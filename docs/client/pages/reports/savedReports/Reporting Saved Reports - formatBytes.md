# formatBytes

> Formats a byte count as B, KB or MB for the saved-reports table.

## Purpose

A small utility that turns `size_bytes` into a short human-readable size. It is local to the
saved-reports folder because nothing else in the client shows file sizes. An unknown or zero
size renders as an empty cell rather than `0 B`.

## Interface

```ts
const formatBytes = (n: number): string
```

Default export. `KB` is 1024 and `MB` is 1024 squared (binary units, labelled KB and MB).

## Uses

- Nothing.

## Used By

- [SavedReportsTable](<Reporting Saved Reports - SavedReportsTable.md>)

## Key Behavior

- Falsy input (`0`, `NaN`, `undefined` at runtime) returns `''`.
- Below 1024: `<n> B`.
- Below 1 MiB: kilobytes with no decimals, for example `412 KB`.
- Otherwise megabytes with one decimal, for example `2.3 MB`. There is no GB tier; a very
  large file prints as a large MB figure.
- Rounding uses `toFixed`, so `1023.6 KB` displays as `1024 KB` rather than rolling into MB.

## Cleanup Notes

- None noted.

## Source

[client/src/pages/reports/savedReports/formatBytes.ts](../../../../../client/src/pages/reports/savedReports/formatBytes.ts)
