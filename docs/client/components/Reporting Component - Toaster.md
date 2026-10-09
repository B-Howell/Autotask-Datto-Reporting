# Toaster

> The single bottom-right snackbar, rendered once at the root and driven entirely by the toast store.

## Purpose

Outcome messages (saved, updated, failed) come from stores and plain functions, not from the page that happens to be on screen. This component subscribes to `toastStore` and renders whatever it holds, so there is one snackbar for the whole app. It is in the component layer and is mounted once by `App`.

## Interface

No props.

## Uses

- `@mui/material` (`Snackbar`, `Alert`)
- [toastStore](<../store/Reporting Store - toastStore.md>)

## Used By

- [App](<../Reporting Client - App.md>)

## Key Behavior

- Auto-hides after 4000 ms.
- A click elsewhere on the page (`reason === 'clickaway'`) does not close it; the timeout or the Alert's close button does.
- Renders a filled `Alert` whose severity comes from the store, so success, error, info and warning all share the one component.
- Anchored bottom right, above the status bar area.

## Cleanup Notes

- None noted.

## Source

[client/src/components/Toaster.tsx](../../../client/src/components/Toaster.tsx)
