# renderer server

> The HTTP front for the renderer: a health probe and one `POST /render` route that turns a JSON report request into a file download, run with `npm run renderer`.

## Purpose

`client/renderer/server.ts` is the process the reporting server talks to when it needs a file for a scheduled delivery. It is deliberately tiny: Node's own `http.createServer`, no framework, two routes, JSON in and bytes out. All of the report knowledge lives in [render](<Reporting Renderer - render.md>); this file only reads the body, enforces a size cap, maps failures to status codes and writes the response headers a caller needs to store the file under its name.

It starts with `npm run renderer`, which runs the TypeScript directly through `tsx`, so the renderer shares the client's source, path alias and installed libraries without a separate build step.

## Interface

| Route | Request | Response |
|---|---|---|
| `GET /health` | none | `200` JSON `{ ok: true, reportTypes: [...] }`, the keys of the handler map. |
| `POST /render` | JSON `RenderRequest` (`reportType`, `data`, `options`, `filename`, optional `logoBase64`), at most 50 MB | `200` with the file bytes, `content-type` from the handler, `content-length`, and `content-disposition: attachment; filename="<URL-encoded name>"`. |
| anything else | | `404` JSON `{ error: "Not found" }`. |

Errors are JSON `{ error }` with `400` for an unknown report type, a body over the cap, a body that is not valid JSON or not an object, or a request missing `reportType` or `filename`; everything else is `500`. Every failure logs one line, `METHOD /url -> status: message`, to stderr.

| Setting | Source | Default |
|---|---|---|
| Port | `RENDERER_PORT` environment variable | `3100` |
| Body cap | `MAX_BODY_BYTES` constant | 50 MB |

## Uses

- `node:http` for the server and the request and response types.
- [render](<Reporting Renderer - render.md>) for `render` and `REPORT_TYPES`.

## Used By

- The `renderer` script in the [package manifest](<../Reporting Client - package manifest.md>).
- The reporting server's scheduled delivery, which posts report data here and stores the bytes it gets back.

## Key Behavior

- The body is read chunk by chunk and the request is destroyed as soon as the running total passes the cap, so an oversized post is rejected without being buffered.
- `parseRequest` normalises the loose JSON into a `RenderRequest`: `options` becomes `{}` when absent or not an object, `logoBase64` becomes null unless it is a string, and the two required strings are checked before anything is rendered.
- `RequestError` carries a status; the one handler-side failure that is the caller's fault, an unknown report type, is recognised by its message and promoted to a 400 so the server sees a clear contract error instead of a generic failure.
- The file name goes into `content-disposition` URL-encoded, so spaces and non-ASCII characters in an agency name survive the header; the caller decodes it or, more simply, keeps the name it sent.
- If a failure happens after the headers were written the response is ended without a JSON body, since the status cannot be changed at that point.
- The listen line prints the port and the report types once, which is the only output on a healthy run.

## Cleanup Notes

- There is no authentication; the service is meant to listen on a private network or loopback beside the reporting server, which is the only caller.

## Source

[client/renderer/server.ts](../../../client/renderer/server.ts)
