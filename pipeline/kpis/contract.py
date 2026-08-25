"""Centralized Analytical & KPI Contract for Energical Decision Platform.

This module provides the authoritative definitions, database loaders, and calculation rules for all platform KPIs:
- Single source of truth for DB connections (SQLAlchemy engine).
- Authoritative realized-sales population status matching.
- Explicit definition of Platform AOV (Realized Revenue / Realized Orders).
- Standardized KPI calculation functions and metadata contract.
"""

import os
import sys
import logging
import unicodedata
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
from sqlalchemy import create_engine, text

logger = logging.getLogger("energical.kpi_contract")

# ==============================================================================
# 1. DATABASE CONNECTION & LOADERS
# ==============================================================================

_engine = None

def get_db_engine():
    """Return the centralized SQLAlchemy engine connected to PostgreSQL/SQLite."""
    global _engine
    if _engine is not None:
        return _engine

    try:
        from backend.core.database import engine as backend_engine
        _engine = backend_engine
        return _engine
    except (ImportError, ValueError):
        pass

    try:
        from core.database import engine as backend_engine
        _engine = backend_engine
        return _engine
    except (ImportError, ValueError):
        pass

    # Fallback to local environment or sqlite file
    from dotenv import load_dotenv
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    env_path = os.path.join(root_dir, "backend", ".env")
    if os.path.exists(env_path):
        load_dotenv(env_path)
    else:
        load_dotenv()

    db_url = os.getenv("DATABASE_URL")
    sqlite_fallback = os.path.abspath(os.path.join(root_dir, "backend", "test_energical.db"))
    if not db_url or db_url.strip() in ["sqlite:///./test_energical.db", "sqlite://test_energical.db", "sqlite:///test_energical.db"]:
        db_url = f"sqlite:///{sqlite_fallback}"

    if db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)

    connect_args = {"check_same_thread": False} if db_url.startswith("sqlite") else {}
    _engine = create_engine(db_url, pool_pre_ping=True, connect_args=connect_args, echo=False)
    return _engine

def load_orders_from_db(engine=None) -> pd.DataFrame:
    """Load orders table from the database into a pandas DataFrame."""
    eng = engine or get_db_engine()
    try:
        with eng.connect() as conn:
            df = pd.read_sql(text("SELECT * FROM orders"), conn)
            return df
    except Exception as exc:
        logger.error(f"Failed to load orders from database: {exc}")
        return pd.DataFrame()

def load_transactions_from_db(engine=None) -> pd.DataFrame:
    """Load transactions table from the database into a pandas DataFrame."""
    eng = engine or get_db_engine()
    try:
        with eng.connect() as conn:
            df = pd.read_sql(text("SELECT * FROM transactions"), conn)
            return df
    except Exception as exc:
        logger.error(f"Failed to load transactions from database: {exc}")
        return pd.DataFrame()

def load_customers_from_db(engine=None) -> pd.DataFrame:
    """Load customers table from the database into a pandas DataFrame."""
    eng = engine or get_db_engine()
    try:
        with eng.connect() as conn:
            df = pd.read_sql(text("SELECT * FROM customers"), conn)
            return df
    except Exception as exc:
        logger.error(f"Failed to load customers from database: {exc}")
        return pd.DataFrame()

def load_catalogue_from_db(engine=None) -> pd.DataFrame:
    """Load catalogue table from the database into a pandas DataFrame."""
    eng = engine or get_db_engine()
    try:
        with eng.connect() as conn:
            df = pd.read_sql(text("SELECT * FROM catalogue"), conn)
            return df
    except Exception as exc:
        logger.error(f"Failed to load catalogue from database: {exc}")
        return pd.DataFrame()

def load_web_analytics_from_db(engine=None) -> pd.DataFrame:
    """Load web_analytics table from the database if available."""
    eng = engine or get_db_engine()
    try:
        with eng.connect() as conn:
            df = pd.read_sql(text("SELECT * FROM web_analytics"), conn)
            return df
    except Exception as exc:
        logger.warning(f"Web analytics table not available in DB: {exc}")
        return pd.DataFrame()

# ==============================================================================
# 2. AUTHORITATIVE REALIZED-SALES POPULATION DEFINITION
# ==============================================================================

REALIZED_SALES_STATUSES = [
    "Terminée",
    "Partiellement remboursée",
    "Completed",
    "Complete",
    "Delivered",
    "Paid",
    "Partially Refunded",
    "Partially_Refunded",
]

def _normalize_status_key(status: Any) -> str:
    if status is None or pd.isna(status):
        return ""
    text_val = str(status).strip().casefold()
    return "".join(
        char for char in unicodedata.normalize("NFKD", text_val)
        if not unicodedata.combining(char)
    )

REALIZED_STATUS_KEYS = {_normalize_status_key(s) for s in REALIZED_SALES_STATUSES if s}

def is_realized_sale_status(status: Any) -> bool:
    """Check whether a single status value qualifies as a realized sale."""
    return _normalize_status_key(status) in REALIZED_STATUS_KEYS

def get_realized_sales_mask(series: pd.Series) -> pd.Series:
    """Return a boolean mask for a Series of order statuses indicating realized sales."""
    if series is None or series.empty:
        return pd.Series(dtype=bool)
    return series.map(_normalize_status_key).isin(REALIZED_STATUS_KEYS)

def filter_realized_sales(df_orders: pd.DataFrame) -> pd.DataFrame:
    """Filter an orders DataFrame to retain only canonical realized sales."""
    if df_orders is None or df_orders.empty:
        return pd.DataFrame()
    if "order_status" not in df_orders.columns:
        return df_orders.copy()
    mask = get_realized_sales_mask(df_orders["order_status"])
    filtered = df_orders.loc[mask].copy()
    if "order_total_amount" in filtered.columns:
        filtered["order_total_amount"] = pd.to_numeric(filtered["order_total_amount"], errors="coerce").fillna(0.0)
    return filtered

def filter_realized_transactions(df_transactions: pd.DataFrame, realized_orders_df: Optional[pd.DataFrame] = None) -> pd.DataFrame:
    """Filter a transactions DataFrame to retain lines belonging to realized sales."""
    if df_transactions is None or df_transactions.empty:
        return pd.DataFrame()
    if realized_orders_df is not None and not realized_orders_df.empty and "order_id_stage" in realized_orders_df.columns and "order_id_stage" in df_transactions.columns:
        valid_ids = set(realized_orders_df["order_id_stage"].dropna().unique())
        return df_transactions[df_transactions["order_id_stage"].isin(valid_ids)].copy()
    if "order_status" in df_transactions.columns:
        mask = get_realized_sales_mask(df_transactions["order_status"])
        return df_transactions.loc[mask].copy()
    return df_transactions.copy()

# ==============================================================================
# 3. AUTHORITATIVE KPI DEFINITIONS & FORMULAS
# ==============================================================================

def calculate_total_revenue(realized_sales_df: pd.DataFrame) -> float:
    """Calculate Total Realized Revenue from realized sales orders."""
    if realized_sales_df is None or realized_sales_df.empty or "order_total_amount" not in realized_sales_df.columns:
        return 0.0
    amounts = pd.to_numeric(realized_sales_df["order_total_amount"], errors="coerce").fillna(0.0)
    return float(amounts.sum())

def calculate_total_orders(realized_sales_df: pd.DataFrame) -> int:
    """Calculate Total Realized Order Count from realized sales orders."""
    if realized_sales_df is None or realized_sales_df.empty:
        return 0
    if "order_id_stage" in realized_sales_df.columns:
        return int(realized_sales_df["order_id_stage"].nunique())
    return int(len(realized_sales_df))

def calculate_platform_aov(realized_sales_df: pd.DataFrame) -> float:
    """Calculate Platform Average Order Value (AOV).
    
    FORMULA: Platform AOV = Total Realized Revenue / Total Realized Orders
    Population: Canonical realized sales orders in the given period.
    """
    revenue = calculate_total_revenue(realized_sales_df)
    orders = calculate_total_orders(realized_sales_df)
    if orders <= 0:
        return 0.0
    return round(revenue / orders, 2)

def calculate_total_clients(customers_df: pd.DataFrame) -> int:
    """Calculate Total Registered Clients count."""
    if customers_df is None or customers_df.empty:
        return 0
    if "customer_id_stage" in customers_df.columns:
        return int(customers_df["customer_id_stage"].nunique())
    return int(len(customers_df))

def calculate_sales_growth(current_revenue: float, previous_revenue: float) -> Optional[float]:
    """Calculate percentage growth rate between two periods."""
    if previous_revenue is None or previous_revenue == 0:
        return None
    growth = ((current_revenue - previous_revenue) / abs(previous_revenue)) * 100.0
    return round(float(growth), 1)

# ==============================================================================
# 4. KPI METADATA CONTRACT REGISTRY
# ==============================================================================

KPI_CONTRACT_REGISTRY: Dict[str, Dict[str, Any]] = {
    "total_revenue": {
        "canonical_name": "Total Realized Revenue",
        "key": "total_revenue",
        "definition": "Sum of order_total_amount for all orders with a valid realized-sales status.",
        "source_tables": ["orders"],
        "source_columns": ["order_total_amount", "order_status"],
        "filter_population": "Realized Sales (Completed, Delivered, Paid, Partiellement remboursée)",
        "unit": "DZD",
        "formatting": "Currency (DZD)",
    },
    "total_orders": {
        "canonical_name": "Total Realized Orders",
        "key": "total_orders",
        "definition": "Count of unique order_id_stage for all orders with a valid realized-sales status.",
        "source_tables": ["orders"],
        "source_columns": ["order_id_stage", "order_status"],
        "filter_population": "Realized Sales",
        "unit": "orders",
        "formatting": "Integer",
    },
    "platform_aov": {
        "canonical_name": "Platform Average Order Value (AOV)",
        "key": "platform_aov",
        "definition": "Total Realized Revenue divided by Total Realized Orders over the specified period.",
        "source_tables": ["orders"],
        "source_columns": ["order_total_amount", "order_id_stage", "order_status"],
        "filter_population": "Realized Sales",
        "unit": "DZD",
        "formatting": "Currency (DZD)",
    },
    "total_clients": {
        "canonical_name": "Total Registered Clients",
        "key": "total_clients",
        "definition": "Total count of registered customer accounts in the database.",
        "source_tables": ["customers"],
        "source_columns": ["customer_id_stage"],
        "filter_population": "All Registered Accounts",
        "unit": "accounts",
        "formatting": "Integer",
    },
    "sales_growth_pct": {
        "canonical_name": "Monthly Sales Growth Rate",
        "key": "growth_pct",
        "definition": "Percentage change in realized revenue between current month and previous month.",
        "source_tables": ["orders"],
        "source_columns": ["order_total_amount", "order_date", "order_status"],
        "filter_population": "Realized Sales by Calendar Month",
        "unit": "%",
        "formatting": "Percentage",
    },
    "customer_aov": {
        "canonical_name": "Customer Lifetime Average Basket",
        "key": "customer_average_basket",
        "definition": "Historical total spent divided by order count for a specific customer profile.",
        "source_tables": ["customers"],
        "source_columns": ["total_amount", "orders_count"],
        "filter_population": "Single Customer Profile",
        "unit": "DZD",
        "formatting": "Currency (DZD)",
    },
    "mean_order_value_mop": {
        "canonical_name": "Mean Order Amount by Payment Method",
        "key": "mop_average_basket",
        "definition": "Average order amount grouped by payment method channel.",
        "source_tables": ["orders"],
        "source_columns": ["order_total_amount", "payment_method_group"],
        "filter_population": "Realized Sales by Payment Group",
        "unit": "DZD",
        "formatting": "Currency (DZD)",
    },
}

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
]
