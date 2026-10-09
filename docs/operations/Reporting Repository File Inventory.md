---
project: "Autotask Datto Reporting"
coverage_inventory: true
coverage_kind: grouped
---

# Repository file inventory

The files at the repository root that are neither application code nor deployment definitions. Each carries no runtime behavior; this page records what each one is for so nothing in the tree is unexplained.

## Reader-facing

- [README.md](../../README.md) is the front door for a hiring manager or a new engineer: the problem it solves (25 clients, roughly 1,700 devices, about 35 reports a month), what each report answers, screenshots, the architecture diagram and the design decisions behind it, and the three ways to run it. It links to the architecture write-up in [architecture](../architecture.md) for the detail. Active.
- [LICENSE](../../LICENSE) is the MIT licence, copyright Brett Howell. Active.

## Tooling pins

- [tools/requirements.txt](../../tools/requirements.txt) pins Playwright for the [screenshot capture](<Reporting Screenshot Capture.md>) script only. It is separate from the server requirements so the application image never installs a browser. Thin by design: one pinned line.

## Repository hygiene

- [.gitignore](../../.gitignore) keeps dependencies, build output, virtualenvs, coverage, SQLite files, the server's runtime `data/` directory, real `.env` files (while allowing `.env.example`), editor settings and the Playwright cache out of version control. The one non-obvious rule is spelled out in its comment: a bare `Scripts` pattern would match a source directory on a case-insensitive filesystem, so the virtualenv patterns are anchored to `/server/Scripts/` and limited to executables and activation scripts. Active, declarative.
