"""HTTP client for the Node renderer that turns report data into files.

The renderer runs the same export builders the browser uses, so a scheduled
file carries the bytes a user would have downloaded. This module is the only
place the server speaks to it: `render` posts one report and returns the
file, `health` asks whether the service is up and which report types it
knows. Both wrap every failure in `RenderError` so the scheduler can record
a readable reason on the run.
"""

import requests

from config import settings

# Workbooks for a large agency take a while to build; the cap is generous so a
# slow render is reported by the renderer, not cut off by the client.
TIMEOUT = 120
HEALTH_TIMEOUT = 5


class RenderError(RuntimeError):
    """The renderer could not be reached or refused the request."""


def _failure(action, response):
    return RenderError(f"Renderer {action} returned {response.status_code}: {response.text[:500]}")


def render(report_type, data, options, filename, logo_base64=None):
    """Renders one report; returns `(bytes, content_type)`.

    The payload is the renderer's `RenderRequest`: `reportType`, `data`,
    `options`, `filename` and `logoBase64`. The renderer echoes `filename` in
    its content-disposition header and does not derive anything from it.
    """
    payload = {
        "reportType": report_type,
        "data": data,
        "options": options or {},
        "filename": filename,
        "logoBase64": logo_base64,
    }
    try:
        response = requests.post(f"{settings.renderer_url}/render", json=payload, timeout=TIMEOUT)
    except requests.RequestException as exc:
        raise RenderError(f"Renderer unreachable at {settings.renderer_url}: {exc}") from exc
    if response.status_code != 200:
        raise _failure("render", response)
    return response.content, response.headers.get("content-type", "application/octet-stream")


def health():
    """The renderer's `/health` body (`ok` and `reportTypes`), or `RenderError`."""
    try:
        response = requests.get(f"{settings.renderer_url}/health", timeout=HEALTH_TIMEOUT)
    except requests.RequestException as exc:
        raise RenderError(f"Renderer unreachable at {settings.renderer_url}: {exc}") from exc
    if response.status_code != 200:
        raise _failure("health check", response)
    return response.json()
