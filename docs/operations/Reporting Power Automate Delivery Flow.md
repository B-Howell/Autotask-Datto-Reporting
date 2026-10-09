# Power Automate delivery flow

> The one flow the app needs: receive a JSON message over HTTP and send it as an email from the reporting mailbox.

## Purpose

The server does not talk to Exchange. It posts a message to this flow, and the flow sends the email using a connection signed in as the reporting account. That keeps mailbox credentials inside Microsoft 365 and lets an admin change who the mail comes from without touching the app. The server side of this exchange is the [delivery integration](<../server/integrations/Reporting Integration - delivery.md>); the schema below is the contract between the two.

## Build the flow

1. Sign in to Power Automate as the reporting account (the one that should appear as the sender).
2. Create an **Instant cloud flow** with the trigger **When an HTTP request is received**. Set "Who can trigger the flow" to **Anyone** (the URL carries its own signature) and paste this request body JSON schema:

```json
{
  "type": "object",
  "properties": {
    "to": { "type": "array", "items": { "type": "string" } },
    "cc": { "type": "array", "items": { "type": "string" } },
    "subject": { "type": "string" },
    "body": { "type": "string" },
    "attachments": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": { "type": "string" },
          "contentType": { "type": "string" },
          "contentBytes": { "type": "string" }
        }
      }
    }
  }
}
```

3. Add a **Select** action (Data Operations). From: expression `triggerBody()?['attachments']`. Map two keys, typed exactly as the mail connector names them: `Name` = `item()?['name']` and `ContentBytes` = `item()?['contentBytes']`. The connector takes the base64 string as it is; do not wrap it in `base64ToBinary`.
4. Add the action **Send an email (V2)** from the Office 365 Outlook connector:
   - To: expression `join(triggerBody()?['to'], ';')`
   - CC: expression `join(triggerBody()?['cc'], ';')`
   - Subject: `triggerBody()?['subject']`
   - Body: `triggerBody()?['body']`
   - Attachments: switch to array input (the "T" icon on the field) and set it to the expression `body('Select')`.
5. Save. Open the trigger and copy the **HTTP POST URL**. Put it in `server/.env` as `DELIVERY_WEBHOOK_URL`. Treat it as a password.
6. In the app, open Scheduled Reports and press **Send test email**. The flow run history shows the request if the mail does not arrive.

## Operating notes

- The flow responds 202 as soon as it accepts the request; the app treats any 2xx as delivered and the flow's run history is the audit trail for the send itself.
- The connector treats Body as HTML, so line breaks typed into a schedule's body would run together. The server converts newlines to `<br>` before posting; the flow passes the body through unchanged.
- The message keys are lowercase (`name`, `contentBytes`); the Select action is what renames them to the `Name` and `ContentBytes` the mail connector expects, so the server never has to know the connector's spelling.
- Attachments are base64 in the body. A 20 MB workbook becomes about 27 MB of JSON, which is inside the trigger's limit; anything larger should be split into separate schedules.
- Rotating the URL (regenerating the trigger) is the way to revoke access; update `.env` and restart the server.
