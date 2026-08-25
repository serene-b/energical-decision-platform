import os
import json
import logging
from typing import List, Optional
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Query, Response
from sqlalchemy import func

try:
    from ..core.database import check_db_connection, SessionLocal
    from ..models.models import Order, Customer, Transaction
    from ..services.pipeline import (
        create_pipeline_run,
        get_pipeline_run_by_id,
        get_recent_pipeline_runs,
        get_cleaned_dataset_csv,
        get_all_cleaned_zip,
        generate_pdf_report,
    )
except (ImportError, ValueError):
    try:
        from core.database import check_db_connection, SessionLocal
        from models.models import Order, Customer, Transaction
        from services.pipeline import (
            create_pipeline_run,
            get_pipeline_run_by_id,
            get_recent_pipeline_runs,
            get_cleaned_dataset_csv,
            get_all_cleaned_zip,
            generate_pdf_report,
        )
    except (ImportError, ValueError):
        from database import check_db_connection, SessionLocal
        from models import Order, Customer, Transaction
        from pipeline_service import (
            create_pipeline_run,
            get_pipeline_run_by_id,
            get_recent_pipeline_runs,
            get_cleaned_dataset_csv,
            get_all_cleaned_zip,
            generate_pdf_report,
        )

logger = logging.getLogger("energical.routers.pipeline")
router = APIRouter(prefix="/api/v1/pipeline", tags=["pipeline"])

@router.get("/state")
async def get_pipeline_state():
    db_ok = check_db_connection()
    data_available = False
    latest_order_date = None
    latest_tx_date = None
    total_orders = 0
    total_transactions = 0
    total_clients = 0

    if db_ok:
        try:
            db = SessionLocal()
            try:
                total_orders = db.query(func.count(Order.order_id_stage)).scalar() or 0
                total_transactions = db.query(func.count(Transaction.transaction_id)).scalar() or 0
                total_clients = db.query(func.count(Customer.customer_id_stage)).scalar() or 0

                max_ord = db.query(func.max(Order.order_date)).scalar()
                max_tx = db.query(func.max(Transaction.order_date)).scalar()

                if max_ord:
                    latest_order_date = max_ord.strftime("%Y-%m-%d")
                if max_tx:
                    latest_tx_date = max_tx.strftime("%Y-%m-%d")

                data_available = (total_orders > 0 or total_transactions > 0)
            finally:
                db.close()
        except Exception as e:
            logger.warning(f"Error querying database state stats: {e}")

    latest_business_date = latest_tx_date or latest_order_date

    return {
        "connected": db_ok,
        "mode": "production" if db_ok else "in_memory_analytics",
        "persistence": "postgres" if db_ok and "postgres" in os.getenv("DATABASE_URL", "").lower() else "sqlite",
        "data_available": data_available,
        "latest_business_date": latest_business_date,
        "latest_order_date": latest_order_date,
        "latest_transaction_date": latest_tx_date,
        "total_orders": total_orders,
        "total_transactions": total_transactions,
        "total_clients": total_clients,
    }

@router.post("/runs")
async def upload_pipeline_files(
    files: List[UploadFile] = File(...),
    dataset_type: Optional[str] = Form(None),
    dataset_types: Optional[str] = Form(None),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded.")

    parsed_dataset_types = {}
    if dataset_types:
        try:
            parsed_dataset_types = json.loads(dataset_types)
        except Exception:
            pass

    MAX_SIZE = int(os.getenv("MAX_UPLOAD_SIZE_BYTES", 10485760))
    files_data = []
    for file in files:
        content = await file.read()
        if len(content) > MAX_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"File '{file.filename}' exceeds maximum allowed upload size of {MAX_SIZE // (1024 * 1024)}MB."
            )
        safe_filename = os.path.basename(file.filename or "upload.csv")
        files_data.append((safe_filename, content))

    run_record = create_pipeline_run(files_data, dataset_types=parsed_dataset_types)
    return run_record

@router.get("/runs")
async def list_recent_runs(limit: int = Query(20, ge=1, le=100)):
    return get_recent_pipeline_runs(limit=limit)

@router.get("/runs/{run_id}")
async def get_run_details(run_id: str):
    clean_id = "".join(c for c in run_id if c.isalnum() or c in ("-", "_"))
    run = get_pipeline_run_by_id(clean_id)
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found.")
    return run

@router.get("/runs/{run_id}/report")
async def download_run_report(run_id: str):
    clean_id = "".join(c for c in run_id if c.isalnum() or c in ("-", "_"))
    run = get_pipeline_run_by_id(clean_id)
    result = run.get("result", {}) if run else {}
    pdf_bytes = generate_pdf_report(clean_id, result)

    filename = f"energical_data_preparation_report_{clean_id[:8]}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/runs/{run_id}/cleaned/{dataset}")
async def download_cleaned_dataset(run_id: str, dataset: str):
    clean_id = "".join(c for c in run_id if c.isalnum() or c in ("-", "_"))
    clean_dataset = "".join(c for c in dataset if c.isalnum() or c in ("-", "_"))
    csv_content = get_cleaned_dataset_csv(clean_id, clean_dataset)
    if not csv_content:
        raise HTTPException(status_code=404, detail=f"Cleaned dataset '{clean_dataset}' not found for run.")

    filename = f"{clean_dataset}_cleaned.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )

@router.get("/runs/{run_id}/cleaned.zip")
async def download_cleaned_zip(run_id: str):
    clean_id = "".join(c for c in run_id if c.isalnum() or c in ("-", "_"))
    zip_bytes = get_all_cleaned_zip(clean_id)
    if not zip_bytes:
        raise HTTPException(status_code=404, detail="No cleaned datasets available to archive.")

    filename = f"cleaned_data_{clean_id[:8]}.zip"
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
