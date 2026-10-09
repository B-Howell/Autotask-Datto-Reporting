# LogBuffer

> A capped, thread-safe list of log lines whose read cursors are absolute line counts, so a follower survives both eviction and `clear()`.

## Purpose

Every report writes its log lines into a buffer that the SSE endpoint polls. The buffer is capped so a long run cannot grow memory without bound, and it is cleared at the start of each run. Both of those operations would strand a reader that tracked a plain list index: once the front was evicted or the list restarted at zero, its index would point past the end and the stream would go silent for the rest of the run. That bug once left the status bar sitting on "Starting" through a whole report. The design decision is that cursors count lines ever written, not slots in the list.

## Interface

| Member | Description |
|---|---|
| `LogBuffer(max_lines=1000)` | Constructor; `MAX_LINES` is the class default. |
| `append(message)` | Adds a line; when the list exceeds `max_lines` the oldest line is dropped and the dropped count rises by one. |
| `clear()` | Empties the list and advances the dropped count by the number of lines removed, so positions keep increasing. |
| `since(cursor)` | Returns `(lines, next_cursor)`: the lines written after absolute position `cursor`, and the absolute position of the end of the buffer. |

## Uses

- `threading.Lock` only.

## Used By

- [streams](<Reporting Core - streams.md>), which keeps one instance per stream name
- [server/tests/test_core.py](../../../server/tests/test_core.py) (`test_log_buffer_cursor_survives_eviction_and_clear`)

## Key Behavior

- Internal state is `_lines` (the window), `_dropped` (the absolute position of `_lines[0]`) and the lock. The absolute end position is always `_dropped + len(_lines)`.
- `since(cursor)` computes `start = max(cursor - _dropped, 0)`. A cursor older than the window is pulled forward to the oldest line still held: that reader missed lines but keeps streaming. A cursor past the end yields an empty slice and is snapped back to the current end.
- `clear()` does not rewind. A live reader keeps its cursor and simply sees nothing until the next report writes, which is the behaviour the SSE follower relies on when `report_logger(..., clear=True)` starts a run.
- A brand-new reader passes cursor `0` and receives the whole retained window (up to 1000 lines) on its first poll, which is how a reloaded page catches up on a run in progress.
- Eviction is one line at a time via `del self._lines[0]`, which is O(n) on a Python list; at 1000 lines this is negligible.
- The test pins the contract with `max_lines=3`: after five appends, `since(0)` returns the last three lines and cursor `5`; after `clear()` and one append, the old cursor returns only the fresh line.

## Cleanup Notes

- None noted.

## Source

[server/core/log_buffer.py](../../../server/core/log_buffer.py)
