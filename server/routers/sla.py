from fastapi import APIRouter, Query

from core import streams
from routers.common import run_report
from services import sla

router = APIRouter(prefix="/api/sla-performance", tags=["sla"])
STREAM = "sla"


@router.get("")
def sla_report(
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    refresh: bool = False,
):
    return run_report(
        STREAM,
        f"SLA Performance · {year}-{month:02d}",
        lambda log: sla.get_sla_report(year, month, logger=log, refresh=refresh),
    )


@router.get("/logs")
async def sla_logs():
    return streams.sse_response(STREAM)
