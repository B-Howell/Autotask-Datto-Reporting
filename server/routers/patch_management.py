from fastapi import APIRouter, Query

from core import streams
from routers.common import run_report
from services import patch_management

router = APIRouter(prefix="/api/patch-management", tags=["patch-management"])
STREAM = "patch"


@router.get("")
def patch_report(site_id: str = Query(...), refresh: bool = False):
    return run_report(
        STREAM,
        f"Patch Management · {site_id}",
        lambda log: patch_management.get_patch_report(site_id, logger=log, refresh=refresh),
    )


@router.get("/logs")
async def patch_logs():
    return streams.sse_response(STREAM)
