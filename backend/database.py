try:
    from .core.database import (
        Base,
        SessionLocal,
        engine,
        get_db,
        check_db_connection,
        init_db,
        DATABASE_URL,
    )
except (ImportError, ValueError):
    from core.database import (
        Base,
        SessionLocal,
        engine,
        get_db,
        check_db_connection,
        init_db,
        DATABASE_URL,
    )

__all__ = [
    "Base",
    "SessionLocal",
    "engine",
    "get_db",
    "check_db_connection",
    "init_db",
    "DATABASE_URL",
]
