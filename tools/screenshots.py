"""Capture the README screenshots from a running demo-mode stack.

    pip install -r tools/requirements.txt && playwright install chromium
    python tools/screenshots.py --base http://localhost:3000

Expects the client at --base and the server already seeded (python -m demo.seed).
Captures at 1440px wide in the dark theme with no browser chrome, and writes
PNGs to docs/screenshots/.
"""

import argparse
import sys
import time
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

OUT_DIR = Path(__file__).resolve().parent.parent / "docs" / "screenshots"
VIEWPORT = {"width": 1440, "height": 900}
DEMO_AGENCY = "Harbor Point Health"
PATCH_AGENCY = "Northfield Community Schools"


def choose_agency(page: Page, name: str) -> None:
    page.get_by_role("combobox", name="Select Agency").click()
    page.get_by_role("option", name=name).click()


def generate(page: Page) -> None:
    page.get_by_role("button", name="Generate").click()
    # The status bar shows Complete once the report has been stored.
    page.get_by_text("Complete", exact=True).first.wait_for(timeout=60_000)
    page.wait_for_timeout(600)


def dismiss_status_bar(page: Page) -> None:
    dismiss = page.get_by_role("button", name="Dismiss")
    while dismiss.count():
        dismiss.first.click()
        page.wait_for_timeout(100)
    page.wait_for_timeout(200)


def capture(page: Page, name: str, full_page: bool = False) -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{name}.png"
    page.screenshot(path=str(path), full_page=full_page)
    print(f"wrote {path.relative_to(OUT_DIR.parent.parent)}")


def shoot_home(page: Page, base: str) -> None:
    page.goto(f"{base}/")
    page.get_by_text("Pick a report to begin").wait_for()
    capture(page, "home")


def shoot_devices(page: Page, base: str) -> None:
    page.goto(f"{base}/reports/device")
    choose_agency(page, DEMO_AGENCY)
    generate(page)
    dismiss_status_bar(page)
    capture(page, "device-report")


def shoot_licensing(page: Page, base: str) -> None:
    page.goto(f"{base}/reports/office-windows")
    choose_agency(page, DEMO_AGENCY)
    generate(page)
    dismiss_status_bar(page)
    capture(page, "licensing-report")


def shoot_sla(page: Page, base: str) -> None:
    page.goto(f"{base}/reports/sla-performance")
    generate(page)
    dismiss_status_bar(page)
    capture(page, "sla-report")


def shoot_tickets(page: Page, base: str) -> None:
    page.goto(f"{base}/reports/tickets")
    choose_agency(page, DEMO_AGENCY)
    page.get_by_text("Complete", exact=True).first.wait_for(timeout=60_000)
    page.wait_for_timeout(600)
    dismiss_status_bar(page)
    capture(page, "ticket-report")


def shoot_utilization(page: Page, base: str) -> None:
    page.goto(f"{base}/reports/annual-utilization")
    generate(page)
    dismiss_status_bar(page)
    capture(page, "utilization-report")


def shoot_patch(page: Page, base: str) -> None:
    page.goto(f"{base}/reports/patch-management")
    choose_agency(page, PATCH_AGENCY)
    generate(page)
    dismiss_status_bar(page)
    capture(page, "patch-report")


def shoot_live_progress(page: Page, base: str) -> None:
    """A refresh re-runs the fetch, so the log panel and status bar are mid-run."""
    page.goto(f"{base}/reports/agency-utilization")
    page.get_by_role("button", name="Refresh data").click()
    page.get_by_text("Running", exact=True).first.wait_for(timeout=20_000)
    page.get_by_text("Collected 1430 time entries so far").wait_for(timeout=20_000)
    capture(page, "live-progress")
    page.get_by_text("Complete", exact=True).first.wait_for(timeout=60_000)


SHOTS = [
    shoot_home,
    shoot_devices,
    shoot_licensing,
    shoot_sla,
    shoot_tickets,
    shoot_utilization,
    shoot_patch,
    shoot_live_progress,
]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base", default="http://localhost:3000")
    args = parser.parse_args()

    with sync_playwright() as pw:
        browser = pw.chromium.launch()
        context = browser.new_context(viewport=VIEWPORT, device_scale_factor=1)
        page = context.new_page()
        page.goto(args.base)
        page.evaluate("localStorage.setItem('themeMode', 'dark')")
        for shot in SHOTS:
            started = time.time()
            shot(page, args.base)
            print(f"  {shot.__name__} in {time.time() - started:.1f}s")
        browser.close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
