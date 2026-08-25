"""Wilaya KPI helpers extracted from pipeline/Notebooks/06_wilaya_analysis.ipynb."""


def revenue_per_wilaya(df_orders):
    """Source: pipeline/Notebooks/06_wilaya_analysis.ipynb."""
    revenue_per_wilaya = (
        df_orders
        .groupby("wilaya_normalized")["order_total_amount"]
        .sum()
        .reset_index()
        .sort_values("order_total_amount", ascending=False)
    )

    return revenue_per_wilaya


def active_customers_per_wilaya(df_orders):
    """Source: pipeline/Notebooks/06_wilaya_analysis.ipynb."""
    active_customers_per_wilaya = (
        df_orders
        .groupby("wilaya_normalized")["customer_id_stage"]
        .nunique()
        .reset_index()
        .rename(columns={"customer_id_stage": "active_customers"})
        .sort_values("active_customers", ascending=False)
    )

    return active_customers_per_wilaya


def wilaya_ranking(revenue_per_wilaya, active_customers_per_wilaya):
    """Source: pipeline/Notebooks/06_wilaya_analysis.ipynb."""
    wilaya_ranking = revenue_per_wilaya.merge(
        active_customers_per_wilaya,
        on="wilaya_normalized"
    )

    wilaya_ranking["avg_revenue_per_customer"] = (
        wilaya_ranking["order_total_amount"] / wilaya_ranking["active_customers"]
    )

    wilaya_ranking = wilaya_ranking.sort_values("order_total_amount", ascending=False)

    return wilaya_ranking


__all__ = [
    "revenue_per_wilaya",
    "active_customers_per_wilaya",
    "wilaya_ranking",
]
