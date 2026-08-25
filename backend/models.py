try:
    from .models.models import (
        Customer,
        Catalogue,
        Order,
        Transaction,
        IntegrationSetting,
    )
except (ImportError, ValueError):
    from models.models import (
        Customer,
        Catalogue,
        Order,
        Transaction,
        IntegrationSetting,
    )

__all__ = [
    "Customer",
    "Catalogue",
    "Order",
    "Transaction",
    "IntegrationSetting",
]
