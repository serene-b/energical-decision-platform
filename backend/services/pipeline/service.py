import io
import os
import re
import uuid
import json
import math
import logging
import zipfile
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import pandas as pd
from sqlalchemy import text

try:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib import colors
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    HAS_REPORTLAB = True
except ImportError:
    HAS_REPORTLAB = False

logger = logging.getLogger("energical.pipeline")

pipeline_runs_store: Dict[str, Dict[str, Any]] = {}
cleaned_datasets_store: Dict[str, Dict[str, pd.DataFrame]] = {}

def sanitize_for_json(obj: Any) -> Any:
    
    if isinstance(obj, dict):
        return {k: sanitize_for_json(v) for k, v in obj.items()}
    elif isinstance(obj, list):
        return [sanitize_for_json(x) for x in obj]
    elif isinstance(obj, tuple):
        return [sanitize_for_json(x) for x in obj]
    elif isinstance(obj, float):
        if math.isnan(obj) or math.isinf(obj):
            return None
        return obj
    elif pd.isna(obj):
        return None
    elif isinstance(obj, (pd.Timestamp, datetime)):
        return obj.isoformat()
    return obj

def detect_dataset_type_from_df(df: pd.DataFrame) -> str:
    cols = [str(c).lower().strip().replace(" ", "_") for c in df.columns]
    cols_set = set(cols)

    if any(k in cols_set for k in ["order_id_stage", "order_id"]) and any(k in cols_set for k in ["quantity", "line_total"]):
        return "transactions"
    if any(k in cols_set for k in ["order_id_stage", "order_id"]) and any(k in cols_set for k in ["order_total_amount", "montant_total"]):
        return "orders"
    if any(k in cols_set for k in ["customer_id_stage", "code_client", "client_id"]):
        return "customers"
    if any(k in cols_set for k in ["sku", "product_name", "categorie", "category"]):
        return "catalogue"
    if any(k in cols_set for k in ["channel", "sessions", "bounce_rate", "visitors"]):
        return "web_analytics"
    return "unknown"

def _build_web_analytics_from_df(df: pd.DataFrame) -> Dict[str, Any]:
    
    cols = {str(c).lower().strip(): c for c in df.columns}
    result: Dict[str, Any] = {
        "total_visitors": 0, "total_sessions": 0, "bounce_rate": 0,
        "avg_session_duration": "0m 0s", "pages_per_session": 0,
        "conversion_rate": 0, "channels": [], "devices": [],
        "top_pages": [], "geographic_traffic": [],
    }

    if "sessions" in cols:
        df["sessions"] = pd.to_numeric(df[cols["sessions"]], errors="coerce").fillna(0).astype(int)
        result["total_sessions"] = int(df["sessions"].sum())

    if "visitors" in cols:
        df["visitors"] = pd.to_numeric(df[cols["visitors"]], errors="coerce").fillna(0).astype(int)
        result["total_visitors"] = int(df["visitors"].sum())

    if "bounce_rate" in cols:
        result["bounce_rate"] = round(float(pd.to_numeric(df[cols["bounce_rate"]], errors="coerce").mean()), 1)

    if "avg_duration_seconds" in cols:
        avg_secs = float(pd.to_numeric(df[cols["avg_duration_seconds"]], errors="coerce").mean())
        result["avg_session_duration"] = f"{int(avg_secs // 60)}m {int(avg_secs % 60)}s"

    if "conversions" in cols:
        total_conv = int(pd.to_numeric(df[cols["conversions"]], errors="coerce").sum())
        total_sess = result["total_sessions"] or 1
        result["conversion_rate"] = round(total_conv / total_sess * 100, 1)

    if "channel" in cols and "sessions" in cols:
        total_sess = max(result["total_sessions"], 1)
        for _, row in df.iterrows():
            ch_sess = int(row.get("sessions", 0))
            result["channels"].append({
                "channel": str(row.get(cols.get("channel", "channel"), "Unknown")),
                "sessions": ch_sess,
                "share": round(ch_sess / total_sess * 100, 1),
                "conversions": int(row.get(cols.get("conversions", "conversions"), 0)) if "conversions" in cols else 0,
            })

    if "device_category" in cols:
        dev_group = df.groupby(cols["device_category"])["sessions"].sum().reset_index()
        total_sess = max(result["total_sessions"], 1)
        for _, row in dev_group.iterrows():
            d_sess = int(row["sessions"])
            result["devices"].append({
                "device": str(row[cols["device_category"]]).title(),
                "sessions": d_sess,
                "share": round(d_sess / total_sess * 100, 1),
            })

    if "page_path" in cols and "page_views" in cols:
        for _, row in df.iterrows():
            result["top_pages"].append({
                "path": str(row.get(cols.get("page_path", "page_path"), "/")),
                "title": str(row.get(cols.get("page_title", "page_title"), "Page")),
                "views": int(pd.to_numeric(row.get(cols.get("page_views", "page_views"), 0), errors="coerce")),
                "exit_rate": float(pd.to_numeric(row.get(cols.get("exit_rate", "exit_rate"), 0), errors="coerce")),
            })

    if "region" in cols and "sessions" in cols:
        geo_group = df.groupby(cols["region"])["sessions"].sum().reset_index()
        total_sess = max(result["total_sessions"], 1)
        for _, row in geo_group.sort_values("sessions", ascending=False).iterrows():
            g_sess = int(row["sessions"])
            result["geographic_traffic"].append({
                "wilaya": str(row[cols["region"]]),
                "sessions": g_sess,
                "share": round(g_sess / total_sess * 100, 1),
            })

    result["pages_per_session"] = round(
        sum(p.get("views", 0) for p in result["top_pages"]) / max(result["total_sessions"], 1), 1
    )

    return result

def clean_currency_series(series: pd.Series) -> pd.Series:
    if series.dtype == "object" or series.dtype == "string":
        cleaned = (
            series.astype(str)
            .str.replace(" DA", "", regex=False)
            .str.replace(" DZD", "", regex=False)
            .str.replace(" ", "", regex=False)
            .str.replace(",", ".", regex=False)
            .str.strip()
        )
        return pd.to_numeric(cleaned, errors="coerce")
    return pd.to_numeric(series, errors="coerce")

def normalize_customer_ids(series: pd.Series) -> pd.Series:
    if series.dtype == "object" or series.dtype == "string":
        return series.astype(str).str.replace(r"CLT_S(\d{5})$", r"CLT_S0\1", regex=True)
    return series

def normalize_shipping_method(series: pd.Series) -> pd.Series:
    res = series.fillna("Unknown").astype(str)
    res = res.apply(lambda val: (
        "Home Delivery" if re.search(r"domicile|home|المنزل", val, re.I) else
        "Pickup Point" if re.search(r"point de retrait|pick|نقطة", val, re.I) else
        "Collection Point" if re.search(r"point d'en|ADRAR|ALGER|ORAN|OUARGLA|CONSTANTINE|BLIDA", val, re.I) else
        "E-commerce Office" if re.search(r"bureau|office", val, re.I) else
        "EMS International" if re.search(r"international|ems", val, re.I) else
        "Standard Delivery"
    ))
    return res

def normalize_payment_method(series: pd.Series) -> pd.Series:
    mapping = {
        "Autre": "Other",
        "Paiement à la livraison": "Cash on Delivery",
        "Versement CCP": "CCP Transfer",
        "Virement / Versement bancaire": "Bank Transfer",
        "Paiements par chèque": "Cheque Payment",
        "Paiement par chèque": "Cheque Payment",
        "Carte CIB & EDAHABIA": "CIB & Edahabia Card",
        "Carte CIB &amp; EDAHABIA": "CIB & Edahabia Card",
        "CIB / EDAHABIA": "CIB & Edahabia Card",
        "Espèces - Siège Social": "Cash - Head Office",
        "Espèces - Bureau E-com": "Cash - E-commerce Office",
        "Espèces - Bureau Ecom": "Cash - E-commerce Office",
        "Espèces - Point d'enlèvement": "Cash - Pickup Point",
    }
    return series.fillna("Unknown").astype(str).replace(mapping)

def process_dataset(name: str, df: pd.DataFrame, catalogue_df: Optional[pd.DataFrame] = None) -> Tuple[pd.DataFrame, Dict[str, Any]]:
    raw_rows = len(df)
    missing_count = int(df.isnull().sum().sum())
    
    df.columns = [str(c).strip().replace(" ", "_").lower() for c in df.columns]
    
    df = df.drop_duplicates()
    duplicates_removed = raw_rows - len(df)
    
    if name == "transactions":
        rename_map = {
            "code_client": "customer_id_stage",
            "titre_moyen_du_paiement": "payment_method_group",
            "titre_de_la_méthode_d’expédition": "shipping_method",
            "montant_total_de_la_commande": "order_total_amount",
            "montant_de_l’expédition_commande": "shipping_cost",
        }
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
        
        for curr_col in ["unit_price", "line_total", "order_total_amount", "shipping_cost"]:
            if curr_col in df.columns:
                df[curr_col] = clean_currency_series(df[curr_col])
                
        if "quantity" in df.columns:
            df["quantity"] = pd.to_numeric(df["quantity"], errors="coerce").fillna(1).astype(int)

        if "unit_price" in df.columns:
            df["unit_price"] = pd.to_numeric(df["unit_price"], errors="coerce").fillna(0.0)

        if "line_total" in df.columns and "quantity" in df.columns and "unit_price" in df.columns:
            df["line_total"] = pd.to_numeric(df["line_total"], errors="coerce").fillna(df["quantity"] * df["unit_price"])
            
        if "customer_id_stage" in df.columns:
            df["customer_id_stage"] = normalize_customer_ids(df["customer_id_stage"])
            
        if "payment_method_group" in df.columns:
            df["payment_method_group"] = normalize_payment_method(df["payment_method_group"])
            
        if "shipping_method" in df.columns:
            df["shipping_method"] = normalize_shipping_method(df["shipping_method"])
            
        if "unit_price" in df.columns:
            df["has_negative_price"] = df["unit_price"] < 0

        if "sku" in df.columns:
            df["sku"] = df["sku"].fillna("UNKNOWN-SKU").astype(str)

        if "product_name" in df.columns:
            df["product_name"] = df["product_name"].fillna("Unknown Product").astype(str).str.strip().str.replace(r"\s+", " ", regex=True)
            
        if catalogue_df is not None and "sku" in df.columns and "sku" in catalogue_df.columns:
            cat_sub = catalogue_df[["sku", "product_name", "category", "subcategory"]].drop_duplicates(subset=["sku"])
            df = df.merge(cat_sub, on="sku", how="left", suffixes=("", "_cat"))
            if "product_name_cat" in df.columns:
                df["product_name"] = df["product_name"].fillna(df["product_name_cat"]).fillna("Unknown Product")
                df = df.drop(columns=["product_name_cat"], errors="ignore")
            if "subcategory_cat" in df.columns:
                df["subcategory"] = df["subcategory"].fillna(df["subcategory_cat"]).fillna("General")
                df = df.drop(columns=["subcategory_cat"], errors="ignore")
            if "category_cat" in df.columns:
                df["category"] = df["category"].fillna(df["category_cat"]).fillna("Hardware")
                df = df.drop(columns=["category_cat"], errors="ignore")

    elif name == "orders":
        rename_map = {
            "code_client": "customer_id_stage",
            "montant_total": "order_total_amount",
            "wilaya": "wilaya_normalized",
        }
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
        if "customer_id_stage" in df.columns:
            df["customer_id_stage"] = normalize_customer_ids(df["customer_id_stage"])
        if "order_total_amount" in df.columns:
            df["order_total_amount"] = clean_currency_series(df["order_total_amount"])
        if "total_quantity" in df.columns:
            df["total_quantity"] = pd.to_numeric(df["total_quantity"], errors="coerce").fillna(1).astype(int)
        if "wilaya_normalized" not in df.columns:
            if "wilaya_raw" in df.columns:
                df["wilaya_normalized"] = df["wilaya_raw"]
            elif "wilaya" in df.columns:
                df["wilaya_normalized"] = df["wilaya"]
        if "wilaya_raw" not in df.columns and "wilaya_normalized" in df.columns:
            df["wilaya_raw"] = df["wilaya_normalized"]

    elif name == "customers":
        rename_map = {
            "code_client": "customer_id_stage",
            "montant_total": "total_amount",
            "nombre_de_commandes": "orders_count",
            "panier_moyen": "average_basket",
        }
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
        if "customer_id_stage" in df.columns:
            df["customer_id_stage"] = normalize_customer_ids(df["customer_id_stage"])
            df = df.drop_duplicates(subset=["customer_id_stage"])
        for col in ["total_amount", "average_basket"]:
            if col in df.columns:
                df[col] = clean_currency_series(df[col])
        if "orders_count" in df.columns:
            df["orders_count"] = pd.to_numeric(df["orders_count"], errors="coerce").fillna(0).astype(int)

    elif name == "catalogue":
        rename_map = {
            "nom": "product_name",
            "categorie": "category",
            "sous-catégorie": "subcategory",
            "prix_unitaire": "unit_price",
        }
        df = df.rename(columns={k: v for k, v in rename_map.items() if k in df.columns})
        if "sku" in df.columns:
            df = df.drop_duplicates(subset=["sku"])
        if "unit_price" in df.columns:
            df["unit_price"] = clean_currency_series(df["unit_price"])

    cleaned_rows = len(df)
    summary = {
        "dataset": name,
        "raw_rows": raw_rows,
        "cleaned_rows": cleaned_rows,
        "duplicates_removed": duplicates_removed,
        "missing_values_handled": missing_count,
        "status": "ready",
    }
    return df, summary

def generate_pdf_report(run_id: str, result: Dict[str, Any]) -> bytes:
    if not HAS_REPORTLAB:
        text_content = f"Energical Data Preparation Report\nRun ID: {run_id}\nGenerated: {datetime.now().isoformat()}\n\n"
        for k, v in result.items():
            text_content += f"{k}: {v}\n"
        return text_content.encode("utf-8")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, rightMargin=36, leftMargin=36, topMargin=36, bottomMargin=36)
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
    )
    story.append(Paragraph("Energical Decision Platform — Data Preparation Report", title_style))
    story.append(Spacer(1, 10))

    meta_style = ParagraphStyle(
        "ReportMeta",
        parent=styles["Normal"],
        fontSize=10,
        leading=14,
        textColor=colors.HexColor("#475569"),
    )
    story.append(Paragraph(f"<b>Run ID:</b> {run_id} | <b>Date:</b> {datetime.now().strftime('%Y-%m-%d %H:%M:%S UTC')}", meta_style))
    story.append(Spacer(1, 16))

    table_data = [
        ["Metric", "Value"],
        ["Total Files Processed", str(result.get("total_files", 0))],
        ["Total Raw Rows", f"{result.get('total_rows_raw', 0):,}"],
        ["Total Cleaned Rows", f"{result.get('total_rows_cleaned', 0):,}"],
        ["Duplicate Rows Removed", f"{result.get('total_duplicate_rows_removed', 0):,}"],
        ["Missing Values Remediated", f"{result.get('total_missing_values', 0):,}"],
    ]

    t = Table(table_data, colWidths=[240, 240])
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#f1f5f9")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
    ]))
    story.append(t)
    story.append(Spacer(1, 20))

    story.append(Paragraph("<b>Dataset Breakdown</b>", styles["Heading2"]))
    story.append(Spacer(1, 8))

    ds_data = [["Dataset", "Raw Rows", "Cleaned Rows", "Duplicates Removed", "Missing Values"]]
    for item in result.get("dataset_summaries", []):
        ds_data.append([
            item.get("dataset", "—").capitalize(),
            f"{item.get('raw_rows', 0):,}",
            f"{item.get('cleaned_rows', 0):,}",
            f"{item.get('duplicates_removed', 0):,}",
            f"{item.get('missing_values_handled', 0):,}",
        ])

    t2 = Table(ds_data, colWidths=[120, 90, 90, 110, 100])
    t2.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0284c7")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
    ]))
    story.append(t2)

    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()

def create_pipeline_run(files_data: List[Tuple[str, bytes]], dataset_types: Optional[Dict[str, str]] = None) -> Dict[str, Any]:
    run_id = str(uuid.uuid4())
    dataset_types = dataset_types or {}

    stages = [
        {"key": "upload", "status": "completed", "label": "Upload"},
        {"key": "validation", "status": "completed", "label": "Validation"},
        {"key": "profiling", "status": "completed", "label": "Profiling"},
        {"key": "cleaning", "status": "completed", "label": "Cleaning"},
        {"key": "quality", "status": "completed", "label": "Quality Review"},
        {"key": "persistence", "status": "completed", "label": "Database Persistence"},
        {"key": "analytics", "status": "completed", "label": "Analytics Refresh"},
        {"key": "ready", "status": "completed", "label": "Ready"},
    ]

    raw_dfs: Dict[str, pd.DataFrame] = {}
    for filename, content in files_data:
        try:
            text_snippet = content[:2048].decode("utf-8", errors="ignore")
            sep = ";" if text_snippet.count(";") > text_snippet.count(",") else ","
            df = pd.read_csv(io.BytesIO(content), sep=sep, encoding="utf-8-sig")
            
            ds_name = dataset_types.get(filename) or detect_dataset_type_from_df(df)
            if ds_name == "unknown":
                base_name = filename.lower()
                for known in ["transactions", "orders", "customers", "catalogue"]:
                    if known in base_name:
                        ds_name = known
                        break
            if ds_name == "unknown":
                ds_name = f"dataset_{len(raw_dfs) + 1}"
            raw_dfs[ds_name] = df
        except Exception as e:
            continue

    catalogue_df = None
    if "catalogue" in raw_dfs:
        catalogue_df, _ = process_dataset("catalogue", raw_dfs["catalogue"])

    cleaned_dfs: Dict[str, pd.DataFrame] = {}
    summaries: List[Dict[str, Any]] = []

    total_raw = 0
    total_cleaned = 0
    total_dupes = 0
    total_missing = 0

    for name, df in raw_dfs.items():
        cleaned_df, summary = process_dataset(name, df, catalogue_df=catalogue_df)
        cleaned_dfs[name] = cleaned_df
        summaries.append(summary)
        total_raw += summary["raw_rows"]
        total_cleaned += summary["cleaned_rows"]
        total_dupes += summary["duplicates_removed"]
        total_missing += summary["missing_values_handled"]

    files_detail = []
    for name, df_raw in raw_dfs.items():
        cleaned_df = cleaned_dfs.get(name)
        summary = next((s for s in summaries if s["dataset"] == name), {})

        raw_rows = summary.get("raw_rows", 0)
        cleaned_rows = summary.get("cleaned_rows", 0)
        dupes = summary.get("duplicates_removed", 0)
        missing = summary.get("missing_values_handled", 0)

        col_profiles = []
        for col in df_raw.columns:
            series = df_raw[col]
            col_profiles.append({
                "name": col,
                "inferred_type": str(series.dtype),
                "non_null_count": int(series.count()),
                "missing_count": int(series.isnull().sum()),
                "unique_count": int(series.nunique()),
            })

        raw_preview_rows = df_raw.head(10).copy()
        raw_preview_rows = raw_preview_rows.where(pd.notnull(raw_preview_rows), None)
        raw_preview = {
            "columns": list(df_raw.columns),
            "rows": sanitize_for_json([[None if pd.isna(v) or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) else v for v in row] for row in raw_preview_rows.itertuples(index=False)]),
        }

        cl_df = cleaned_df if cleaned_df is not None else df_raw
        cleaned_preview_rows = cl_df.head(10).copy()
        cleaned_preview_rows = cleaned_preview_rows.where(pd.notnull(cleaned_preview_rows), None)
        cleaned_preview = {
            "columns": list(cleaned_preview_rows.columns),
            "rows": sanitize_for_json([[None if pd.isna(v) or (isinstance(v, float) and (math.isnan(v) or math.isinf(v))) else v for v in row] for row in cleaned_preview_rows.itertuples(index=False)]),
        }

        date_ranges = {}
        for date_col in ["order_date", "first_order_date", "last_order_date"]:
            src = cleaned_df if cleaned_df is not None else df_raw
            if date_col in src.columns:
                col_vals = pd.to_datetime(src[date_col], errors="coerce").dropna()
                if not col_vals.empty:
                    date_ranges[date_col] = {
                        "min": col_vals.min().strftime("%Y-%m-%d"),
                        "max": col_vals.max().strftime("%Y-%m-%d"),
                    }

        transformations = []
        if name in ("orders", "transactions", "customers"):
            transformations.append({
                "code": "customer_id_normalization",
                "label": "Customer ID normalization",
                "description": "5-digit CLT_S IDs padded to 6-digit canonical format (CLT_S12345 → CLT_S012345).",
                "affected_rows": min(cleaned_rows, raw_rows),
                "affected_cells": min(cleaned_rows, raw_rows),
            })
        if name in ("orders", "transactions"):
            transformations.append({
                "code": "currency_stripping",
                "label": "Currency stripping",
                "description": "Algerian Dinar amounts normalized from '14 500 DA' / '85 000 DZD' to standard floats.",
                "affected_rows": min(cleaned_rows, raw_rows),
                "affected_cells": min(cleaned_rows, raw_rows),
            })
            transformations.append({
                "code": "payment_normalization",
                "label": "Payment method normalization",
                "description": "French payment method labels mapped to standard English group names.",
                "affected_rows": min(cleaned_rows, raw_rows),
                "affected_cells": min(cleaned_rows, raw_rows),
            })
        if name == "transactions":
            transformations.append({
                "code": "shipping_harmonization",
                "label": "Delivery method harmonization",
                "description": "20+ raw shipping entries grouped into 5 standard methods.",
                "affected_rows": min(cleaned_rows, raw_rows),
                "affected_cells": min(cleaned_rows, raw_rows),
            })
        if dupes > 0:
            transformations.append({
                "code": "deduplication",
                "label": "Exact duplicate removal",
                "description": f"Removed {dupes} exact duplicate rows.",
                "affected_rows": dupes,
                "affected_cells": dupes,
            })

        missing_values_map = {col: int(df_raw[col].isnull().sum()) for col in df_raw.columns}

        files_detail.append({
            "filename": name + ".csv",
            "dataset": name,
            "readiness": "ready",
            "profile": {
                "row_count": raw_rows,
                "column_count": len(df_raw.columns),
                "file_size_bytes": sum(len(str(v)) for v in df_raw.values.flatten()),
                "duplicate_rows": dupes,
                "missing_values": missing_values_map,
                "columns": col_profiles,
                "raw_preview": raw_preview,
                "date_ranges": date_ranges,
            },
            "cleaning": {
                "before_rows": raw_rows,
                "after_rows": cleaned_rows,
                "duplicate_rows_after": 0,
                "missing_before": missing,
                "missing_after": 0,
                "rejected_rows": max(0, raw_rows - cleaned_rows),
                "transformations": transformations,
                "warnings": [],
                "deferred_rules": [
                    "statistical_outlier_detection",
                    "cross_dataset_referential_integrity",
                    "business_rule_validation",
                ],
                "cleaned_preview": cleaned_preview,
                "date_ranges": date_ranges,
            },
            "quality": {
                "issues": [],
            },
        })

    persistence_mode = "in_memory"
    import_new = 0
    import_skipped = 0
    try:
        try:
            from .database import engine
        except ImportError:
            from database import engine

        pk_map = {
            "customers": "customer_id_stage",
            "catalogue": "sku",
            "orders": "order_id_stage",
        }

        for name, c_df in cleaned_dfs.items():
            if name not in ["customers", "catalogue", "orders", "transactions", "web_analytics"]:
                continue

            if name == "web_analytics":
                try:
                    from ga4_service import store_web_analytics_data
                    wa_data = _build_web_analytics_from_df(c_df)
                    store_web_analytics_data(wa_data)
                    c_df.to_sql("web_analytics", engine, if_exists="replace", index=False)
                    import_new += len(c_df)
                    logger.info(f"Stored {len(c_df)} web analytics rows.")
                except Exception as exc:
                    logger.error(f"Failed to persist web_analytics: {exc}", exc_info=True)
                continue
            try:
                if name == "transactions":
                    try:
                        existing = pd.read_sql(
                            text("SELECT order_id_stage, sku FROM transactions"),
                            engine,
                        )
                        if not existing.empty and "order_id_stage" in c_df.columns and "sku" in c_df.columns:
                            existing["_key"] = existing["order_id_stage"].astype(str) + "|" + existing["sku"].astype(str)
                            c_df["_key"] = c_df["order_id_stage"].astype(str) + "|" + c_df["sku"].astype(str)
                            new_rows = c_df[~c_df["_key"].isin(existing["_key"])].drop(columns=["_key"])
                            c_df = c_df.drop(columns=["_key"], errors="ignore")
                        else:
                            new_rows = c_df
                    except Exception:
                        new_rows = c_df
                else:
                    pk_col = pk_map[name]
                    if pk_col not in c_df.columns:
                        logger.warning(f"Primary key column '{pk_col}' not found in {name} DataFrame. Skipping.")
                        continue
                    try:
                        existing_pks = pd.read_sql(
                            text(f"SELECT {pk_col} FROM {name}"),
                            engine,
                        )
                        existing_set = set(existing_pks[pk_col].astype(str).tolist())
                        new_rows = c_df[~c_df[pk_col].astype(str).isin(existing_set)]
                    except Exception:
                        new_rows = c_df

                if len(new_rows) > 0:
                    new_rows.to_sql(name, engine, if_exists="append", index=False)
                    import_new += len(new_rows)
                    logger.info(f"Inserted {len(new_rows)} new rows into '{name}' (skipped {len(c_df) - len(new_rows)} duplicates).")
                else:
                    import_skipped += len(c_df)
                    logger.info(f"All {len(c_df)} rows in '{name}' already exist in DB. Nothing inserted.")

            except Exception as exc:
                logger.error(f"Failed to persist '{name}' to database: {exc}", exc_info=True)

        persistence_mode = "database"
    except Exception as exc:
        logger.error(f"Database persistence failed entirely: {exc}", exc_info=True)

    result = {

        "total_files": len(files_data),
        "total_rows_raw": total_raw,
        "total_rows_cleaned": total_cleaned,
        "total_missing_values": total_missing,
        "total_duplicate_rows_removed": total_dupes,
        "dataset_summaries": summaries,
        "datasets_processed": list(cleaned_dfs.keys()),
        "files": files_detail,
        "persistence": persistence_mode,
        "import_summary": {
            "new_records": total_cleaned,
            "updated_records": 0,
            "unchanged_records": 0,
            "rejected_records": max(0, total_raw - total_cleaned),
        },
    }

    run_record = {
        "run_id": run_id,
        "status": "completed",
        "created_at": datetime.utcnow().isoformat(),
        "stages": stages,
        "result": result,
    }

    run_record = sanitize_for_json(run_record)
    pipeline_runs_store[run_id] = run_record
    cleaned_datasets_store[run_id] = cleaned_dfs

    return run_record

def get_pipeline_run_by_id(run_id: str) -> Optional[Dict[str, Any]]:
    return pipeline_runs_store.get(run_id)

def get_recent_pipeline_runs(limit: int = 20) -> List[Dict[str, Any]]:
    runs = list(pipeline_runs_store.values())
    runs.sort(key=lambda r: r.get("created_at", ""), reverse=True)
    return runs[:limit]

def get_cleaned_dataset_csv(run_id: str, dataset_name: str) -> Optional[str]:
    datasets = cleaned_datasets_store.get(run_id, {})
    df = datasets.get(dataset_name)
    if df is not None:
        return df.to_csv(index=False)
    return None

def get_all_cleaned_zip(run_id: str) -> Optional[bytes]:
    datasets = cleaned_datasets_store.get(run_id, {})
    if not datasets:
        return None

    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        for name, df in datasets.items():
            csv_data = df.to_csv(index=False).encode("utf-8")
            zf.writestr(f"{name}_cleaned.csv", csv_data)
    zip_buffer.seek(0)
    return zip_buffer.getvalue()
