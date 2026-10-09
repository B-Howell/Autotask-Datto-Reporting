"""Deployment-specific reporting rules.

Autotask picklist values (sources, priorities, issue types, statuses) are
numeric ids chosen per tenant, and the SLA targets, billing tiers and fiscal
calendar are contractual. Everything in this module is what another MSP would
change to run these reports against its own Autotask; nothing else in the
services should need editing for that.
"""

# ── Ticket report ────────────────────────────────────────────────────────────

# Ticket "source" picklist id -> report bucket. Several sources fold into one
# bucket so the monthly report stays readable.
TICKET_SOURCE_LABELS = {
    18: "Agent",
    4: "Email",
    6: "In Person/Onsite",
    -2: "Insourced",
    8: "Monitoring Alert",
    17: "Other",
    2: "Phone",
    1: "Voice Mail",
    -1: "Other",  # client portal
    5: "Other",  # web portal
    15: "Phone",  # on call
    19: "Monitoring Alert",  # security platform alerts
}
TICKET_SOURCE_ORDER = [
    "Agent",
    "Email",
    "In Person/Onsite",
    "Insourced",
    "Monitoring Alert",
    "Other",
    "Phone",
    "Voice Mail",
]
TICKET_SOURCE_DEFAULT = "Other"
TICKET_SOURCE_PHONE = 2

TICKET_PRIORITY_LABELS = {
    6: "No Metrics",
    4: "P1 Critical",
    1: "P2 Important",
    2: "P3 Moderate",
    3: "P4 Minor",
    5: "P5 Scheduled",
}
TICKET_PRIORITY_ORDER = [
    "No Metrics",
    "P1 Critical",
    "P2 Important",
    "P3 Moderate",
    "P4 Minor",
    "P5 Scheduled",
]
TICKET_PRIORITY_DEFAULT = "No Metrics"

TICKET_ISSUE_TYPE_LABELS = {
    25: "Email Issue",
    11: "Network Admin",
    32: "Other Issue",
    33: "Password Reset",
    20: "3rd Party Services",
    62: "Account Management",
    21: "Backup/DR",
    26: "Information Security",
    73: "Maintenance",
    28: "Meetings",
    49: "Mobile Device",
    72: "Phone",
    34: "Printer/Scanner/Copier",
    38: "Purchasing",
    19: "Projects",
    37: "Reporting",
    18: "RMM Monitoring",
    7: "Server",
    39: "Software",
    40: "System Admin",
    42: "Training",
    43: "User Requests",
    48: "Workstation",
}
TICKET_ISSUE_TYPE_DEFAULT = "Other Issue"

# Password-reset tickets are also counted by the system the reset was for.
PASSWORD_RESET_ISSUE_TYPE = 33
PASSWORD_RESET_SUB_ISSUE_LABELS = {
    246: "Other",
    250: "Account Unlock",
    296: "Email",
    297: "Email",
    298: "Email",
    301: "Encryption Password Needed",
    302: "EHR Platform",
    303: "EHR Platform",
    304: "EHR Platform",
    323: "Google Workspace",
    328: "Accounting System",
    353: "MFA",
    370: "Network",
    371: "Network",
    372: "Network",
    373: "Network",
    417: "E-sign Platform",
    418: "E-sign Platform",
    419: "E-sign Platform",
    428: "Training Platform",
    429: "Training Platform",
    430: "Training Platform",
    431: "Training Platform",
    594: "Network",
    658: "Network",
    665: "MFA",
    666: "MFA",
    676: "Other",
}

# Row order for the issue-type table: password-reset sub-buckets first, then
# the issue types proper.
TICKET_ISSUE_TYPE_ORDER = [
    "Account Unlock",
    "Email",
    "Encryption Password Needed",
    "EHR Platform",
    "Google Workspace",
    "Accounting System",
    "MFA",
    "Network",
    "Other",
    "E-sign Platform",
    "Training Platform",
    "None",
    "Password Reset",
    "3rd Party Services",
    "Account Management",
    "Backup/DR",
    "Email Issue",
    "Information Security",
    "Maintenance",
    "Meetings",
    "Mobile Device",
    "Network Admin",
    "Other Issue",
    "Phone",
    "Printer/Scanner/Copier",
    "Purchasing",
    "Projects",
    "Reporting",
    "RMM Monitoring",
    "Server",
    "Software",
    "System Admin",
    "Training",
    "User Requests",
    "Workstation",
]

TICKET_STATUS_COMPLETE = 5

# ── SLA report ───────────────────────────────────────────────────────────────

# Contracted targets in business hours, by priority picklist id.
SLA_TARGETS = {
    4: {"response": 1, "resolution": 9},  # P1 Critical
    1: {"response": 4, "resolution": 18},  # P2 Important
    2: {"response": 9, "resolution": 45},  # P3 Moderate
    3: {"response": 27, "resolution": 90},  # P4 Minor
}
# Tickets at this priority carry no SLA and are excluded from every metric.
SLA_NO_METRICS_PRIORITY = 6
BUSINESS_HOURS = (8, 17)  # Mon-Fri, local time

# ── Disk-space tickets ───────────────────────────────────────────────────────

HDD_SUB_ISSUE_TYPE = 503  # "Hard Drive"
HDD_MONITORING_SOURCE = 8  # "Monitoring Alert", i.e. raised by the RMM

# ── Utilization ──────────────────────────────────────────────────────────────

# The role on a time entry is the tier the work was billed at. Using it
# instead of the resource's current department keeps history stable when
# someone changes role.
ROLE_TO_TIER = {
    "Level 0 - Administration": "Administration",
    "Level 1 - Call Center": "Call Center",
    "Level 2 - Help Desk": "Help Desk",
    "Level 3 - Jr Sys Admin": "Jr Sys Admin",
    "Level 4 - Sr Sys Admin": "Sr Sys Admin",
    "Level 5 - Specialist": "Sr Sys Admin",
}
# The reporting year runs September through August.
FISCAL_START_MONTH = 9
# Time with no company behind it (no ticket, no project) is the MSP's own.
INTERNAL_LABEL = "Internal"

# ── Devices ──────────────────────────────────────────────────────────────────

# Autotask product types that count as an end-user machine. Everything else it
# tracks as a configuration item (servers, routers, printers) is infrastructure.
END_USER_DEVICE_TYPES = {"desktop", "laptop", "tablet"}
# Model strings that mean the "device" is really a VM. Some VMs are classed
# as Desktop in Autotask, so the type check alone is not enough.
VM_MODELS = {"VMware7,1", "Virtual Machine", "VMware Virtual Platform"}
# User-defined field names on Autotask configuration items.
UDF_PENDING_RETIRED = "Pending/Retired"
UDF_PURCHASE_DATE = "Purchase Date"
UDF_PRIMARY_USER = "Primary User or Role"
UDF_DEPARTMENT = "Department"
# Grid columns that can be edited and written back to those fields.
EDITABLE_DEVICE_FIELDS = (UDF_PRIMARY_USER, UDF_PURCHASE_DATE, UDF_DEPARTMENT, "Location")


# ── Deployment overrides ─────────────────────────────────────────────────────


def _apply_local_overrides():
    """Replace any constant above with the value of the same name from
    report_rules_local.py, a file that is never committed. Only names that
    already exist here are honoured, so a typo in the local file is ignored
    rather than silently creating a new, unused rule."""
    try:
        import report_rules_local as local
    except ImportError:
        return
    for name, value in vars(local).items():
        if name.isupper() and name in globals():
            globals()[name] = value


_apply_local_overrides()
