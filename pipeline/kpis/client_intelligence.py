"""Client KPI helpers extracted from pipeline/Notebooks/03_client_intelligence.ipynb."""

import pandas as pd


def client_recency(df_customers):
    """Source: pipeline/Notebooks/03_client_intelligence.ipynb."""
    df_customers["last_order_date"] = pd.to_datetime(df_customers["last_order_date"])

    reference_date = df_customers["last_order_date"].max()

    df_customers["recency_days"] = (
        reference_date - df_customers["last_order_date"]
    ).dt.days

    return df_customers


__all__ = ["client_recency"]
