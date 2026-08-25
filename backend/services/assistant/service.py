"""Server-side, data-grounded integration for the Energical AI assistant.

The browser can tell the assistant which view is open, but it must never be the
source of truth for business metrics. This module builds a fresh, read-only
snapshot from the same analytics services used by the dashboard before every
assistant request. Groq receives that snapshot as evidence and is instructed to
decline unsupported metrics instead of filling gaps with general knowledge.
"""

import json
import logging
import math
import os
import re
import unicodedata
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Mapping, Optional

import pandas as pd
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

logger = logging.getLogger("energical.assistant")

GLOBAL_CONTEXT_SCHEMA = "energical-global-context-v1"
MAX_HISTORY_MESSAGES = 8
MAX_HISTORY_CHARS = 2000
PIPELINE_KPI_OUTPUT_SOURCES = [
    {
        "section": "sales",
        "module": "pipeline/kpis/sales_intelligence.py",
        "notebook": "pipeline/Notebooks/05_sales_intelligence.ipynb",
    },
    {
        "section": "clients",
        "module": "pipeline/kpis/client_intelligence.py",
        "notebook": "pipeline/Notebooks/03_client_intelligence.ipynb",
    },
    {
        "section": "products",
        "module": "pipeline/kpis/product_intelligence.py",
        "notebook": "pipeline/Notebooks/04_product_intelligence.ipynb",
    },
    {
        "section": "wilayas",
        "module": "pipeline/kpis/wilaya_analysis.py",
        "notebook": "pipeline/Notebooks/06_wilaya_analysis.ipynb",
    },
]


def _json_safe(value: Any) -> Any:
    """Convert pandas/SQLAlchemy scalar values into JSON-safe primitives."""

    if isinstance(value, Mapping):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, (list, tuple, set)):
        return [_json_safe(item) for item in value]
    if isinstance(value, (datetime, pd.Timestamp)):
        return value.isoformat()
    if isinstance(value, pd.Timedelta):
        return value.total_seconds()
    if value is pd.NA:
        return None
    if hasattr(value, "item") and not isinstance(value, (str, bytes, bytearray)):
        try:
            return _json_safe(value.item())
        except (TypeError, ValueError):
            pass
    if isinstance(value, float):
        return None if math.isnan(value) or math.isinf(value) else value
    if value is None or isinstance(value, (str, int, bool)):
        return value
    return str(value)


def _safe_text(value: Any, default: str = "", limit: int = 240) -> str:
    text = str(value).strip() if value is not None else ""
    return text[:limit] if text else default


def _safe_scalar_metrics(payload: Mapping[str, Any]) -> Dict[str, Any]:
    """Keep the old page-context contract, but treat it as an untrusted hint."""

    raw_metrics = payload.get("approved_metrics") or {}
    safe_metrics: Dict[str, Any] = {}
    if isinstance(raw_metrics, Mapping):
        for key, value in raw_metrics.items():
            if isinstance(value, (int, float, str, bool)) and not isinstance(value, bytes):
                safe_metrics[str(key)[:100]] = _json_safe(value)
    return safe_metrics


def _load_analytics_functions() -> Dict[str, Any]:
    """Import analytics lazily so the assistant remains usable in both app layouts."""

    try:
        from ..analytics.service import (
            execute_query,
            get_clients_data,
            get_decisions_data,
            get_forecast_data,
            get_overview_alerts,
            get_overview_data,
            get_products_data,
            get_revenue_trend,
            get_sales_data,
            get_wilayas_data,
            _load_valid_sales,
            _load_valid_transactions,
        )
        from ..ga4.service import get_customer_behavior_data
    except (ImportError, ValueError):
        from services.analytics.service import (
            execute_query,
            get_clients_data,
            get_decisions_data,
            get_forecast_data,
            get_overview_alerts,
            get_overview_data,
            get_products_data,
            get_revenue_trend,
            get_sales_data,
            get_wilayas_data,
            _load_valid_sales,
            _load_valid_transactions,
        )
        from services.ga4.service import get_customer_behavior_data

    return {
        "execute_query": execute_query,
        "get_overview_data": get_overview_data,
        "get_revenue_trend": get_revenue_trend,
        "get_sales_data": get_sales_data,
        "get_clients_data": get_clients_data,
        "get_customer_behavior_data": get_customer_behavior_data,
        "get_wilayas_data": get_wilayas_data,
        "get_products_data": get_products_data,
        "get_forecast_data": get_forecast_data,
        "get_decisions_data": get_decisions_data,
        "get_overview_alerts": get_overview_alerts,
        "_load_valid_sales": _load_valid_sales,
        "_load_valid_transactions": _load_valid_transactions,
    }


def _dataframe_records(frame: Any) -> List[Dict[str, Any]]:
    if frame is None or not hasattr(frame, "to_dict"):
        return []
    try:
        return _json_safe(frame.to_dict(orient="records"))
    except Exception:
        return []


def _query_table_context(execute_query: Any) -> Dict[str, Any]:
    """Expose catalogue and operational aggregates without raw customer rows."""

    inventory: Dict[str, Any] = {}
    for table in ("orders", "transactions", "customers", "catalogue"):
        result = execute_query(f"SELECT COUNT(*) AS rows FROM {table}")
        if result is not None and not result.empty:
            inventory[table] = int(result.iloc[0]["rows"] or 0)

    catalogue_frame = execute_query(
        """
        SELECT sku, product_name, category, subcategory, unit_price, stock_status, ever_sold
        FROM catalogue
        ORDER BY product_name
        """
    )
    catalogue_items: List[Dict[str, Any]] = []
    catalogue_categories: List[Dict[str, Any]] = []
    if catalogue_frame is not None and not catalogue_frame.empty:
        catalogue_items = _dataframe_records(catalogue_frame)
        if "category" in catalogue_frame.columns:
            category_frame = (
                catalogue_frame.groupby("category", dropna=False)
                .agg(skus=("sku", "nunique"))
                .reset_index()
                .sort_values("skus", ascending=False)
            )
            catalogue_categories = _dataframe_records(category_frame)

    status_frame = execute_query(
        """
        SELECT order_status, COUNT(*) AS orders,
               COALESCE(SUM(order_total_amount), 0) AS revenue
        FROM orders
        GROUP BY order_status
        ORDER BY orders DESC
        """
    )
    transaction_summary = execute_query(
        """
        SELECT COUNT(*) AS rows,
               COALESCE(SUM(quantity), 0) AS units,
               COALESCE(SUM(line_total), 0) AS line_revenue
        FROM transactions
        """
    )
    negative_price = execute_query(
        "SELECT COUNT(*) AS rows FROM transactions WHERE has_negative_price IS TRUE"
    )

    transaction_metrics: Dict[str, Any] = {
        "status_breakdown": _dataframe_records(status_frame),
        "line_summary": _dataframe_records(transaction_summary),
        "negative_price_lines": (
            int(negative_price.iloc[0]["rows"] or 0)
            if negative_price is not None and not negative_price.empty
            else None
        ),
    }

    return {
        "inventory": inventory,
        "catalogue": {
            "status": "success" if catalogue_frame is not None else "no_data",
            "items": catalogue_items,
            "category_summary": catalogue_categories,
            "rows_returned": len(catalogue_items),
        },
        "transactions": transaction_metrics,
    }


def _compact_catalogue_for_prompt(catalogue: Mapping[str, Any], query: str) -> Dict[str, Any]:
    """Keep the LLM request bounded without discarding server-side catalogue access.

    The catalogue can contain hundreds of records. Dashboard product analytics
    already carries the verified performance leaders; the prompt only needs
    exact catalogue rows that are relevant to this question plus aggregates for
    the complete catalogue. The full server-side snapshot remains available to
    the request builder and is never replaced by client-provided values.
    """

    raw_items = catalogue.get("items") if isinstance(catalogue, Mapping) else []
    items = [item for item in raw_items if isinstance(item, Mapping)]
    normalized_query = unicodedata.normalize("NFKD", query or "").casefold()
    query_terms = [
        term for term in re.findall(r"[\w\u0600-\u06ff-]{3,}", normalized_query, flags=re.UNICODE)
        if term not in {
            "what", "which", "when", "where", "why", "how", "our", "the", "and", "for", "with",
            "that", "this", "from", "does", "are", "has", "have", "about", "best", "most", "main",
            "quel", "quelle", "quels", "quelles", "notre", "nos", "dans", "avec", "pourquoi", "comment",
            "les", "des", "une", "un", "est", "sont", "produit", "produits", "catalogue", "catalog",
            "منتج", "المنتجات", "ما", "ماذا", "كيف", "لماذا", "عن", "من", "في", "ال",
        }
    ]

    def item_text(item: Mapping[str, Any]) -> str:
        return unicodedata.normalize(
            "NFKD",
            " ".join(str(item.get(key) or "") for key in ("sku", "product_name", "category", "subcategory", "stock_status")),
        ).casefold()

    matching_items = [
        dict(item) for item in items
        if query_terms and any(term in item_text(item) for term in query_terms)
    ]
    stock_requested = any(marker in normalized_query for marker in (
        "stock", "rupture", "out of stock", "disponible", "disponibilite", "inventaire", "مخزون", "نفد"
    ))
    if stock_requested:
        stock_items = [
            dict(item) for item in items
            if any(marker in str(item.get("stock_status") or "").casefold() for marker in ("rupture", "out", "stock", "indispon"))
        ]
        matching_items.extend(stock_items)

    # Preserve order while removing duplicates, then cap exact rows to keep
    # request size predictable. Product performance leaders remain in the
    # products dashboard section and are not affected by this cap.
    unique_items: List[Dict[str, Any]] = []
    seen = set()
    for item in matching_items:
        key = str(item.get("sku") or item.get("product_name") or "")
        if key and key not in seen:
            seen.add(key)
            unique_items.append(item)
    selected_items = unique_items[:60]

    prices = []
    stock_summary: Dict[str, int] = {}
    sold_summary = {"ever_sold": 0, "never_sold": 0, "unknown": 0}
    for item in items:
        try:
            price = float(item.get("unit_price"))
            if math.isfinite(price):
                prices.append(price)
        except (TypeError, ValueError):
            pass
        stock = str(item.get("stock_status") or "Unknown")
        stock_summary[stock] = stock_summary.get(stock, 0) + 1
        sold = item.get("ever_sold")
        if sold is True:
            sold_summary["ever_sold"] += 1
        elif sold is False:
            sold_summary["never_sold"] += 1
        else:
            sold_summary["unknown"] += 1

    price_summary: Dict[str, Any] = {"available": False}
    if prices:
        price_summary = {
            "available": True,
            "minimum": round(min(prices), 2),
            "maximum": round(max(prices), 2),
            "average": round(sum(prices) / len(prices), 2),
            "priced_rows": len(prices),
        }

    return {
        "status": catalogue.get("status", "no_data") if isinstance(catalogue, Mapping) else "no_data",
        "rows_available_server_side": len(items),
        "fields": ["sku", "product_name", "category", "subcategory", "unit_price", "stock_status", "ever_sold"],
        "category_summary": catalogue.get("category_summary", []) if isinstance(catalogue, Mapping) else [],
        "stock_status_summary": stock_summary,
        "ever_sold_summary": sold_summary,
        "price_summary": price_summary,
        "items": selected_items,
        "items_in_prompt": len(selected_items),
        "matching_items_found": len(unique_items),
        "full_catalogue_not_embedded": True,
        "retrieval_note": (
            "Exact catalogue rows are included when they match the user question. "
            "The complete catalogue remains server-side; do not infer an absent row."
        ),
    }


def _compact_platform_context_for_prompt(
    platform_context: Mapping[str, Any],
    query: str,
) -> Dict[str, Any]:
    """Prepare a bounded global evidence package for the model context window."""

    compact = json.loads(json.dumps(platform_context, ensure_ascii=False, allow_nan=False))
    inventory = compact.get("data_inventory")
    if isinstance(inventory, Mapping) and isinstance(inventory.get("catalogue"), Mapping):
        compact["data_inventory"]["catalogue"] = _compact_catalogue_for_prompt(
            inventory["catalogue"], query
        )

    # Retain the full server snapshot above, but send concise, decision-useful
    # slices of repeated time/region records to the model. The exact current vs
    # previous period values remain in period_comparison; the latest series are
    # retained for trend interpretation and the complete region count remains
    # explicit in the coverage metadata.
    sections = compact.get("dashboard_sections")
    if isinstance(sections, Mapping):
        list_limits = {
            "trend": (8, "latest_periods"),
            "history": (8, "latest_periods"),
            "wilayas": (6, "highest_revenue_regions"),
        }
        for section in sections.values():
            if not isinstance(section, Mapping) or not isinstance(section.get("data"), Mapping):
                continue
            data = section["data"]
            for key, (limit, selection_rule) in list_limits.items():
                values = data.get(key)
                if not isinstance(values, list) or len(values) <= limit:
                    continue
                if selection_rule == "highest_revenue_regions":
                    selected = sorted(
                        values,
                        key=lambda item: float(item.get("revenue") or 0) if isinstance(item, Mapping) else 0,
                        reverse=True,
                    )[:limit]
                else:
                    selected = values[-limit:]
                data[key] = selected
                data[f"{key}_coverage"] = {
                    "total_records": len(values),
                    "records_in_prompt": len(selected),
                    "omitted_records": len(values) - len(selected),
                    "selection": selection_rule,
                }
        sales_data = sections.get("sales", {}).get("data") if isinstance(sections.get("sales"), Mapping) else None
        if isinstance(sales_data, Mapping) and isinstance(sales_data.get("trend"), list):
            sales_trend_count = len(sales_data["trend"])
            # revenue_trend carries the same monthly series with the order
            # counts needed for interpretation, so avoid sending the duplicate
            # sales-only copy while keeping its provenance explicit.
            sales_data.pop("trend", None)
            sales_data["trend_coverage"] = {
                "total_records": sales_trend_count,
                "available_in": "dashboard_sections.revenue_trend.data.trend",
            }
        behavior_data = sections.get("customer_behavior", {}).get("data") if isinstance(sections.get("customer_behavior"), Mapping) else None
        if isinstance(behavior_data, Mapping):
            for key, limit in (("top_pages", 5), ("geographic_traffic", 5)):
                values = behavior_data.get(key)
                if isinstance(values, list) and len(values) > limit:
                    behavior_data[key] = values[:limit]
                    behavior_data[f"{key}_coverage"] = {
                        "total_records": len(values),
                        "records_in_prompt": limit,
                        "omitted_records": len(values) - limit,
                        "selection": "highest_ranked_records",
                    }
        pipeline_data = compact.get("pipeline_analysis")
        if isinstance(pipeline_data, Mapping) and isinstance(pipeline_data.get("kpi_output_sources"), list):
            pipeline_data["kpi_output_sections"] = [
                item.get("section") for item in pipeline_data["kpi_output_sources"]
                if isinstance(item, Mapping) and item.get("section")
            ]
            pipeline_data.pop("kpi_output_sources", None)
    compact["prompt_context"] = {
        "global_scope": "entire_platform",
        "catalogue_retrieval": "server_side_question_relevant_rows_and_aggregates",
        "long_series_retrieval": "latest_periods_and_highest_revenue_regions_with_coverage_counts",
    }
    return compact


def _dimension_period_changes(
    frame: pd.DataFrame,
    dimension: str,
    value_column: str,
    current_period: str,
    previous_period: str,
    limit: int = 10,
) -> List[Dict[str, Any]]:
    if dimension not in frame.columns or value_column not in frame.columns:
        return []

    work = frame[[dimension, value_column, "period"]].copy()
    work[dimension] = work[dimension].fillna("Unknown").astype(str).str.strip()
    work[value_column] = pd.to_numeric(work[value_column], errors="coerce").fillna(0)
    current = work[work["period"] == current_period]
    previous = work[work["period"] == previous_period]

    def aggregate(source: pd.DataFrame) -> pd.DataFrame:
        if source.empty:
            return pd.DataFrame(columns=[dimension, "revenue", "rows"])
        grouped = (
            source.groupby(dimension, dropna=False)
            .agg(revenue=(value_column, "sum"), rows=(value_column, "size"))
            .reset_index()
        )
        return grouped

    current_group = aggregate(current).rename(columns={"revenue": "current_revenue", "rows": "current_rows"})
    previous_group = aggregate(previous).rename(columns={"revenue": "previous_revenue", "rows": "previous_rows"})
    merged = current_group.merge(previous_group, on=dimension, how="outer").fillna(0)
    if merged.empty:
        return []
    merged["sort_value"] = merged["current_revenue"].abs().where(
        merged["current_revenue"].abs() > 0,
        merged["previous_revenue"].abs(),
    )
    merged = merged.sort_values("sort_value", ascending=False).head(limit)

    rows: List[Dict[str, Any]] = []
    for _, row in merged.iterrows():
        current_value = float(row.get("current_revenue", 0) or 0)
        previous_value = float(row.get("previous_revenue", 0) or 0)
        change_pct = None
        if previous_value != 0:
            change_pct = round((current_value - previous_value) / abs(previous_value) * 100, 2)
        rows.append({
            "label": str(row[dimension]),
            "current_revenue": round(current_value, 2),
            "previous_revenue": round(previous_value, 2),
            "change": round(current_value - previous_value, 2),
            "change_pct": change_pct,
            "current_rows": int(row.get("current_rows", 0) or 0),
            "previous_rows": int(row.get("previous_rows", 0) or 0),
        })
    return rows


def _build_period_comparison(analytics: Mapping[str, Any]) -> Dict[str, Any]:
    """Calculate current-vs-previous monthly drivers from the canonical sales set."""

    try:
        sales = analytics["_load_valid_sales"]()
        if sales is None or sales.empty or "order_date" not in sales.columns:
            return {"status": "no_data", "reason": "At least two dated realized-sales periods are required."}

        sales = sales.copy()
        sales["order_date"] = pd.to_datetime(sales["order_date"], errors="coerce")
        sales["order_total_amount"] = pd.to_numeric(
            sales.get("order_total_amount", 0), errors="coerce"
        ).fillna(0)
        sales = sales.dropna(subset=["order_date"])
        if sales.empty:
            return {"status": "no_data", "reason": "No dated realized-sales records are available."}

        sales["period"] = sales["order_date"].dt.to_period("M").astype(str)
        periods = sorted(sales["period"].dropna().unique())
        if len(periods) < 2:
            return {"status": "no_data", "reason": "At least two monthly periods are required."}

        current_period, previous_period = periods[-1], periods[-2]

        def period_summary(source: pd.DataFrame) -> Dict[str, Any]:
            revenue = float(source["order_total_amount"].sum())
            orders = int(source["order_id_stage"].nunique()) if "order_id_stage" in source.columns else int(len(source))
            return {
                "revenue": round(revenue, 2),
                "orders": orders,
                "average_order_value": round(revenue / orders, 2) if orders else None,
            }

        current = period_summary(sales[sales["period"] == current_period])
        previous = period_summary(sales[sales["period"] == previous_period])

        def pct_change(current_value: Optional[float], previous_value: Optional[float]) -> Optional[float]:
            if previous_value in (None, 0):
                return None
            return round((current_value - previous_value) / abs(previous_value) * 100, 2)

        overall = {
            "revenue_change": round(current["revenue"] - previous["revenue"], 2),
            "revenue_change_pct": pct_change(current["revenue"], previous["revenue"]),
            "orders_change": current["orders"] - previous["orders"],
            "orders_change_pct": pct_change(current["orders"], previous["orders"]),
            "average_order_value_change": (
                round(current["average_order_value"] - previous["average_order_value"], 2)
                if current["average_order_value"] is not None and previous["average_order_value"] is not None
                else None
            ),
            "average_order_value_change_pct": pct_change(
                current["average_order_value"], previous["average_order_value"]
            ),
        }

        transaction_frame = analytics["_load_valid_transactions"](sales)
        breakdowns: Dict[str, Any] = {
            "customer_type": _dimension_period_changes(
                sales, "customer_type_inferred", "order_total_amount", current_period, previous_period
            ),
            "wilaya": _dimension_period_changes(
                sales, "wilaya_normalized", "order_total_amount", current_period, previous_period
            ),
        }
        if transaction_frame is not None and not transaction_frame.empty:
            transaction_frame = transaction_frame.copy()
            transaction_frame["order_date"] = pd.to_datetime(transaction_frame["order_date"], errors="coerce")
            transaction_frame["period"] = transaction_frame["order_date"].dt.to_period("M").astype(str)
            breakdowns["product"] = _dimension_period_changes(
                transaction_frame,
                "product_name",
                "line_total",
                current_period,
                previous_period,
            )

        return {
            "status": "success",
            "periods": {"current": current_period, "previous": previous_period},
            "current": current,
            "previous": previous,
            "overall": overall,
            "breakdowns": breakdowns,
            "method": "Canonical realized orders grouped by calendar month; product drivers use valid transaction lines.",
        }
    except Exception as exc:
        logger.warning("Period comparison could not be built: %s", exc)
        return {"status": "unavailable", "reason": "The period comparison could not be calculated from the current database."}


def _pipeline_context() -> Dict[str, Any]:
    try:
        try:
            from ..pipeline.service import get_recent_pipeline_runs
        except (ImportError, ValueError):
            from services.pipeline.service import get_recent_pipeline_runs
        runs = get_recent_pipeline_runs(limit=10)
    except Exception as exc:
        logger.warning("Pipeline results unavailable to assistant: %s", exc)
        return {"status": "unavailable", "runs": [], "warning": "Pipeline run history is unavailable."}

    safe_runs: List[Dict[str, Any]] = []
    for run in runs or []:
        result = run.get("result") or {}
        summaries = []
        for summary in result.get("dataset_summaries", []) or []:
            summaries.append({
                key: _json_safe(summary.get(key))
                for key in (
                    "dataset", "raw_rows", "cleaned_rows", "duplicates_removed",
                    "missing_values_handled", "date_ranges", "transformations",
                )
                if key in summary
            })
        safe_runs.append({
            "run_id": _safe_text(run.get("run_id"), limit=80),
            "status": _safe_text(run.get("status"), "unknown", 40),
            "created_at": _json_safe(run.get("created_at")),
            "stages": [
                {
                    "key": _safe_text(stage.get("key"), limit=60),
                    "status": _safe_text(stage.get("status"), limit=40),
                    "label": _safe_text(stage.get("label"), limit=100),
                }
                for stage in (run.get("stages") or [])
                if isinstance(stage, Mapping)
            ],
            "datasets_processed": _json_safe(result.get("datasets_processed", [])),
            "dataset_summaries": summaries,
            "totals": {
                key: _json_safe(result.get(key))
                for key in (
                    "total_files", "total_rows_raw", "total_rows_cleaned",
                    "total_missing_values", "total_duplicate_rows_removed",
                    "persistence", "import_summary",
                )
                if key in result
            },
        })
    return {
        "status": "success" if safe_runs else "no_runs",
        "runs": safe_runs,
        # The dashboard sections above contain the live outputs of these
        # helpers even when no separate upload/run history exists in memory.
        "kpi_outputs_included": True,
        "kpi_output_sources": PIPELINE_KPI_OUTPUT_SOURCES,
    }


def build_global_platform_context() -> Dict[str, Any]:
    """Build the complete server-side evidence package for Brock/Groq."""

    analytics = _load_analytics_functions()
    domain_loaders = {
        "overview": analytics["get_overview_data"],
        "revenue_trend": analytics["get_revenue_trend"],
        "sales": analytics["get_sales_data"],
        "clients": analytics["get_clients_data"],
        "customer_behavior": analytics["get_customer_behavior_data"],
        "wilayas": analytics["get_wilayas_data"],
        "products": analytics["get_products_data"],
        "forecast": analytics["get_forecast_data"],
        "decisions": analytics["get_decisions_data"],
        "overview_alerts": analytics["get_overview_alerts"],
    }

    domains: Dict[str, Any] = {}
    warnings: List[str] = []
    for name, loader in domain_loaders.items():
        try:
            result = loader()
            safe_result = _json_safe(result if isinstance(result, Mapping) else {})
            if name == "forecast":
                # The existing forecast page intentionally marks its projection
                # as pending approval. Do not give its placeholder growth value
                # to an assistant that is required to report verified facts.
                forecast_data = safe_result.get("data") if isinstance(safe_result, Mapping) else None
                if isinstance(forecast_data, dict):
                    forecast_data.pop("expected_growth_pct", None)
                    forecast_data["forecast_status"] = "pending_approval"
            domains[name] = safe_result
            for warning in (safe_result.get("warnings", []) if isinstance(safe_result, Mapping) else []) or []:
                warnings.append(f"{name}: {warning}")
        except Exception as exc:
            logger.warning("Global assistant context domain '%s' failed: %s", name, exc)
            domains[name] = {
                "status": "unavailable",
                "data": None,
                "warnings": ["This platform section could not be read at query time."],
            }
            warnings.append(f"{name}: unavailable")

    try:
        table_context = _query_table_context(analytics["execute_query"])
    except Exception as exc:
        logger.warning("Global assistant table context failed: %s", exc)
        table_context = {
            "inventory": {},
            "catalogue": {"status": "unavailable", "items": [], "category_summary": []},
            "transactions": {"status_breakdown": [], "line_summary": [], "negative_price_lines": None},
        }
        warnings.append("Database inventory and catalogue context are unavailable.")

    period_comparison = _build_period_comparison(analytics)
    if period_comparison.get("status") != "success":
        warnings.append("No verified two-period comparison is available.")

    pipeline_analysis = _pipeline_context()
    # Keep the same page-level vocabulary the frontend uses. The upload page
    # is represented by its sanitized pipeline result; the overview product
    # card is an alias of the verified products result.
    products_data = domains.get("products", {}).get("data", {}) if isinstance(domains.get("products"), Mapping) else {}
    top_product = products_data.get("top_product") if isinstance(products_data, Mapping) else None
    domains["overview_product"] = {
        "status": domains.get("products", {}).get("status", "no_data") if isinstance(domains.get("products"), Mapping) else "no_data",
        "data": {
            "top_product": top_product,
            **(top_product if isinstance(top_product, Mapping) else {}),
        },
    }
    domains["upload"] = pipeline_analysis

    provisional_context = {"dashboard_sections": domains}
    available_sections = [
        name for name in domains
        if _domain_available(provisional_context, name)
    ]

    return _json_safe({
        "schema": GLOBAL_CONTEXT_SCHEMA,
        "scope": "entire_platform",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "source_of_truth": "Server-side analytics services and the configured project database.",
        "client_view_metrics_are_not_authoritative": True,
        "available_sections": available_sections,
        "dashboard_sections": domains,
        "period_comparison": period_comparison,
        "data_inventory": table_context,
        "pipeline_analysis": pipeline_analysis,
        "kpi_contract_registry": (
            KPI_CONTRACT_REGISTRY if "KPI_CONTRACT_REGISTRY" in globals() else {}
        ),
        "analysis_sources": [
            {"domain": "sales", "module": "pipeline/kpis/sales_intelligence.py", "notebook": "pipeline/Notebooks/05_sales_intelligence.ipynb"},
            {"domain": "clients", "module": "pipeline/kpis/client_intelligence.py", "notebook": "pipeline/Notebooks/03_client_intelligence.ipynb"},
            {"domain": "products", "module": "pipeline/kpis/product_intelligence.py", "notebook": "pipeline/Notebooks/04_product_intelligence.ipynb"},
            {"domain": "wilayas", "module": "pipeline/kpis/wilaya_analysis.py", "notebook": "pipeline/Notebooks/06_wilaya_analysis.ipynb"},
            {"domain": "cleaning", "module": "pipeline/kpis/cleaning.py", "notebook": "pipeline/Notebooks/02_data_cleaning.ipynb"},
        ],
        "warnings": sorted(set(str(item) for item in warnings if item)),
    })


def sanitize_context(payload: Dict[str, Any]) -> Dict[str, Any]:
    """Return the global context while preserving the existing endpoint shape."""

    page = _safe_text(payload.get("page"), "overview", 80)
    selection_type = _safe_text(payload.get("selection_type"), "dashboard_selection", 80)
    selection = _safe_text(payload.get("selection"), "Current View", 240)
    safe_metrics = _safe_scalar_metrics(payload)
    platform_context = build_global_platform_context()

    return {
        "status": "success",
        "context": {
            "scope": "entire_platform",
            "current_view": {
                "page": page,
                "selection_type": selection_type,
                "selection": selection,
            },
            "approved_metrics": safe_metrics,
            "platform_context": platform_context,
            "boundary": "Server-side verified aggregates and analysis results; client tab metrics are contextual hints only.",
        },
    }


def _detect_language(query: str, interface_language: Optional[str] = None) -> str:
    if re.search(r"[\u0600-\u06ff\u0750-\u077f]", query or ""):
        return "ar"
    normalized = unicodedata.normalize("NFKD", query or "").lower()
    french_markers = (
        " chiffre ", "revenu", "ventes", "commande", "client", "produit", "moyenne",
        "tendance", "pourquoi", "baisse", "hausse", "quel", "quelle", "quels", "quelles",
    )
    def contains_marker(marker: str) -> bool:
        clean_marker = marker.strip()
        return bool(re.search(rf"(?<!\w){re.escape(clean_marker)}(?!\w)", normalized))

    if any(contains_marker(marker) for marker in french_markers) or any(
        contains_marker(marker)
        for marker in ("comment", "données", "donnees", "analyse", "notre", "nos", "avec", "dans")
    ):
        return "fr"
    english_markers = (
        " what ", "which ", " why ", " how ", " our ", " total ", "revenue", "sales",
        "customer", "product", "average", "trend", "show ", "explain ", "compare ",
    )
    if any(contains_marker(marker) for marker in english_markers):
        return "en"
    return interface_language if interface_language in {"en", "fr", "ar"} else "en"


def _domain_data(platform_context: Optional[Mapping[str, Any]], name: str) -> Dict[str, Any]:
    if not isinstance(platform_context, Mapping):
        return {}
    domains = platform_context.get("dashboard_sections") or platform_context.get("domains") or {}
    result = domains.get(name) if isinstance(domains, Mapping) else None
    data = result.get("data") if isinstance(result, Mapping) else None
    return data if isinstance(data, Mapping) else {}


def _domain_available(platform_context: Optional[Mapping[str, Any]], name: str) -> bool:
    if not isinstance(platform_context, Mapping):
        return False
    domains = platform_context.get("dashboard_sections") or platform_context.get("domains") or {}
    result = domains.get(name) if isinstance(domains, Mapping) else None
    if not isinstance(result, Mapping) or result.get("status") != "success" or not isinstance(result.get("data"), Mapping):
        return False
    data = result["data"]
    warnings = " ".join(str(item).casefold() for item in (result.get("warnings") or []))
    if any(marker in warnings for marker in ("no order data", "no customer data", "no transaction data", "no web analytics data")):
        return False
    if name in {"overview", "sales"}:
        return int(data.get("total_orders", data.get("orders", 0)) or 0) > 0
    if name == "clients":
        return int(data.get("total_clients", 0) or 0) > 0
    if name == "revenue_trend":
        return bool(data.get("trend"))
    if name == "products":
        return bool(data.get("top_products"))
    if name == "wilayas":
        return int(data.get("active_wilayas", 0) or 0) > 0
    if name == "customer_behavior":
        return bool(data.get("total_sessions") or data.get("total_visitors") or data.get("channels"))
    if name == "overview_product":
        return isinstance(data.get("top_product"), Mapping)
    if name == "upload":
        return bool(data.get("runs"))
    return True


def _count_numeric_metrics(value: Any) -> int:
    """Count numeric values in the server snapshot for response observability."""

    if isinstance(value, Mapping):
        return sum(_count_numeric_metrics(item) for item in value.values())
    if isinstance(value, (list, tuple)):
        return sum(_count_numeric_metrics(item) for item in value)
    if isinstance(value, bool):
        return 0
    return 1 if isinstance(value, (int, float)) else 0


def _context_metadata(
    platform_context: Mapping[str, Any],
    page: str,
    selection_type: str,
    selection: str,
    client_metrics: Mapping[str, Any],
    prompt_context: Optional[Mapping[str, Any]] = None,
) -> Dict[str, Any]:
    domains = platform_context.get("dashboard_sections") or {}
    source_names = ["configured project database", "server-side analytics services"]
    if platform_context.get("analysis_sources"):
        source_names.append("pipeline KPI helpers and referenced notebooks")
    if "customer_behavior" in domains:
        source_names.append("customer behavior / GA4 or uploaded web analytics")
    return {
        "scope": "entire_platform",
        "context_scope": "entire_platform",
        "global_context": True,
        "context_schema": platform_context.get("schema", GLOBAL_CONTEXT_SCHEMA),
        "current_page": page,
        "selection_type": selection_type,
        "selection": selection,
        "available_metric_count": _count_numeric_metrics(domains),
        "client_metrics_count": len(client_metrics),
        # Keep this compatibility field, but make clear it is not the global count.
        "metrics_count": len(client_metrics),
        "data_sources": source_names,
        "analysis_sections_used": list(domains.keys()) if isinstance(domains, Mapping) else [],
        "available_sections": platform_context.get("available_sections", []),
        "pipeline_results_included": bool(
            (platform_context.get("pipeline_analysis") or {}).get("runs")
            or (platform_context.get("pipeline_analysis") or {}).get("kpi_outputs_included")
        ),
        "pipeline_run_history_available": bool((platform_context.get("pipeline_analysis") or {}).get("runs")),
        "period_comparison": (platform_context.get("period_comparison") or {}).get("status"),
        "global_context_chars": len(json.dumps(platform_context, ensure_ascii=False)),
        "llm_context_chars": len(json.dumps(prompt_context or platform_context, ensure_ascii=False)),
        "client_metrics_treated_as_hint": True,
    }


def _format_number(value: Any, decimals: int = 2) -> str:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return "—"
    if math.isnan(number) or math.isinf(number):
        return "—"
    if number.is_integer():
        return f"{int(number):,}"
    return f"{number:,.{decimals}f}"


def _latest_trend_change(platform_context: Mapping[str, Any]) -> Optional[Dict[str, Any]]:
    trend_data = _domain_data(platform_context, "revenue_trend")
    points = trend_data.get("trend") or _domain_data(platform_context, "sales").get("trend") or []
    if len(points) < 2:
        return None
    previous, current = points[-2], points[-1]
    previous_revenue = float(previous.get("revenue") or 0)
    current_revenue = float(current.get("revenue") or 0)
    change_pct = None if previous_revenue == 0 else round((current_revenue - previous_revenue) / abs(previous_revenue) * 100, 2)
    return {
        "previous_period": previous.get("period"),
        "current_period": current.get("period"),
        "previous_revenue": previous_revenue,
        "current_revenue": current_revenue,
        "change_pct": change_pct,
    }


def _localized_unavailable(language: str) -> str:
    if language == "fr":
        return "Je ne peux pas confirmer cette information à partir des données disponibles dans la plateforme. Aucun résultat vérifié correspondant n’est accessible actuellement."
    if language == "ar":
        return "لا أستطيع تأكيد هذه المعلومة من البيانات المتاحة في المنصة. لا توجد حالياً نتيجة موثّقة مطابقة يمكن الوصول إليها."
    return "I cannot confirm that from the data available in the platform. No verified result matching the request is currently accessible."


def _localized_groq_unavailable(language: str) -> str:
    if language == "fr":
        return "L’analyse globale n’a pas pu être générée : le fournisseur Groq est indisponible ou a échoué. Aucune réponse métier de secours n’a été utilisée."
    if language == "ar":
        return "تعذر إنشاء التحليل العام: مزود Groq غير متاح أو فشل في معالجة الطلب. لم يتم استخدام إجابة أعمال احتياطية."
    return "The global analysis could not be generated because the Groq provider is unavailable or failed. No business-answer fallback was used."


def generate_contextual_answer(
    query: str,
    page: str,
    selection: str,
    metrics: Optional[Dict[str, Any]],
    platform_context: Optional[Dict[str, Any]] = None,
    interface_language: Optional[str] = None,
) -> str:
    """Data-grounded answer utility retained for compatibility with direct callers."""

    language = _detect_language(query, interface_language)
    context = platform_context or {}
    overview = _domain_data(context, "overview")
    sales = _domain_data(context, "sales")
    products = _domain_data(context, "products")
    clients = _domain_data(context, "clients")
    wilayas = _domain_data(context, "wilayas")
    comparison = context.get("period_comparison") if isinstance(context, Mapping) else None
    comparison = comparison if isinstance(comparison, Mapping) else {}
    query_normalized = unicodedata.normalize("NFKD", query or "").lower()

    is_revenue = any(term in query_normalized for term in ("revenue", "revenu", "chiffre", "sales", "ventes", "إيراد", "المبيعات"))
    is_product = any(term in query_normalized for term in ("product", "produit", "sku", "منتج"))
    is_average = any(term in query_normalized for term in ("average order", "average basket", "panier moyen", "moyenne", "متوسط الطلب"))
    is_segment = any(term in query_normalized for term in ("segment", "customer type", "client type", "b2b", "b2c", "شريحة", "العملاء"))
    is_trend = any(term in query_normalized for term in ("trend", "changed", "change", "decrease", "declin", "increase", "baisse", "hausse", "évolu", "تغير", "انخفاض", "اتجاه"))
    is_kpi = any(term in query_normalized for term in ("kpi", "metric", "indicator", "indicateur", "مؤشر"))
    is_pipeline = any(term in query_normalized for term in ("quality", "check", "transformation", "pipeline", "qualité", "contrôle", "nettoyage", "جودة", "تحليل البيانات"))

    if not context or not context.get("available_sections"):
        return _localized_unavailable(language)

    if is_pipeline:
        pipeline = context.get("pipeline_analysis") or {}
        runs = pipeline.get("runs") or [] if isinstance(pipeline, Mapping) else []
        if not runs:
            return _localized_unavailable(language)
        latest = runs[0]
        totals = latest.get("totals") or {}
        if language == "fr":
            return (
                f"Résultat vérifié du dernier pipeline ({latest.get('status', 'inconnu')}) : "
                f"{_format_number(totals.get('total_files'), 0)} fichier(s), "
                f"{_format_number(totals.get('total_rows_raw'), 0)} ligne(s) brutes et "
                f"{_format_number(totals.get('total_rows_cleaned'), 0)} ligne(s) nettoyées. "
                "Les métriques métier restent calculées à partir des données persistées et des résultats analytiques disponibles."
            )
        if language == "ar":
            return (
                f"النتيجة الموثّقة لأحدث عملية تحليل ({latest.get('status', 'غير معروف')}): "
                f"{_format_number(totals.get('total_files'), 0)} ملف، "
                f"{_format_number(totals.get('total_rows_raw'), 0)} صف خام، و"
                f"{_format_number(totals.get('total_rows_cleaned'), 0)} صف منقح. "
                "يتم حساب مؤشرات الأعمال من البيانات المحفوظة ونتائج التحليل المتاحة."
            )
        return (
            f"Verified result from the latest pipeline run ({latest.get('status', 'unknown')}): "
            f"{_format_number(totals.get('total_files'), 0)} file(s), "
            f"{_format_number(totals.get('total_rows_raw'), 0)} raw row(s), and "
            f"{_format_number(totals.get('total_rows_cleaned'), 0)} cleaned row(s). "
            "Business metrics are calculated from persisted data and the available analysis results."
        )

    if is_product:
        top_products = products.get("top_products") or []
        if not top_products:
            return _localized_unavailable(language)
        top = top_products[0]
        if language == "fr":
            return (
                f"Réponse directe : le produit le plus performant selon le chiffre d’affaires réalisé est « {top.get('label', '—')} », "
                f"avec {_format_number(top.get('revenue'))} DZD sur {_format_number(top.get('orders'), 0)} ligne(s)/commande(s) analysée(s).\n\n"
                "Interprétation : ce classement provient des transactions valides et ne constitue pas une prévision. "
                "Pour une décision de stock, vérifiez aussi les unités vendues et le statut catalogue."
            )
        if language == "ar":
            return (
                f"الإجابة المباشرة: المنتج الأفضل حسب الإيرادات المحققة هو «{top.get('label', '—')}»، "
                f"بإيراد قدره {_format_number(top.get('revenue'))} دج عبر {_format_number(top.get('orders'), 0)} من معاملات/أسطر البيع المحللة.\n\n"
                "التفسير: يعتمد هذا الترتيب على المعاملات الصالحة، وليس على توقع مستقبلي. ولقرار المخزون، راجع أيضاً الوحدات المباعة وحالة المنتج في الكتالوج."
            )
        return (
            f"Direct answer: the best-performing product by realized revenue is “{top.get('label', '—')}”, "
            f"with {_format_number(top.get('revenue'))} DZD across {_format_number(top.get('orders'), 0)} analyzed transaction line/order records.\n\n"
            "Interpretation: this ranking is based on valid transactions, not a forecast. For a stock decision, also check units sold and catalogue stock status."
        )

    if is_segment:
        segments = sales.get("customer_types") or clients.get("customer_types") or []
        if not segments:
            return _localized_unavailable(language)
        top_segment = max(segments, key=lambda item: float(item.get("revenue") or 0))
        if language == "fr":
            return (
                f"Le segment générant le plus de revenus est « {top_segment.get('label', '—')} » avec "
                f"{_format_number(top_segment.get('revenue'))} DZD et {_format_number(top_segment.get('orders'), 0)} commande(s). "
                f"Le panier moyen de ce segment est de {_format_number(top_segment.get('average_basket'))} DZD lorsqu’il est disponible."
            )
        if language == "ar":
            return (
                f"الشريحة التي تحقق أعلى إيراد هي «{top_segment.get('label', '—')}» بإيرادات قدرها "
                f"{_format_number(top_segment.get('revenue'))} دج و {_format_number(top_segment.get('orders'), 0)} طلباً. "
                f"ومتوسط قيمة الطلب لهذه الشريحة هو {_format_number(top_segment.get('average_basket'))} دج عند توفره."
            )
        return (
            f"The highest-revenue customer segment is “{top_segment.get('label', '—')}” with "
            f"{_format_number(top_segment.get('revenue'))} DZD and {_format_number(top_segment.get('orders'), 0)} order(s). "
            f"Its average order value is {_format_number(top_segment.get('average_basket'))} DZD where available."
        )

    if is_average:
        value = sales.get("average_basket", overview.get("average_basket"))
        if value is None or not (_domain_available(context, "sales") or _domain_available(context, "overview")):
            return _localized_unavailable(language)
        if language == "fr":
            return f"Le panier moyen vérifié est de {_format_number(value)} DZD, calculé comme le chiffre d’affaires réalisé divisé par le nombre de commandes réalisées."
        if language == "ar":
            return f"متوسط قيمة الطلب الموثّق هو {_format_number(value)} دج، ويُحسب بقسمة الإيرادات المحققة على عدد الطلبات المحققة."
        return f"The verified average order value is {_format_number(value)} DZD, calculated as realized revenue divided by realized order count."

    if is_trend or (is_revenue and any(term in query_normalized for term in ("why", "pourquoi", "سبب", "لماذا"))):
        if comparison.get("status") == "success":
            overall = comparison.get("overall") or {}
            current_period = comparison.get("periods", {}).get("current")
            previous_period = comparison.get("periods", {}).get("previous")
            direction = "increased" if (overall.get("revenue_change") or 0) > 0 else "decreased" if (overall.get("revenue_change") or 0) < 0 else "was flat"
            dimensions = comparison.get("breakdowns") or {}
            largest_declines: List[str] = []
            for dimension in ("product", "customer_type", "wilaya"):
                rows = [row for row in (dimensions.get(dimension) or []) if (row.get("change") or 0) < 0]
                rows.sort(key=lambda row: float(row.get("change") or 0))
                if rows:
                    largest_declines.append(f"{dimension}: {rows[0].get('label')} ({_format_number(rows[0].get('change'))} DZD)")
            drivers = "; ".join(largest_declines[:3]) or "No negative driver was identified in the available top-level breakdowns."
            if language == "fr":
                return (
                    f"Entre {previous_period} et {current_period}, le chiffre d’affaires réalisé {('a augmenté' if direction == 'increased' else 'a diminué' if direction == 'decreased' else 'est resté stable')} de "
                    f"{_format_number(overall.get('revenue_change'))} DZD ({_format_number(overall.get('revenue_change_pct'))} %). "
                    f"Les commandes ont évolué de {_format_number(overall.get('orders_change'), 0)} et le panier moyen de {_format_number(overall.get('average_order_value_change'))} DZD.\n\n"
                    f"Facteurs visibles dans les ventilations disponibles : {drivers}. "
                    "Ces facteurs décrivent une contribution observée ; ils ne prouvent pas à eux seuls une causalité."
                )
            if language == "ar":
                return (
                    f"بين {previous_period} و{current_period}، {('ارتفعت' if direction == 'increased' else 'انخفضت' if direction == 'decreased' else 'استقرت')} الإيرادات المحققة بمقدار "
                    f"{_format_number(overall.get('revenue_change'))} دج ({_format_number(overall.get('revenue_change_pct'))}٪). "
                    f"وتغير عدد الطلبات بمقدار {_format_number(overall.get('orders_change'), 0)}، بينما تغير متوسط قيمة الطلب بمقدار {_format_number(overall.get('average_order_value_change'))} دج.\n\n"
                    f"العوامل الظاهرة في التقسيمات المتاحة: {drivers}. هذه مساهمات ملاحظة وليست دليلاً منفرداً على السببية."
                )
            return (
                f"Between {previous_period} and {current_period}, realized revenue {direction} by "
                f"{_format_number(overall.get('revenue_change'))} DZD ({_format_number(overall.get('revenue_change_pct'))}%). "
                f"Orders changed by {_format_number(overall.get('orders_change'), 0)}, while average order value changed by {_format_number(overall.get('average_order_value_change'))} DZD.\n\n"
                f"Visible factors in the available breakdowns: {drivers}. These are observed contributions, not proof of causality by themselves."
            )
        trend = _latest_trend_change(context)
        if trend:
            if language == "fr":
                return (
                    f"Le revenu est passé de {_format_number(trend['previous_revenue'])} DZD en {trend['previous_period']} à "
                    f"{_format_number(trend['current_revenue'])} DZD en {trend['current_period']} ({_format_number(trend['change_pct'])} %)."
                )
            if language == "ar":
                return (
                    f"تغيرت الإيرادات من {_format_number(trend['previous_revenue'])} دج في {trend['previous_period']} إلى "
                    f"{_format_number(trend['current_revenue'])} دج في {trend['current_period']} ({_format_number(trend['change_pct'])}٪)."
                )
            return (
                f"Revenue changed from {_format_number(trend['previous_revenue'])} DZD in {trend['previous_period']} to "
                f"{_format_number(trend['current_revenue'])} DZD in {trend['current_period']} ({_format_number(trend['change_pct'])}%)."
            )
        return _localized_unavailable(language)

    if is_revenue or is_kpi:
        revenue = overview.get("total_revenue", overview.get("revenue", sales.get("total_revenue")))
        orders = overview.get("total_orders", overview.get("orders", sales.get("total_orders")))
        clients_count = overview.get("total_clients", overview.get("clients"))
        if not (_domain_available(context, "overview") or _domain_available(context, "sales")):
            return _localized_unavailable(language)
        top_product = (products.get("top_products") or [None])[0]
        top_region = next((row for row in (wilayas.get("wilayas") or []) if float(row.get("revenue") or 0) > 0), None)
        if language == "fr":
            return (
                f"Réponse directe : le chiffre d’affaires réalisé est de {_format_number(revenue)} DZD sur {_format_number(orders, 0)} commande(s), "
                f"pour {_format_number(clients_count, 0)} client(s) enregistré(s).\n\n"
                f"Points clés : produit en tête « {top_product.get('label', '—') if top_product else '—'} » ; première wilaya par revenu « {top_region.get('label', '—') if top_region else '—'} ». "
                "Ces résultats proviennent des agrégats analytiques disponibles dans la plateforme."
            )
        if language == "ar":
            return (
                f"الإجابة المباشرة: الإيرادات المحققة هي {_format_number(revenue)} دج من {_format_number(orders, 0)} طلب، "
                f"مع {_format_number(clients_count, 0)} عميلاً مسجلاً.\n\n"
                f"أهم النتائج: المنتج الأول «{top_product.get('label', '—') if top_product else '—'}»، والولاية الأولى حسب الإيراد «{top_region.get('label', '—') if top_region else '—'}». "
                "هذه النتائج مستخرجة من التجميعات التحليلية المتاحة في المنصة."
            )
        return (
            f"Direct answer: realized revenue is {_format_number(revenue)} DZD across {_format_number(orders, 0)} order(s), "
            f"with {_format_number(clients_count, 0)} registered customer(s).\n\n"
            f"Key findings: leading product “{top_product.get('label', '—') if top_product else '—'}”; leading revenue Wilaya “{top_region.get('label', '—') if top_region else '—'}”. "
            "These results come from the platform’s available analytical aggregates."
        )

    if _domain_available(context, "overview") or _domain_available(context, "sales"):
        revenue = overview.get("total_revenue", overview.get("revenue", sales.get("total_revenue")))
        orders = overview.get("total_orders", overview.get("orders", sales.get("total_orders")))
        average = sales.get("average_basket", overview.get("average_basket"))
        top_product = (products.get("top_products") or [None])[0]
        top_segment = max(sales.get("customer_types") or clients.get("customer_types") or [], key=lambda item: float(item.get("revenue") or 0), default=None)
        top_region = next((row for row in (wilayas.get("wilayas") or []) if float(row.get("revenue") or 0) > 0), None)
        if language == "fr":
            return (
                f"Voici la lecture vérifiée de la plateforme pour « {selection} » : chiffre d’affaires réalisé {_format_number(revenue)} DZD, "
                f"{_format_number(orders, 0)} commande(s) et panier moyen {_format_number(average)} DZD. "
                f"Le produit leader est « {top_product.get('label', '—') if top_product else '—'} » et le segment leader est « {top_segment.get('label', '—') if top_segment else '—'} ». "
                f"La wilaya leader est « {top_region.get('label', '—') if top_region else '—'} ». "
                "Ce sont des faits observés ; une recommandation détaillée nécessite une question ou une période précise."
            )
        if language == "ar":
            return (
                f"هذه قراءة موثّقة للمنصة حول «{selection}»: إيرادات محققة قدرها {_format_number(revenue)} دج، "
                f"وعدد الطلبات {_format_number(orders, 0)}، ومتوسط قيمة الطلب {_format_number(average)} دج. "
                f"المنتج الرائد هو «{top_product.get('label', '—') if top_product else '—'}»، والشريحة الرائدة هي «{top_segment.get('label', '—') if top_segment else '—'}»، "
                f"والولاية الأولى هي «{top_region.get('label', '—') if top_region else '—'}». هذه حقائق ملاحظة؛ وتتطلب التوصية التفصيلية سؤالاً أو فترة محددة."
            )
        return (
            f"Here is the verified platform readout for “{selection}”: realized revenue {_format_number(revenue)} DZD, "
            f"{_format_number(orders, 0)} order(s), and average order value {_format_number(average)} DZD. "
            f"The leading product is “{top_product.get('label', '—') if top_product else '—'}”, the leading segment is “{top_segment.get('label', '—') if top_segment else '—'}”, "
            f"and the leading Wilaya is “{top_region.get('label', '—') if top_region else '—'}”. These are observed facts; a detailed recommendation needs a specific question or period."
        )

    return _localized_unavailable(language)


def _sanitize_history(history: Optional[Iterable[Mapping[str, Any]]]) -> List[Dict[str, str]]:
    safe: List[Dict[str, str]] = []
    for item in list(history or [])[-MAX_HISTORY_MESSAGES:]:
        if not isinstance(item, Mapping) or item.get("role") not in {"user", "assistant"}:
            continue
        content = _safe_text(item.get("content"), limit=MAX_HISTORY_CHARS)
        if content:
            safe.append({"role": str(item["role"]), "content": content})
    return safe


def query_groq_llm(
    query: str,
    page: str,
    selection: str,
    metrics: Optional[Dict[str, Any]],
    platform_context: Optional[Dict[str, Any]] = None,
    interface_language: Optional[str] = None,
    history: Optional[Iterable[Mapping[str, Any]]] = None,
    selection_type: str = "dashboard_selection",
    prompt_context: Optional[Dict[str, Any]] = None,
) -> Optional[str]:
    # Prefer the provider-specific key. API_AUTH_TOKEN is retained as the
    # project's existing backwards-compatible Groq-key setting.
    api_token = os.getenv("GROQ_API_KEY") or os.getenv("API_AUTH_TOKEN")
    if not api_token or not api_token.strip() or api_token.strip().lower().startswith("gsk_your_"):
        return None
    if not platform_context or not platform_context.get("dashboard_sections"):
        return None

    provider_url = (os.getenv("ASSISTANT_PROVIDER_URL") or "https://api.groq.com/openai/v1").rstrip("/")
    endpoint = provider_url if provider_url.endswith("/chat/completions") else f"{provider_url}/chat/completions"
    # Keep the default aligned with the currently enabled Groq model catalog.
    # Deployments can still override this with ASSISTANT_MODEL.
    model = os.getenv("ASSISTANT_MODEL", "openai/gpt-oss-120b")
    detected_language = _detect_language(query, interface_language)
    language_name = {"en": "English", "fr": "French", "ar": "Arabic"}[detected_language]
    prompt_context = prompt_context or _compact_platform_context_for_prompt(platform_context, query)
    context_json = json.dumps(
        prompt_context,
        ensure_ascii=False,
        allow_nan=False,
        separators=(",", ":"),
    )
    current_hint = json.dumps({
        "page": page,
        "selection_type": selection_type,
        "selection": selection,
        "client_supplied_metrics": metrics or {},
    }, indent=2, ensure_ascii=False)

    system_prompt = f"""You are Brock, the multilingual Business Analyst for the Energical Decision Platform.

The user is currently viewing {page!r} and has selected {selection!r}. That is navigation context only. You have a GLOBAL view of the entire platform below, including every dashboard section, database-backed KPI, catalogue aggregate, transaction aggregate, operational alert, period comparison, and available pipeline/notebook result.

Answer in the same language as the user's question. The detected language is {language_name}; support English, French, and Arabic fluently. Do not switch languages unless the user explicitly asks.

SOURCE-OF-TRUTH RULES:
- Use only the GLOBAL PLATFORM EVIDENCE JSON for project facts and numbers.
- Client-supplied tab metrics are only a UI hint and must never override server-side evidence.
- Never invent, estimate, round into existence, or infer an unavailable metric. If it is absent, has status no_data/unavailable, or cannot support the requested claim, say so clearly.
- Treat derived web-analytics values as derived/estimated when the evidence says so; do not present them as live GA4 facts.
- Treat forecast values marked pending_approval as unapproved projections, not actual performance.
- Do not expose raw customer records, secrets, SQL, or internal credentials. Use the available aggregate customer information.

BUSINESS-ANALYST METHOD:
1. Identify the relevant evidence and metric.
2. Give a direct answer with the exact available values and period.
3. Separate verified facts from interpretation.
4. Compare periods, categories, products, segments, or regions when the evidence supports it.
5. For why-questions, use the period_comparison breakdowns to identify observed contributors and explicitly distinguish contribution from causation.
6. End with practical implications or recommendations only when they follow from the evidence. Do not add generic filler.
For analytical questions, provide a useful depth of detail: direct answer, metrics, interpretation, key findings, business implications, and recommendations where appropriate.

CURRENT VIEW HINT (NOT AUTHORITATIVE):
{current_hint}

GLOBAL PLATFORM EVIDENCE JSON:
<platform_evidence>
{context_json}
</platform_evidence>"""

    messages: List[Dict[str, str]] = [{"role": "system", "content": system_prompt}]
    messages.extend(_sanitize_history(history))
    messages.append({"role": "user", "content": _safe_text(query, limit=6000)})
    try:
        max_tokens = int(os.getenv("ASSISTANT_MAX_TOKENS", "1200"))
    except (TypeError, ValueError):
        max_tokens = 1200
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.2,
        "max_tokens": max(400, min(max_tokens, 4000)),
    }

    try:
        req_data = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        req = urllib.request.Request(
            endpoint,
            data=req_data,
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {api_token.strip()}",
                "User-Agent": "Energical-Decision-Platform/1.0",
            },
        )
        with urllib.request.urlopen(req, timeout=20) as response:
            res_json = json.loads(response.read().decode("utf-8"))
            choices = res_json.get("choices") or []
            if choices and isinstance(choices[0].get("message"), Mapping):
                content = choices[0]["message"].get("content")
                if isinstance(content, str) and content.strip():
                    return content.strip()
    except Exception as exc:
        logger.warning("Groq API query failed: %s", exc)
    return None


def handle_assistant_query(payload: Dict[str, Any]) -> Dict[str, Any]:
    query = _safe_text(payload.get("query") or payload.get("question"), limit=6000)
    page = _safe_text(payload.get("page"), "overview", 80)
    selection_type = _safe_text(payload.get("selection_type"), "dashboard_selection", 80)
    selection = _safe_text(payload.get("selection"), "All platform data", 240)
    metrics = _safe_scalar_metrics(payload)
    interface_language = payload.get("interface_language") or payload.get("language")
    history = payload.get("conversation") or payload.get("history") or []

    try:
        platform_context = build_global_platform_context()
    except Exception as exc:
        logger.error("Global assistant context could not be built: %s", exc, exc_info=True)
        language = _detect_language(query, interface_language)
        return {
            "status": "error",
            "answer": _localized_groq_unavailable(language),
            "provider": "global_context_unavailable",
            "error": {
                "code": "global_context_unavailable",
                "message": "The server could not build the verified global platform context.",
            },
            "context_used": {
                "scope": "entire_platform",
                "context_scope": "entire_platform",
                "global_context": False,
                "current_page": page,
                "selection_type": selection_type,
                "selection": selection,
                "client_metrics_count": len(metrics),
                "metrics_count": len(metrics),
                "client_metrics_treated_as_hint": True,
            },
        }

    prompt_context = _compact_platform_context_for_prompt(platform_context, query)
    context_used = _context_metadata(
        platform_context,
        page,
        selection_type,
        selection,
        metrics,
        prompt_context=prompt_context,
    )
    llm_answer = query_groq_llm(
        query,
        page,
        selection,
        metrics,
        platform_context=platform_context,
        interface_language=interface_language,
        history=history,
        selection_type=selection_type,
        prompt_context=prompt_context,
    )
    if llm_answer:
        return {
            "status": "success",
            "answer": llm_answer,
            "provider": "groq",
            "context_used": context_used,
        }

    return {
        "status": "error",
        "answer": _localized_groq_unavailable(_detect_language(query, interface_language)),
        "provider": "groq_unavailable",
        "error": {
            "code": "groq_unavailable",
            "message": "Groq did not return an answer. No local business-answer fallback was used.",
        },
        "context_used": context_used,
    }
