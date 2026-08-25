from typing import Optional
from fastapi import APIRouter
from pydantic import BaseModel

try:
    from ..services.ga4 import (
        get_ga4_status,
        save_ga4_credentials,
        test_ga4_connection,
        delete_ga4_credentials,
    )
except (ImportError, ValueError):
    try:
        from services.ga4 import (
            get_ga4_status,
            save_ga4_credentials,
            test_ga4_connection,
            delete_ga4_credentials,
        )
    except (ImportError, ValueError):
        from ga4_service import (
            get_ga4_status,
            save_ga4_credentials,
            test_ga4_connection,
            delete_ga4_credentials,
        )

router = APIRouter(prefix="/api/v1/integrations/ga4", tags=["ga4"])

class GA4CredentialsPayload(BaseModel):
    property_id: str
    credentials_json: Optional[str] = None

@router.get("")
async def get_ga4_integration():
    return get_ga4_status()

@router.post("")
async def save_ga4_integration(payload: GA4CredentialsPayload):
    return save_ga4_credentials(payload.property_id, payload.credentials_json)

@router.post("/test")
async def test_ga4_integration(payload: GA4CredentialsPayload):
    return test_ga4_connection(payload.property_id, payload.credentials_json)

@router.delete("")
async def delete_ga4_integration():
    return delete_ga4_credentials()
