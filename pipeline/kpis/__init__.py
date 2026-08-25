"""Callable KPI logic and contract definitions for the Energical Decision Platform."""

from .contract import (
    get_db_engine,
    load_orders_from_db,
    load_transactions_from_db,
    load_customers_from_db,
    load_catalogue_from_db,
    load_web_analytics_from_db,
    REALIZED_SALES_STATUSES,
    is_realized_sale_status,
    get_realized_sales_mask,
    filter_realized_sales,
    filter_realized_transactions,
    calculate_total_revenue,
    calculate_total_orders,
    calculate_platform_aov,
    calculate_total_clients,
    calculate_sales_growth,
    KPI_CONTRACT_REGISTRY,
)
from .sales_intelligence import VALID_SALES_STATUSES

__all__ = [
    "get_db_engine",
    "load_orders_from_db",
    "load_transactions_from_db",
    "load_customers_from_db",
    "load_catalogue_from_db",
    "load_web_analytics_from_db",
    "REALIZED_SALES_STATUSES",
    "is_realized_sale_status",
    "get_realized_sales_mask",
    "filter_realized_sales",
    "filter_realized_transactions",
    "calculate_total_revenue",
    "calculate_total_orders",
    "calculate_platform_aov",
    "calculate_total_clients",
    "calculate_sales_growth",
    "KPI_CONTRACT_REGISTRY",
    "VALID_SALES_STATUSES",
]
