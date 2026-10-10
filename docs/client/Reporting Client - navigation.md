# navigation

> The single table of report destinations (label, path, icon, description) that both the sidebar and the home page render from.

## Purpose

`client/src/navigation.tsx` exists so the sidebar and the home-screen cards cannot drift apart. The sidebar lists `HOME_ITEM` followed by `NAV_ITEMS`; the home page renders one card per `NAV_ITEMS` entry with the same icon and a one-sentence description. Adding a report means adding one entry here plus a `Route` in `App`.

It is a `.tsx` file because each entry carries a rendered icon element (`<DevicesIcon />`), which keeps the consumers free of icon imports.

## Interface

```ts
interface NavItem {
  label: string;        // sidebar text and card title
  path: string;         // route path, must match a Route in App.tsx
  icon: ReactElement;   // an @mui/icons-material element
  description: string;  // one sentence for the home-screen card
}
export const HOME_ITEM: NavItem;   // '/', the Home icon
export const NAV_ITEMS: NavItem[]; // the ten destinations, in display order
```

| Label | Path |
|---|---|
| Device Reports | `/reports/device` |
| Office / Windows | `/reports/office-windows` |
| Ticket Reports | `/reports/tickets` |
| SLA Performance | `/reports/sla-performance` |
| Quarterly Utilization | `/reports/agency-utilization` |
| Annual Utilization | `/reports/annual-utilization` |
| Patch Management | `/reports/patch-management` |
| HDD Storage Tickets | `/reports/hdd-tickets` |
| Saved Reports | `/reports/saved-reports` |
| Scheduled Reports | `/scheduled` |

## Uses

- `@mui/icons-material` (Assessment, ConfirmationNumber, Devices, Folder, Home, Insights, ScheduleSend, SecurityUpdateGood, Storage, DesktopWindows).
- `react` for the `ReactElement` type.

## Used By

- [NavBar](<components/Reporting Component - NavBar.md>) renders `[HOME_ITEM, ...NAV_ITEMS]`.
- [Home page](<pages/Reporting Page - Home.md>) renders a card per `NAV_ITEMS` entry.

## Key Behavior

- Order in `NAV_ITEMS` is display order in both the sidebar and the card grid.
- `HOME_ITEM` is kept separate so the home page can list the reports without listing itself.
- Both utilization entries share the `Insights` icon; they are told apart by label only.
- Paths are written in full (`/reports/...`), not relative to the `/reports` layout route, so they can be used directly as link targets. Scheduled Reports lives at `/scheduled`, outside the `/reports` layout, because it manages deliveries rather than showing a report.
- The description text is user-facing copy on the home screen; keep it to one sentence.

## Cleanup Notes

- None noted.

## Source

[client/src/navigation.tsx](../../client/src/navigation.tsx)
