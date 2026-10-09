# theme

> Builds the MUI theme for a given light or dark mode: palette, shape, typography, flat paper and card surfaces, and global thin scrollbars.

## Purpose

`client/src/theme.ts` exports one function, `buildTheme(mode)`, that `App` memoises per mode. It centralises every visual constant the client has: the two palettes, the 10 px corner radius, the Inter font stack, and component overrides that make `Paper` and `Card` flat bordered surfaces instead of elevated ones.

The decision worth knowing is that scrollbars are styled globally through `MuiCssBaseline` rather than per component. Pages, data grids, dropdown menus and the log boxes all overflow, and one rule set (`*` and the `::-webkit-scrollbar` pseudo-elements) keeps them identical without each component carrying its own `sx`.

## Interface

| Export | Signature | Description |
|---|---|---|
| `buildTheme` | `(mode: ThemeMode) => Theme` | Returns a `createTheme` result for `light` or `dark`. |

Settings inside the theme:

| Area | Light | Dark |
|---|---|---|
| `background.default` / `paper` | `#f0f2f5` / `#ffffff` | `#0a0e17` / `#111827` |
| `primary.main` | `#51c3ff` (contrast text white) | same |
| `secondary.main` | `#4f46e5` | `#6366f1` |
| `divider` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` |

- `shape.borderRadius`: 10.
- `typography.fontFamily`: Inter, Roboto, Helvetica, Arial, sans-serif; `h5` and `h6` at weight 600.
- `MuiPaper` and `MuiCard`: `elevation` 0 by default, `backgroundImage: none` (removes the dark-mode overlay gradient), 1 px divider border.
- `MuiButton`: `textTransform: none`, weight 500.
- `MuiCssBaseline`: the scrollbar rules described below.

## Uses

- `@mui/material/styles` (`createTheme`, `Theme`).
- [themeStore](<store/Reporting Store - themeStore.md>) for the `ThemeMode` type only.

## Used By

- [App](<Reporting Client - App.md>), via `useMemo(() => buildTheme(mode), [mode])`.

## Key Behavior

- Scrollbars: `scrollbar-width: thin` and `scrollbar-color` for Firefox; 10 px `::-webkit-scrollbar` with a transparent track, a rounded thumb inset by a 2 px ring using `background-clip: padding-box`, hover and active shades, no corner and no buttons, for Chromium and WebKit.
- `scrollbar-gutter: stable` is applied to every element so a thumb never paints over the last column of a grid. The app shell resets it to `auto` on its own non-scrolling containers (see App).
- The thumb colours are computed from `theme.palette.mode` inside the override, so the same function serves both modes.
- Primary blue is identical in both modes; only backgrounds, secondary and dividers change.
- `backgroundImage: none` is needed because MUI dark mode otherwise lightens `Paper` with an elevation-based gradient, which would fight the flat bordered look.

## Cleanup Notes

- `MuiPaper` and `MuiCard` carry identical override objects; a shared constant would remove the duplication.

## Source

[client/src/theme.ts](../../client/src/theme.ts)
