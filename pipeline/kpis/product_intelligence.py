"""Product KPI helpers extracted from pipeline/Notebooks/04_product_intelligence.ipynb."""


def _valid_sku_transactions(clean_transactions):
    """Keep reviewed SKU rows across the source system's quality labels.

    The notebook used ``ok`` while the seeded database and some imports use
    ``VALID``. Newly persisted rows can also have a null quality flag because
    that field is optional in the database schema. Treat those equivalent
    reviewed/blank values consistently, while still excluding explicit bad
    quality flags.
    """

    if "sku_quality" not in clean_transactions.columns:
        return clean_transactions
    quality = clean_transactions["sku_quality"].astype("string").str.strip().str.casefold()
    valid = quality.isna() | quality.eq("") | quality.isin({"ok", "valid", "verified", "true", "1"})
    return clean_transactions[valid]


def Top_products(clean_transactions, top_n=10):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = _valid_sku_transactions(clean_transactions)
    top_products=(
        ok_transactions.groupby("product_name").agg(
                total_revenue=("line_total", "sum"),
                total_orders=("order_id_stage", "count")
            ).reset_index().sort_values(by="total_revenue", ascending=False).head(top_n)
        )
    return top_products


def low_performers_products(clean_transactions, bottom_n=10):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = _valid_sku_transactions(clean_transactions)
    low_performers_products=(
        ok_transactions.groupby("product_name").agg(
                total_revenue=("line_total", "sum"),
                total_orders=("order_id_stage", "count")
            ).reset_index().sort_values(by="total_revenue", ascending=True).head(bottom_n)
    )
    return low_performers_products


def performance_per_category(clean_transactions):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = _valid_sku_transactions(clean_transactions)

    top_categories = (
        ok_transactions
        .groupby("category")
        .agg(
            total_revenue=("line_total", "sum"),
            total_orders=("order_id_stage", "nunique")
        )
        .reset_index()
        .sort_values(by="total_revenue", ascending=False)
    )
    return top_categories
    

def performance_per_subcategory(clean_transactions):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = _valid_sku_transactions(clean_transactions)
    ok_transactions = ok_transactions.drop(columns=["category", "subcategory"])

    merged = ok_transactions.merge(
        clean_catalogue[["sku", "category", "subcategory"]],
        on="sku",
        how="left"
    )
    top_subcategory = (
        merged
        .groupby("subcategory")
        .agg(
            total_revenue=("line_total", "sum"),
            total_orders=("order_id_stage", "nunique")
        )
        .reset_index()
        .sort_values(by="total_revenue", ascending=False)
    )
    return top_subcategory
    

def avg_order_quant_per_product(clean_transactions):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = _valid_sku_transactions(clean_transactions)

    avg_quantities = (
        ok_transactions
        .groupby("product_name")
        .agg(
            total_units_sold=("quantity", "sum"),
            avg_quantity_per_order=("quantity", "mean"),
            number_of_orders=("order_id_stage", "nunique")
        )
        .reset_index()
    )
    return avg_quantities


def price_vs_volume(clean_transactions):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = _valid_sku_transactions(clean_transactions)
    price_volume = (
        ok_transactions
        .groupby("product_name")
        .agg(
            total_units_sold=("quantity", "sum"),
            avg_price=("unit_price", "mean"),
            total_revenue=("line_total", "sum")
        )
        .reset_index()
    )
    return price_volume


__all__ = [
    "Top_products",
    "low_performers_products",
    "performance_per_category",
    "performance_per_subcategory",
    "avg_order_quant_per_product",
    "price_vs_volume",
]
