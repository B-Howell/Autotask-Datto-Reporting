"""Schedules over HTTP: when a preset runs, who receives it, and what happened last.

Besides the schedule rows this router carries the scheduled reports page's
operational view: run history, the runner's status and log stream, a
run-now button, and two checks the page offers before anyone waits for the
first of the month (is the renderer up, does the delivery flow accept mail).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core import streams
from routers.common import call_or_http_error
from services import presets, scheduled_runs, schedules
from services.schedule_runner import STREAM, runner

router = APIRouter(prefix="/api/schedules", tags=["schedules"])


class ScheduleBody(BaseModel):
    """Every field optional so one body serves create and partial update.

    Only the fields the caller sent are passed on (`exclude_unset`), so a
    PUT with `{"enabled": false}` leaves the rest alone; the service
    validates the merged row and names the field that is wrong.
    """

    preset_id: int | None = None
    day_of_month: int | None = None
    hour: int | None = None
    recipients_to: list[str] | None = None
    recipients_cc: list[str] | None = None
    subject: str | None = None
    body: str | None = None
    enabled: bool | None = None


class TestDelivery(BaseModel):
    to: list[str] = Field(min_length=1)


def _joined(schedule):
    """The row as the list route shapes it: with its preset attached."""
    return {**schedule, "preset": presets.get(schedule["preset_id"])}


# The literal paths are declared before the `/{schedule_id}` routes so that
# a request for `/runs` or `/status` is never parsed as a schedule id.


@router.get("")
def list_schedules():
    return schedules.list_schedules()


@router.post("", status_code=201)
def create_schedule(body: ScheduleBody):
    return _joined(
        call_or_http_error(lambda: schedules.create(body.model_dump(exclude_unset=True)))
    )


@router.get("/runs")
def recent_runs(limit: int = Query(50, ge=1, le=500)):
    """The newest runs across every schedule, for the page's history table."""
    return schedules.recent_runs(limit)


@router.get("/status")
def runner_status():
    return runner.status()


@router.get("/logs")
async def schedule_logs():
    return streams.sse_response(STREAM)


@router.get("/renderer-health")
def renderer_health():
    return call_or_http_error(scheduled_runs.renderer_health)


@router.post("/test-delivery")
def test_delivery(body: TestDelivery):
    """Send a one-line message with no attachment through the delivery flow."""
    call_or_http_error(lambda: scheduled_runs.send_test_message(body.to))
    return {"sent": True}


@router.put("/{schedule_id}")
def update_schedule(schedule_id: int, body: ScheduleBody):
    return _joined(
        call_or_http_error(
            lambda: schedules.update(schedule_id, body.model_dump(exclude_unset=True))
        )
    )


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int):
    call_or_http_error(lambda: schedules.delete(schedule_id))
    return {"deleted": True}


@router.get("/{schedule_id}/runs")
def schedule_runs(schedule_id: int):
    return call_or_http_error(lambda: schedules.runs_for(schedule_id))


@router.post("/{schedule_id}/run", status_code=202)
def run_schedule_now(schedule_id: int):
    """Start the schedule on the runner's thread; the page follows `/logs`."""
    call_or_http_error(lambda: schedules.existing(schedule_id))
    if not runner.run_now(schedule_id):
        running = runner.status()["schedule_id"]
        which = f"schedule {running}" if running is not None else "another schedule"
        raise HTTPException(status_code=409, detail=f"A run of {which} is already in flight")
    return {"started": True}
