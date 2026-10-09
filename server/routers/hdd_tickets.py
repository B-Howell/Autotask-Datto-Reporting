from fastapi import APIRouter, Query

from core import streams
from routers.common import run_report
from services import hdd_tickets

router = APIRouter(prefix="/api/hdd-tickets", tags=["hdd-tickets"])
STREAM = "hdd"


def _parse_ids(company_ids):
    if not company_ids:
        return None
    return [int(x) for x in company_ids.split(",") if x.strip().lstrip("-").isdigit()]


@router.get("")
def hdd_report(
    company_ids: str | None = Query(None, description="Comma-separated company ids; omit for all"),
    refresh: bool = False,
):
    ids = _parse_ids(company_ids)
    return run_report(
        STREAM,
        "HDD Storage Tickets",
        lambda log: hdd_tickets.get_hdd_report(ids, logger=log, refresh=refresh),
    )


@router.get("/logs")
async def hdd_logs():
    return streams.sse_response(STREAM)
