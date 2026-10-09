# nginx config

> The production web server for the client: serves the built bundle, falls back to `index.html` for client-side routes, caches hashed assets and proxies `/api` to the FastAPI container with streaming enabled.

## Purpose

`client/nginx.conf` is copied into the nginx image as `/etc/nginx/conf.d/default.conf` by the client Dockerfile. It is the only process the browser talks to in production. It serves the static files from `/usr/share/nginx/html` (the Vite `dist/` output) and reverse-proxies everything under `/api/` to `http://server:8000`, where `server` is the backend service name on the compose network.

The design constraint that shapes it is Server-Sent Events. Every report streams its log and progress lines over SSE for minutes at a time, and nginx's default behaviour (buffer the upstream response, time out after 60 s) would break that, so the `/api/` block turns buffering off and raises the timeouts.

## Interface

| Block or directive | Setting | Why |
|---|---|---|
| `location = /index.html` | `Cache-Control: no-store, no-cache, must-revalidate`, `expires off` | The shell must never be cached, or a deploy would leave browsers pointing at asset hashes that no longer exist. |
| `location /assets/` | `expires 1y`, `Cache-Control: public, immutable` | Vite emits content-hashed filenames, so a file at a given URL never changes. |
| `location /` | `try_files $uri $uri/ /index.html` | SPA fallback: any path the filesystem does not have (e.g. `/reports/tickets`) is answered with the shell so React Router can route it. |
| `location /api/` | `proxy_pass http://server:8000` | Same-origin API; the client never needs CORS. |
| | `client_max_body_size 100M` | Saved-report uploads; the annual utilization workbook carries a year of time entries and exceeded the 1 MB default. |
| | `proxy_http_version 1.1`, empty `Connection` header | Keep-alive to the upstream, and no `Connection: close` injected into the streamed response. |
| | `proxy_buffering off`, `proxy_cache off` | SSE lines reach the browser as they are written, not when the response ends. |
| | `proxy_read_timeout 600s`, `proxy_send_timeout 600s` | A report may run for minutes; the stream must not be cut at the 60 s default. |
| | `X-Real-IP`, `X-Forwarded-For`, `X-Forwarded-Proto`, `Host` | Standard forwarding headers for the server's logs. |

## Uses

- The nginx image and the compose network name `server` for the backend.
- The `dist/` output described in [Vite config](<Reporting Client - vite config.md>).

## Used By

- Nothing imports this; it is an entry point consumed by the client Dockerfile.

## Key Behavior

- nginx picks the longest matching prefix, so `/api/...` requests go to the proxy block and never fall through to the `index.html` fallback.
- The 413 for oversized uploads surfaced as a bare status with nothing in the server log, because nginx rejected it before proxying. That is why the body limit lives here rather than in FastAPI.
- `proxy_read_timeout` is an idle timeout, not a total. An SSE stream that goes 600 s with no line is closed; the browser's `EventSource` reconnects on its own and the client ignores stream errors (see [reportJob util](<utils/Reporting Util - reportJob.md>)).
- Only `/assets/` is cached long-term. Files in `/public` (report icons, agency logos) are served with nginx defaults.
- There is no TLS here; the expectation is that a host-level reverse proxy or the LAN handles it.

## Cleanup Notes

- None noted.

## Source

[client/nginx.conf](../../client/nginx.conf)
