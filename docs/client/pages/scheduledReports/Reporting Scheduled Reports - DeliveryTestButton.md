# DeliveryTestButton

> A button and small dialog that sends a one-line test message to one address through the delivery flow.

## Purpose

A schedule's first real run is a bad time to discover that the delivery webhook is missing or
rejecting. `DeliveryTestButton` sends the server's fixed test message (no attachment) to an
address the user types, so the flow can be proven from the page before anything is scheduled.

## Interface

`DeliveryTestButton` takes no props and is the module's default export. It renders the
outlined "Send test email" button and owns the dialog's open, address and sending state.

## Uses

- `sendTestEmail` from the [schedules API](<../../api/Reporting API - schedules.md>).
- [toastStore](<../../store/Reporting Store - toastStore.md>) for the outcome.
- `isEmailAddress` from the [report component barrel](<../../components/report/Reporting Report Component - index.md>), documented under [useScheduleForm](<../../components/report/Reporting Report Component - useScheduleForm.md>), and `errorMessage` from the [reportJob util](<../../utils/Reporting Util - reportJob.md>).
- Material UI `Dialog`, `TextField`, `Button`, the `Send` icon.

## Used By

- [ScheduledReports page](<../Reporting Page - ScheduledReports.md>)

## Key Behavior

- Send is enabled once the trimmed address passes `isEmailAddress`, the same `@` test the
  dialog's recipient fields and the server apply; Enter in the field sends too.
- Success toasts `Test message sent to <address>` and closes the dialog. A rejection, which is
  the server's 502 `detail` when the delivery flow is unreachable or unconfigured (for example
  `DELIVERY_WEBHOOK_URL is not set; see server/.env.example`), toasts that text (or `The test
  message was not sent` when the error carries none) and leaves the dialog open with the
  address intact.
- The dialog cannot be closed while a send is in flight.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/scheduledReports/DeliveryTestButton.tsx](../../../../client/src/pages/scheduledReports/DeliveryTestButton.tsx)
