# AgenciesSection

> The Settings card that lists configured agencies, deletes them, and hosts the add form.

## Purpose

`AgenciesSection` is the last card on the Settings page. It binds the agency store to a
dense list (name, id and Datto site per row, with a delete icon) and to `AddAgencyForm`
below a divider. All persistence goes through the store's `addAgency` and `removeAgency`,
which call the agencies API and refresh the list that every report page's agency dropdown
reads, so a change here is visible everywhere without a reload.

## Interface

`AgenciesSection` takes no props and is the module's default export.

State read from the agency store:

| Selector | Type | Purpose |
|---|---|---|
| `agencies` | `Agency[]` | Rows of the list and the duplicate check for the form. |
| `loaded` | `boolean` | Distinguishes "still fetching" from "none configured". |
| `addAgency` | `(agency: Agency) => Promise<void>` | Called by the form's `onAdd`. |
| `removeAgency` | `(id: number) => Promise<void>` | Called by each row's delete button. |

## Uses

- Material UI `Paper`, `List`, `ListItem`, `ListItemText`, `IconButton`, `Divider`,
  `CircularProgress` and the `Delete` icon.
- [agencyStore](<../../store/Reporting Store - agencyStore.md>)
- [AddAgencyForm](<Reporting Settings - AddAgencyForm.md>)

## Used By

- [Settings page](<../Reporting Page - Settings.md>)

## Key Behavior

- Three list states: a centred spinner while `loaded` is false, a "No agencies configured."
  line when loaded and empty, and one `ListItem` per agency otherwise. The spinner and the
  empty message cannot show together because both check `loaded`.
- Each row's secondary text shows `ID: <id>` and `Site: <site>`; rows are keyed by `agency.id`.
- Delete is immediate: the icon button calls `removeAgency(agency.id)` with no confirmation
  dialog.
- `isDuplicate` passed to the form is `agencies.some((a) => a.id === id)`, so duplicates are
  judged on the Autotask company id only; two agencies may share a name or site.
- Promise results of `addAgency` and `removeAgency` are discarded with `void`; errors are the
  store's responsibility.

## Cleanup Notes

- Deleting an agency has no confirmation step and no undo; a confirm dialog would be cheap.
- The secondary text uses a dash character between the id and site; the `ListItemText`
  could take two spans instead if that character ever needs to change.

## Source

[client/src/pages/settings/AgenciesSection.tsx](../../../../client/src/pages/settings/AgenciesSection.tsx)
