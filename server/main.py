"""FastAPI application: wiring only. Behaviour lives in services/."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from repositories import snapshots, sqlite
from routers import (
    agencies,
    credentials,
    devices,
    hdd_tickets,
    health,
    jobs,
    manual_inputs,
    office_windows,
    patch_management,
    presets,
    saved_reports,
    schedules,
    sla,
    sync,
    tenant,
    tickets,
    utilization,
)
from routers.common import validation_error_response
from services import schedule_runner
from services.sync import runner

ROUTERS = (
    health,
    agencies,
    devices,
    office_windows,
    tickets,
    sla,
    utilization,
    patch_management,
    hdd_tickets,
    jobs,
    sync,
    manual_inputs,
    saved_reports,
    presets,
    schedules,
    tenant,
    credentials,
)


async def _sync_scheduler():
    # Warm a cold database shortly after boot, then refresh on the configured
    # interval. The runner skips a start while a sync is already in flight or
    # while a vendor has no credentials yet, so a fresh install waits for the
    # Settings page rather than failing every step.
    await asyncio.sleep(5)
    if snapshots.last_sync_time() is None:
        runner.start()
    while True:
        await asyncio.sleep(settings.sync_interval_hours * 3600)
        runner.start()


async def _schedule_ticker():
    # Scheduled reports fire on a day and an hour; checking once a minute is
    # plenty, and because due() compares with <= now a missed minute does not
    # skip a run. The tick is one SQLite query, but a snapshot swap can hold
    # the database lock for a while, so it runs on a worker thread rather
    # than stalling every HTTP request on the event loop.
    await asyncio.sleep(10)
    while True:
        try:
            await asyncio.to_thread(schedule_runner.runner.tick)
        except Exception as exc:
            print(f"[WARN] schedule tick failed: {exc}")
        await asyncio.sleep(settings.schedule_poll_seconds)


@asynccontextmanager
async def lifespan(_app):
    sqlite.init_db()
    # A run the previous process was in the middle of has no one left to
    # close it; its schedule was already advanced, so it is recorded as an
    # error rather than run again.
    schedule_runner.sweep_interrupted()
    scheduler = asyncio.create_task(_sync_scheduler())
    ticker = asyncio.create_task(_schedule_ticker())
    try:
        yield
    finally:
        scheduler.cancel()
        ticker.cancel()
        # A run on its last step (closing its row) gets a moment to finish;
        # one still rendering is a daemon thread that process exit ends, and
        # the sweep on the next start records it as interrupted.
        schedule_runner.runner.join(timeout=1)


def create_app():
    app = FastAPI(title="Autotask + Datto Reporting", lifespan=lifespan)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.middleware("http")
    async def no_cache_headers(request: Request, call_next):
        # Every layer between the server and the page (browser, proxy, service
        # worker) must be stopped from serving stale report data.
        response = await call_next(request)
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
        response.headers["Expires"] = "0"
        return response

    for module in ROUTERS:
        app.include_router(module.router)
    app.add_exception_handler(RequestValidationError, validation_error_response)
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    # A short graceful window: uvicorn otherwise waits for in-flight requests,
    # and a report request can run for minutes, which held Ctrl+C hostage.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, timeout_graceful_shutdown=2)
