"""Presets over HTTP: the stored report configurations a schedule renders."""

from fastapi import APIRouter
from pydantic import BaseModel

from routers.common import call_or_http_error
from services import presets

router = APIRouter(prefix="/api/presets", tags=["presets"])


class PresetBody(BaseModel):
    """Every field optional so one body serves create and partial update.

    Only the fields the caller sent are passed on (`exclude_unset`), so a
    rename does not wipe the report type; the service validates the merged
    row and names the field that is wrong.
    """

    name: str | None = None
    report_type: str | None = None
    agency_key: str | int | None = None
    agency_name: str | None = None
    options: dict | None = None


@router.get("")
def list_presets():
    return presets.list_presets()


@router.post("", status_code=201)
def create_preset(body: PresetBody):
    return call_or_http_error(lambda: presets.create(body.model_dump(exclude_unset=True)))


@router.put("/{preset_id}")
def update_preset(preset_id: int, body: PresetBody):
    return call_or_http_error(
        lambda: presets.update(preset_id, body.model_dump(exclude_unset=True))
    )


@router.delete("/{preset_id}")
def delete_preset(preset_id: int):
    call_or_http_error(lambda: presets.delete(preset_id))
    return {"deleted": True}
