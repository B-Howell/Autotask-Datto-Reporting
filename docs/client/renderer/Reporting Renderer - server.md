# renderer server

> The HTTP front for the renderer: a health probe and one `POST /render` route that turns a JSON report request into a file download, run with `npm run renderer`.

## Purpose

`client/renderer/server.ts` is the process the reporting server talks to when it needs a file for a scheduled delivery. It is deliberately tiny: Node's own `http.createServer`, no framework, two routes, JSON in and bytes out. All of the report knowledge lives in [render](<Reporting Renderer - render.md>); this file only reads the body, enforces a size cap, checks the request has the fields the dispatcher needs, maps failures to status codes and writes the response headers a caller needs to store the file under its name.

It starts with `npm run renderer`, which runs the TypeScript directly through `tsx`, so the renderer shares the client's source, path alias and installed libraries without a separate build step. The server is also exported as a factory so a test can bind it to a free port.

## Interface

| Route | Request | Response |
|---|---|---|
| `GET /health` | none | `200` JSON `{ ok: true, reportTypes: [...] }`, the keys of the handler map. |
| `POST /render` | JSON `RenderRequest` (`reportType`, `data`, `options`, `filename`, optional `logoBase64`), at most 50 MB | `200` with the file bytes, `content-type` from the handler, `content-length`, and `content-disposition` in the RFC 6266 form `attachment; filename="<ASCII fallback>"; filename*=UTF-8''<percent-encoded name>`. |
| anything else | | `404` JSON `{ error: "Not found" }`. |

Errors are JSON `{ error }`: `413` with `connection: close` for a body over the cap; `400` for a body that is not valid JSON or not an object, a request missing `reportType` or `filename`, a `data` that is not an object, or an unknown report type; `500` for anything else, including a payload whose shape does not match its report type, which fails inside the builder. Every failure logs one line, `METHOD /url -> status: message`, to stderr.

| Export | Signature | Description |
|---|---|---|
| `createRendererServer` | `({ maxBodyBytes? }) => Server` | The server, not yet listening; the cap defaults to `MAX_BODY_BYTES`. |
| `startRendererServer` | `() => Server` | Listens on the configured host and port and logs one line. |
| `contentDisposition` | `(filename) => string` | The header value described above. |
| `MAX_BODY_BYTES` | number | 50 MB. |

| Setting | Source | Default |
|---|---|---|
| Host | `RENDERER_HOST` | `127.0.0.1`; the container sets `0.0.0.0` so the reporting server can reach it over the compose network. |
| Port | `RENDERER_PORT` | `3100` |
| Body cap | `MAX_BODY_BYTES` constant, or the factory option | 50 MB |

## Uses

- `node:http` for the server and the request and response types; `node:url` to recognise when the file is the entry script.
- [render](<Reporting Renderer - render.md>) for `render` and `REPORT_TYPES`.

## Used By

- The `renderer` script in the [package manifest](<../Reporting Client - package manifest.md>).
- The reporting server's scheduled delivery, which posts report data here and stores the bytes it gets back.
- [client/renderer/server.test.ts](../../../client/renderer/server.test.ts), which binds the factory to port 0 and exercises every status.

## Key Behavior

- Oversized bodies: the body is read chunk by chunk and, as soon as the running total passes the cap, the data listener comes off and the stream is paused, so the server stops consuming without killing the socket. The `413` reply then goes out with `connection: close`, and the request is destroyed only after the response has finished. Destroying first would hand the caller a connection reset instead of a status; with this order curl receives the 413 part way through a 51 MB upload.
- `parseRequest` normalises the loose JSON into a `RenderRequest`: `reportType` and `filename` must be strings, `data` must be a non-null object, `options` becomes `{}` when absent or not an object, and `logoBase64` becomes null unless it is a string. Nothing is rendered until those checks pass.
- `RequestError` carries a status; the one handler-side failure that is the caller's fault, an unknown report type, is recognised by its message and promoted to a 400 so the server sees a clear contract error instead of a generic failure.
- The file name goes into `content-disposition` twice: a plain `filename` where every non-ASCII character and every double quote becomes `_`, for clients that read only that, and `filename*` carrying the exact name percent-encoded as UTF-8 (with `'`, `(`, `)` and `*` encoded too, since RFC 5987 leaves them out of the bare character set). A caller that already knows the name it sent can simply keep it.
- If a failure happens after the headers were written the response is ended without a JSON body, since the status cannot be changed at that point.
- The file listens only when it is the entry script (`process.argv[1]` matched against `import.meta.url`), so importing it from a test binds nothing.
- The listen line prints the host, the port and the report types once, which is the only output on a healthy run.

## Cleanup Notes

- There is no authentication; the service is meant to listen on loopback or a private container network beside the reporting server, which is the only caller.

## Source

[client/renderer/server.ts](../../../client/renderer/server.ts)
