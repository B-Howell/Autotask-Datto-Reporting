"""Datto RMM REST client.

Datto rate-limits the account to 600 reads a minute and answers 429 (or a 5xx)
when a sync pushes past it, so every call is paced and retried with backoff.
OAuth tokens are cached and refreshed a minute early; a 401/403 drops the
cached token so the retry re-authenticates rather than failing until the clock
catches up.
"""

import threading
import time
from threading import Lock

import requests
from requests.auth import HTTPBasicAuth

from config import settings

# Refresh this many seconds before the advertised expiry, so a request that
# starts just before the deadline does not go out with a token that dies in flight.
_EXPIRY_SKEW_SECONDS = 60
_RETRY_STATUSES = {429}


class DattoTokenProvider:
    def __init__(self, token_url, api_key, api_secret, timeout=30):
        self._token_url = token_url
        self._api_key = api_key
        self._api_secret = api_secret
        self._timeout = timeout
        self._lock = Lock()
        self._token = None
        self._expires_at = 0.0

    def invalidate(self):
        with self._lock:
            self._token = None
            self._expires_at = 0.0

    def token(self):
        # The lock keeps concurrent audit workers from each requesting their
        # own token when the cached one expires.
        with self._lock:
            now = time.time()
            if self._token and now < self._expires_at - _EXPIRY_SKEW_SECONDS:
                return self._token
            response = requests.post(
                self._token_url,
                headers={
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Accept": "application/json",
                },
                data={
                    "grant_type": "password",
                    "username": self._api_key,
                    "password": self._api_secret,
                },
                # Datto's documented public OAuth client; not a secret.
                auth=HTTPBasicAuth("public-client", "public"),
                timeout=self._timeout,
            )
            response.raise_for_status()
            data = response.json()
            self._token = data["access_token"]
            self._expires_at = now + data.get("expires_in", 3600)
            return self._token


class DattoClient:
    def __init__(self, api_base, tokens, timeout, min_request_interval, max_workers):
        self._api_base = api_base.rstrip("/")
        self._tokens = tokens
        self._timeout = timeout
        self._min_interval = min_request_interval
        self.max_workers = max_workers
        self._pace_lock = threading.Lock()
        self._last_request_at = 0.0

    def _pace(self):
        """Space requests out across all worker threads."""
        if self._min_interval <= 0:
            return
        with self._pace_lock:
            wait = self._last_request_at + self._min_interval - time.monotonic()
            if wait > 0:
                time.sleep(wait)
            self._last_request_at = time.monotonic()

    def get(self, path, params=None, attempts=3, logger=None, tag=""):
        """GET with a live token, retrying the failures worth retrying.

        Returns the Response on success, or None once the attempts are spent.
        Other 4xx responses are returned as-is for the caller to interpret.
        """
        url = f"{self._api_base}/api/v2/{path.lstrip('/')}"
        delay = 1.0
        for attempt in range(1, attempts + 1):
            last = attempt == attempts
            # Fetched outside the retry: a rejected key or secret is a
            # configuration error and must surface as such, not as three
            # retries ending in a generic request failure.
            token = self._tokens.token()
            try:
                self._pace()
                response = requests.get(
                    url,
                    params=params,
                    headers={"Authorization": f"Bearer {token}"},
                    timeout=self._timeout,
                )
            except requests.RequestException as exc:
                if last:
                    if logger:
                        logger(f"[WARN] {tag} request failed after {attempts} attempts: {exc}")
                    return None
                time.sleep(delay)
                delay *= 2
                continue

            if response.status_code == 200:
                return response

            if response.status_code in (401, 403):
                self._tokens.invalidate()
                if logger:
                    logger(f"[WARN] {tag} auth rejected ({response.status_code}); refreshing token")
            elif response.status_code in _RETRY_STATUSES or response.status_code >= 500:
                retry_after = response.headers.get("Retry-After")
                try:
                    delay = float(retry_after) if retry_after else delay
                except ValueError:
                    pass
                if logger:
                    logger(f"[WARN] {tag} got {response.status_code}; retrying in {delay:.0f}s")
            else:
                return response

            if last:
                return None
            time.sleep(delay)
            delay *= 2
        return None

    def get_json(self, path, params=None, logger=None, tag=""):
        """Decoded body of a successful GET, or None."""
        response = self.get(path, params=params, logger=logger, tag=tag)
        if response is None or response.status_code != 200:
            return None
        return response.json()

    def paged(self, path, params=None, page_size=200, logger=None, tag="", on_page=None):
        """Every item of a paged collection endpoint (`devices` key), raising on failure."""
        items = []
        page = 0
        while True:
            body = self.get_json(
                path,
                params={**(params or {}), "pageSize": page_size, "page": page},
                logger=logger,
                tag=f"{tag} p{page}",
            )
            if body is None:
                raise RuntimeError(f"Datto request failed: {path} page {page}")
            batch = body.get("devices", [])
            if not batch:
                break
            items.extend(batch)
            if on_page:
                on_page(len(items))
            page += 1
        return items

    # ── endpoints ──────────────────────────────────────────────────────────

    def site_devices(self, site_uid, logger=None, on_page=None):
        return self.paged(
            f"site/{site_uid}/devices", logger=logger, tag=f"[site {site_uid}]", on_page=on_page
        )

    def account_devices(self, site_uid=None, logger=None, on_page=None):
        params = {"siteUid": site_uid} if site_uid else None
        return self.paged(
            "account/devices", params, logger=logger, tag="[account]", on_page=on_page
        )

    def device_software(self, device_uid, logger=None, tag=""):
        """Installed software list, or None when the audit is unavailable."""
        body = self.get_json(f"audit/device/{device_uid}/software", logger=logger, tag=tag)
        if body is None:
            return None
        return body.get("software", body.get("items", body.get("data", [])))

    def device_audit(self, device_uid, logger=None, tag=""):
        """Hardware audit (memory modules, logical disks), or None."""
        return self.get_json(f"audit/device/{device_uid}", logger=logger, tag=tag)


_client = None
_client_lock = Lock()


def datto():
    """The process-wide client, built from settings on first use."""
    global _client
    with _client_lock:
        if _client is None:
            tokens = DattoTokenProvider(
                settings.datto_token_url, settings.datto_api_key, settings.datto_api_secret
            )
            _client = DattoClient(
                settings.datto_api_base,
                tokens,
                timeout=settings.datto_timeout,
                min_request_interval=settings.datto_min_request_interval,
                max_workers=settings.datto_max_workers,
            )
        return _client
