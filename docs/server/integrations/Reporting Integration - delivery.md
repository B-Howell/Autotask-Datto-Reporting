# Delivery integration

> Posts a finished report, with its recipients and covering text, to the Power Automate flow that sends the email.

## Purpose

The server never talks to Exchange and never holds a mailbox password. Delivery is one HTTP POST to a Power Automate flow whose trigger URL is signed; the flow, signed in as the reporting mailbox, turns the message into an email. That keeps mail credentials inside Microsoft 365, lets an admin change the sender without touching the app, and leaves the flow's run history as the record of what was sent. This module builds the message in the exact shape the flow's trigger schema declares and reports every failure as one exception type whose text is safe to store on a run.

## Interface

| Name | Description |
|---|---|
| `Attachment(name, content, content_type)` | Frozen dataclass: the file name the recipient sees, the raw bytes and the MIME type the renderer reported. |
| `message(to, cc, subject, body, attachments)` | The JSON body for the flow: `to` and `cc` as lists of addresses, `subject`, `body` and `attachments` as `{name, contentType, contentBytes}` with base64 content. |
| `send(to, cc, subject, body, attachments)` | Posts `message(...)` to `settings.delivery_webhook_url`; returns nothing on any 2xx. |
| `DeliveryError` | Raised when the URL is not configured, the flow cannot be reached, or it answers 300 or above. |
| `TIMEOUT` | 60 seconds. |

## Uses

- `requests`, `base64`, `urllib.parse.urlsplit`.
- [config](<../Reporting Server - config.md>) for `delivery_webhook_url`.
- The [Power Automate delivery flow](<../../operations/Reporting Power Automate Delivery Flow.md>), the other end of the POST; its trigger schema is the shape `message` builds.

## Used By

- [server/tests/test_delivery.py](../../../server/tests/test_delivery.py).
- The scheduler loop that the scheduled-delivery branch adds next, which calls `send` with the bytes the [renderer integration](<Reporting Integration - renderer.md>) returned, and the "send test email" route on the scheduled reports page.

## Key Behavior

- The message is the contract with the flow's HTTP trigger, not a convenience shape: the trigger's request body schema names exactly `to`, `cc`, `subject`, `body` and `attachments[].name`, `contentType`, `contentBytes`, and the flow's send action reads each by that name. Renaming a key here breaks every deployment's flow silently (the mail goes out with blanks), so the schema lives in the [flow recipe](<../../operations/Reporting Power Automate Delivery Flow.md>) and `message` is tested against the literal dict.
- `to` and `cc` are copied with `list()`, so a tuple from a stored row is sent as a JSON array and `cc=None` becomes `[]`; the flow's `join` expression needs an array in both fields.
- Attachment bytes are base64 in the body because the trigger has no multipart support. A 20 MB workbook is about 27 MB of JSON, inside the trigger's limit; the content type travels with each attachment so Outlook names and opens the file correctly.
- An empty `DELIVERY_WEBHOOK_URL` raises before any request is made, with a message pointing at `server/.env.example`; this is the expected state on a fresh install and the scheduled reports page shows it as "delivery not configured".
- The webhook URL carries its own signature in the query string, so it is treated as a password: it is never logged, and the unreachable-flow error carries only the URL's host and the exception's class name, because `requests` quotes the full URL (signature included) in its connection error text. The non-2xx error carries the status and the first 500 characters of the flow's response body, which never contains the URL.
- Any 2xx is success. The flow answers 202 as soon as it accepts the request; whether the email was actually sent is visible only in the flow's run history, which is why the [flow recipe](<../../operations/Reporting Power Automate Delivery Flow.md>) calls that history the audit trail.
- `settings` is read at call time through the module's name, so a test can swap the URL with `dataclasses.replace`.

## Cleanup Notes

- The message body is a plain string. The flow's send action treats it as HTML, so a body typed with line breaks in the schedule form arrives as one paragraph unless the caller converts newlines; the scheduler should do that once when it builds the message.

## Source

[server/integrations/delivery.py](../../../server/integrations/delivery.py)
