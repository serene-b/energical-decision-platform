import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

try:
    from .core.config import ORIGINS, API_TITLE, API_VERSION
    from .core.database import init_db
    from .routers import (
        health_router,
        pipeline_router,
        analytics_router,
        ga4_router,
        assistant_router,
    )
except (ImportError, ValueError):
    from core.config import ORIGINS, API_TITLE, API_VERSION
    from core.database import init_db
    from routers import (
        health_router,
        pipeline_router,
        analytics_router,
        ga4_router,
        assistant_router,
    )

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("energical.api")

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing database tables...")
    init_db()
    yield

app = FastAPI(
    title=API_TITLE,
    version=API_VERSION,
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ORIGINS if ORIGINS else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    return response

@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error": {
                "code": "http_error",
                "message": exc.detail,
                "status": exc.status_code,
            }
        },
    )

@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error processing {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": {
                "code": "internal_error",
                "message": "An internal server error occurred while processing the request.",
                "status": 500,
            }
        },
    )

app.include_router(health_router)
app.include_router(pipeline_router)
app.include_router(analytics_router)
app.include_router(ga4_router)
app.include_router(assistant_router)

try:
    from .routers.health import health_check
    from .routers.pipeline import (
        get_pipeline_state,
        upload_pipeline_files,
        list_recent_runs,
        get_run_details,
        download_run_report,
        download_cleaned_dataset,
        download_cleaned_zip,
    )
    from .routers.analytics import (
        analytics_overview,
        analytics_revenue_trend,
        analytics_sales,
        analytics_clients,
        analytics_customers,
        analytics_wilayas,
        analytics_products,
        analytics_forecast,
        analytics_decisions,
        analytics_overview_alerts,
        analytics_overview_product,
        search_endpoint,
    )
    from .routers.ga4 import (
        get_ga4_integration,
        save_ga4_integration,
        test_ga4_integration,
        delete_ga4_integration,
    )
    from .routers.assistant import assistant_context, assistant_query
except (ImportError, ValueError):
    from routers.health import health_check
    from routers.pipeline import (
        get_pipeline_state,
        upload_pipeline_files,
        list_recent_runs,
        get_run_details,
        download_run_report,
        download_cleaned_dataset,
        download_cleaned_zip,
    )
    from routers.analytics import (
        analytics_overview,
        analytics_revenue_trend,
        analytics_sales,
        analytics_clients,
        analytics_customers,
        analytics_wilayas,
        analytics_products,
        analytics_forecast,
        analytics_decisions,
        analytics_overview_alerts,
        analytics_overview_product,
        search_endpoint,
    )
    from routers.ga4 import (
        get_ga4_integration,
        save_ga4_integration,
        test_ga4_integration,
        delete_ga4_integration,
    )
    from routers.assistant import assistant_context, assistant_query
