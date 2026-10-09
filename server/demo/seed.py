"""Populate the SQLite cache and the agency list with demo data.

    cd server && DEMO_MODE=1 python -m demo.seed

Runs the normal sync against the demo generators, so every snapshot table ends
up exactly as a real sync would leave it. Safe to run repeatedly.
"""

import os
import sys

if not os.environ.get("DEMO_MODE"):
    os.environ["DEMO_MODE"] = "1"

from demo.data import DEMO_AGENCIES  # noqa: E402
from repositories import manual_inputs, sqlite  # noqa: E402
from services import agencies  # noqa: E402
from services.sync import run_sync  # noqa: E402

# Licence figures are typed in by hand in the real deployment; the first demo
# agency gets a filled-in set so the licensing report has something to show.
DEMO_LICENCES = {
    "officeLicense::visibleSkus": '["Microsoft 365 Business Standard", "Microsoft 365 Business Premium", "Microsoft 365 E3"]',
    "Microsoft 365 Business Standard": "60",
    "available::Microsoft 365 Business Standard": "4",
    "Microsoft 365 Business Premium": "25",
    "available::Microsoft 365 Business Premium": "1",
    "Microsoft 365 E3": "10",
    "available::Microsoft 365 E3": "0",
    "Office LTSC Standard 2024": "5",
    "Windows 11": "90",
    "Windows 10": "20",
}


def seed_manual_inputs():
    agency_key = str(DEMO_AGENCIES[0]["id"])
    for field, value in DEMO_LICENCES.items():
        manual_inputs.set_manual_input(agency_key, "office_windows", field, value)


def main():
    sqlite.init_db()
    agencies.replace_agencies(DEMO_AGENCIES)
    seed_manual_inputs()
    print(f"Wrote {len(DEMO_AGENCIES)} demo agencies")

    quiet = "--verbose" not in sys.argv

    def log(message):
        if not quiet or message.startswith(("[DONE]", "[WARN]", "[ERROR]")):
            print(message)

    def on_progress(done, total, current):
        if quiet:
            print(f"\r  {done}/{total} {current[:60]:<60}", end="", flush=True)

    run_sync(logger=log, progress=on_progress)
    print("\nDemo data ready")


if __name__ == "__main__":
    main()
