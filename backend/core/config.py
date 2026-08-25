import os
from pathlib import Path

from dotenv import load_dotenv


# Load the backend environment before reading configuration values. This module
# is imported before core.database from main.py, so relying on database.py to
# load .env leaves CORS_ORIGINS at its fallback value.
load_dotenv(Path(__file__).resolve().parent.parent / ".env")

ALLOWED_ORIGINS_ENV = os.getenv(
    "CORS_ORIGINS",
    ",".join(
        [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174",
            "http://localhost:3000",
        ]
    ),
)
ORIGINS = [origin.strip() for origin in ALLOWED_ORIGINS_ENV.split(",") if origin.strip()]
API_TITLE = "Energical Decision Platform API"
API_VERSION = "0.1.0"
