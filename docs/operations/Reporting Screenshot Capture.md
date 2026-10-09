# Screenshot capture

> A Playwright script that drives the running demo stack and writes the README screenshots.

## Purpose

The README screenshots have to be reproducible, because the UI changes and stale images are worse than none. This script replaces hand-captured images with a deterministic run against demo data: fixed viewport, light theme, same agencies every time, and a mid-run capture of a report in flight for the live progress image.

## Interface

```bash
pip install -r tools/requirements.txt && playwright install chromium
python tools/screenshots.py --base http://localhost:3000
```

| Function | Captures |
|---|---|
| `shoot_home` | the home page card grid |
| `shoot_devices` | device inventory for the first demo agency after Generate |
| `shoot_licensing` | Office and Windows licensing |
| `shoot_sla` | SLA performance with its pivots |
| `shoot_tickets` | the monthly ticket breakdown |
| `shoot_utilization` | annual utilization |
| `shoot_patch` | patch status for a second demo agency |
| `shoot_live_progress` | agency utilization mid-refresh, with the status bar and log panel populated |

Helpers: `choose_agency` opens the agency combobox by its accessible name, `generate` clicks Generate and waits for the status bar to read Complete, `dismiss_status_bar` closes finished job rows one at a time, `capture` writes `docs/screenshots/<name>.png`.

## Uses

- Playwright for Python, pinned in `tools/requirements.txt` (see the [repository file inventory](<Reporting Repository File Inventory.md>)).
- A running client and a seeded demo server, see the [demo override](<Reporting Demo Compose Override.md>).
- The theme preference key read by the [theme store](<../client/store/Reporting Store - themeStore.md>).

## Used By

- Nothing imports this; it is run by hand when the UI changes. Its output is the [screenshot inventory](<../screenshots/Reporting Screenshot Inventory.md>).

## Key Behavior

- Viewport is 1440 by 900 at device scale 1, so the PNGs are the same size on every machine.
- The light theme is forced by writing `themeMode` to `localStorage` before the first navigation, matching what the theme store reads.
- Every wait is on visible text or an accessible role, never a fixed sleep, apart from short settle pauses after a click.
- `dismiss_status_bar` re-queries the Dismiss button on each loop because each click removes a row and invalidates earlier locators.
- The live progress capture clicks Refresh data rather than Generate so the server re-runs the fetch instead of serving the cache, then waits for a specific progress line from the demo generator before capturing. The demo generator sleeps briefly every ten workdays so that line is observable.
- The script fails loudly on a timeout instead of writing a partial set, so a broken page cannot silently produce a stale image.

## Cleanup Notes

- The expected progress text in `shoot_live_progress` is coupled to the demo generator's output; if the seed data changes, that string changes with it.

## Source

[tools/screenshots.py](../../tools/screenshots.py)
