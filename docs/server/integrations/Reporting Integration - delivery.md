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
| `TIMEOUT`, `ERROR_TEXT_LIMIT` | 60 seconds and 300 characters. The timeout is per socket operation, so it bounds the wait for the flow's answer after the body is sent, not the upload. |

## Uses

- `requests`, `base64`, `re`, `urllib.parse.urlsplit`.
- [config](<../Reporting Server - config.md>) for `delivery_webhook_url`.
- The [Power Automate delivery flow](<../../operations/Reporting Power Automate Delivery Flow.md>), the other end of the POST; its trigger schema is the shape `message` builds.

## Used By

- [server/tests/test_delivery.py](../../../server/tests/test_delivery.py).
- [scheduled_runs service](<../services/Reporting Service - scheduled_runs.md>) (`send` and `Attachment`, with the bytes and content type the [renderer integration](<Reporting Integration - renderer.md>) returned and the body already converted to HTML).
- The "send test email" route on the scheduled reports page that the scheduled-delivery branch adds next.

## Key Behavior

- The message is the contract with the flow's HTTP trigger, not a convenience shape: the trigger's request body schema names exactly `to`, `cc`, `subject`, `body` and `attachments[].name`, `contentType`, `contentBytes`, and the flow's send action reads each by that name. Renaming a key here breaks every deployment's flow silently (the mail goes out with blanks), so the schema lives in the [flow recipe](<../../operations/Reporting Power Automate Delivery Flow.md>) and `message` is tested against the literal dict.
- `to` and `cc` are copied with `list()`, so a tuple from a stored row is sent as a JSON array and `cc=None` becomes `[]`; the flow's `join` expression needs an array in both fields.
- Attachment bytes are base64 in the body because the trigger has no multipart support. A 20 MB workbook is about 27 MB of JSON, inside the trigger's limit; the content type travels with each attachment so Outlook names and opens the file correctly.
- Memory: the raw bytes, their base64 text, the JSON string `requests` builds and the encoded request body all exist at once, so a send peaks at roughly four times the attachment size. That is fine for one run at a time, which is what the scheduler does (runs are serialised, never rendered and sent in parallel).
- The body string is sent as the connector receives it and the connector treats it as HTML, so the server converts newlines to `<br>` before calling `send`; that conversion is the scheduler's job when it builds the message from the schedule's text, not this module's, which stays a faithful transport.
- An empty `DELIVERY_WEBHOOK_URL` raises before any request is made, with a message pointing at `server/.env.example`; this is the expected state on a fresh install and the scheduled reports page shows it as "delivery not configured".
- The webhook URL carries its own signature in the query string, so it is treated as a password: it is never logged, and the unreachable-flow error carries only the URL's host and the exception's class name, because `requests` quotes the full URL (signature included) in its connection error text. The non-2xx error carries the status and a readable reason: Power Automate refuses with `{"error": {"code", "message"}}`, and `message` is used on its own when that shape parses; any other body (a gateway's HTML page, say) is collapsed to one line and capped at 300 characters. Neither contains the URL.
- Any 2xx is success. The flow answers 202 as soon as it accepts the request; whether the email was actually sent is visible only in the flow's run history, which is why the [flow recipe](<../../operations/Reporting Power Automate Delivery Flow.md>) calls that history the audit trail.
- `settings` is read at call time through the module's name, so a test can swap the URL with `dataclasses.replace`.

## Cleanup Notes

- The newline-to-`<br>` conversion described above lives in the scheduled_runs service (`_html_body`, which also HTML-escapes the text); a caller that bypasses it sends a multi-line body as one paragraph.

## Source

[server/integrations/delivery.py](../../../server/integrations/delivery.py)
