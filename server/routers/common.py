"""Shared plumbing for the routes: job lifecycle and error mapping."""

from fastapi import HTTPException

from core import jobs, streams
from integrations import delivery, renderer
from services import presets

# nginx's "client closed request": the caller asked for the cancellation and
# has already stopped waiting for an answer.
HTTP_CLIENT_CLOSED_REQUEST = 499


def run_report(stream, label, run):
    """Run a report as the tracked job, logging to its stream.

    `run(logger)` does the work. A cancellation from the status bar surfaces
    as 499, a bad request (malformed dates and the like) as 400.
    """
    job_id = jobs.start(label)
    logger = streams.report_logger(stream, job_id=job_id)
    try:
        result = run(logger)
        jobs.finish(job_id)
        return result
    except jobs.ReportCancelled:
        # Logged outside the tracked logger: that one checks the cancel flag
        # and would raise again from inside this handler.
        streams.get_buffer(stream).append("[DONE] Cancelled")
        jobs.note(job_id, "[DONE] Cancelled")
        jobs.finish(job_id, cancelled=True)
        raise HTTPException(
            status_code=HTTP_CLIENT_CLOSED_REQUEST, detail="Report cancelled"
        ) from None
    except ValueError as exc:
        jobs.finish(job_id, error=exc)
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        jobs.finish(job_id, error=exc)
        raise


def call_or_http_error(fn):
    """Run a service call, answering each of its typed failures with a status.

    `InUseError` is a `ValueError` that means a conflict with existing state,
    so it is matched before the plain `ValueError` clause.
    """
    try:
        return fn()
    except presets.InUseError as exc:
        raise HTTPException(status_code=409, detail=str(exc)) from exc
    except LookupError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except (renderer.RenderError, delivery.DeliveryError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
