from fastapi import APIRouter, Query
from pydantic import BaseModel

from repositories import manual_inputs

router = APIRouter(prefix="/api/manual-inputs", tags=["manual-inputs"])


class ManualInput(BaseModel):
    agency_key: str
    report_type: str
    field_key: str
    value: str | None = None


@router.get("")
def get_manual_inputs(agency_key: str = Query(...), report_type: str = Query(...)):
    """Saved hand-entered values for one agency and report, e.g. {'Windows 11': '30'}."""
    return manual_inputs.get_manual_inputs(agency_key, report_type)


@router.put("")
def put_manual_input(body: ManualInput):
    manual_inputs.set_manual_input(
        body.agency_key, body.report_type, body.field_key, body.value or ""
    )
    return {"ok": True}
