import csv
import io
import json
from datetime import datetime, timezone
from email.parser import BytesParser
from email.policy import default
from pathlib import PurePath
from uuid import uuid4

from fastapi import HTTPException


SUPPORTED_DATASETS = {"transactions", "orders", "customers", "catalogue"}
MAX_UPLOAD_BYTES = 10 * 1024 * 1024
DATASET_HINTS = {
    "transactions": {"transaction_id", "line_total", "sku_quality"},
    "orders": {"n_lines", "total_quantity", "order_total_amount"},
    "customers": {"orders_count", "average_basket", "first_order_date"},
    "catalogue": {"sku", "unit_price", "stock_status"},
}


def _multipart_message(content_type, body):
    if not content_type.lower().startswith("multipart/form-data"):
        raise HTTPException(415, "Expected multipart form data")
    if len(body) > MAX_UPLOAD_BYTES * len(SUPPORTED_DATASETS) + 64 * 1024:
        raise HTTPException(413, "Upload batch is too large")
    message = BytesParser(policy=default).parsebytes(
        f"Content-Type: {content_type}\r\nMIME-Version: 1.0\r\n\r\n".encode() + body
    )
    if not message.is_multipart():
        raise HTTPException(400, "Invalid multipart request")
    return message


def parse_multipart(content_type, body):
    fields = {}
    uploads = []
    for part in _multipart_message(content_type, body).iter_parts():
        params = dict(part.get_params(header="content-disposition", unquote=True) or [])
        field_name = params.get("name")
        filename = params.get("filename")
        payload = part.get_payload(decode=True) or b""
        if field_name == "files" and filename:
            safe_filename = PurePath(filename).name
            if len(payload) > MAX_UPLOAD_BYTES:
                raise HTTPException(413, f"{safe_filename} exceeds the 10 MB limit")
            uploads.append((safe_filename, payload))
        elif field_name:
            try:
                fields[field_name] = payload.decode("utf-8")
            except UnicodeDecodeError as error:
                raise HTTPException(422, f"{field_name} must be UTF-8 text") from error
    return fields, uploads


def parse_dataset_selections(raw_selections):
    try:
        selections = json.loads(raw_selections or "{}")
    except json.JSONDecodeError as error:
        raise HTTPException(422, "dataset_types must be valid JSON") from error
    if not isinstance(selections, dict):
        raise HTTPException(422, "dataset_types must be an object")
    if any(not isinstance(filename, str) or not isinstance(dataset, str) for filename, dataset in selections.items()):
        raise HTTPException(422, "dataset_types keys and values must be strings")
    invalid = set(selections.values()) - SUPPORTED_DATASETS
    if invalid:
        raise HTTPException(422, f"Unsupported dataset type: {sorted(invalid)[0]}")
    return selections


def _dataset_name(filename, headers, selections):
    if filename in selections:
        return selections[filename]
    normalized_headers = {header.strip().lower() for header in headers}
    dataset, score = max(
        ((name, len(hints & normalized_headers)) for name, hints in DATASET_HINTS.items()),
        key=lambda candidate: candidate[1],
    )
    if not score:
        raise HTTPException(422, f"Could not identify the dataset for {filename}")
    return dataset


def _csv_rows(filename, payload):
    try:
        parsed_rows = list(csv.reader(io.StringIO(payload.decode("utf-8-sig"), newline="")))
    except (UnicodeDecodeError, csv.Error) as error:
        raise HTTPException(422, f"{filename} is not a valid UTF-8 CSV") from error
    if not parsed_rows or not parsed_rows[0]:
        raise HTTPException(422, f"{filename} is empty")
    headers = [header.strip() for header in parsed_rows[0]]
    if any(not header for header in headers) or len(set(headers)) != len(headers):
        raise HTTPException(422, f"{filename} has invalid or duplicate column names")
    body_rows = parsed_rows[1:]
    if any(len(row) != len(headers) for row in body_rows):
        raise HTTPException(422, f"{filename} has malformed rows")
    return headers, body_rows


def _unique_rows(rows):
    seen = set()
    unique = []
    for row in rows:
        row_key = tuple(row)
        if row_key not in seen:
            seen.add(row_key)
            unique.append(row)
    return unique


def _missing_values(headers, rows):
    return {
        header: sum(not row[index].strip() for row in rows)
        for index, header in enumerate(headers)
    }


def _column_profiles(headers, rows, missing_values):
    return [
        {
            "name": header,
            "inferred_type": "string",
            "non_null_count": len(rows) - missing_values[header],
            "missing_count": missing_values[header],
            "unique_count": len({row[index] for row in rows if row[index].strip()}),
        }
        for index, header in enumerate(headers)
    ]


def _profile_summary(headers, rows, payload_size, metrics):
    return {
        "row_count": len(rows),
        "column_count": len(headers),
        "file_size_bytes": payload_size,
        "duplicate_rows": metrics["duplicate_count"],
        "missing_values": metrics["missing_values"],
        "columns": _column_profiles(headers, rows, metrics["missing_values"]),
        "date_ranges": {},
        "raw_preview": {"columns": headers, "rows": rows[:10]},
    }


def _transformations(duplicate_count, column_count):
    if not duplicate_count:
        return []
    return [{
        "code": "exact_duplicates_removed",
        "label": "Exact duplicates removed",
        "description": "Repeated rows with identical values were removed.",
        "affected_rows": duplicate_count,
        "affected_cells": duplicate_count * column_count,
    }]


def _cleaning_summary(headers, rows, cleaned_rows, metrics):
    return {
        "before_rows": len(rows),
        "after_rows": len(cleaned_rows),
        "missing_before": metrics["missing_before"],
        "missing_after": metrics["missing_after"],
        "duplicate_rows_after": 0,
        "rejected_rows": 0,
        "transformations": _transformations(metrics["duplicate_count"], len(headers)),
        "warnings": [],
        "deferred_rules": [],
        "date_ranges": {},
        "cleaned_preview": {"columns": headers, "rows": cleaned_rows[:10]},
    }


def _quality_summary(missing_values, missing_after):
    if not missing_after:
        return {"issues": []}
    return {"issues": [{
        "code": "missing_values",
        "message": "Missing values remain after deterministic cleaning.",
        "count": missing_after,
        "columns": [header for header, count in missing_values.items() if count],
    }]}


def _csv_summary(filename, payload, selections):
    headers, rows = _csv_rows(filename, payload)
    cleaned_rows = _unique_rows(rows)
    missing_values = _missing_values(headers, rows)
    cleaned_missing_values = _missing_values(headers, cleaned_rows)
    metrics = {
        "duplicate_count": len(rows) - len(cleaned_rows),
        "missing_values": missing_values,
        "missing_before": sum(missing_values.values()),
        "missing_after": sum(cleaned_missing_values.values()),
    }
    summary = {
        "filename": filename,
        "dataset": _dataset_name(filename, headers, selections),
        "readiness": "ready_with_warnings" if metrics["missing_after"] else "ready",
        "profile": _profile_summary(headers, rows, len(payload), metrics),
        "cleaning": _cleaning_summary(headers, rows, cleaned_rows, metrics),
        "quality": _quality_summary(cleaned_missing_values, metrics["missing_after"]),
    }
    return summary, {"dataset": summary["dataset"], "headers": headers, "rows": cleaned_rows}


def _pipeline_result(file_summaries):
    raw_rows = sum(summary["profile"]["row_count"] for summary in file_summaries)
    clean_rows = sum(summary["cleaning"]["after_rows"] for summary in file_summaries)
    return {
        "total_files": len(file_summaries),
        "total_rows_raw": raw_rows,
        "total_rows_cleaned": clean_rows,
        "total_missing_values": sum(summary["cleaning"]["missing_after"] for summary in file_summaries),
        "total_duplicate_rows_removed": raw_rows - clean_rows,
        "persistence": "memory",
        "import_summary": None,
        "files": file_summaries,
    }


def _new_pipeline_run(file_summaries):
    timestamp = datetime.now(timezone.utc).isoformat()
    return {
        "run_id": str(uuid4()),
        "status": "completed",
        "stage": "ready",
        "message": "CSV processing completed.",
        "created_at": timestamp,
        "completed_at": timestamp,
        "stages": [
            {"key": key, "status": "completed"}
            for key in ("upload", "validation", "profiling", "cleaning", "quality", "persistence", "analytics", "ready")
        ],
        "result": _pipeline_result(file_summaries),
    }


def build_pipeline_run(uploads, selections):
    if not uploads:
        raise HTTPException(422, "Select at least one CSV file")
    file_summaries = []
    prepared_files = []
    datasets = set()
    for filename, payload in uploads:
        if not filename.lower().endswith(".csv"):
            raise HTTPException(415, f"{filename} is not a CSV file")
        file_summary, prepared_file = _csv_summary(filename, payload, selections)
        dataset = file_summary["dataset"]
        if dataset in datasets:
            raise HTTPException(422, f"Only one {dataset} dataset can be processed per batch")
        datasets.add(dataset)
        file_summaries.append(file_summary)
        prepared_files.append(prepared_file)
    return _new_pipeline_run(file_summaries), prepared_files


def recent_run_summary(run):
    pipeline_result = run["result"]
    raw_rows = pipeline_result["total_rows_raw"]
    return {
        "run_id": run["run_id"],
        "created_at": run["created_at"],
        "completed_at": run["completed_at"],
        "datasets": [summary["dataset"] for summary in pipeline_result["files"]],
        "persistence": pipeline_result["persistence"],
        "total_rows_cleaned": pipeline_result["total_rows_cleaned"],
        "retention_percentage": round(pipeline_result["total_rows_cleaned"] * 100 / raw_rows, 1) if raw_rows else None,
        "warning_count": pipeline_result["total_missing_values"],
    }
