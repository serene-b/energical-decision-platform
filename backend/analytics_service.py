try:
    from .services.analytics.service import *
    from .services.analytics.service import (
        ALGERIA_WILAYAS_GEO,
        execute_query,
        _db_has_data,
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
except (ImportError, ValueError):
    from services.analytics.service import *
    from services.analytics.service import (
        ALGERIA_WILAYAS_GEO,
        execute_query,
        _db_has_data,
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
