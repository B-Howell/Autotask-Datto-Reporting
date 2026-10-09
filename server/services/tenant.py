"""Deployment-specific presentation settings the client reads at startup.

Everything here used to be a constant in client source. Keeping it in
data/tenant.json means the private deployment can merge upstream changes
without ever editing a tracked file.
"""

import json
import os

from config import settings
from services.agencies import get_agencies

TENANT_FILE = os.path.join(settings.data_dir, "tenant.json")
LOGO_DIR = os.path.join(settings.data_dir, "logos")
GROUP_PREFIX = "group:"

DEFAULTS = {
    # Several Autotask companies shown as one client. Members are the
    # agencies whose name starts with matchPrefix; a group needs two to show.
    "groups": [],
    # Agency display name -> PNG filename under data/logos.
    "logos": {},
    "ratedDepartments": [
        {"department": "Administration", "rate": 0},
        {"department": "Call Center", "rate": 65},
        {"department": "Help Desk", "rate": 75},
        {"department": "Jr Sys Admin", "rate": 80},
        {"department": "Sr Sys Admin", "rate": 90},
    ],
    "firstReportYear": 2024,
    "earliestQuarterYear": 2023,
}


def get_tenant():
    """The defaults with every key from tenant.json laid over them."""
    data = dict(DEFAULTS)
    try:
        with open(TENANT_FILE, encoding="utf-8") as f:
            data.update(json.load(f))
    except (OSError, json.JSONDecodeError):
        pass
    return data


def group_members(group_name, agencies=None):
    agencies = agencies if agencies is not None else get_agencies()
    for group in get_tenant()["groups"]:
        if group["name"] == group_name:
            return [a for a in agencies if a["name"].startswith(group["matchPrefix"])]
    return []


def resolve_agency(agency_key):
    """(members, display name) for a dropdown value: a company id or group:<name>."""
    agencies = get_agencies()
    if str(agency_key).startswith(GROUP_PREFIX):
        name = str(agency_key)[len(GROUP_PREFIX) :]
        return group_members(name, agencies), name
    try:
        wanted = int(agency_key)
    except (TypeError, ValueError):
        return [], ""
    for agency in agencies:
        if agency["id"] == wanted:
            return [agency], agency["name"]
    return [], ""


def logo_path(agency_name):
    """Absolute path of the agency's logo, or None when none is mapped or on disk."""
    filename = get_tenant()["logos"].get(agency_name)
    if not filename:
        return None
    path = os.path.join(LOGO_DIR, os.path.basename(filename))
    return path if os.path.isfile(path) else None
