# selectedAgency

> Resolves the Datto site a report was run for back to the agency (or agency group) whose name the report is titled with.

## Purpose

The Office and Windows store records only the first member's `site` id when a report runs, but the report must be titled for what the user picked in the dropdown. When several Autotask companies are presented as one group, the member site must map back to the group, not to the individual company. This one-function module does that lookup so the page can derive the displayed agency from store state alone, which keeps the title correct after a page reload or when the dropdown value has since changed. It is a pure helper in the page layer.

## Interface

- `reportedAgencyForSite(site: string or null, agencies: Agency[], effectiveAgencies: EffectiveAgency[]): EffectiveAgency or null`.

## Uses

- `isAgencyGroup` and the `Agency` / `EffectiveAgency` types from [API types](<../../../api/Reporting API - types.md>).

## Used By

- [OfficeWindowsReports page](<../Reporting Page - OfficeWindowsReports.md>), inside a `useMemo` over `[companies, effectiveAgencies, selectedSite]`.

## Key Behavior

- Returns `null` for a null site or a site that matches no agency in the raw list; the page treats `null` as "no results" (`hasResults` requires a selected company).
- The site is matched against the raw agency list by exact `site` equality, then the effective list is searched for a group containing that agency's `id`; the group wins, otherwise the single agency is returned.
- Only the first matching single agency and the first matching group are considered; an agency belonging to two groups would be reported under whichever group appears first in `effectiveAgencies`.
- The result's `name` feeds `reportTitle`, the export filenames and the saved-report metadata, so this function decides what a customer-facing document is called.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/selectedAgency.ts](../../../../../client/src/pages/reports/officeWindows/selectedAgency.ts)
