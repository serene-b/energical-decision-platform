"""Sales KPI helpers extracted from pipeline/Notebooks/05_sales_intelligence.ipynb."""

import pandas as pd
from statsmodels.tsa.stattools import adfuller


VALID_SALES_STATUSES = ["Terminée", "Partiellement remboursée"]


def sale_number(valid_sales):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    sales_number=valid_sales['order_total_amount'].sum()
    return sales_number


def Sales_growth(current_sales_number,previous_sales_number):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    if previous_sales_number==0:
        return None
    else:
        sales_growth=((current_sales_number-previous_sales_number)/previous_sales_number)*100
    return sales_growth


def avg_basket_value(clean_customers):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    customers = clean_customers.copy()
    customers["average_basket"] = (
        customers["total_amount"] / customers["orders_count"]
    )

    return customers


def performance_per_mop(Valid_sales):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    performance = (
        Valid_sales
        .groupby("payment_method_group")
        .agg(
            Revenue=("order_total_amount", "sum"),
            Orders=("order_id_stage", "nunique"),
            Average_Basket=("order_total_amount", "mean")
        )
        .reset_index()
    )

    return performance


def performance_per_delivery_method(orders_shipping):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    performance = (
        orders_shipping.groupby("shipping_method").agg(
            Revenue=("order_total_amount", "sum"),
            Orders=("order_id_stage", "nunique"),
            Average_Basket=("order_total_amount", "mean")
        )
        .reset_index()
    )

    return performance


def performance_per_customer_type(valid_sales):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    performance = (
        valid_sales
        .groupby("customer_type_inferred", as_index=False)
        .agg(
            Customers=("customer_id_stage", "nunique"),
            Revenue=("order_total_amount", "sum"),
            Orders=("order_id_stage", "nunique"),
        )
    )

    performance["Average_Basket"] = (
        performance["Revenue"] / performance["Orders"]
    )

    return performance


def sales_status(clean_orders):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""

    sales_status = (
        clean_orders.groupby("sales_status")
        .agg(
            orders_count=("order_id_stage", "nunique")
        )
        .reset_index()
    )

    sales_status["percentage"] = (
        sales_status["orders_count"]
        / sales_status["orders_count"].sum()
    ) * 100

    sales_status["percentage"] = sales_status["percentage"].round(2)

    return sales_status


def negative_price_flag_performance(clean_transactions, valid_sales):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""

    # Create one row per order indicating whether it contains a negative-price line.
    negative_price_orders = (
        clean_transactions.groupby("order_id_stage")["has_negative_price"]
        .any()
        .reset_index()
        .rename(columns={"has_negative_price": "order_has_negative_price"})
    )

    # Keep the same realized-sales population used by the other sales analyses.
    orders = valid_sales.merge(
        negative_price_orders,
        on="order_id_stage",
        how="left"
    )

    # Orders with no negative-price line become False.
    orders["order_has_negative_price"] = (
        orders["order_has_negative_price"].astype("boolean").fillna(False).astype(bool)
    )

    # Aggregate at the order level
    impact = (
        orders.groupby("order_has_negative_price")
        .agg(
            Total_Revenue=("order_total_amount", "sum"),
            Total_Orders=("order_id_stage", "nunique"),
            Average_Order_Value=("order_total_amount", "mean")
        )
        .reset_index()
    )

    return impact


def free_shipping_performance(clean_transactions, valid_sales):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    free_shipping_orders = (
        clean_transactions.groupby("order_id_stage")["free_shipping"]
        .any()
        .reset_index()
        .rename(columns={"free_shipping": "order_has_free_shipping"})
    )
    
    orders = valid_sales.merge(
        free_shipping_orders,
        on="order_id_stage",
        how="left"
    )
    

    orders["order_has_free_shipping"] = (
        orders["order_has_free_shipping"].astype("boolean").fillna(False).astype(bool)
    )
    impact = (
        orders.groupby("order_has_free_shipping")
        .agg(
            Total_Revenue=("order_total_amount", "sum"),
            Total_Orders=("order_id_stage", "nunique"),
            Average_Order_Value=("order_total_amount", "mean")
        )
        .reset_index()
    )

    return impact


def adf_test(monthly_sales_no_var_no_trend):
    """Source: pipeline/Notebooks/05_sales_intelligence.ipynb."""
    test_results = adfuller(monthly_sales_no_var_no_trend["order_total_amount"].dropna())
    print('ADF Statistic: ', test_results[0])
    print('P-Value: ', test_results[1])
    print('Critical Values:')
    for thres, adf_stat in test_results[4].items():
        print('\t%s: %.2f' % (thres, adf_stat))


__all__ = [
    "VALID_SALES_STATUSES",
    "sale_number",
    "Sales_growth",
    "avg_basket_value",
    "performance_per_mop",
    "performance_per_delivery_method",
    "performance_per_customer_type",
    "sales_status",
    "negative_price_flag_performance",
    "free_shipping_performance",
    "adf_test",
]
