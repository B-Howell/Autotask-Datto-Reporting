# Client package manifest

> Declares the client's npm scripts, runtime dependencies and tooling, and is the single place CI and the Docker build take their commands from.

## Purpose

`client/package.json` defines the `reporting-client` package: an ES module project (`"type": "module"`) that is never published (`"private": true`). It sits at the root of the client and is read by three consumers: a developer running `npm run dev`, the CI workflow running lint, typecheck, test and build, and the client Dockerfile, which runs `npm ci` then `npm run build` inside the build stage.

The one design decision is that the `build` script typechecks before bundling. Vite strips types without checking them, so without the `tsc --noEmit` step a type error would ship silently. Version numbers are intentionally not repeated here; the manifest and lockfile are the source of truth.

## Interface

| Script | Command | Purpose |
|---|---|---|
| `dev` | `vite` | Dev server on port 3000 with `/api` proxied to the FastAPI server (see the Vite config). |
| `build` | `tsc --noEmit && vite build` | Strict typecheck, then the production bundle into `dist/`. Fails on any type error. |
| `preview` | `vite preview` | Serves the built `dist/` locally for a last look before deploying. |
| `typecheck` | `tsc --noEmit` | The typecheck on its own, as CI runs it. |
| `lint` | `eslint . --max-warnings=0` | ESLint over the whole client; a single warning fails the run. |
| `format` / `format:check` | `prettier --write .` / `prettier --check .` | Apply or verify formatting. CI uses the check form. |
| `test` / `test:watch` | `vitest run` / `vitest` | One-shot or watch-mode unit tests under jsdom (the renderer test opts into the Node environment). |
| `renderer` | `tsx renderer/server.ts` | Starts the [renderer service](<renderer/Reporting Renderer - server.md>) that runs the exporters under Node for scheduled deliveries; port from `RENDERER_PORT`, default 3100. |

### Runtime dependencies and why each is there

- `react`, `react-dom`: the UI runtime. `react-router-dom` provides the nested `/reports/*` routes in the App shell.
- `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled`: Material UI and its styling engine (Emotion is a peer requirement of MUI, not used directly).
- `@mui/x-data-grid`: the editable device grid and the SLA raw-data grid.
- `@mui/x-charts`: the patch-status donut and ticket breakdown charts.
- `@mui/x-date-pickers` with `dayjs`: date range inputs for the utilization reports.
- `zustand`: the stores that hold report results across navigation, the job tracker, agencies, theme and toasts.
- `exceljs`: builds the xlsx exports in the browser. Loaded on demand, see the excel util.
- `docx`: builds the Office/Windows licensing Word export.
- `jspdf` and `jspdf-autotable`: the PDF exports (patch management, Office/Windows). Also loaded on demand.

### Tooling

- `typescript`, `@types/react`, `@types/react-dom`: strict TypeScript.
- `vite`, `@vitejs/plugin-react`: bundler and the React fast-refresh plugin.
- `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `globals`: the flat ESLint config in `eslint.config.js`.
- `prettier`: formatting.
- `vitest`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`: unit tests with a DOM and the jest-dom matchers registered by `src/test/setup.ts`.
- `tsx`, `@types/node`: run the renderer's TypeScript directly under Node without a build step, and type the Node APIs (`http`, `fs`, `Buffer`) it uses. Both are dev dependencies because the renderer is a developer-started service, not part of the shipped bundle.

## Uses

- npm and the lockfile `package-lock.json`, which `npm ci` installs exactly.
- [Vite config](<Reporting Client - vite config.md>) for what `dev`, `build` and `test` actually do.

## Used By

- The client Dockerfile (`npm ci`, `npm run build`).
- The CI workflow (`lint`, `format:check`, `typecheck`, `test`, `build`).
- Nothing in the source imports this; it is an entry point for tooling.

## Key Behavior

- `build` is two commands joined with `&&`, so a type error stops the bundle from being produced at all.
- `lint` runs with `--max-warnings=0`; warnings are treated as failures everywhere, including locally.
- The export libraries (`exceljs`, `docx`, `jspdf`, `jspdf-autotable`) are runtime dependencies but are only pulled into the bundle as dynamic-import chunks, so they do not weigh on first load.
- `"type": "module"` means `vite.config.ts` and `eslint.config.js` are ESM; CommonJS config files would not load.
- `renderer` does not go through Vite at all: `tsx` resolves the `@/` alias from `tsconfig.json` and Node's own resolver picks each library's Node build (jspdf publishes one under its `node` export condition), so the service shares `src/` with the app without a second bundle.

## Cleanup Notes

- None noted.

## Source

[client/package.json](../../client/package.json)
