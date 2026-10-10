# RendererStatusChip

> A chip that reports whether the report renderer answers its health check, rechecked every minute.

## Purpose

Scheduled runs render through the renderer service rather than the browser, so a page that
manages schedules should say whether that service is up. `RendererStatusChip` asks on mount
and every 60 seconds and shows one of three states.

## Interface

`RendererStatusChip` takes no props and is the module's default export.

| State | Chip |
|---|---|
| Not yet answered | `Checking renderer…`, outlined, no colour |
| `ok: true` | `Renderer ready`, success colour, tick icon |
| Rejected, or `ok: false` | `Renderer unreachable`, error colour, warning icon, with the message as a tooltip |

## Uses

- `fetchRendererHealth` from the [schedules API](<../../api/Reporting API - schedules.md>).
- `errorMessage` from the [reportJob util](<../../utils/Reporting Util - reportJob.md>) for the tooltip text.
- Material UI `Chip`, `Tooltip`, the `CheckCircleOutline` and `ErrorOutline` icons.

## Used By

- [ScheduledReports page](<../Reporting Page - ScheduledReports.md>)

## Key Behavior

- The tooltip message is the 502 `detail` the server returns when it cannot reach the
  renderer, so it names the host and the failure; a rejection with no text falls back to
  `No response`. A response with `ok: false` (which the current renderer never sends) gets a
  fixed sentence.
- The interval is cleared on unmount; nothing is cached across visits.

## Cleanup Notes

- The report types the health response lists are not shown; the chip only reads `ok`.

## Source

[client/src/pages/scheduledReports/RendererStatusChip.tsx](../../../../client/src/pages/scheduledReports/RendererStatusChip.tsx)
