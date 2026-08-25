import os
import logging
import sys
import unicodedata
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import pandas as pd
from sqlalchemy import text

try:
    from pipeline.kpis.contract import (
        filter_realized_sales,
        filter_realized_transactions,
        calculate_platform_aov,
        calculate_total_revenue,
        calculate_total_orders,
        calculate_total_clients,
        calculate_sales_growth,
    )
    from pipeline.kpis.cleaning import clean_dtypes
    from pipeline.kpis.client_intelligence import client_recency
    from pipeline.kpis.product_intelligence import Top_products, avg_order_quant_per_product
    from pipeline.kpis.sales_intelligence import (
        VALID_SALES_STATUSES,
        Sales_growth,
        performance_per_customer_type,
        performance_per_delivery_method,
        performance_per_mop,
        sale_number,
    )
    from pipeline.kpis.wilaya_analysis import (
        active_customers_per_wilaya,
        revenue_per_wilaya,
        wilaya_ranking,
    )
except ImportError:
    # The Docker image starts in /app (the backend directory), while local
    # development starts from the repository root. Make the extracted
    # notebook package importable in both layouts.
    PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".."))
    if PROJECT_ROOT not in sys.path:
        sys.path.insert(0, PROJECT_ROOT)
    from pipeline.kpis.contract import (
        filter_realized_sales,
        filter_realized_transactions,
        calculate_platform_aov,
        calculate_total_revenue,
        calculate_total_orders,
        calculate_total_clients,
        calculate_sales_growth,
    )
    from pipeline.kpis.cleaning import clean_dtypes
    from pipeline.kpis.client_intelligence import client_recency
    from pipeline.kpis.product_intelligence import Top_products, avg_order_quant_per_product
    from pipeline.kpis.sales_intelligence import (
        VALID_SALES_STATUSES,
        Sales_growth,
        performance_per_customer_type,
        performance_per_delivery_method,
        performance_per_mop,
        sale_number,
    )
    from pipeline.kpis.wilaya_analysis import (
        active_customers_per_wilaya,
        revenue_per_wilaya,
        wilaya_ranking,
    )

logger = logging.getLogger("energical.analytics")

ALGERIA_WILAYAS_GEO = [
    {"id": "01", "label": "Adrar", "latitude": 27.8742, "longitude": -0.2939},
    {"id": "02", "label": "Chlef", "latitude": 36.1647, "longitude": 1.3317},
    {"id": "03", "label": "Laghouat", "latitude": 33.8000, "longitude": 2.8651},
    {"id": "04", "label": "Oum El Bouaghi", "latitude": 35.8755, "longitude": 7.1135},
    {"id": "05", "label": "Batna", "latitude": 35.5559, "longitude": 6.1741},
    {"id": "06", "label": "Béjaïa", "latitude": 36.7559, "longitude": 5.0843},
    {"id": "07", "label": "Biskra", "latitude": 34.8504, "longitude": 5.7281},
    {"id": "08", "label": "Béchar", "latitude": 31.6167, "longitude": -2.2167},
    {"id": "09", "label": "Blida", "latitude": 36.4700, "longitude": 2.8300},
    {"id": "10", "label": "Bouira", "latitude": 36.3749, "longitude": 3.9020},
    {"id": "11", "label": "Tamanrasset", "latitude": 22.7850, "longitude": 5.5228},
    {"id": "12", "label": "Tébessa", "latitude": 35.4042, "longitude": 8.1242},
    {"id": "13", "label": "Tlemcen", "latitude": 34.8783, "longitude": -1.3150},
    {"id": "14", "label": "Tiaret", "latitude": 35.3710, "longitude": 1.3170},
    {"id": "15", "label": "Tizi Ouzou", "latitude": 36.7118, "longitude": 4.0459},
    {"id": "16", "label": "Alger", "latitude": 36.7538, "longitude": 3.0588},
    {"id": "17", "label": "Djelfa", "latitude": 34.6728, "longitude": 3.2630},
    {"id": "18", "label": "Jijel", "latitude": 36.8206, "longitude": 5.7667},
    {"id": "19", "label": "Sétif", "latitude": 36.1911, "longitude": 5.4137},
    {"id": "20", "label": "Saïda", "latitude": 34.8303, "longitude": 0.1517},
    {"id": "21", "label": "Skikda", "latitude": 36.8792, "longitude": 6.9075},
    {"id": "22", "label": "Sidi Bel Abbès", "latitude": 35.1899, "longitude": -0.6308},
    {"id": "23", "label": "Annaba", "latitude": 36.9000, "longitude": 7.7667},
    {"id": "24", "label": "Guelma", "latitude": 36.4621, "longitude": 7.4261},
    {"id": "25", "label": "Constantine", "latitude": 36.3650, "longitude": 6.6147},
    {"id": "26", "label": "Médéa", "latitude": 36.2642, "longitude": 2.7539},
    {"id": "27", "label": "Mostaganem", "latitude": 35.9312, "longitude": 0.0892},
    {"id": "28", "label": "M'Sila", "latitude": 35.7058, "longitude": 4.5419},
    {"id": "29", "label": "Mascara", "latitude": 35.3966, "longitude": 0.1403},
    {"id": "30", "label": "Ouargla", "latitude": 31.9493, "longitude": 5.3250},
    {"id": "31", "label": "Oran", "latitude": 35.6976, "longitude": -0.6337},
    {"id": "32", "label": "El Bayadh", "latitude": 33.6832, "longitude": 1.0193},
    {"id": "33", "label": "Illizi", "latitude": 26.4833, "longitude": 8.4667},
    {"id": "34", "label": "Bordj Bou Arréridj", "latitude": 36.0732, "longitude": 4.7611},
    {"id": "35", "label": "Boumerdès", "latitude": 36.7664, "longitude": 3.4772},
    {"id": "36", "label": "El Tarf", "latitude": 36.7672, "longitude": 8.3138},
    {"id": "37", "label": "Tindouf", "latitude": 27.6761, "longitude": -8.1478},
    {"id": "38", "label": "Tissemsilt", "latitude": 35.6072, "longitude": 1.8108},
    {"id": "39", "label": "El Oued", "latitude": 33.3683, "longitude": 6.8674},
    {"id": "40", "label": "Khenchela", "latitude": 35.4358, "longitude": 7.1433},
    {"id": "41", "label": "Souk Ahras", "latitude": 36.2864, "longitude": 7.9511},
    {"id": "42", "label": "Tipaza", "latitude": 36.5897, "longitude": 2.4475},
    {"id": "43", "label": "Mila", "latitude": 36.4503, "longitude": 6.2644},
    {"id": "44", "label": "Aïn Defla", "latitude": 36.2642, "longitude": 1.9679},
    {"id": "45", "label": "Naâma", "latitude": 33.2667, "longitude": -0.3167},
    {"id": "46", "label": "Aïn Témouchent", "latitude": 35.2975, "longitude": -1.1404},
    {"id": "47", "label": "Ghardaïa", "latitude": 32.4909, "longitude": 3.6735},
    {"id": "48", "label": "Relizane", "latitude": 35.7373, "longitude": 0.5559},
    {"id": "49", "label": "Timimoun", "latitude": 29.2639, "longitude": 0.2310},
    {"id": "50", "label": "Bordj Badji Mokhtar", "latitude": 21.3297, "longitude": 0.9542},
    {"id": "51", "label": "Ouled Djellal", "latitude": 34.4333, "longitude": 5.0667},
    {"id": "52", "label": "Béni Abbès", "latitude": 30.1333, "longitude": -2.1667},
    {"id": "53", "label": "In Salah", "latitude": 27.1936, "longitude": 2.4607},
    {"id": "54", "label": "In Guezzam", "latitude": 19.5686, "longitude": 5.7694},
    {"id": "55", "label": "Touggourt", "latitude": 33.1053, "longitude": 6.0600},
    {"id": "56", "label": "Djanet", "latitude": 24.5531, "longitude": 9.4842},
    {"id": "57", "label": "El M'Ghair", "latitude": 33.9500, "longitude": 5.9167},
    {"id": "58", "label": "El Meniaa", "latitude": 30.5833, "longitude": 2.8833},
]

_WILAYA_GEO_LOOKUP = {w["label"]: w for w in ALGERIA_WILAYAS_GEO}

def execute_query(sql_query: str) -> Optional[pd.DataFrame]:
    try:
        try:
            from .database import engine
        except ImportError:
            try:
                from ...core.database import engine
            except (ImportError, ValueError):
                try:
                    from core.database import engine
                except ImportError:
                    from database import engine
        with engine.connect() as conn:
            return pd.read_sql(text(sql_query), conn)
    except Exception as exc:
        logger.warning(f"Query failed: {exc}")
        return None

def _db_has_data() -> bool:
    
    df = execute_query("SELECT COUNT(*) AS cnt FROM orders")
    if df is not None and not df.empty:
        return int(df.iloc[0]["cnt"]) > 0
    return False


def _status_key(value: Any) -> str:
    text_value = "" if value is None else str(value).strip().casefold()
    return "".join(
        char for char in unicodedata.normalize("NFKD", text_value)
        if not unicodedata.combining(char)
    )


# The notebook uses the canonical French labels. The test/dev seed and some
# imported business files use their English equivalents, so recognize both
# without changing the KPI definition of realized sales.
REALIZED_SALES_STATUS_KEYS = {
    *(_status_key(status) for status in VALID_SALES_STATUSES),
    "completed",
    "complete",
    "delivered",
    "paid",
    "partially refunded",
    "partially_refunded",
}


def _load_valid_sales() -> Optional[pd.DataFrame]:
    """Load the canonical realized-sales population from the orders table."""
    df_orders = execute_query("SELECT * FROM orders")
    if df_orders is None:
        return None
    return filter_realized_sales(df_orders)


def _load_valid_transactions(valid_sales: Optional[pd.DataFrame] = None) -> Optional[pd.DataFrame]:
    """Load transaction rows belonging to the canonical realized-sales population."""
    df_transactions = execute_query(
        """
        SELECT
            transaction_id,
            order_id_stage,
            customer_id_stage,
            order_date,
            wilaya_raw,
            wilaya_normalized,
            geo_quality_flag,
            customer_type_inferred,
            sku,
            product_name,
            sku_quality,
            category,
            subcategory,
            quantity,
            unit_price,
            line_total,
            order_status,
            payment_method_group,
            sales_channel,
            has_negative_price
        FROM transactions
        """
    )
    if df_transactions is None:
        return None
    return filter_realized_transactions(df_transactions, valid_sales)

def get_overview_data() -> Dict[str, Any]:
    valid_sales = _load_valid_sales()
    df_customers = execute_query("SELECT * FROM customers")

    if valid_sales is not None and not valid_sales.empty and "order_total_amount" in valid_sales.columns:
        valid_sales = clean_dtypes(valid_sales)
        valid_sales["order_total_amount"] = pd.to_numeric(
            valid_sales["order_total_amount"], errors="coerce"
        ).fillna(0)
        total_rev = calculate_total_revenue(valid_sales)
        total_orders = calculate_total_orders(valid_sales)
        avg_basket = calculate_platform_aov(valid_sales)
        total_clients = calculate_total_clients(df_customers)

        growth_pct = 0.0
        if "order_date" in valid_sales.columns:
            valid_sales["order_date"] = pd.to_datetime(valid_sales["order_date"], errors="coerce")
            valid_sales = valid_sales.dropna(subset=["order_date"])
            monthly_periods = sorted(valid_sales["order_date"].dt.to_period("M").dropna().unique())
            if len(monthly_periods) >= 2:
                last = float(sale_number(valid_sales[valid_sales["order_date"].dt.to_period("M") == monthly_periods[-1]]))
                prev = float(sale_number(valid_sales[valid_sales["order_date"].dt.to_period("M") == monthly_periods[-2]]))
                growth = Sales_growth(last, prev)
                growth_pct = round(float(growth), 1) if growth is not None else 0.0

        period_start = ""
        period_end = ""
        if "order_date" in valid_sales.columns:
            dates = valid_sales["order_date"].dropna()
            if not dates.empty:
                period_start = dates.min().strftime("%Y-%m-%d")
                period_end = dates.max().strftime("%Y-%m-%d")
    else:
        total_rev = 0.0
        total_orders = 0
        avg_basket = 0.0
        total_clients = 0
        growth_pct = 0.0
        period_start = ""
        period_end = ""

    return {
        "status": "success",
        "data": {
            "revenue": total_rev,
            "total_revenue": total_rev,
            "orders": total_orders,
            "total_orders": total_orders,
            "average_basket": avg_basket,
            "clients": total_clients,
            "total_clients": total_clients,
            "growth_pct": growth_pct,
            "period_start": period_start,
            "period_end": period_end,
            "scope": {
                "datasets": ["orders", "transactions", "customers"],
                "period_start": period_start,
                "period_end": period_end,
            },
        },
        "scope": {"datasets": ["orders", "transactions", "customers"]},
        "warnings": [] if total_orders > 0 else ["No order data found in database. Upload CSV files to populate dashboards."],
    }

def get_revenue_trend(granularity: str = "monthly", start_date: str = "", end_date: str = "") -> Dict[str, Any]:
    granularity = str(granularity) if isinstance(granularity, str) else "monthly"
    start_date = str(start_date).strip() if isinstance(start_date, str) else ""
    end_date = str(end_date).strip() if isinstance(end_date, str) else ""

    df = _load_valid_sales()

    if df is not None and not df.empty and "order_date" in df.columns:
        df = clean_dtypes(df)
        df["order_date"] = pd.to_datetime(df["order_date"], errors="coerce")
        df = df.dropna(subset=["order_date"])
        df["order_total_amount"] = pd.to_numeric(df["order_total_amount"], errors="coerce").fillna(0)

        if start_date:
            try:
                df = df[df["order_date"] >= pd.to_datetime(start_date)]
            except Exception:
                pass
        if end_date:
            try:
                df = df[df["order_date"] <= pd.to_datetime(end_date)]
            except Exception:
                pass

        if df.empty:
            return {"status": "no_data", "data": None, "warnings": ["No orders in the selected date range."]}

        available_start = df["order_date"].min().strftime("%Y-%m-%d")
        available_end = df["order_date"].max().strftime("%Y-%m-%d")
        data_through = available_end

        points = []
        partial_periods = []

        if granularity == "monthly":
            df["period"] = df["order_date"].dt.to_period("M").astype(str)
            now_period = datetime.now().strftime("%Y-%m")
            for period, period_df in df.groupby("period"):
                is_partial = str(period) == now_period
                if is_partial:
                    partial_periods.append(str(period))
                points.append({
                    "period": str(period),
                    "revenue": round(float(sale_number(period_df)), 2),
                    "orders": int(period_df["order_id_stage"].nunique()) if "order_id_stage" in period_df.columns else int(len(period_df)),
                    "is_partial": is_partial,
                })

        elif granularity == "weekly":
            df["period"] = df["order_date"].dt.to_period("W").astype(str)
            for period, period_df in df.groupby("period"):
                points.append({
                    "period": str(period),
                    "revenue": round(float(sale_number(period_df)), 2),
                    "orders": int(period_df["order_id_stage"].nunique()) if "order_id_stage" in period_df.columns else int(len(period_df)),
                    "is_partial": False,
                })

        elif granularity == "daily":
            df["period"] = df["order_date"].dt.strftime("%Y-%m-%d")
            for period, period_df in df.groupby("period"):
                points.append({
                    "period": str(period),
                    "revenue": round(float(sale_number(period_df)), 2),
                    "orders": int(period_df["order_id_stage"].nunique()) if "order_id_stage" in period_df.columns else int(len(period_df)),
                    "is_partial": False,
                })

        points.sort(key=lambda p: p["period"])

        range_start = start_date or available_start
        range_end = end_date or available_end

        return {
            "status": "success",
            "data": {
                "granularity": granularity,
                "trend": points,
                "partial_periods": partial_periods,
                "available_start": available_start,
                "available_end": available_end,
                "range_start": range_start,
                "range_end": range_end,
                "data_through": data_through,
                "scope": {
                    "start_date": range_start,
                    "end_date": range_end,
                },
            },
        }

    return {
        "status": "no_data",
        "data": {
            "granularity": granularity,
            "trend": [],
            "partial_periods": [],
            "available_start": "",
            "available_end": "",
            "range_start": start_date or "",
            "range_end": end_date or "",
            "data_through": "",
            "scope": {"start_date": "", "end_date": ""},
        },
        "warnings": ["No order data available. Upload CSV files to see revenue trends."],
    }

def get_sales_data() -> Dict[str, Any]:
    valid_sales = _load_valid_sales()
    df_transactions = _load_valid_transactions(valid_sales)

    if valid_sales is not None and not valid_sales.empty and "order_total_amount" in valid_sales.columns:
        valid_sales = clean_dtypes(valid_sales)
        valid_sales["order_total_amount"] = pd.to_numeric(valid_sales["order_total_amount"], errors="coerce").fillna(0)
        total_revenue = calculate_total_revenue(valid_sales)
        total_orders = calculate_total_orders(valid_sales)
        average_basket = calculate_platform_aov(valid_sales)

        growth_pct = 0.0
        period_start = ""
        period_end = ""
        partial_months = []
        if "order_date" in valid_sales.columns:
            valid_sales["order_date"] = pd.to_datetime(valid_sales["order_date"], errors="coerce")
            dates = valid_sales["order_date"].dropna()
            if not dates.empty:
                period_start = dates.min().strftime("%Y-%m-%d")
                period_end = dates.max().strftime("%Y-%m-%d")
            monthly_periods = sorted(valid_sales["order_date"].dropna().dt.to_period("M").unique())
            if len(monthly_periods) >= 2:
                last = float(sale_number(valid_sales[valid_sales["order_date"].dt.to_period("M") == monthly_periods[-1]]))
                prev = float(sale_number(valid_sales[valid_sales["order_date"].dt.to_period("M") == monthly_periods[-2]]))
                growth = Sales_growth(last, prev)
                growth_pct = round(float(growth), 1) if growth is not None else 0.0

        trend = []
        if "order_date" in valid_sales.columns:
            valid_sales["period"] = valid_sales["order_date"].dt.to_period("M").astype(str)
            for period, period_df in valid_sales.groupby("period"):
                trend.append({"period": str(period), "revenue": round(float(sale_number(period_df)), 2)})
        trend.sort(key=lambda x: x["period"])

        customer_types = []
        if all(column in valid_sales.columns for column in ("customer_type_inferred", "customer_id_stage", "order_id_stage")):
            customer_type_performance = performance_per_customer_type(valid_sales)
            for _, row in customer_type_performance.iterrows():
                customer_types.append({
                    "label": str(row["customer_type_inferred"]),
                    "revenue": round(float(row["Revenue"]), 2),
                    "orders": int(row["Orders"]),
                    "average_basket": round(float(row["Average_Basket"]), 2) if pd.notna(row["Average_Basket"]) else 0.0,
                })

        payment_methods = []
        if all(column in valid_sales.columns for column in ("payment_method_group", "order_id_stage")):
            payment_performance = performance_per_mop(valid_sales)
            for _, row in payment_performance.iterrows():
                payment_methods.append({
                    "label": str(row["payment_method_group"]),
                    "revenue": round(float(row["Revenue"]), 2),
                    "orders": int(row["Orders"]),
                })
            payment_methods.sort(key=lambda x: x["revenue"], reverse=True)

        delivery_methods = []
        if (
            df_transactions is not None
            and not df_transactions.empty
            and "order_id_stage" in df_transactions.columns
            and "order_id_stage" in valid_sales.columns
        ):
            shipping_column = "shipping_method" if "shipping_method" in df_transactions.columns else "sales_channel"
            if shipping_column in df_transactions.columns:
                shipping_per_order = (
                    df_transactions[["order_id_stage", shipping_column]]
                    .drop_duplicates()
                    .rename(columns={shipping_column: "shipping_method"})
                )
                orders_shipping = valid_sales.merge(
                    shipping_per_order,
                    on="order_id_stage",
                    how="left"
                )
                delivery_performance = performance_per_delivery_method(orders_shipping)
                for _, row in delivery_performance.iterrows():
                    delivery_methods.append({
                        "label": str(row["shipping_method"]),
                        "revenue": round(float(row["Revenue"]), 2),
                        "orders": int(row["Orders"]),
                    })
            delivery_methods.sort(key=lambda x: x["revenue"], reverse=True)

        return {
            "status": "success",
            "data": {
                "total_revenue": total_revenue,
                "total_orders": total_orders,
                "average_basket": average_basket,
                "growth_pct": growth_pct,
                "period_start": period_start,
                "period_end": period_end,
                "partial_months": partial_months,
                "trend": trend,
                "customer_types": customer_types,
                "payment_methods": payment_methods,
                "delivery_methods": delivery_methods,
                "scope": {
                    "run_id": "live-db",
                    "datasets": ["orders", "transactions"],
                    "rows_used": {"orders": total_orders, "realized_orders": total_orders},
                    "notes": [
                        "Revenue is calculated from order_total_amount in the orders table.",
                        "Only orders with a valid realized-sales status are included.",
                    ],
                },
            },
        }

    return {
        "status": "no_data",
        "data": {
            "total_revenue": 0, "total_orders": 0, "average_basket": 0, "growth_pct": 0,
            "period_start": "", "period_end": "", "partial_months": [],
            "trend": [], "customer_types": [], "payment_methods": [], "delivery_methods": [],
            "scope": {"run_id": "none", "datasets": [], "rows_used": {"orders": 0, "realized_orders": 0}, "notes": ["No data. Upload CSVs to populate."]},
        },
        "warnings": ["No order data in database."],
    }

def get_clients_data() -> Dict[str, Any]:
    df_customers = execute_query("SELECT * FROM customers")
    valid_sales = _load_valid_sales()

    if df_customers is not None and not df_customers.empty:
        df_customers = clean_dtypes(df_customers)
        total_clients = int(len(df_customers))

        customer_types = []
        if "customer_type_inferred" in df_customers.columns:
            cust_by_type = (
                df_customers.groupby("customer_type_inferred")
                .size()
                .reset_index(name="customers")
            )
            if (
                valid_sales is not None
                and not valid_sales.empty
                and all(column in valid_sales.columns for column in ("customer_type_inferred", "customer_id_stage", "order_id_stage", "order_total_amount"))
            ):
                valid_sales = clean_dtypes(valid_sales)
                valid_sales["order_total_amount"] = pd.to_numeric(valid_sales["order_total_amount"], errors="coerce").fillna(0)
                customer_type_performance = performance_per_customer_type(valid_sales)
                merged = cust_by_type.merge(
                    customer_type_performance[
                        ["customer_type_inferred", "Revenue", "Orders"]
                    ],
                    on="customer_type_inferred",
                    how="left",
                ).fillna(0)
            else:
                merged = cust_by_type.assign(Revenue=0, Orders=0)
            for _, row in merged.iterrows():
                customer_types.append({
                    "label": str(row["customer_type_inferred"]),
                    "customers": int(row["customers"]),
                    "revenue": round(float(row.get("Revenue", 0)), 2),
                    "orders": int(row.get("Orders", 0)),
                })

        rfm = {
            "reference_date": datetime.now().strftime("%Y-%m-%d"),
            "recency_days_min": 1,
            "recency_days_max": 365,
            "frequency_field": "orders_count",
            "monetary_field": "total_amount",
        }
        if "first_order_date" in df_customers.columns and "last_order_date" in df_customers.columns:
            recency_customers = client_recency(df_customers.copy())
            last_dates = recency_customers["last_order_date"].dropna()
            if not last_dates.empty:
                ref_date = last_dates.max()
                recency = recency_customers["recency_days"].dropna()
                rfm["reference_date"] = ref_date.strftime("%Y-%m-%d")
                rfm["recency_days_min"] = int(recency.min()) if not recency.empty else 0
                rfm["recency_days_max"] = int(recency.max()) if not recency.empty else 365

        wilaya_distribution = []
        if "wilaya" in df_customers.columns:
            wil_group = df_customers.groupby("wilaya").size().reset_index(name="customers")
            wil_group = wil_group.sort_values("customers", ascending=False)
            for _, row in wil_group.head(15).iterrows():
                wilaya_distribution.append({
                    "label": str(row["wilaya"]),
                    "customers": int(row["customers"]),
                })

        return {
            "status": "success",
            "data": {
                "total_clients": total_clients,
                "customer_types": customer_types,
                "rfm": rfm,
                "wilaya_distribution": wilaya_distribution,
                "scope": {"datasets": ["customers", "orders"]},
            },
        }

    return {
        "status": "no_data",
        "data": {
            "total_clients": 0, "customer_types": [], "rfm": {},
            "wilaya_distribution": [], "scope": {"datasets": []},
        },
        "warnings": ["No customer data in database."],
    }

def get_wilayas_data() -> Dict[str, Any]:
    valid_sales = _load_valid_sales()

    if valid_sales is not None and not valid_sales.empty and "order_total_amount" in valid_sales.columns:
        valid_sales = clean_dtypes(valid_sales)
        if "wilaya_normalized" not in valid_sales.columns:
            if "wilaya_raw" in valid_sales.columns:
                valid_sales["wilaya_normalized"] = valid_sales["wilaya_raw"]
            elif "wilaya" in valid_sales.columns:
                valid_sales["wilaya_normalized"] = valid_sales["wilaya"]
            else:
                valid_sales["wilaya_normalized"] = "Alger"
        if "wilaya_raw" in valid_sales.columns:
            valid_sales["wilaya_normalized"] = valid_sales["wilaya_normalized"].fillna(valid_sales["wilaya_raw"])
        valid_sales["wilaya_normalized"] = valid_sales["wilaya_normalized"].fillna("Alger")
        valid_sales["order_total_amount"] = pd.to_numeric(valid_sales["order_total_amount"], errors="coerce").fillna(0)
        total_revenue = float(sale_number(valid_sales))
        total_orders = int(valid_sales["order_id_stage"].nunique()) if "order_id_stage" in valid_sales.columns else int(len(valid_sales))

        revenue_by_wilaya = revenue_per_wilaya(valid_sales)
        customers_by_wilaya = active_customers_per_wilaya(valid_sales)
        ranking = wilaya_ranking(revenue_by_wilaya, customers_by_wilaya)
        order_counts = (
            valid_sales.groupby("wilaya_normalized")["order_id_stage"].nunique()
            if "order_id_stage" in valid_sales.columns
            else valid_sales.groupby("wilaya_normalized").size()
        )

        wilayas_list = []
        for _, row in ranking.iterrows():
            label = str(row["wilaya_normalized"])
            rev = float(row["order_total_amount"])
            ords = int(order_counts.get(row["wilaya_normalized"], 0))
            clts = int(row["active_customers"])
            share = round(rev / total_revenue * 100, 2) if total_revenue > 0 else 0.0

            geo = _WILAYA_GEO_LOOKUP.get(label)
            if geo:
                wilayas_list.append({
                    "id": geo["id"],
                    "label": label,
                    "latitude": geo["latitude"],
                    "longitude": geo["longitude"],
                    "geography_status": "valid_wilaya",
                    "revenue": round(rev, 2),
                    "orders": ords,
                    "clients": clts,
                    "share": share,
                    "growth": 0.0,
                })
            else:
                wilayas_list.append({
                    "id": "99",
                    "label": label,
                    "latitude": 28.0,
                    "longitude": 3.0,
                    "geography_status": "unmapped",
                    "revenue": round(rev, 2),
                    "orders": ords,
                    "clients": clts,
                    "share": share,
                    "growth": 0.0,
                })

        seen_labels = {w["label"] for w in wilayas_list}
        for geo_w in ALGERIA_WILAYAS_GEO:
            if geo_w["label"] not in seen_labels:
                wilayas_list.append({
                    "id": geo_w["id"],
                    "label": geo_w["label"],
                    "latitude": geo_w["latitude"],
                    "longitude": geo_w["longitude"],
                    "geography_status": "valid_wilaya",
                    "revenue": 0.0,
                    "orders": 0,
                    "clients": 0,
                    "share": 0.0,
                    "growth": 0.0,
                })

        wilayas_list.sort(key=lambda w: w["revenue"], reverse=True)

        return {
            "status": "success",
            "data": {
                "active_wilayas": sum(1 for w in wilayas_list if w["orders"] > 0),
                "wilayas": wilayas_list,
                "scope": {
                    "rows_used": {"realized_orders": total_orders},
                    "notes": [
                        "Geographic coordinates mapped to official 58 Wilaya centroids.",
                        "Market share calculated as Wilaya Revenue / Total Realized Revenue.",
                    ],
                },
            },
        }

    wilayas_list = []
    for w in ALGERIA_WILAYAS_GEO:
        wilayas_list.append({
            "id": w["id"], "label": w["label"],
            "latitude": w["latitude"], "longitude": w["longitude"],
            "geography_status": "valid_wilaya",
            "revenue": 0.0, "orders": 0, "clients": 0, "share": 0.0, "growth": 0.0,
        })
    return {
        "status": "no_data",
        "data": {
            "active_wilayas": 0, "wilayas": wilayas_list,
            "scope": {"rows_used": {"realized_orders": 0}, "notes": ["No order data available."]},
        },
        "warnings": ["No order data in database."],
    }

def get_products_data() -> Dict[str, Any]:
    valid_sales = _load_valid_sales()
    df_tx = _load_valid_transactions(valid_sales)

    if (
        df_tx is not None
        and not df_tx.empty
        and all(column in df_tx.columns for column in ("product_name", "line_total", "quantity", "sku_quality", "order_id_stage"))
    ):
        df_tx = clean_dtypes(df_tx)
        df_tx["line_total"] = pd.to_numeric(df_tx["line_total"], errors="coerce").fillna(0)
        df_tx["quantity"] = pd.to_numeric(df_tx["quantity"], errors="coerce").fillna(0).astype(int)

        top_products = Top_products(df_tx, top_n=10)
        product_quantities = avg_order_quant_per_product(df_tx)
        grouped = top_products.merge(
            product_quantities[["product_name", "total_units_sold"]],
            on="product_name",
            how="left",
        )

        top_prods = []
        for _, row in grouped.head(10).iterrows():
            top_prods.append({
                "label": str(row["product_name"]),
                "revenue": round(float(row["total_revenue"]), 2),
                "orders": int(row["total_orders"]),
                "units": int(row["total_units_sold"]),
            })

        catalogue_skus = int(df_tx["sku"].nunique()) if "sku" in df_tx.columns else 0

        return {
            "status": "success",
            "data": {
                "top_products": top_prods,
                "top_product": top_prods[0] if top_prods else None,
                "scope": {"catalogue_skus": catalogue_skus},
            },
        }

    return {
        "status": "no_data",
        "data": {"top_products": [], "top_product": None, "scope": {"catalogue_skus": 0}},
        "warnings": ["No transaction data in database."],
    }

def get_forecast_data() -> Dict[str, Any]:
    valid_sales = _load_valid_sales()
    history = []
    forecast_points = []
    expected_growth_pct = None
    forecast_status = "pending_approval"
    model_name = "ARIMA(1,1,1)"
    reason = "Dynamic ARIMA(1,1,1) time-series model projection with confidence bounds."

    if valid_sales is not None and not valid_sales.empty and "order_date" in valid_sales.columns:
        valid_sales = valid_sales.copy()
        valid_sales["order_date"] = pd.to_datetime(valid_sales["order_date"], errors="coerce")
        valid_sales = valid_sales.dropna(subset=["order_date"])
        valid_sales["order_total_amount"] = pd.to_numeric(valid_sales["order_total_amount"], errors="coerce").fillna(0)
        valid_sales["period"] = valid_sales["order_date"].dt.to_period("M").astype(str)
        monthly = valid_sales.groupby("period")["order_total_amount"].sum().sort_index()

        for period, rev in monthly.items():
            history.append({
                "period": str(period),
                "revenue": round(float(rev) / 1_000_000, 2),
                "revenue_raw": round(float(rev), 2),
            })

        if len(monthly) >= 3:
            try:
                from statsmodels.tsa.arima.model import ARIMA
                values = monthly.values.astype(float)
                order = (1, 1, 1) if len(values) >= 5 else (1, 1, 0)
                model = ARIMA(values, order=order)
                fitted = model.fit()
                steps = 3
                forecast_res = fitted.get_forecast(steps=steps)
                fc_values = forecast_res.predicted_mean
                conf_int = forecast_res.conf_int()

                last_period_str = str(monthly.index[-1])
                last_dt = pd.to_datetime(last_period_str + "-01")

                for i in range(steps):
                    next_dt = last_dt + pd.DateOffset(months=i+1)
                    p_str = next_dt.strftime("%Y-%m")
                    pred_rev = max(0.0, float(fc_values[i]))
                    lower_b = max(0.0, float(conf_int[i, 0])) if conf_int is not None and len(conf_int) > i else pred_rev * 0.9
                    upper_b = max(pred_rev, float(conf_int[i, 1])) if conf_int is not None and len(conf_int) > i else pred_rev * 1.1

                    forecast_points.append({
                        "period": p_str,
                        "revenue": round(pred_rev / 1_000_000, 2),
                        "revenue_raw": round(pred_rev, 2),
                        "lower_bound": round(lower_b / 1_000_000, 2),
                        "upper_bound": round(upper_b / 1_000_000, 2),
                    })

                last_actual = float(values[-1])
                first_fc = float(fc_values[0])
                if last_actual > 0:
                    expected_growth_pct = round(((first_fc - last_actual) / last_actual) * 100.0, 1)
                forecast_status = "active"
                model_name = f"ARIMA{order}"
            except Exception as exc:
                logger.warning(f"ARIMA forecast fitting failed: {exc}")
                reason = f"ARIMA model fitting unavailable ({exc}). Forecast marked as pending."
                forecast_status = "unavailable"
        else:
            reason = "Minimum 3 historical monthly periods required for dynamic ARIMA forecasting."
            forecast_status = "insufficient_data"

    return {
        "status": "success",
        "data": {
            "model_name": model_name,
            "reason": reason,
            "forecast_status": forecast_status,
            "expected_growth_pct": expected_growth_pct,
            "history": history,
            "forecast": forecast_points,
            "scope": {
                "historical_periods": len(history),
                "forecast_steps": len(forecast_points),
            },
        },
    }

def get_decisions_data() -> Dict[str, Any]:
    alerts = []
    df_cust = execute_query("SELECT customer_id_stage, last_order_date, total_amount FROM customers")
    if df_cust is not None and not df_cust.empty and "last_order_date" in df_cust.columns:
        df_cust["last_order_date"] = pd.to_datetime(df_cust["last_order_date"], errors="coerce")
        cutoff = datetime.now() - timedelta(days=90)
        at_risk = df_cust[df_cust["last_order_date"] < cutoff]
        if not at_risk.empty:
            risk_count = int(len(at_risk))
            risk_revenue = float(pd.to_numeric(at_risk["total_amount"], errors="coerce").sum())
            alerts.append({
                "code": "CLIENT_RETENTION_RISK",
                "title": "At-Risk Accounts",
                "message": f"{risk_count} clients have had zero reorders in over 90 days, representing {risk_revenue:,.0f} DZD in historical revenue.",
                "severity": "danger",
                "count": risk_count,
            })

    df_neg = execute_query("SELECT COUNT(*) AS cnt FROM transactions WHERE has_negative_price IS TRUE")
        if neg_count > 0:
            alerts.append({
                "code": "NEGATIVE_PRICE_ANOMALY",
                "title": "Negative Price Records",
                "message": f"{neg_count} transaction lines contain negative unit prices — these may be returns or adjustments.",
                "severity": "warning",
                "count": neg_count,
            })

    df_wil = execute_query(
        "SELECT wilaya_normalized, SUM(order_total_amount) AS rev FROM orders "
        "GROUP BY wilaya_normalized ORDER BY rev DESC LIMIT 1"
    )
    if df_wil is not None and not df_wil.empty:
        total_rev_df = execute_query("SELECT SUM(order_total_amount) AS total FROM orders")
        if total_rev_df is not None and not total_rev_df.empty:
            top_rev = float(df_wil.iloc[0]["rev"])
            total_rev = float(total_rev_df.iloc[0]["total"])
            if total_rev > 0:
                share = top_rev / total_rev * 100
                if share > 30:
                    alerts.append({
                        "code": "REGIONAL_CONCENTRATION",
                        "title": "High Regional Concentration",
                        "message": f"{df_wil.iloc[0]['wilaya_normalized']} accounts for {share:.1f}% of total revenue. Consider expanding distribution.",
                        "severity": "info",
                        "count": 1,
                    })

    if not alerts:
        alerts.append({
            "code": "ALL_CLEAR",
            "title": "No Issues Detected",
            "message": "No factual alerts from the current data. Upload more data for deeper analysis.",
            "severity": "info",
            "count": 0,
        })

    return {"status": "success", "data": {"alerts": alerts}}

def get_overview_alerts() -> Dict[str, Any]:
    decisions = get_decisions_data()
    raw_alerts = decisions.get("data", {}).get("alerts", [])

    formatted = []
    for i, alert in enumerate(raw_alerts[:5]):
        formatted.append({
            "id": i + 1,
            "code": alert.get("code", "UNKNOWN"),
            "title": alert.get("title", "Alert"),
            "message": alert.get("message", ""),
            "severity": alert.get("severity", "info"),
            "value": alert.get("count", 0),
            "unit": "items",
            "observed_at": datetime.now().strftime("%Y-%m-%dT%H:%M:%S"),
            "priority": alert.get("severity") in ("danger", "warning"),
        })

    return {"status": "success", "data": {"alerts": formatted}}

def get_customer_behavior_data() -> Dict[str, Any]:
    try:
        try:
            from .ga4_service import get_customer_behavior_data as ga4_get_data
        except ImportError:
            from ga4_service import get_customer_behavior_data as ga4_get_data
        return ga4_get_data()
    except Exception as exc:
        logger.warning(f"GA4 service unavailable: {exc}")
        return {
            "status": "no_data",
            "data": {
                "total_visitors": 0, "total_sessions": 0, "bounce_rate": 0,
                "avg_session_duration": "0m 0s", "pages_per_session": 0,
                "conversion_rate": 0, "channels": [], "devices": [],
                "top_pages": [], "geographic_traffic": [],
            },
            "warnings": ["GA4 service unavailable."],
        }

def search_platform(query: str, limit: int = 15) -> Dict[str, Any]:
    q = (query or "").strip()
    if not q:
        return {
            "status": "success",
            "query": "",
            "total_matches": 0,
            "results": [],
        }

    q_lower = q.lower()
    q_wildcard = f"%{q}%"
    results = []

    pages = [
        {"id": "overview", "title": "Overview & Executive Dashboard", "title_fr": "Vue d'ensemble & Tableau de bord", "description": "High-level revenue, orders, growth rate, and top performance metrics", "description_fr": "Revenu global, commandes, taux de croissance et indicateurs clés", "tab": "overview", "badge": "Page"},
        {"id": "sales", "title": "Sales Intelligence", "title_fr": "Intelligence des Ventes", "description": "Revenue trends, payment channels, monthly breakdown, and customer type mix", "description_fr": "Tendances de revenus, canaux de paiement, évolution mensuelle et types de clients", "tab": "sales", "badge": "Page"},
        {"id": "clients", "title": "Client Intelligence & RFM", "title_fr": "Intelligence Clients & RFM", "description": "Account segments, B2B vs B2C, purchase frequency, and churn risk", "description_fr": "Segments de comptes, B2B vs B2C, fréquence d'achat et risque de churn", "tab": "clients", "badge": "Page"},
        {"id": "wilayas", "title": "Wilaya Intelligence", "title_fr": "Intelligence des Wilayas", "description": "Geographic map of Algeria, 58 wilayas performance, regional revenue and rankings", "description_fr": "Carte géographique d'Algérie, performance des 58 wilayas, revenus et classements", "tab": "wilayas", "badge": "Page"},
        {"id": "behavior", "title": "Customer Behavior (GA4)", "title_fr": "Comportement Client (GA4)", "description": "Google Analytics 4 web traffic, digital acquisition channels, devices and product views", "description_fr": "Trafic web GA4, canaux d'acquisition, appareils et pages produits vues", "tab": "behavior", "badge": "Page"},
        {"id": "products", "title": "Products & Demand Forecast", "title_fr": "Produits & Prévision de Demande", "description": "Catalog catalog, sales velocity, SKU stock levels, and predictive forecasts", "description_fr": "Catalogue, vélocité des ventes, niveaux de stock SKU et prévisions", "tab": "products", "badge": "Page"},
        {"id": "alerts", "title": "Actions & Quality Alerts", "title_fr": "Actions & Alertes Qualité", "description": "Data quality issues, inactive accounts, negative price records, and AI actions", "description_fr": "Qualité des données, comptes inactifs, prix négatifs et alertes IA", "tab": "alerts", "badge": "Page"},
        {"id": "upload", "title": "Data Upload Pipeline", "title_fr": "Import des Données & Pipeline", "description": "Upload CSV/Excel datasets, data cleaning, validation, and database updates", "description_fr": "Importation de jeux de données CSV/Excel, nettoyage, validation et mise à jour", "tab": "upload", "badge": "Page"},
    ]

    for p in pages:
        combined = f"{p['title']} {p['title_fr']} {p['description']} {p['description_fr']} {p['tab']}".lower()
        if q_lower in combined:
            results.append({
                "type": "navigation",
                "id": p["id"],
                "title": p["title"],
                "title_fr": p["title_fr"],
                "subtitle": p["description"],
                "subtitle_fr": p["description_fr"],
                "badge": p["badge"],
                "tab": p["tab"],
                "selection": None,
            })

    try:
        from .database import engine
    except ImportError:
        from database import engine

    try:
        with engine.connect() as conn:
            wilaya_matches = [w for w in ALGERIA_WILAYAS_GEO if q_lower in w["label"].lower() or q_lower in w["id"]]
            if wilaya_matches:
                for w in wilaya_matches[:5]:
                    w_name = w["label"]
                    w_id = w["id"]
                    try:
                        row = conn.execute(
                            text("SELECT count(*), sum(order_total_amount) FROM orders WHERE lower(wilaya_normalized) = lower(:w)"),
                            {"w": w_name}
                        ).fetchone()
                        orders_count = row[0] if row and row[0] else 0
                        revenue = float(row[1]) if row and row[1] else 0.0
                        rev_formatted = f"{(revenue / 1_000_000):.2f}M DZD" if revenue >= 1_000_000 else f"{revenue:,.0f} DZD"
                        subtitle = f"Wilaya {w_id} · {orders_count} orders · {rev_formatted}"
                        subtitle_fr = f"Wilaya {w_id} · {orders_count} commandes · {rev_formatted}"
                    except Exception:
                        subtitle = f"Wilaya {w_id} · Geographic Boundary"
                        subtitle_fr = f"Wilaya {w_id} · Limite Géographique"

                    results.append({
                        "type": "wilaya",
                        "id": w_id,
                        "title": w_name,
                        "title_fr": w_name,
                        "subtitle": subtitle,
                        "subtitle_fr": subtitle_fr,
                        "badge": "Wilaya",
                        "tab": "wilayas",
                        "selection": w_name,
                        "details": {
                            "Wilaya Code": w_id,
                            "Wilaya Name": w_name,
                            "Recorded Orders": orders_count,
                            "Realized Revenue": rev_formatted,
                        },
                        "approved_metrics": {
                            "revenue_m_da": round(revenue / 1_000_000, 2) if revenue >= 1_000_000 else None,
                            "revenue": rev_formatted,
                            "orders": orders_count,
                            "wilaya": w_name,
                        },
                    })

            try:
                cust_rows = conn.execute(
                    text("""
                        SELECT customer_id_stage, customer_type_inferred, wilaya, orders_count, total_amount
                        FROM customers
                        WHERE lower(customer_id_stage) LIKE lower(:q)
                           OR lower(wilaya) LIKE lower(:q)
                           OR lower(customer_type_inferred) LIKE lower(:q)
                        LIMIT 6
                    """),
                    {"q": q_wildcard}
                ).fetchall()

                for r in cust_rows:
                    cid = str(r[0])
                    ctype = str(r[1] or "Client")
                    cwilaya = str(r[2] or "")
                    ocount = int(r[3] or 0)
                    tot = float(r[4] or 0.0)
                    tot_formatted = f"{(tot / 1_000_000):.2f}M DZD" if tot >= 1_000_000 else f"{tot:,.0f} DZD"
                    loc = f" · {cwilaya}" if cwilaya else ""
                    results.append({
                        "type": "client",
                        "id": cid,
                        "title": f"Client {cid}",
                        "title_fr": f"Client {cid}",
                        "subtitle": f"{ctype}{loc} · {ocount} orders · {tot_formatted}",
                        "subtitle_fr": f"{ctype}{loc} · {ocount} commandes · {tot_formatted}",
                        "badge": ctype if ctype in ("B2B", "B2C") else "Client",
                        "tab": "clients",
                        "selection": cid,
                        "details": {
                            "Client ID": cid,
                            "Customer Type": ctype,
                            "Wilaya": cwilaya or "Algeria",
                            "Total Orders": ocount,
                            "Total Spend": tot_formatted,
                        },
                        "approved_metrics": {
                            "revenue_m_da": round(tot / 1_000_000, 2) if tot >= 1_000_000 else None,
                            "revenue": tot_formatted,
                            "orders": ocount,
                            "client_id": cid,
                            "segment": ctype,
                        },
                    })
            except Exception:
                pass

            try:
                prod_rows = conn.execute(
                    text("""
                        SELECT sku, product_name, category, subcategory, unit_price
                        FROM catalogue
                        WHERE lower(sku) LIKE lower(:q)
                           OR lower(product_name) LIKE lower(:q)
                           OR lower(category) LIKE lower(:q)
                           OR lower(subcategory) LIKE lower(:q)
                        LIMIT 6
                    """),
                    {"q": q_wildcard}
                ).fetchall()

                found_skus = set()
                for r in prod_rows:
                    sku_code = str(r[0])
                    found_skus.add(sku_code)
                    pname = str(r[1] or sku_code)
                    pcat = str(r[2] or "Product")
                    price = float(r[4] or 0.0)
                    price_fmt = f"{price:,.0f} DZD"
                    results.append({
                        "type": "product",
                        "id": sku_code,
                        "title": pname,
                        "title_fr": pname,
                        "subtitle": f"SKU: {sku_code} · {pcat} · {price_fmt}",
                        "subtitle_fr": f"SKU: {sku_code} · {pcat} · {price_fmt}",
                        "badge": pcat if len(pcat) <= 14 else "Product",
                        "tab": "products",
                        "selection": sku_code,
                        "details": {
                            "SKU": sku_code,
                            "Product Name": pname,
                            "Category": pcat,
                            "Unit Price": price_fmt,
                        },
                        "approved_metrics": {
                            "revenue": price_fmt,
                            "sku": sku_code,
                            "category": pcat,
                            "unit_price": price,
                        },
                    })

                if len(results) < limit:
                    tx_prod_rows = conn.execute(
                        text("""
                            SELECT sku, product_name, category, subcategory, unit_price
                            FROM transactions
                            WHERE (lower(sku) LIKE lower(:q)
                                OR lower(product_name) LIKE lower(:q)
                                OR lower(category) LIKE lower(:q)
                                OR lower(subcategory) LIKE lower(:q))
                            GROUP BY sku, product_name
                            LIMIT 6
                        """),
                        {"q": q_wildcard}
                    ).fetchall()

                    for r in tx_prod_rows:
                        sku_code = str(r[0])
                        if sku_code in found_skus:
                            continue
                        found_skus.add(sku_code)
                        pname = str(r[1] or sku_code)
                        pcat = str(r[2] or "Product")
                        price = float(r[4] or 0.0)
                        price_fmt = f"{price:,.0f} DZD"
                        results.append({
                            "type": "product",
                            "id": sku_code,
                            "title": pname,
                            "title_fr": pname,
                            "subtitle": f"SKU: {sku_code} · {pcat} · {price_fmt}",
                            "subtitle_fr": f"SKU: {sku_code} · {pcat} · {price_fmt}",
                            "badge": pcat if len(pcat) <= 14 else "Product",
                            "tab": "products",
                            "selection": sku_code,
                            "details": {
                                "SKU": sku_code,
                                "Product Name": pname,
                                "Category": pcat,
                                "Unit Price": price_fmt,
                            },
                            "approved_metrics": {
                                "revenue": price_fmt,
                                "sku": sku_code,
                                "category": pcat,
                                "unit_price": price,
                            },
                        })
            except Exception:
                pass

    except Exception as exc:
        logger.warning(f"Database search failed: {exc}")

    return {
        "status": "success",
        "query": q,
        "total_matches": len(results),
        "results": results[:limit],
    }
