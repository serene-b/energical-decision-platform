from fastapi import Depends, FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError, SQLAlchemyError
from sqlalchemy.orm import Session

from analytics import router as analytics_router
from database import get_db
from models import Customer
from pipeline import (
    build_pipeline_run,
    parse_dataset_selections,
    parse_multipart,
    recent_run_summary,
)
from persistence import PersistenceValidationError, persist_prepared_files


app = FastAPI(title="Energical Decision Platform API")
app.include_router(analytics_router)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ponytail: process-local history; move runs to PostgreSQL when restart-safe history is required.
PIPELINE_RUNS = {}


@app.get("/")
def read_root():
    return {"message": "API Energical fonctionne correctement"}


@app.get("/api/v1/health")
def api_health():
    return {"status": "ok"}


@app.post("/api/v1/pipeline/runs")
async def create_pipeline_run(request: Request, db: Session = Depends(get_db)):
    fields, uploads = parse_multipart(
        request.headers.get("content-type", ""),
        await request.body(),
    )
    selections = parse_dataset_selections(fields.get("dataset_types"))
    pipeline_run, prepared_files = build_pipeline_run(uploads, selections)
    try:
        import_summary = persist_prepared_files(db, prepared_files)
        db.commit()
    except PersistenceValidationError as error:
        db.rollback()
        raise HTTPException(422, str(error)) from error
    except IntegrityError as error:
        db.rollback()
        raise HTTPException(409, "A referenced customer, product, or order is missing from PostgreSQL") from error
    except SQLAlchemyError as error:
        db.rollback()
        raise HTTPException(500, "PostgreSQL could not save the uploaded batch") from error
    pipeline_run["result"]["persistence"] = "postgres"
    pipeline_run["result"]["import_summary"] = import_summary
    PIPELINE_RUNS[pipeline_run["run_id"]] = pipeline_run
    return pipeline_run


@app.get("/api/v1/pipeline/runs")
def list_pipeline_runs(limit: int = 20):
    bounded_limit = max(0, min(limit, 100))
    if not bounded_limit:
        return []
    runs = list(PIPELINE_RUNS.values())[-bounded_limit:]
    return [recent_run_summary(run) for run in reversed(runs)]


@app.get("/api/v1/pipeline/runs/{run_id}")
def get_pipeline_run(run_id: str):
    if run_id not in PIPELINE_RUNS:
        raise HTTPException(404, "Pipeline run not found")
    return PIPELINE_RUNS[run_id]


@app.get("/api/v1/pipeline/state")
def pipeline_state(db: Session = Depends(get_db)):
    state = db.execute(text("""
        SELECT
            EXISTS (
                SELECT 1 FROM customers
                UNION ALL SELECT 1 FROM catalogue
                UNION ALL SELECT 1 FROM orders
                UNION ALL SELECT 1 FROM transactions
            ) AS data_available,
            (SELECT MAX(order_date)::date FROM orders) AS latest_business_date
    """)).mappings().one()
    return {
        "data_available": state["data_available"],
        "persistence": "postgres",
        "latest_business_date": state["latest_business_date"],
    }


@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    query_result = db.execute(text("SELECT 1"))
    return {"database_connection": "OK", "result": query_result.scalar()}


@app.get("/customers/count")
def count_customers(db: Session = Depends(get_db)):
    return {"total_customers": db.query(Customer).count()}
