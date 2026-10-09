# Home page

> The landing page: one clickable card per report, built from the shared navigation list.

## Purpose

`Home` is the page rendered at `/` (and the target of the `*` catch-all redirect) in the
client's router. It has no data of its own. It reads `NAV_ITEMS` from the navigation module
and renders a card per entry, so a report added to the sidebar appears on the home grid with
no further change. It sits at the page layer and uses no hook, store, API call or export.

The one design decision is that the card copy (label, icon, one-sentence description) lives in
`navigation.tsx` rather than here, so the sidebar and the home grid can never disagree.

## Interface

`Home` takes no props and is the module's default export.

The private `ReportCard` component takes:

| Prop | Type | Required | Description |
|---|---|---|---|
| `item` | `NavItem` | yes | Label, path, icon and description for one report. |

## Uses

- `react-router-dom` (`useNavigate`) and Material UI `Card`, `CardActionArea`, `CardContent`.
- [navigation](<../Reporting Client - navigation.md>) for `NAV_ITEMS` and the `NavItem` type.

## Used By

- [App](<../Reporting Client - App.md>) mounts it on the `/` route.

## Key Behavior

- The grid is CSS grid with `repeat(auto-fill, minmax(300px, 1fr))`, so the column count
  follows the viewport width with no breakpoint logic.
- Each card is a full-height `CardActionArea`; clicking anywhere on it calls
  `navigate(item.path)`. Cards are keyed by `item.path`.
- The icon sits in a 44 by 44 rounded box filled with `primary.main`, so the home grid
  reuses the sidebar's icons with the theme's accent colour in both light and dark mode.
- `HOME_ITEM` is not rendered; only the report entries in `NAV_ITEMS` become cards, so the
  home page never links to itself.
- The heading and intro copy are static text; there is no loading state because the page
  depends on nothing asynchronous.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/Home.tsx](../../../client/src/pages/Home.tsx)
