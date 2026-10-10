# Docker Compose stack

> The three-container production stack: a FastAPI server that is never published to the host, a Node renderer the server calls for scheduled report files, and an nginx client that serves the bundle and proxies the API.

## Purpose

The application is self-hosted on one small box at the MSP, so the deployment unit is a single `docker compose up -d --build`. Compose builds all three images from the repository, wires them on a private network, and keeps the server's data directory on a named volume so the SQLite cache, the agency list, saved reports and the master key for stored credentials survive a redeploy.

## Interface

| Service | Image | Exposure | Notes |
|---|---|---|---|
| `server` | `autotask-datto-reporting/server:latest`, built from `server/` | `expose: 8000` only (compose network, not the host) | reads `./server/.env`, sets `RENDERER_URL=http://renderer:3100`, depends on `renderer`, mounts `reporting-data` at `/app/data`, health check hits `/health` every 30 s |
| `renderer` | `autotask-datto-reporting/renderer:latest`, built from `client/` with `Dockerfile.renderer` | `expose: 3100` only | runs `tsx renderer/server.ts` on `0.0.0.0:3100`; no volumes, no env file |
| `client` | `autotask-datto-reporting/client:latest`, built from `client/` | host port 80 | depends on `server`; nginx proxies `/api/*` to `server:8000` |

Volume: `reporting-data`, the server's `DATA_DIR`. Besides the database, the agency list, the tenant settings and the saved reports it holds `secret.key`, the master key the server generates on first use when `APP_SECRET_KEY` is not set.

## Uses

- The server image from the [server packaging inventory](<../server/Reporting Server Packaging and Configuration Inventory.md>) and its settings loader, [config](<../server/Reporting Server - config.md>).
- The client image and its [nginx configuration](<../client/Reporting Client - nginx.md>).
- The renderer image, described in the [client tooling inventory](<../client/Reporting Client Tooling and Asset Inventory.md>), and the [renderer server](<../client/renderer/Reporting Renderer - server.md>) it runs.
- The [demo override](<Reporting Demo Compose Override.md>) layers on top of this file.

## Used By

- Nothing imports this; it is the deployment entry point described in the README.

## Key Behavior

- The server is deliberately not published. The only path to the API is through nginx, which also means CORS is not involved in production; `CORS_ORIGINS` only matters for the Vite dev server.
- The renderer is not published either and has no authentication; it is reachable only by name on the compose network, and the server is its only caller. `RENDERER_URL` is set in the compose file rather than `.env` because it names a compose service, not a deployment value.
- `RENDERER_URL` survives the demo override. The [demo override](<Reporting Demo Compose Override.md>) sets `environment.DEMO_MODE` on the same service; compose merges `environment` maps key by key when the files are combined, so the demo stack's server sees both `DEMO_MODE=1` and `RENDERER_URL=http://renderer:3100`. The override does not touch `depends_on`, so the renderer starts there too.
- `depends_on` on the server only orders startup; it does not wait for the renderer to be ready. The renderer is a Node process that listens within a second or two, and a delivery that runs before it is up fails that one run and is retried on its schedule, so there is no health check on it.
- The health check runs with the Python already in the image and a five second timeout, so an unhealthy server shows up in `docker ps` without installing curl.
- `restart: unless-stopped` on every service covers host reboots.
- Back the volume up as a whole. The credentials entered on the Settings page are encrypted rows in the database, and `secret.key` on the same volume is the only thing that can read them; a backup of the database without the key is useless, and a volume lost or recreated without it means entering the credentials again, as the [credential storage page](<Reporting Credential Storage.md>) describes.
- The commented image names are placeholders for a registry. Building on the host is the documented path because the deployment is one machine.
- Port 80 is the only host-facing setting; the comment in the file tells an operator to change the left side of the mapping when 80 is taken.

## Cleanup Notes

- None noted.

## Source

[docker-compose.yml](../../docker-compose.yml)
