"""Schedules over HTTP: when a preset runs, who receives it, and what happened last.

Besides the schedule rows this router carries the scheduled reports page's
operational view: run history, the runner's status and log stream, a
run-now button, and two checks the page offers before anyone waits for the
first of the month (is the renderer up, does the delivery flow accept mail).
"""

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from core import streams
from integrations import delivery, renderer
from repositories import schedules as schedule_repo
from services import presets, schedules
from services.schedule_runner import STREAM, runner

router = APIRouter(prefix="/api/schedules", tags=["schedules"])

TEST_SUBJECT = "Reporting: delivery test"
TEST_BODY = "This is a test message from the reporting server. Delivery is working."


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


def _or_error(fn):
    """Run a service call, mapping its failures to the usual status codes."""
    try:
        return fn()
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


def _joined(schedule):
    """The row as the list route shapes it: with its preset attached."""
    return {**schedule, "preset": presets.get(schedule["preset_id"])}


def _existing(schedule_id):
    schedule = schedules.get(schedule_id)
    if schedule is None:
        raise HTTPException(status_code=404, detail="No such schedule")
    return schedule


# The literal paths are declared before the `/{schedule_id}` routes so that
# a request for `/runs` or `/status` is never parsed as a schedule id.


@router.get("")
def list_schedules():
    return schedules.list_schedules()


@router.post("", status_code=201)
def create_schedule(body: ScheduleBody):
    return _joined(_or_error(lambda: schedules.create(body.model_dump(exclude_unset=True))))


@router.get("/runs")
def recent_runs(limit: int = Query(50, ge=1, le=500)):
    """The newest runs across every schedule, for the page's history table."""
    return schedule_repo.list_runs(limit=limit)


@router.get("/status")
def runner_status():
    return runner.status()


@router.get("/logs")
async def schedule_logs():
    return streams.sse_response(STREAM)


@router.get("/renderer-health")
def renderer_health():
    try:
        return renderer.health()
    except renderer.RenderError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


@router.post("/test-delivery")
def test_delivery(body: TestDelivery):
    """Send a one-line message with no attachment through the delivery flow."""
    try:
        delivery.send(to=body.to, cc=[], subject=TEST_SUBJECT, body=TEST_BODY, attachments=[])
    except delivery.DeliveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return {"sent": True}


@router.put("/{schedule_id}")
def update_schedule(schedule_id: int, body: ScheduleBody):
    return _joined(
        _or_error(lambda: schedules.update(schedule_id, body.model_dump(exclude_unset=True)))
    )


@router.delete("/{schedule_id}")
def delete_schedule(schedule_id: int):
    schedules.delete(schedule_id)
    return {"deleted": True}


@router.get("/{schedule_id}/runs")
def schedule_runs(schedule_id: int):
    _existing(schedule_id)
    return schedule_repo.list_runs(schedule_id)


@router.post("/{schedule_id}/run", status_code=202)
def run_schedule_now(schedule_id: int):
    """Start the schedule on the runner's thread; the page follows `/logs`."""
    _existing(schedule_id)
    if not runner.run_now(schedule_id):
        running = runner.status()["schedule_id"]
        which = f"schedule {running}" if running is not None else "another schedule"
        raise HTTPException(status_code=409, detail=f"A run of {which} is already in flight")
    return {"started": True}
