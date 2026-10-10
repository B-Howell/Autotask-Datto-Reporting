---
project: "Autotask Datto Reporting"
coverage_inventory: true
coverage_kind: grouped
---

# Screenshot inventory

The PNGs the README embeds. All are written by the [screenshot capture](<../operations/Reporting Screenshot Capture.md>) script from the demo data set at 1440 by 900 in the dark theme, so every agency, device and person shown is invented. Regenerate the whole set rather than editing one image; the script is the source of truth for what each one shows.

## Images

- [home.png](home.png): the home page, one card per report with its icon and a one-line description. Active.
- [device-report.png](device-report.png): the device inventory grid for one demo agency, Autotask asset fields merged with the Datto hardware and software audit. Active.
- [licensing-report.png](licensing-report.png): Office and Windows licensing with the per-product licence count fields. Active.
- [sla-report.png](sla-report.png): SLA performance by ticket with the resource, priority and issue type pivots. Active.
- [ticket-report.png](ticket-report.png): the monthly ticket breakdown cards. Active.
- [utilization-report.png](utilization-report.png): annual utilization by billing tier. Active.
- [patch-report.png](patch-report.png): patch status across a demo agency's workstations. Active.
- [live-progress.png](live-progress.png): a report mid-run, with the status bar's phase progress and the server log panel streaming. Active.
- [scheduled-reports.png](scheduled-reports.png): the Scheduled Reports page with three schedules the script creates over the API for the shot and removes afterwards (device inventory and licensing for one demo agency, SLA for all), each with its next run, plus the renderer status chip. Active.
