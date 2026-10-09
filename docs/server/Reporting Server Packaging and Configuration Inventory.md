---
project: "Autotask Datto Reporting"
coverage_inventory: true
coverage_kind: grouped
---

# Server packaging and configuration inventory

The non-code files that build, configure and lint the FastAPI server, plus the package markers. The behavior they influence lives in the focused pages for [main](<Reporting Server - main.md>) and [config](<Reporting Server - config.md>); this page explains the files themselves.

## Container image

- [server/Dockerfile](../../server/Dockerfile) builds on `python:3.11-slim`, installs the pinned runtime requirements in their own layer before copying source (so a code edit does not reinstall dependencies), and starts uvicorn on port 8000 bound to all interfaces, which is required inside a container. Active.
- [server/.dockerignore](../../server/.dockerignore) keeps bytecode, local virtualenvs, the dev-only requirements and `pyproject.toml`, the runtime `data/` directory and every `.env` file out of the build context. The data directory is excluded because it is seeded on first boot and persisted on a volume; secrets are excluded because they must be mounted, never baked into an image. Active, declarative.

## Dependencies

- [server/requirements.txt](../../server/requirements.txt) pins the six runtime packages: FastAPI, uvicorn with its standard extras, requests for the vendor APIs, sse-starlette for the log streams, python-dotenv for `server/.env`, and python-multipart for the saved-report upload route. Every version is exact so `pip-audit` in CI has a fixed target. Active.
- [server/requirements-dev.txt](../../server/requirements-dev.txt) pins the tooling CI runs and the image never installs: ruff, bandit, pip-audit, pytest and httpx (needed by FastAPI's `TestClient`). Active.

## Lint, security and test configuration

- [server/pyproject.toml](../../server/pyproject.toml) configures three tools in one place. Ruff: 100 column lines, Python 3.11 target, the pycodestyle, pyflakes, isort, bugbear and pyupgrade rule sets, with E501 left to the formatter and B008 ignored because FastAPI's `Depends()` and `Query()` defaults are idiomatic. The isort section pins the local packages as first-party so import grouping is identical in CI, which has no virtualenv, and on a dev machine. Bandit excludes tests and any local virtualenv. Pytest is pointed at `tests/`. Active.

## Environment template

- `server/.env.example` is the documented template for `server/.env`. It is listed here in prose only because the project configuration treats every `.env*` path as sensitive and keeps it out of vault links. It names `DEMO_MODE` and the Autotask and Datto settings that [config](<Reporting Server - config.md>) reads, with a comment on each saying where in the vendor UI the value comes from. Every value in the committed template is a placeholder. Active.

## Package markers

- [server/core/__init__.py](../../server/core/__init__.py), [server/demo/__init__.py](../../server/demo/__init__.py), [server/integrations/__init__.py](../../server/integrations/__init__.py), [server/repositories/__init__.py](../../server/repositories/__init__.py), [server/routers/__init__.py](../../server/routers/__init__.py) and [server/services/__init__.py](../../server/services/__init__.py) are empty package markers. They exist so each layer is importable as a package from the `server/` directory that uvicorn and pytest run in; none carries code. Active, thin by design.
