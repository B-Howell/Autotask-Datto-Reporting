"""Copy to report_rules_local.py and set the values for this deployment.

Only names that exist in report_rules.py are honoured. Every other setting
keeps its default. This file is listed in .gitignore; the example is not.
The Dockerfile copies it into the image when it exists, which is how a
deployment ships its rules.
"""

# Example: the reporting year runs January through December here.
# FISCAL_START_MONTH = 1

# Example: our Autotask picklist for ticket sources.
# TICKET_SOURCE_LABELS = {1: "Phone", 2: "Email", 3: "Portal"}
