# main

> The browser entry point: finds the root element, loads the global stylesheet and renders `App` under `React.StrictMode`.

## Purpose

`client/src/main.tsx` is the module `index.html` loads. It does the minimum a React 19 entry needs: import the global CSS, locate `#root`, create a root with `ReactDOM.createRoot`, and render the application. Everything else (theme, router, stores) is set up inside `App` so that this file has nothing to test and nothing to configure.

## Interface

No exports. Side effects on load:

| Step | Effect |
|---|---|
| `import './index.css'` | Base body and `code` font rules and margin reset. |
| `document.getElementById('root')` | Throws `Root element #root not found` if `index.html` is missing the mount node, rather than rendering nothing silently. |
| `createRoot(container).render(...)` | Mounts `<App />` wrapped in `<React.StrictMode>`. |

## Uses

- `react`, `react-dom/client`.
- [App](<Reporting Client - App.md>).
- `client/src/index.css` (global stylesheet).

## Used By

- Nothing imports this; it is an entry point referenced from `client/index.html`.

## Key Behavior

- `StrictMode` is on in every build. In development React mounts, unmounts and remounts components once to surface effect bugs, so one-shot effects such as `fetchAgencies` in `App` fire twice locally; production is unaffected.
- The explicit null check on the container exists because `createRoot(null)` would throw a less helpful error from inside React.
- Vite injects this file as a module script, so top-level `import` statements are valid and the CSS import becomes a bundled stylesheet.

## Cleanup Notes

- `index.css` sets a system font stack on `body`, but the theme's `CssBaseline` sets `fontFamily` to Inter/Roboto on the same element afterwards, so the stylesheet's font rule is effectively dead. Harmless, but one of the two could go.

## Source

[client/src/main.tsx](../../client/src/main.tsx)
