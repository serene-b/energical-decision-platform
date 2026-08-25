import os
import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

dotenv_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env")
if os.path.exists(dotenv_path):
    load_dotenv(dotenv_path)
else:
    load_dotenv()

logger = logging.getLogger("energical.database")

backend_db_path = os.path.abspath(os.path.join(os.path.dirname(os.path.dirname(__file__)), "test_energical.db"))
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or DATABASE_URL.strip() in ["sqlite:///./test_energical.db", "sqlite://test_energical.db", "sqlite:///test_energical.db"]:
    DATABASE_URL = f"sqlite:///{backend_db_path}"

if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

try:
    engine = create_engine(
        DATABASE_URL,
        pool_pre_ping=True,
        connect_args=connect_args,
        echo=False
    )
    with engine.connect() as conn:
        conn.execute(text("SELECT 1"))
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
except Exception as exc:
    logger.warning(f"Database connection to '{DATABASE_URL}' failed ({exc}). Falling back to backend SQLite.")
    engine = create_engine(f"sqlite:///{backend_db_path}", connect_args={"check_same_thread": False})
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def check_db_connection() -> bool:
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))
        return True
    except Exception as err:
        logger.warning(f"Database health check failed: {err}")
        return False

def init_db():
    try:
        try:
            from ..models.models import Customer, Catalogue, Order, Transaction, IntegrationSetting
        except (ImportError, ValueError):
            from models.models import Customer, Catalogue, Order, Transaction, IntegrationSetting
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables initialized successfully.")
    except Exception as exc:
        logger.error(f"Failed to auto-create tables: {exc}")
