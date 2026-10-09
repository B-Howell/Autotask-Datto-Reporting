"""Demo mode: deterministic stand-ins for the Autotask and Datto fetches.

With DEMO_MODE=1 the cache layer routes every snapshot miss here instead of to
the vendor APIs, so the whole app runs with no accounts. The generators return
rows in the exact shape the real service fetch functions return, emit the same
[PROGRESS] lines, and pause briefly so the live-progress UI has something to
show. Agency names, hostnames and people are invented; nothing here comes from
a real tenant.
"""

from demo.data import DEMO_AGENCIES, fetch_for

__all__ = ["DEMO_AGENCIES", "fetch_for"]
