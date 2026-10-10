# Renderer integration

> The HTTP client for the Node renderer: posts a report's data and gets the finished file back, and asks the renderer whether it is up.

## Purpose

Scheduled deliveries have to produce the same xlsx, docx and pdf bytes a user gets from the browser, and those builders are TypeScript. Rather than port them, the client ships a small Node service (the renderer under `client/renderer/`) that runs the same builders behind `POST /render`. This module is the server's only conversation with that service. Services call `render` with the report payload they already assemble for the browser and receive bytes plus a content type; the scheduled reports page calls `health` so an operator can see at a glance whether the renderer is reachable. Every failure, reachability or refusal, surfaces as one exception type with a message fit to store on a run.

## Interface

| Name | Description |
|---|---|
| `render(report_type, data, options, filename, logo_base64=None)` | `POST {renderer_url}/render` with the renderer's request shape; returns `(bytes, content_type)`. |
| `health()` | `GET {renderer_url}/health`; returns the parsed body, `{"ok": true, "reportTypes": [...]}`. A 200 whose body is not JSON is a `RenderError` (`Renderer answered with a body that is not JSON`), not a `ValueError`. |
| `RenderError` | Raised by both when the renderer is unreachable or answers anything but 200. |
| `TIMEOUT`, `HEALTH_TIMEOUT` | 120 and 5 seconds. |

## Uses

- `requests`.
- [config](<../Reporting Server - config.md>) for `renderer_url`.

## Used By

- [server/tests/test_renderer_client.py](../../../server/tests/test_renderer_client.py).
- [scheduled_runs service](<../services/Reporting Service - scheduled_runs.md>) (`render`, once per run, with the payload the browser would have built).
- [schedules router](<../routers/Reporting Router - schedules.md>) (`health` from `GET /api/schedules/renderer-health`; a `RenderError` becomes its 502).

## Key Behavior

- The request is the renderer's `RenderRequest` contract from `client/renderer/render.ts`: `reportType` (one of the renderer's handler names), `data` (the report payload, whose shape depends on the type), `options` (the per-report settings such as device columns or the pdf/docx choice; `None` is sent as `{}` because the renderer requires an object), `filename` (echoed in the renderer's content-disposition header, never derived from) and `logoBase64` (the agency logo as a base64 PNG, or null). The renderer validates only that `reportType` and `filename` are strings and `data` is an object; a payload of the wrong shape fails inside the builder and comes back as a 500.
- Only a 200 is a success. The renderer answers 400 for a malformed request or an unknown report type, 413 when the body exceeds its 50 MB cap and 500 for a builder failure, each with a JSON `{error}` body. The client does not parse that body; it puts the status and the first 500 characters of the text into the `RenderError` message, so `Unknown report type: x` reads through unchanged while a stack trace cannot bloat the stored error.
- The content type comes from the response header, falling back to `application/octet-stream` if the renderer ever omits it; the renderer sets it from the builder (`XLSX_MIME`, `DOCX_MIME` or `application/pdf`), and the delivery message passes it on as the attachment's `contentType`.
- A `requests.RequestException` (connection refused, DNS, timeout) is wrapped in a `RenderError` that names the configured URL, because the most common cause is the renderer not running or `RENDERER_URL` pointing at the wrong host.
- `health` uses a short timeout so a status page does not hang on a down renderer, and raises rather than returning a flag so callers handle the down case the same way they handle a failed render. The body is parsed inside a `try`: a reverse proxy answering 200 with an HTML page would otherwise surface as a bare `ValueError`, which the routers map to a 400 as if the caller were at fault; wrapped as `RenderError` it reaches the page as the 502 it is.
- `settings` is read at call time through the module's name, so a test can swap the URL with `dataclasses.replace` and the same pattern will serve a future reload.

## Cleanup Notes

- The renderer's `/health` body includes `reportTypes`; the presets service keeps its own copy of that list in sync by test rather than by calling `health`, so the two can drift in a deployment that runs mismatched images. Nothing enforces the match at runtime yet.

## Source

[server/integrations/renderer.py](../../../server/integrations/renderer.py)
