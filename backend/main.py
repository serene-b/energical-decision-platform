from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db
from models import Customer

app = FastAPI(title="Energical Decision Platform API")

@app.get("/")
def read_root():
    return {"message": "API Energical fonctionne correctement"}

@app.get("/test-db")
def test_db_connection(db: Session = Depends(get_db)):
    result = db.execute(text("SELECT 1"))
    return {"database_connection": "OK", "result": result.scalar()}



@app.get("/customers/count")
def count_customers(db: Session = Depends(get_db)):
    count = db.query(Customer).count()
    return {"total_customers": count}