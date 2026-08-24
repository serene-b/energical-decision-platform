import re
import unicodedata
from datetime import datetime
from decimal import Decimal, InvalidOperation

from sqlalchemy import bindparam, text


DATASET_ORDER = ("customers", "catalogue", "orders", "transactions")
TABLES = {
    "customers": {
        "key": "customer_id_stage",
        "columns": (
            "customer_id_stage", "customer_type_inferred", "wilaya",
            "first_order_date", "last_order_date", "orders_count",
            "total_amount", "average_basket",
        ),
    },
    "catalogue": {
        "key": "sku",
        "columns": (
            "sku", "product_name", "category", "subcategory", "unit_price",
            "stock_status", "short_desc",
        ),
    },
    "orders": {
        "key": "order_id_stage",
        "columns": (
            "order_id_stage", "customer_id_stage", "order_date", "wilaya_raw",
            "wilaya_normalized", "customer_type_inferred", "order_status",
            "payment_method_group", "sales_channel", "order_total_amount",
            "total_quantity", "n_lines",
        ),
    },
    "transactions": {
        "key": None,
        "columns": (
            "order_id_stage", "customer_id_stage", "order_date", "wilaya_raw",
            "wilaya_normalized", "geo_quality_flag", "customer_type_inferred",
            "sku", "product_name", "sku_quality", "category", "subcategory",
            "quantity", "unit_price", "line_total", "order_status",
            "payment_method_group", "sales_channel",
        ),
    },
}
ALIASES = {
    "customers": {"code_client": "customer_id_stage"},
    "catalogue": {
        "nom": "product_name",
        "categorie": "category",
        "sous_categorie": "subcategory",
        "prix_unitaire": "unit_price",
    },
    "transactions": {"code_client": "customer_id_stage"},
}
INTEGER_COLUMNS = {"orders_count", "total_quantity", "n_lines", "quantity"}
DECIMAL_COLUMNS = {"total_amount", "average_basket", "unit_price", "order_total_amount", "line_total"}
DATE_COLUMNS = {"first_order_date", "last_order_date"}
DATETIME_COLUMNS = {"order_date"}


class PersistenceValidationError(ValueError):
    pass


def _normalize_header(header):
    plain = unicodedata.normalize("NFKD", header).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "_", plain.lower()).strip("_")


def _mapped_columns(dataset, headers):
    allowed = set(TABLES[dataset]["columns"])
    aliases = ALIASES.get(dataset, {})
    mapped = []
    for header in headers:
        normalized = _normalize_header(header)
        column = aliases.get(normalized, normalized)
        mapped.append(column if column in allowed else None)
    selected = [column for column in mapped if column]
    if len(selected) != len(set(selected)):
        raise PersistenceValidationError(f"{dataset} maps more than one CSV column to the same database column")
    key = TABLES[dataset]["key"]
    if key and key not in selected:
        raise PersistenceValidationError(f"{dataset} requires the {key} column")
    if dataset == "transactions" and "order_id_stage" not in selected:
        raise PersistenceValidationError("transactions requires the order_id_stage column")
    return mapped


def _parse_value(column, raw_value):
    value = raw_value.strip()
    if not value:
        return None
    try:
        if column in INTEGER_COLUMNS:
            number = Decimal(value.replace(",", ""))
            if number != number.to_integral_value():
                raise PersistenceValidationError(f"{column} must be a whole number")
            return int(number)
        if column in DECIMAL_COLUMNS:
            return Decimal(re.sub(r"\s*DA$", "", value, flags=re.IGNORECASE).replace(",", ""))
        if column in DATE_COLUMNS:
            for date_format in ("%Y-%m-%d", "%m/%d/%Y"):
                try:
                    return datetime.strptime(value, date_format).date()
                except ValueError:
                    pass
            raise PersistenceValidationError(f"{column} must use YYYY-MM-DD or MM/DD/YYYY")
        if column in DATETIME_COLUMNS:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (InvalidOperation, ValueError) as error:
        if isinstance(error, PersistenceValidationError):
            raise
        raise PersistenceValidationError(f"Invalid value for {column}: {value}") from error
    return value


def _database_rows(prepared_file):
    dataset = prepared_file["dataset"]
    mapped_columns = _mapped_columns(dataset, prepared_file["headers"])
    rows = []
    for row_number, csv_row in enumerate(prepared_file["rows"], start=2):
        try:
            database_row = {
                column: _parse_value(column, value)
                for column, value in zip(mapped_columns, csv_row)
                if column
            }
        except PersistenceValidationError as error:
            raise PersistenceValidationError(f"{dataset} row {row_number}: {error}") from error
        rows.append(database_row)
    key = TABLES[dataset]["key"]
    if key:
        keys = [row[key] for row in rows]
        if any(value is None for value in keys):
            raise PersistenceValidationError(f"{dataset} contains an empty {key}")
        if len(keys) != len(set(keys)):
            raise PersistenceValidationError(f"{dataset} contains duplicate {key} values")
    return rows


def _existing_keys(db, dataset, key, keys):
    if not keys:
        return set()
    statement = text(f"SELECT {key} FROM {dataset} WHERE {key} IN :keys").bindparams(
        bindparam("keys", expanding=True)
    )
    return set(db.execute(statement, {"keys": list(keys)}).scalars())


def _upsert(db, dataset, rows):
    key = TABLES[dataset]["key"]
    columns = tuple(rows[0]) if rows else ()
    existing = _existing_keys(db, dataset, key, [row[key] for row in rows])
    if rows:
        assignments = ", ".join(f"{column} = EXCLUDED.{column}" for column in columns if column != key)
        conflict = f"DO UPDATE SET {assignments}" if assignments else "DO NOTHING"
        statement = text(
            f"INSERT INTO {dataset} ({', '.join(columns)}) "
            f"VALUES ({', '.join(':' + column for column in columns)}) "
            f"ON CONFLICT ({key}) {conflict}"
        )
        db.execute(statement, rows)
    return {
        "dataset": dataset,
        "inserted_records": len(rows) - len(existing),
        "updated_records": len(existing),
        "unchanged_records": 0,
        "rejected_records": 0,
    }


def _insert_transactions(db, rows):
    order_ids = {row["order_id_stage"] for row in rows if row.get("order_id_stage")}
    if any(not row.get("order_id_stage") for row in rows):
        raise PersistenceValidationError("transactions contains an empty order_id_stage")
    existing_orders = _existing_keys(db, "transactions", "order_id_stage", order_ids)
    new_rows = [row for row in rows if row["order_id_stage"] not in existing_orders]
    if new_rows:
        columns = tuple(new_rows[0])
        statement = text(
            f"INSERT INTO transactions ({', '.join(columns)}) "
            f"VALUES ({', '.join(':' + column for column in columns)})"
        )
        db.execute(statement, new_rows)
    return {
        "dataset": "transactions",
        "inserted_records": len(new_rows),
        "updated_records": 0,
        "unchanged_records": len(rows) - len(new_rows),
        "rejected_records": 0,
        "new_orders": len({row["order_id_stage"] for row in new_rows}),
        "new_transaction_rows": len(new_rows),
        "existing_orders_skipped": len(existing_orders),
        "review_orders": 0,
        "review_transaction_rows": 0,
    }


def persist_prepared_files(db, prepared_files):
    by_dataset = {prepared_file["dataset"]: prepared_file for prepared_file in prepared_files}
    dataset_summaries = []
    for dataset in DATASET_ORDER:
        if dataset not in by_dataset:
            continue
        rows = _database_rows(by_dataset[dataset])
        summary = _insert_transactions(db, rows) if dataset == "transactions" else _upsert(db, dataset, rows)
        dataset_summaries.append(summary)
    return {
        "inserted_records": sum(item["inserted_records"] for item in dataset_summaries),
        "updated_records": sum(item["updated_records"] for item in dataset_summaries),
        "unchanged_records": sum(item["unchanged_records"] for item in dataset_summaries),
        "rejected_records": 0,
        "warning_count": 0,
        "datasets": dataset_summaries,
    }
