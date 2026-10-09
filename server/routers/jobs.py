from fastapi import APIRouter

from core import jobs

router = APIRouter(prefix="/api/jobs", tags=["jobs"])


@router.get("/current")
def current_job():
    """The report being generated right now, so a reloaded page can show it."""
    return jobs.current() or {}


@router.post("/current/cancel")
def cancel_current_job():
    return {"cancelled": jobs.cancel()}


@router.delete("/current")
def dismiss_current_job():
    jobs.clear()
    return {"ok": True}
