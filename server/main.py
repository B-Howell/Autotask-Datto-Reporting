"""FastAPI application: wiring only. Behaviour lives in services/."""

import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware

from config import settings
from repositories import snapshots, sqlite
from routers import (
    agencies,
    devices,
    hdd_tickets,
    health,
    jobs,
    manual_inputs,
    office_windows,
    patch_management,
    saved_reports,
    sla,
    sync,
    tickets,
    utilization,
)
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
)


async def _sync_scheduler():
    # Warm a cold database shortly after boot, then refresh on the configured
    # interval. The runner skips a start while a sync is already in flight.
    await asyncio.sleep(5)
    if snapshots.last_sync_time() is None:
        runner.start()
    while True:
        await asyncio.sleep(settings.sync_interval_hours * 3600)
        runner.start()


@asynccontextmanager
async def lifespan(_app):
    sqlite.init_db()
    scheduler = asyncio.create_task(_sync_scheduler())
    try:
        yield
    finally:
        scheduler.cancel()


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
    return app


app = create_app()


if __name__ == "__main__":
    import uvicorn

    # A short graceful window: uvicorn otherwise waits for in-flight requests,
    # and a report request can run for minutes, which held Ctrl+C hostage.
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True, timeout_graceful_shutdown=2)
