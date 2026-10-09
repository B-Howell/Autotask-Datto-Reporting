# Docker Compose stack

> The two-container production stack: a FastAPI server that is never published to the host, and an nginx client that serves the bundle and proxies the API.

## Purpose

The application is self-hosted on one small box at the MSP, so the deployment unit is a single `docker compose up -d --build`. Compose builds both images from the repository, wires them on a private network, and keeps the server's data directory on a named volume so the SQLite cache, the agency list and saved reports survive a redeploy.

## Interface

| Service | Image | Exposure | Notes |
|---|---|---|---|
| `server` | `autotask-datto-reporting/server:latest`, built from `server/` | `expose: 8000` only (compose network, not the host) | reads `./server/.env`, mounts `reporting-data` at `/app/data`, health check hits `/health` every 30 s |
| `client` | `autotask-datto-reporting/client:latest`, built from `client/` | host port 80 | depends on `server`; nginx proxies `/api/*` to `server:8000` |

Volume: `reporting-data`, the server's `DATA_DIR`.

## Uses

- The server image from the [server packaging inventory](<../server/Reporting Server Packaging and Configuration Inventory.md>) and its settings loader, [config](<../server/Reporting Server - config.md>).
- The client image and its [nginx configuration](<../client/Reporting Client - nginx.md>).
- The [demo override](<Reporting Demo Compose Override.md>) layers on top of this file.

## Used By

- Nothing imports this; it is the deployment entry point described in the README.

## Key Behavior

- The server is deliberately not published. The only path to the API is through nginx, which also means CORS is not involved in production; `CORS_ORIGINS` only matters for the Vite dev server.
- The health check runs with the Python already in the image and a five second timeout, so an unhealthy server shows up in `docker ps` without installing curl.
- `restart: unless-stopped` on both services covers host reboots.
- The commented image names are placeholders for a registry. Building on the host is the documented path because the deployment is one machine.
- Port 80 is the only host-facing setting; the comment in the file tells an operator to change the left side of the mapping when 80 is taken.

## Cleanup Notes

- None noted.

## Source

[docker-compose.yml](../../docker-compose.yml)
