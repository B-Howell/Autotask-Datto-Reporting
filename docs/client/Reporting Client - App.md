# App

> The root component: builds the MUI theme, mounts the router and the app shell, declares every route and loads the agency list and the tenant settings once.

## Purpose

`client/src/App.tsx` is the composition root of the client. It wires the theme store to a MUI `ThemeProvider`, mounts the global `Toaster`, and lays out the fixed shell: a `NavBar` on the left, a scrolling main area holding the routed page, and the `RunningReportBar` pinned beneath it. It also declares the entire route table, so this file is the one place to look to see which page answers which URL.

The design decision is that the shell never scrolls. The outer `Box` is `100vh` with `overflow: hidden`; only the inner page container scrolls. That keeps the nav and the status bar fixed whatever the page height, and it means a report in flight keeps reporting in the status bar as the user navigates, because the bar is rendered outside `Routes`.

## Interface

| Route | Element |
|---|---|
| `/` | `Home` (one card per report, from the navigation table) |
| `/reports` | `Reports`, a layout route that renders an `Outlet` |
| `/reports/device` | `DeviceReports` |
| `/reports/office-windows` | `OfficeWindowsReports` |
| `/reports/tickets` | `Tickets` |
| `/reports/sla-performance` | `SlaPerformance` |
| `/reports/agency-utilization` | `AgencyUtilization` |
| `/reports/annual-utilization` | `AnnualUtilization` |
| `/reports/patch-management` | `PatchManagement` |
| `/reports/hdd-tickets` | `HddTickets` |
| `/reports/saved-reports` | `SavedReports` |
| `/scheduled` | `ScheduledReports` |
| `/settings` | `Settings` |
| `*` | `Navigate` to `/` with `replace` |

The component takes no props and is the default export.

## Uses

- `react-router-dom` (`BrowserRouter`, `Routes`, `Route`, `Navigate`), MUI `ThemeProvider`, `CssBaseline`, `Box`.
- [theme](<Reporting Client - theme.md>) via `buildTheme(mode)`.
- [themeStore](<store/Reporting Store - themeStore.md>) for the light/dark mode.
- [agencyStore](<store/Reporting Store - agencyStore.md>) for `fetchAgencies`.
- [tenant API](<api/Reporting API - tenant.md>) via `tenantApi.fetchTenant` and [tenantStore](<store/Reporting Store - tenantStore.md>) for `setTenant`.
- [NavBar](<components/Reporting Component - NavBar.md>), [RunningReportBar](<components/Reporting Component - RunningReportBar.md>), [Toaster](<components/Reporting Component - Toaster.md>).
- [Home](<pages/Reporting Page - Home.md>), [ScheduledReports](<pages/Reporting Page - ScheduledReports.md>), [Settings](<pages/Reporting Page - Settings.md>), the [Reports layout route](<pages/reports/Reporting Page - Reports.md>) and each report page under `docs/client/pages/reports/`.

## Used By

- [main](<Reporting Client - main.md>), which renders `<App />` into the DOM.

## Key Behavior

- The theme is rebuilt with `useMemo` only when `mode` changes, so toggling dark mode is the only thing that re-creates the MUI theme object.
- `fetchAgencies` runs once on mount. Under `React.StrictMode` in development it runs twice; the store simply overwrites itself.
- A second mount effect fetches `/api/tenant` and hands the result to `useTenantStore.getState().setTenant`. A rejected fetch is logged with `console.error('Failed to load tenant settings:', err)`, the same treatment `agencyStore` gives its fetch, and otherwise ignored: the tenant store starts from defaults identical to the server's, so a server without the route, or a network failure, leaves the app behaving as it did when those values were client constants, with the console pointing at the cause. The two fetches are independent and may resolve in either order; every consumer subscribes to both stores.
- `scrollbarGutter: 'auto'` is set on both shell containers to undo the global `scrollbar-gutter: stable` the theme applies to every element; without it each non-scrolling container would reserve an empty strip.
- `Toaster` sits outside `BrowserRouter`, so toasts survive route changes and do not depend on router context.
- The main content area applies `p: 3` padding, so pages do not add their own outer padding.
- Unknown paths redirect to `/` with `replace`, so the bad URL does not stay in history.

## Cleanup Notes

- None noted.

## Source

[client/src/App.tsx](../../client/src/App.tsx)
