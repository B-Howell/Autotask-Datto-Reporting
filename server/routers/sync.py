from fastapi import APIRouter

from core import streams
from repositories import snapshots
from services.sync import STREAM, runner

router = APIRouter(prefix="/api/sync", tags=["sync"])


@router.post("")
def trigger_sync():
    started = runner.start()
    return {"started": started, **runner.status()}


@router.get("/status")
def sync_status():
    return runner.status()


@router.get("/state")
def sync_state():
    """Per-report outcome of the last refresh.

    A report whose refresh keeps failing silently serves its previous snapshot,
    so this is where that shows up without reading container logs.
    """
    return {
        "sync_state": snapshots.list_sync_state(),
        "device_office_coverage": snapshots.device_office_coverage(),
    }


@router.get("/logs")
async def sync_logs():
    return streams.sse_response(STREAM)
