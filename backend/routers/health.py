from fastapi import APIRouter

try:
    from ..core.database import check_db_connection
except (ImportError, ValueError):
    try:
        from core.database import check_db_connection
    except (ImportError, ValueError):
        from database import check_db_connection

router = APIRouter(prefix="/api/v1", tags=["health"])

@router.get("/health")
async def health_check():
    db_ok = check_db_connection()
    return {
        "status": "healthy" if db_ok else "degraded",
        "service": "Energical Decision Platform API",
        "version": "0.1.0",
        "database_connected": db_ok,
    }
