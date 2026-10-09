# Datto RMM API Credentials

These credentials are read by `server/integrations/datto.py`, which exchanges them for an OAuth token and refreshes it as needed.

**Official Datto docs:** https://rmm.datto.com/help/en/Content/2SETUP/APIv2.htm

---

## Steps to Activate the API and Generate Keys

1. Navigate to **Setup → Global Settings → Access Control**
2. Turn on the **Enable API Access** toggle
3. Navigate to **Setup → Users** and click the username you want to enable API access for
4. Click **Generate API Keys** — an **API Key** and **API Secret Key** will be displayed
5. **Copy both values immediately.** The API Secret Key is hidden after you navigate away and cannot be retrieved again
6. Click **Save User**

> If you lose the secret, return to the same user page and click **Generate API Keys** again — this invalidates any previously generated keys.

---

## Configure

Put the values in `server/.env` (copy `server/.env.example` to start). They are
read from the environment -- never hardcode them into a source file.

```ini
DATTO_API_KEY=your-api-key
DATTO_API_SECRET=your-api-secret
DATTO_PLATFORM=your-platform
```

Restart the backend. The client fetches a fresh OAuth token on the first request and renews it a minute before expiry.

---

## Notes

- **API URL field:** After generating keys, an API URL field appears on the user page (e.g. `https://<platform>-api.centrastage.net`). The label before `-api` is your `DATTO_PLATFORM`.
- **Token expiry:** OAuth tokens expire after 100 hours; renewal is automatic.
- **Rate limits:** 600 read requests / 100 write requests per 60 seconds across the whole account.
- A `400 Client Error` on `/auth/oauth/token` means the key or secret is invalid: regenerate them and update `server/.env`.
