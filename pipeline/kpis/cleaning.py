"""Cleaning helpers extracted from pipeline/Notebooks/02_data_cleaning.ipynb."""

import pandas as pd


def clean_dtypes(df):
    """Source: pipeline/Notebooks/02_data_cleaning.ipynb."""
    for col in df.columns:
        if "date" in col:
            df[col] = pd.to_datetime(df[col], errors="coerce")
    
    
    numeric_cols = ["quantity", "unit_price", "line_total",
                    "order_total_amount", "total_quantity", "n_lines","shipping_cost","Prix unitaire"]

    for col in numeric_cols:
        if col in df.columns:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    for col in df.select_dtypes(include="object").columns:
        df[col] = df[col].astype("string")

    return df


def clean_duplicates(df):
    """Source: pipeline/Notebooks/02_data_cleaning.ipynb."""
    before=len(df)
    df = df.drop_duplicates()
    after=len(df)
    print(f"removed {before-after} duplicates")
    return df


def clean_missing_values(df, df_name):
    """Source: pipeline/Notebooks/02_data_cleaning.ipynb."""
    before=len(df)
    if df_name == "transactions":
        df = df.dropna(subset=["quantity", "unit_price", "line_total"])  
    after=len(df) 
    print(f"removed {before-after} incomplete rows")
    return df
        

def validate_business_rules(df, df_name):
    """Source: pipeline/Notebooks/02_data_cleaning.ipynb."""

    print(f"\nBusiness Rule Validation - {df_name}")

    if "quantity" in df.columns:
        print(f"Negative quantities: {(df['quantity'] < 0).sum()}")

    if "unit_price" in df.columns:
        print(f"Negative prices: {(df['unit_price'] < 0).sum()}")
    if "line_total" in df.columns:
        print(f"Negative line totals: {(df['line_total'] < 0).sum()}")

    if "order_date" in df.columns:
        print(f"Future dates: {(df['order_date'] > pd.Timestamp.today()).sum()}")
    
    return df
        

def clean_product_names(df):
    """Source: pipeline/Notebooks/02_data_cleaning.ipynb."""

    if "product_name" in df.columns:

        df["product_name"] = (
            df["product_name"]
            .str.strip()
            .str.replace(r"\s+", " ", regex=True)
        )

    return df


__all__ = [
    "clean_dtypes",
    "clean_duplicates",
    "clean_missing_values",
    "validate_business_rules",
    "clean_product_names",
]
