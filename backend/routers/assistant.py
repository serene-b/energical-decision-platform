from typing import Optional, Dict
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from ..services.assistant import sanitize_context, handle_assistant_query
except (ImportError, ValueError):
    try:
        from services.assistant import sanitize_context, handle_assistant_query
    except (ImportError, ValueError):
        from assistant_service import sanitize_context, handle_assistant_query

router = APIRouter(prefix="/api/v1/assistant", tags=["assistant"])

class AssistantContextPayload(BaseModel):
    page: Optional[str] = "overview"
    selection_type: Optional[str] = "dashboard_selection"
    selection: Optional[str] = "Current View"
    approved_metrics: Optional[dict] = None

class AssistantQueryPayload(BaseModel):
    query: Optional[str] = None
    question: Optional[str] = None
    page: Optional[str] = "overview"
    selection_type: Optional[str] = "dashboard_selection"
    selection: Optional[str] = "Current View"
    approved_metrics: Optional[dict] = None

@router.post("/context")
async def assistant_context(payload: AssistantContextPayload):
    return sanitize_context(payload.dict())

@router.post("/query")
async def assistant_query(payload: AssistantQueryPayload):
    return handle_assistant_query(payload.dict())
