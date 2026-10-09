from fastapi import APIRouter, Query
from pydantic import BaseModel

from core import streams
from routers.common import run_report
from services import devices

router = APIRouter(prefix="/api/devices", tags=["devices"])
STREAM = "devices"


class DeviceChange(BaseModel):
    deviceId: int
    field: str
    value: str | None = None


class DeviceUpdate(BaseModel):
    changes: list[DeviceChange]


@router.get("")
def device_sheet(company_id: int = Query(...), site_id: str = Query(...), refresh: bool = False):
    return run_report(
        STREAM,
        f"Device Report · {company_id}",
        lambda log: devices.get_device_sheet(company_id, site_id, logger=log, refresh=refresh),
    )


@router.get("/logs")
async def device_logs():
    return streams.sse_response(STREAM)


@router.post("/update")
def update_devices(body: DeviceUpdate):
    logger = streams.report_logger(STREAM, clear=False)
    results = devices.update_devices([c.model_dump() for c in body.changes], logger=logger)
    return {"status": "success", "results": results}
