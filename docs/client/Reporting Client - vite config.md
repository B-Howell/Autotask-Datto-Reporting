# Vite config

> Configures the dev server, the `@` path alias, production chunking and the Vitest environment for the client.

## Purpose

`client/vite.config.ts` is the one build configuration for the client. It serves three jobs: a local dev server that proxies `/api` to the FastAPI process so the browser never sees a cross-origin request; a production build whose output nginx serves from `dist/`; and the Vitest settings (the file carries a `/// <reference types="vitest/config" />` directive so the `test` key typechecks).

The design decision is explicit chunking. The React runtime and the MUI family are split out of the app chunk so that an app code change does not invalidate the cached framework bundles, and so the first download stays small. The export libraries are not listed here because they are already dynamic imports.

## Interface

| Setting | Value | Controls |
|---|---|---|
| `plugins` | `react()` | JSX transform and fast refresh. |
| `resolve.alias['@']` | `./src` | The `@/...` import prefix used throughout the client. Must agree with `paths` in `tsconfig.json`. |
| `server.port` | 3000 | Dev server port. |
| `server.proxy['/api']` | `http://localhost:8000`, `changeOrigin` | Forwards API calls to the server in development; mirrors what nginx does in production. |
| `build.outDir` | `dist` | What the Dockerfile copies into the nginx image. |
| `build.sourcemap` | `false` | No source maps in the production bundle. |
| `build.chunkSizeWarningLimit` | 1200 kB | Raised because exceljs and the MUI chunk each exceed the 500 kB default on their own. |
| `rollupOptions.output.manualChunks` | `react`, `mui` | Named vendor chunks: React, ReactDOM, Router and Zustand in one; `@mui/material`, icons, data grid, charts and date pickers in the other. |
| `test.environment` | `jsdom` | A DOM for component and store tests. |
| `test.globals` | `true` | `describe`, `it`, `expect` without imports. |
| `test.setupFiles` | `./src/test/setup.ts` | Registers the jest-dom matchers. |
| `test.css` | `false` | CSS imports are ignored in tests. |

## Uses

- `vite`, `@vitejs/plugin-react`, `node:url` (for a path-safe alias on every OS).
- [Package manifest](<Reporting Client - package manifest.md>) for the scripts that invoke it.

## Used By

- Nothing imports this; it is an entry point read by Vite and Vitest.

## Key Behavior

- The proxy applies only to `npm run dev`. The built bundle calls relative `/api/...` URLs and relies on nginx (see [nginx](<Reporting Client - nginx.md>)) to proxy them.
- `changeOrigin: true` rewrites the `Host` header to the target, which matters only for servers that check it; FastAPI does not, but it keeps the dev path identical to the nginx path.
- The alias is resolved with `fileURLToPath(new URL('./src', import.meta.url))` rather than `path.resolve`, because the config is an ES module where `__dirname` is not defined.
- Chunks named in `manualChunks` always ship, even on a page that uses none of them; the cost is accepted for cache stability.
- Any dependency not named in `manualChunks` lands in the app chunk unless it is dynamically imported.

## Cleanup Notes

- None noted.

## Source

[client/vite.config.ts](../../client/vite.config.ts)
