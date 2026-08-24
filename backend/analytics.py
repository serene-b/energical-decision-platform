import calendar
import re
import unicodedata
from datetime import date, datetime, timedelta, timezone
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import text
from sqlalchemy.orm import Session

from database import get_db


router = APIRouter(prefix="/api/v1/analytics", tags=["analytics"])
COMPLETED_STATUS = "Terminée"
WILAYA_CODES = {
    "adrar": "01", "chlef": "02", "laghouat": "03", "oum el bouaghi": "04",
    "batna": "05", "bejaia": "06", "biskra": "07", "bechar": "08",
    "blida": "09", "bouira": "10", "tamanrasset": "11", "tebessa": "12",
    "tlemcen": "13", "tiaret": "14", "tizi ouzou": "15", "alger": "16",
    "djelfa": "17", "jijel": "18", "setif": "19", "saida": "20",
    "skikda": "21", "sidi bel abbes": "22", "annaba": "23", "guelma": "24",
    "constantine": "25", "medea": "26", "mostaganem": "27", "msila": "28",
    "mascara": "29", "ouargla": "30", "oran": "31", "el bayadh": "32",
    "illizi": "33", "bordj bou arreridj": "34", "boumerdes": "35", "el tarf": "36",
    "tindouf": "37", "tissemsilt": "38", "el oued": "39", "khenchela": "40",
    "souk ahras": "41", "tipaza": "42", "mila": "43", "ain defla": "44",
    "naama": "45", "ain temouchent": "46", "ghardaia": "47", "relizane": "48",
}
WILAYA_COORDINATES = {
    "01": (27.87, -0.29), "02": (36.17, 1.33), "03": (33.80, 2.87), "04": (35.88, 7.11),
    "05": (35.56, 6.17), "06": (36.75, 5.06), "07": (34.85, 5.73), "08": (31.62, -2.22),
    "09": (36.47, 2.83), "10": (36.37, 3.90), "11": (22.79, 5.52), "12": (35.40, 8.12),
    "13": (34.88, -1.32), "14": (35.37, 1.32), "15": (36.71, 4.05), "16": (36.75, 3.06),
    "17": (34.67, 3.26), "18": (36.82, 5.77), "19": (36.19, 5.41), "20": (34.83, 0.15),
    "21": (36.88, 6.91), "22": (35.19, -0.63), "23": (36.90, 7.77), "24": (36.46, 7.43),
    "25": (36.37, 6.61), "26": (36.26, 2.75), "27": (35.93, 0.09), "28": (35.71, 4.54),
    "29": (35.40, 0.14), "30": (31.95, 5.32), "31": (35.70, -0.63), "32": (33.68, 1.02),
    "33": (26.48, 8.47), "34": (36.07, 4.76), "35": (36.76, 3.47), "36": (36.77, 8.31),
    "37": (27.67, -8.15), "38": (35.61, 1.81), "39": (33.37, 6.87), "40": (35.43, 7.14),
    "41": (36.29, 7.95), "42": (36.59, 2.45), "43": (36.45, 6.26), "44": (36.26, 1.97),
    "45": (33.27, -0.31), "46": (35.30, -1.14), "47": (32.49, 3.67), "48": (35.74, 0.56),
}


def _response(analytics_payload, scope=None, warnings=None):
    return {
        "status": "ok",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "data": analytics_payload,
        "scope": scope or {},
        "warnings": warnings or [],
    }


def _scope(db):
    counts = db.execute(text("""
        SELECT
            COUNT(*) AS orders,
            COUNT(*) FILTER (WHERE order_status = :completed_status) AS realized_orders,
            (SELECT COUNT(*) FROM customers) AS customers,
            (SELECT COUNT(*) FROM catalogue) AS catalogue,
            (SELECT COUNT(*) FROM transactions) AS transactions
        FROM orders
    """), {"completed_status": COMPLETED_STATUS}).mappings().one()
    return {
        "run_id": None,
        "datasets": ["customers", "catalogue", "orders", "transactions"],
        "rows_used": dict(counts),
        "notes": ["Revenue includes completed orders only."],
    }


def _summary(db):
    return db.execute(text("""
        SELECT
            COALESCE(SUM(order_total_amount), 0) AS revenue,
            COUNT(*) AS orders,
            COALESCE(AVG(order_total_amount), 0) AS average_basket,
            COUNT(DISTINCT customer_id_stage) AS clients,
            MIN(order_date)::date AS period_start,
            MAX(order_date)::date AS period_end
        FROM orders
        WHERE order_status = :completed_status
    """), {"completed_status": COMPLETED_STATUS}).mappings().one()


def _trend_rows(db, granularity, start_date=None, end_date=None):
    period = {"daily": "day", "weekly": "week", "monthly": "month"}[granularity]
    rows = db.execute(text("""
        SELECT
            DATE_TRUNC(:period, order_date)::date AS period,
            COALESCE(SUM(order_total_amount), 0) AS revenue,
            COUNT(*) AS orders
        FROM orders
        WHERE order_status = :completed_status
          AND order_date::date >= COALESCE(CAST(:start_date AS date), '-infinity'::date)
          AND order_date::date <= COALESCE(CAST(:end_date AS date), 'infinity'::date)
        GROUP BY 1
        ORDER BY 1
    """), {
        "period": period,
        "completed_status": COMPLETED_STATUS,
        "start_date": start_date,
        "end_date": end_date,
    }).mappings().all()
    data_through = _summary(db)["period_end"]
    return [
        {**dict(row), "is_partial": _is_partial(row["period"], data_through, granularity)}
        for row in rows
    ]


def _is_partial(period, data_through, granularity):
    if not data_through:
        return False
    if granularity == "daily":
        period_end = period
    elif granularity == "weekly":
        period_end = period + timedelta(days=6)
    else:
        period_end = period.replace(day=calendar.monthrange(period.year, period.month)[1])
    return period_end > data_through


def _growth_pct(trend):
    if len(trend) < 2 or not trend[-2]["revenue"]:
        return None
    return round((trend[-1]["revenue"] - trend[-2]["revenue"]) * 100 / trend[-2]["revenue"], 1)


def _breakdown(db, dimension):
    return [dict(row) for row in db.execute(text("""
        SELECT COALESCE(
                   CASE :dimension
                       WHEN 'customer_type' THEN customer_type_inferred
                       WHEN 'payment_method' THEN payment_method_group
                   END,
                   'Unknown'
               ) AS label,
               COALESCE(SUM(order_total_amount), 0) AS revenue,
               COUNT(*) AS orders
        FROM orders
        WHERE order_status = :completed_status
        GROUP BY 1
        ORDER BY revenue DESC
    """), {
        "completed_status": COMPLETED_STATUS,
        "dimension": dimension,
    }).mappings()]


def _analytics_alerts(db):
    counts = db.execute(text("""
        SELECT
            COUNT(*) FILTER (WHERE order_status = 'En cours') AS open_orders,
            COUNT(*) FILTER (WHERE wilaya_normalized IS NULL OR BTRIM(wilaya_normalized) = '') AS missing_wilaya,
            (SELECT COUNT(*) FROM transactions WHERE sku IS NULL OR sku_quality IS DISTINCT FROM 'ok') AS product_review
        FROM orders
    """)).mappings().one()
    definitions = (
        ("open_orders", "info", "Orders in progress", "Orders are not included in realized revenue yet."),
        ("missing_wilaya", "warning", "Missing normalized wilaya", "Orders cannot be assigned to a verified wilaya."),
        ("product_review", "warning", "Product matches need review", "Transaction rows do not have a verified SKU match."),
    )
    return [
        {"code": code, "severity": severity, "title": title, "message": message, "count": counts[code]}
        for code, severity, title, message in definitions if counts[code]
    ]


@router.get("/overview")
def overview(db: Session = Depends(get_db)):
    summary = dict(_summary(db))
    summary["growth_pct"] = _growth_pct(_trend_rows(db, "monthly"))
    return _response(summary, _scope(db))


@router.get("/overview/revenue-trend")
def overview_revenue_trend(
    granularity: Literal["daily", "weekly", "monthly"] = "monthly",
    start_date: date | None = None,
    end_date: date | None = None,
    db: Session = Depends(get_db),
):
    available = _summary(db)
    range_start = start_date or available["period_start"]
    range_end = end_date or available["period_end"]
    if range_start and range_end and range_start > range_end:
        raise HTTPException(422, "start_date must be on or before end_date")
    trend = _trend_rows(db, granularity, range_start, range_end)
    trend_payload = {
        "granularity": granularity,
        "available_start": available["period_start"],
        "available_end": available["period_end"],
        "range_start": range_start,
        "range_end": range_end,
        "data_through": available["period_end"],
        "partial_periods": [row["period"] for row in trend if row["is_partial"]],
        "trend": trend,
    }
    return _response(trend_payload, _scope(db))


@router.get("/sales")
def sales(db: Session = Depends(get_db)):
    summary = dict(_summary(db))
    trend = _trend_rows(db, "monthly")
    sales_payload = {
        "total_revenue": summary["revenue"],
        "total_orders": summary["orders"],
        "average_basket": summary["average_basket"],
        "growth_pct": _growth_pct(trend),
        "period_start": summary["period_start"],
        "period_end": summary["period_end"],
        "partial_months": [row["period"] for row in trend if row["is_partial"]],
        "trend": trend,
        "customer_types": _breakdown(db, "customer_type"),
        "payment_methods": _breakdown(db, "payment_method"),
        "delivery_methods": [],
    }
    scope = _scope(db)
    scope["notes"].append("Delivery method is not present in the imported orders schema.")
    return _response(sales_payload, scope)


@router.get("/clients")
def clients(db: Session = Depends(get_db)):
    customer_types = db.execute(text("""
        SELECT COALESCE(customer_type_inferred, 'Unknown') AS label,
               COUNT(*) AS customers,
               COALESCE(SUM(total_amount), 0) AS revenue,
               COALESCE(SUM(orders_count), 0) AS orders
        FROM customers GROUP BY 1 ORDER BY customers DESC
    """)).mappings().all()
    wilayas = db.execute(text("""
        SELECT COALESCE(wilaya, 'Unknown') AS label, COUNT(*) AS customers
        FROM customers GROUP BY 1 ORDER BY customers DESC
    """)).mappings().all()
    recency = db.execute(text("""
        WITH reference AS (SELECT MAX(last_order_date) AS reference_date FROM customers)
        SELECT reference.reference_date,
               MIN(reference.reference_date - customers.last_order_date) AS recency_days_min,
               MAX(reference.reference_date - customers.last_order_date) AS recency_days_max
        FROM customers CROSS JOIN reference
        GROUP BY reference.reference_date
    """)).mappings().first()
    client_payload = {
        "total_clients": sum(row["customers"] for row in customer_types),
        "customer_types": [dict(row) for row in customer_types],
        "wilaya_distribution": [dict(row) for row in wilayas],
        "rfm": {
            **(dict(recency) if recency else {}),
            "frequency_field": "orders_count",
            "monetary_field": "total_amount",
        },
    }
    return _response(client_payload, _scope(db))


def _normalized_wilaya(name):
    plain = unicodedata.normalize("NFKD", name or "").encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", " ", plain.lower()).strip()


@router.get("/wilayas")
def wilayas(db: Session = Depends(get_db)):
    totals = db.execute(text("""
        SELECT wilaya_normalized AS label,
               COALESCE(SUM(order_total_amount), 0) AS revenue,
               COUNT(*) AS orders,
               COUNT(DISTINCT customer_id_stage) AS clients
        FROM orders
        WHERE order_status = :completed_status AND wilaya_normalized IS NOT NULL
        GROUP BY 1 ORDER BY revenue DESC
    """), {"completed_status": COMPLETED_STATUS}).mappings().all()
    grand_total = sum(row["revenue"] for row in totals)
    wilaya_metrics = []
    for row in totals:
        code = WILAYA_CODES.get(_normalized_wilaya(row["label"]))
        latitude, longitude = WILAYA_COORDINATES.get(code, (None, None))
        wilaya_metrics.append({
            **dict(row),
            "id": code,
            "share": round(row["revenue"] * 100 / grand_total, 2) if grand_total else 0,
            "growth": None,
            "latitude": latitude,
            "longitude": longitude,
            "geography_status": "valid_wilaya" if code else "unmapped",
        })
    wilaya_payload = {
        "active_wilayas": sum(row["geography_status"] == "valid_wilaya" for row in wilaya_metrics),
        "wilayas": wilaya_metrics,
    }
    return _response(wilaya_payload, _scope(db))


def _top_products(db, limit=10):
    return [dict(row) for row in db.execute(text("""
        SELECT COALESCE(NULLIF(t.product_name, ''), t.sku, 'Unknown') AS label,
               t.sku,
               COALESCE(SUM(t.line_total), 0) AS revenue,
               COALESCE(SUM(t.quantity), 0) AS units,
               COUNT(DISTINCT t.order_id_stage) AS orders
        FROM transactions t
        JOIN orders o ON o.order_id_stage = t.order_id_stage
        WHERE o.order_status = :completed_status
        GROUP BY t.sku, COALESCE(NULLIF(t.product_name, ''), t.sku, 'Unknown')
        ORDER BY revenue DESC
        LIMIT :limit
    """), {"completed_status": COMPLETED_STATUS, "limit": limit}).mappings()]


@router.get("/overview-product")
def overview_product(db: Session = Depends(get_db)):
    products = _top_products(db, 1)
    return _response({"top_product": products[0] if products else None}, _scope(db))


@router.get("/products")
def products(db: Session = Depends(get_db)):
    return _response({"top_products": _top_products(db)}, _scope(db))


@router.get("/forecast")
def forecast(db: Session = Depends(get_db)):
    history = _trend_rows(db, "monthly")
    forecast_payload = {
        "reason": "Forecast model selection is pending approval.",
        "history": history,
    }
    return _response(
        forecast_payload,
        _scope(db),
        ["Historical data is available; no forecast is presented as approved truth."],
    )


@router.get("/overview-alerts")
def overview_alerts(db: Session = Depends(get_db)):
    return _response({"alerts": _analytics_alerts(db)}, _scope(db))


@router.get("/decisions")
def decisions(db: Session = Depends(get_db)):
    return _response({"alerts": _analytics_alerts(db)}, _scope(db))
