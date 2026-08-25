try:
    from .services.ga4.service import *
    from .services.ga4.service import (
        get_effective_ga4_credentials,
        test_ga4_connection,
        save_ga4_credentials,
        delete_ga4_credentials,
        get_ga4_status,
        store_web_analytics_data,
        get_customer_behavior_data,
        is_ga4_configured,
    )
except (ImportError, ValueError):
    from services.ga4.service import *
    from services.ga4.service import (
        get_effective_ga4_credentials,
        test_ga4_connection,
        save_ga4_credentials,
        delete_ga4_credentials,
        get_ga4_status,
        store_web_analytics_data,
        get_customer_behavior_data,
        is_ga4_configured,
    )
