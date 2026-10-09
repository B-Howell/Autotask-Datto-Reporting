# InstallsSection

> The card that frames each product table of the Office and Windows report with its icon and heading.

## Purpose

Both tables on the report (Office and Windows Installs) sit in the same kind of container: a `Paper` with a small product icon next to an `h6` heading, then the table. This component owns that frame so the two tables stay visually identical and the icon-plus-title markup exists once. It is a layout-only component in the page layer with no state.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `icon` | `string` | yes | URL of the icon image, drawn at `1.25em` high with automatic width. |
| `title` | `string` | yes | The section heading. |
| `children` | `ReactNode` | yes | The table (or any content) rendered under the heading. |

## Uses

- `@mui/material` (`Paper`, `Box`, `Typography`).

## Used By

- [OfficeTable](<Reporting Office Windows - OfficeTable.md>) with `OFFICE_ICON` and the title "Office".
- [WindowsTable](<Reporting Office Windows - WindowsTable.md>) with `WINDOWS_ICON` and the title "Windows Installs".

## Key Behavior

- The icon is rendered as an `img` with an empty `alt`, so screen readers announce only the heading text.
- The icon height is tied to the heading font size (`1.25em`), so it scales with the typography rather than being a fixed pixel size.
- Padding is `p: 2` with `mb: 3` between sections; the on-screen spacing between the Office and Windows tables comes from here, not from the tables.
- The icon URLs come from [assets util](<../../../utils/Reporting Util - assets.md>) and are the same files the Word and PDF exports embed, so the screen and the documents share one set of icons.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/officeWindows/InstallsSection.tsx](../../../../../client/src/pages/reports/officeWindows/InstallsSection.tsx)
