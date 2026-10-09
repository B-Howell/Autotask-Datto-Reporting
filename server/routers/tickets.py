from fastapi import APIRouter, Query

from routers.common import run_report
from services import tickets

router = APIRouter(prefix="/api/tickets", tags=["tickets"])
STREAM = "tickets"


@router.get("/details")
def ticket_details(
    company_id: int = Query(...),
    year: int = Query(..., ge=2000, le=2100),
    month: int = Query(..., ge=1, le=12),
    refresh: bool = False,
):
    return run_report(
        STREAM,
        f"Ticket Report · {company_id} · {year}-{month:02d}",
        lambda log: tickets.get_ticket_details(
            company_id, year, month, logger=log, refresh=refresh
        ),
    )
