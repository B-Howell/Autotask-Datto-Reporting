# CI workflow

> The GitHub Actions pipeline that gates every push and pull request: server checks, client checks, then a Docker build of all three images.

## Purpose

The repository is a portfolio piece as well as a working tool, so the pipeline exists to prove the code is lint-clean, typed, tested and buildable on a clean machine, not to deploy anything. Nothing is pushed to a registry and no environment is touched. The three jobs mirror the three ways the project is consumed: the Python server, the Vite client, and the three container images that `docker compose` builds.

## Interface

Triggers: pushes to `main` and every pull request.

| Job | Runner | Steps in order |
|---|---|---|
| Server | ubuntu, Python 3.11, pip cache keyed on both requirements files | install runtime and dev requirements, `ruff check`, `ruff format --check`, Bandit at high severity and high confidence with `tests` excluded, `pip-audit` against the runtime requirements, `pytest -q` |
| Client | ubuntu, Node 20, npm cache keyed on the lockfile | `npm ci`, lint, Prettier check, `tsc` typecheck, Vitest, production build, `npm audit` on production dependencies at high level |
| Docker images | ubuntu, needs both jobs above | `docker build` of `server/`, `client/` and the renderer (`client/` with `-f client/Dockerfile.renderer`) with throwaway tags |

## Uses

- The server tooling pinned in the packaging inventory, see [server packaging](<../server/Reporting Server Packaging and Configuration Inventory.md>).
- The client scripts defined in the [package manifest](<../client/Reporting Client - package manifest.md>).
- All three Dockerfiles, described in the [server packaging](<../server/Reporting Server Packaging and Configuration Inventory.md>) and [client tooling](<../client/Reporting Client Tooling and Asset Inventory.md>) inventories.

## Used By

- Nothing imports this; GitHub runs it. The README badge at the top of the repository reports its last result.

## Key Behavior

- Ruff runs both the linter and the formatter check, so an unformatted file fails CI even if it has no lint findings.
- Bandit is limited to high severity and high confidence on purpose. The medium findings it raises on FastAPI code (binding to all interfaces in the Dockerfile command, for example) are intentional and would only produce noise.
- `pip-audit` scans the runtime requirements only. Dev tooling is installed but not audited, because it never ships in the image.
- `npm audit` runs with `--omit=dev`, so vulnerabilities in build-time tooling do not fail the pipeline; the production bundle is what matters.
- The image job depends on both check jobs, so a broken build is never attempted on code that already failed lint or tests.
- The renderer image is built from the same `client/` context as the client image with a different Dockerfile, which is why the step passes `-f` and `client` as the context. The build only installs and copies; the renderer's TypeScript is typechecked and tested by the Client job, not by the image build.
- No job uses secrets. The workflow runs identically on a fork.

## Cleanup Notes

- None noted.

## Source

[.github/workflows/ci.yml](../../.github/workflows/ci.yml)
