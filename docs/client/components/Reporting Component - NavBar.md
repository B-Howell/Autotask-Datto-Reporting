# NavBar

> The permanent left drawer: logo, one entry per report with a sliding active highlight, and the Settings entry.

## Purpose

Every page shares the same navigation. This component renders it from the `HOME_ITEM` and `NAV_ITEMS` lists in `navigation.tsx`, so adding a report means adding one entry there. It is in the component layer and is mounted once by `App`, beside the routed page.

The design decision is a single highlight element that slides to the active item, rather than each item toggling its own background.

## Interface

No props. Reads the current path from the router.

## Uses

- `react` (`useLayoutEffect`, `useRef`, `useState`)
- `react-router-dom` (`useLocation`, `useNavigate`)
- `@mui/material` drawer and list components, `@mui/icons-material/Settings`
- [navigation](<../Reporting Client - navigation.md>) for `HOME_ITEM`, `NAV_ITEMS`

## Used By

- [App](<../Reporting Client - App.md>)

## Key Behavior

- Each item registers its DOM node in `itemRefs` keyed by path. A layout effect on path change reads the active node's `offsetTop` and `offsetHeight` and moves the absolutely positioned highlight there with a transform.
- The highlight has no transition until after its first placement (`positioned` ref plus a `requestAnimationFrame`), so it does not slide in from the top on load.
- When the current path matches no item (for example `/settings`), the highlight fades out rather than jumping.
- Active items swap text and icon colour to white over the highlight; hover is suppressed on the active item.
- The Settings entry is outside the sliding list and uses MUI's `selected` styling instead, below a divider.
- The drawer is `permanent`, full height, with `position: relative` so it sits in the app's flex row rather than fixed to the viewport.
- The logo is `/app-logo.png` from the public folder, 26 px tall, not draggable.

## Cleanup Notes

- None noted.

## Source

[client/src/components/NavBar.tsx](../../../client/src/components/NavBar.tsx)
