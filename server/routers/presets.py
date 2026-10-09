"""Presets over HTTP: the stored report configurations a schedule renders."""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

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


def _or_error(fn):
    """Run a service call, mapping its failures to the usual status codes."""
    try:
        return fn()
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get("")
def list_presets():
    return presets.list_presets()


@router.post("", status_code=201)
def create_preset(body: PresetBody):
    return _or_error(lambda: presets.create(body.model_dump(exclude_unset=True)))


@router.put("/{preset_id}")
def update_preset(preset_id: int, body: PresetBody):
    return _or_error(lambda: presets.update(preset_id, body.model_dump(exclude_unset=True)))


@router.delete("/{preset_id}")
def delete_preset(preset_id: int):
    # The service refuses while a schedule still renders this preset; that
    # is a conflict with existing state, not a malformed request.
    try:
        presets.delete(preset_id)
    except ValueError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    return {"deleted": True}
