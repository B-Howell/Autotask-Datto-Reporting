"""Shared plumbing for the routes: job lifecycle and error mapping."""

from fastapi import HTTPException

from core import jobs, secrets, streams
from services import credentials, presets, scheduled_runs

# nginx's "client closed request": the caller asked for the cancellation and
# has already stopped waiting for an answer.
HTTP_CLIENT_CLOSED_REQUEST = 499
# The secrets error names the key file path, which the browser has no use for.
SECRETS_UNREADABLE = "Stored credentials cannot be read; check APP_SECRET_KEY or the key file"


def _report_failure(exc):
    """(status, detail) for a typed failure a report route answers, else None."""
    if isinstance(exc, ValueError):
        return 400, str(exc)
    if isinstance(exc, credentials.CredentialsMissing):
        return 503, str(exc)
    if isinstance(exc, secrets.SecretsError):
        return 503, SECRETS_UNREADABLE
    return None


def run_report(stream, label, run):
    """Run a report as the tracked job, logging to its stream.

    `run(logger)` does the work. A cancellation from the status bar surfaces
    as 499, a bad request (malformed dates and the like) as 400, and vendor
    credentials that are missing or unreadable as 503.
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
    except Exception as exc:
        jobs.finish(job_id, error=exc)
        failure = _report_failure(exc)
        if failure is None:
            raise
        status_code, detail = failure
        raise HTTPException(status_code=status_code, detail=detail) from exc


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
    except (scheduled_runs.RenderError, scheduled_runs.DeliveryError) as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
