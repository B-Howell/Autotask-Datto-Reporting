# Annual Utilization YearStartPicker

> The month picker that chooses which month the annual report's twelve-month window opens in, with the resulting range as helper text.

## Purpose

The annual report always covers twelve whole months, so the only input is the opening month. This component is a month-and-year MUI `DatePicker` whose helper text spells out the exact range the choice produces and warns when it runs past today. It is a controlled presentational component in the Annual Utilization folder; the page owns the value and derives the range with `rangeOrDefault`.

## Interface

| Prop | Type | Required | Description |
|---|---|---|---|
| `value` | `Dayjs \| null` | yes | The chosen start month; `null` when the field is cleared. |
| `onChange` | `(value: Dayjs \| null) => void` | yes | Picker change handler. |
| `range` | `DateRange` | yes | The window the current value opens, used for the helper text. |

## Uses

- `@mui/x-date-pickers` `DatePicker`, `LocalizationProvider`, `AdapterDayjs`.
- `dayjs` (`Dayjs` type).
- [fiscalYear](<Reporting Annual Utilization - fiscalYear.md>) for the `DateRange` type.

## Used By

- [AnnualUtilization page](<../Reporting Page - AnnualUtilization.md>)

## Key Behavior

- Views are limited to `year` and `month`, opening on the month view, and the field format is `MMMM YYYY`, so no day can be chosen; `rangeFromStartMonth` normalises whatever day comes back to the first anyway.
- The label is "Year starting". The helper text is `range.detail` (for example `1 Sep 2024` to `31 Aug 2025`) with "runs past today" appended when `range.incomplete` is true.
- The component wraps its own `LocalizationProvider` with the dayjs adapter, so it works wherever it is mounted without an app-level provider.
- Clearing the field passes `null` up; the page's `rangeOrDefault` keeps the last complete September-to-August year as the effective range, and the helper text shows that default.
- The default value supplied by the page is `defaultStartMonth()`, 1 September of the last complete reporting year.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/annualUtilization/YearStartPicker.tsx](../../../../../client/src/pages/reports/annualUtilization/YearStartPicker.tsx)
