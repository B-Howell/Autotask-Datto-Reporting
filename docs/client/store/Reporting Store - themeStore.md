# themeStore

> Light or dark mode, persisted to local storage and toggled from the appearance settings.

## Purpose

The app has a light and a dark Material UI theme. This store holds which one is active so `App` can build the theme object, and persists the choice so it survives a reload. It is in the store layer and is the smallest store in the client.

## Interface

Not created by the `reportDataStore` factory.

| Field / action | Type | Description |
|---|---|---|
| `mode` | `ThemeMode` (`'light' \| 'dark'`) | The active mode. |
| `toggleMode()` | `() => void` | Flips the mode and writes it to `localStorage` under `themeMode`. |

Exports the `ThemeMode` type and the default store hook.

## Uses

- `zustand` (`create`)
- `localStorage`

## Used By

- [App](<../Reporting Client - App.md>), which rebuilds the theme with `buildTheme(mode)` when the mode changes
- [theme](<../Reporting Client - theme.md>) for the `ThemeMode` type
- [AppearanceSection settings](<../pages/settings/Reporting Settings - AppearanceSection.md>), which shows the toggle
- [DeviceReports page](<../pages/reports/Reporting Page - DeviceReports.md>), which derives an `isDark` flag for the grid border colours

## Key Behavior

- The initial mode is dark only if storage holds exactly `'dark'`; anything else, including a storage access error, gives light.
- There is no `setMode`; the only mutation is the toggle.
- Storage writes are wrapped in try/catch, so with storage blocked the choice lasts for the session only.
- The store does not follow the operating system's colour-scheme preference.

## Cleanup Notes

- None noted.

## Source

[client/src/store/themeStore.ts](../../../client/src/store/themeStore.ts)
