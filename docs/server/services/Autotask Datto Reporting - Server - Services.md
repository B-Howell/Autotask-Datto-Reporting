---
documentation_hub: true
---

# Autotask Datto Reporting - Server - Services

This hub organizes the **Server / Services** documentation area for Autotask Datto Reporting. Its child hubs and focused documents carry the implementation details, source links, behavior, and decisions.

One module per report, each split into a fetch step that talks to the vendor clients and an aggregate step that is pure, plus the shared helpers, the background sync and the saved-report store. The package marker [server/services/__init__.py](../../../server/services/__init__.py) is intentionally empty: the package exposes no shared surface, routers import the module they need by name, and keeping the marker empty means importing one service never triggers another service's imports.

<!-- BEGIN DOCUMENTATION HUB LINKS -->

## Documentation Navigation

This navigation block is maintained by the documentation tooling. Keep durable explanation outside it.

- Parent hub: [Autotask Datto Reporting - Server](<../Autotask Datto Reporting - Server.md>)

### Documents and artifacts in this area

- [Reporting Service - agencies.md](<Reporting Service - agencies.md>)
- [Reporting Service - common.md](<Reporting Service - common.md>)
- [Reporting Service - credentials.md](<Reporting Service - credentials.md>)
- [Reporting Service - device_audit.md](<Reporting Service - device_audit.md>)
- [Reporting Service - devices.md](<Reporting Service - devices.md>)
- [Reporting Service - hdd_tickets.md](<Reporting Service - hdd_tickets.md>)
- [Reporting Service - office_windows.md](<Reporting Service - office_windows.md>)
- [Reporting Service - patch_management.md](<Reporting Service - patch_management.md>)
- [Reporting Service - periods.md](<Reporting Service - periods.md>)
- [Reporting Service - presets.md](<Reporting Service - presets.md>)
- [Reporting Service - saved_reports.md](<Reporting Service - saved_reports.md>)
- [Reporting Service - schedule_runner.md](<Reporting Service - schedule_runner.md>)
- [Reporting Service - scheduled_runs.md](<Reporting Service - scheduled_runs.md>)
- [Reporting Service - schedules.md](<Reporting Service - schedules.md>)
- [Reporting Service - sla.md](<Reporting Service - sla.md>)
- [Reporting Service - sync.md](<Reporting Service - sync.md>)
- [Reporting Service - tenant.md](<Reporting Service - tenant.md>)
- [Reporting Service - tickets.md](<Reporting Service - tickets.md>)
- [Reporting Service - utilization.md](<Reporting Service - utilization.md>)

<!-- END DOCUMENTATION HUB LINKS -->
