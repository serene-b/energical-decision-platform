from .health import router as health_router
from .pipeline import router as pipeline_router
from .analytics import router as analytics_router
from .ga4 import router as ga4_router
from .assistant import router as assistant_router

__all__ = [
    "health_router",
    "pipeline_router",
    "analytics_router",
    "ga4_router",
    "assistant_router",
]
