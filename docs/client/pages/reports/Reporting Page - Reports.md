# Reports layout route

> The parent route element for every `/reports/*` page; it renders only the router outlet.

## Purpose

`Reports` is the element of the `/reports` route in `App`. The nine report pages are nested
routes beneath it (`device`, `office-windows`, `tickets`, `sla-performance`,
`agency-utilization`, `annual-utilization`, `patch-management`, `hdd-tickets`,
`saved-reports`), and this component is the point where React Router renders whichever child
matched. It carries no chrome of its own because the page shell (sidebar, scrolling main area,
running-report bar) already lives in `App`.

It exists so that the report routes share one parent path and so a common wrapper could be
added in one place later.

## Interface

`Reports` takes no props and is the module's default export. It renders `<Outlet />`.

## Uses

- `react-router-dom` (`Outlet`).

## Used By

- [App](<../../Reporting Client - App.md>) mounts it on the `/reports` route with the report
  pages as children.

## Key Behavior

- A request for bare `/reports` matches this route with no child, so the outlet renders
  nothing; there is no index route and no redirect to a default report.
- Because every report page is a child of this element, any state placed here in future
  (for example a shared toolbar) would survive navigation between reports but not a visit to
  `/` or `/settings`.

## Cleanup Notes

- Bare `/reports` renders an empty main area. An index route redirecting to `/` or to the
  first report would be friendlier.

## Source

[client/src/pages/reports/Reports.tsx](../../../../client/src/pages/reports/Reports.tsx)
