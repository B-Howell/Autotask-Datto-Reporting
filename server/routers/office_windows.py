from fastapi import APIRouter, Query

from core import streams
from routers.common import run_report
from services import office_windows

router = APIRouter(prefix="/api/office-windows", tags=["office-windows"])
STREAM = "office-windows"


@router.get("/breakdown")
def breakdown(company_id: int = Query(...), site_id: str = Query(...), refresh: bool = False):
    return run_report(
        STREAM,
        f"Office / Windows · {company_id}",
        lambda log: office_windows.get_office_windows(
            company_id, site_id, logger=log, refresh=refresh
        ),
    )


@router.get("/breakdown/logs")
async def breakdown_logs():
    return streams.sse_response(STREAM)
