import logging
from typing import Optional
from fastapi import APIRouter, Query

try:
    from ..services.analytics import (
        get_overview_data,
        get_revenue_trend,
        get_sales_data,
        get_clients_data,
        get_wilayas_data,
        get_products_data,
        get_forecast_data,
        get_decisions_data,
        get_overview_alerts,
        search_platform,
    )
    from ..services.ga4 import get_customer_behavior_data
except (ImportError, ValueError):
    try:
        from services.analytics import (
            get_overview_data,
            get_revenue_trend,
            get_sales_data,
            get_clients_data,
            get_wilayas_data,
            get_products_data,
            get_forecast_data,
            get_decisions_data,
            get_overview_alerts,
            search_platform,
        )
        from services.ga4 import get_customer_behavior_data
    except (ImportError, ValueError):
        from analytics_service import (
            get_overview_data,
            get_revenue_trend,
            get_sales_data,
            get_clients_data,
            get_wilayas_data,
            get_products_data,
            get_forecast_data,
            get_decisions_data,
            get_overview_alerts,
            search_platform,
        )
        from ga4_service import get_customer_behavior_data

logger = logging.getLogger("energical.routers.analytics")
router = APIRouter(prefix="/api/v1", tags=["analytics"])

@router.get("/analytics/overview")
async def analytics_overview():
    return get_overview_data()

@router.get("/analytics/overview/revenue-trend")
async def analytics_revenue_trend(
    granularity: str = Query("monthly", pattern="^(daily|weekly|monthly)$"),
    start_date: Optional[str] = Query(""),
    end_date: Optional[str] = Query(""),
):
    return get_revenue_trend(granularity=granularity, start_date=start_date, end_date=end_date)

@router.get("/analytics/sales")
async def analytics_sales():
    return get_sales_data()

@router.get("/analytics/clients")
async def analytics_clients():
    return get_clients_data()

@router.get("/analytics/customers")
async def analytics_customers():
    return get_customer_behavior_data()

@router.get("/analytics/wilayas")
async def analytics_wilayas():
    return get_wilayas_data()

@router.get("/analytics/products")
async def analytics_products():
    return get_products_data()

@router.get("/analytics/forecast")
async def analytics_forecast():
    return get_forecast_data()

@router.get("/analytics/decisions")
async def analytics_decisions():
    return get_decisions_data()

@router.get("/analytics/overview-alerts")
async def analytics_overview_alerts():
    return get_overview_alerts()

@router.get("/analytics/overview-product")
async def analytics_overview_product():
    products_data = get_products_data()
    tp = products_data.get("data", {}).get("top_product")
    return {
        "status": "success",
        "data": {
            "top_product": tp,
            **(tp if isinstance(tp, dict) else {}),
        },
    }

@router.get("/search")
async def search_endpoint(q: str = Query("", description="Search term across all entities"), limit: int = Query(15, ge=1, le=50)):
    return search_platform(q, limit)
