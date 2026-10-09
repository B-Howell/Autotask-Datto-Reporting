from fastapi import APIRouter, HTTPException, Query

from core import jobs, streams
from routers.common import run_report
from services import utilization

router = APIRouter(prefix="/api/agency-utilization", tags=["utilization"])
STREAM = "utilization"

START = Query(..., description="Inclusive start date, YYYY-MM-DD")
END = Query(..., description="Inclusive end date, YYYY-MM-DD")


@router.get("")
def utilization_report(start: str = START, end: str = END, refresh: bool = False):
    return run_report(
        STREAM,
        f"Utilization · {start} to {end}",
        lambda log: utilization.get_utilization(start, end, logger=log, refresh=refresh),
    )


@router.get("/entries")
def utilization_entries(start: str = START, end: str = END):
    """The raw time entries behind a report, for the Excel export."""
    logger = streams.report_logger(STREAM, clear=False)

    def log(message):
        logger(message)
        jobs.note_current(message)

    try:
        return {"entries": utilization.get_entries(start, end, logger=log)}
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("/logs")
async def utilization_logs():
    return streams.sse_response(STREAM)
