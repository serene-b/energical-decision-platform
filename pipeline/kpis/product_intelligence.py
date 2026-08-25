"""Product KPI helpers extracted from pipeline/Notebooks/04_product_intelligence.ipynb."""


def Top_products(clean_transactions, top_n=10):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = clean_transactions[clean_transactions["sku_quality"] == "ok"]
    top_products=(
        ok_transactions.groupby("product_name").agg(
                total_revenue=("line_total", "sum"),
                total_orders=("order_id_stage", "count")
            ).reset_index().sort_values(by="total_revenue", ascending=False).head(top_n)
        )
    return top_products


def low_performers_products(clean_transactions, bottom_n=10):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = clean_transactions[clean_transactions["sku_quality"] == "ok"]
    low_performers_products=(
        ok_transactions.groupby("product_name").agg(
                total_revenue=("line_total", "sum"),
                total_orders=("order_id_stage", "count")
            ).reset_index().sort_values(by="total_revenue", ascending=True).head(bottom_n)
    )
    return low_performers_products


def performance_per_category(clean_transactions):
    """Source: pipeline/Notebooks/04_product_intelligence.ipynb."""
    ok_transactions = clean_transactions[clean_transactions["sku_quality"] == "ok"]

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
    ok_transactions = clean_transactions[clean_transactions["sku_quality"] == "ok"]
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
    ok_transactions = clean_transactions[clean_transactions["sku_quality"] == "ok"]

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
    ok_transactions = clean_transactions[clean_transactions["sku_quality"] == "ok"]
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
