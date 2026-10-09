# AppearanceSection

> The Settings card that switches the application between light and dark themes.

## Purpose

`AppearanceSection` is the first card on the Settings page. It is a thin view over the theme
store: it shows the current mode in an exclusive toggle group and flips the store when the
other option is chosen. The theme itself is built in `App` from the store's `mode`, so this
component never touches Material UI's theme directly.

The store exposes `toggleMode` rather than `setMode`, so the component guards against
re-toggling when the already-selected button is clicked.

## Interface

`AppearanceSection` takes no props and is the module's default export.

State read from the theme store:

| Selector | Type | Purpose |
|---|---|---|
| `mode` | `ThemeMode` (`'light'` or `'dark'`) | Current value of the toggle group. |
| `toggleMode` | `() => void` | Flips the mode; called only when the selection changes. |

## Uses

- Material UI `Paper`, `ToggleButtonGroup`, `ToggleButton`, and the `LightMode` and
  `DarkMode` icons.
- [themeStore](<../../store/Reporting Store - themeStore.md>) for `mode`, `toggleMode` and the
  `ThemeMode` type.

## Used By

- [Settings page](<../Reporting Page - Settings.md>)

## Key Behavior

- The `ToggleButtonGroup` is `exclusive`, so its `onChange` receives either the new value or
  `null` (when the active button is clicked again). The handler ignores `null` and ignores a
  value equal to the current mode; only a real change calls `toggleMode()`.
- Because the store only offers a toggle, the component relies on there being exactly two
  modes. A third mode would need a `setMode` action instead.
- Layout: a `Paper` with `maxWidth: 600` and `mb: 3`, a "Theme" label and the small toggle
  group side by side.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/settings/AppearanceSection.tsx](../../../../client/src/pages/settings/AppearanceSection.tsx)
