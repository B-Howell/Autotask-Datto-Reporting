"""Shared log buffer behind the SSE progress streams."""

from threading import Lock


class LogBuffer:
    """A capped log buffer that readers follow by absolute position.

    Cursors count lines ever written, not slots in the list, so they survive
    both eviction from the front and clear(). A reader that tracked a plain
    list index would be stranded the moment the buffer filled or restarted,
    and its stream would go silent for the rest of the run.
    """

    MAX_LINES = 1000

    def __init__(self, max_lines=MAX_LINES):
        self._lines = []
        self._dropped = 0  # absolute position of _lines[0]
        self._max_lines = max_lines
        self._lock = Lock()

    def append(self, message):
        with self._lock:
            self._lines.append(message)
            if len(self._lines) > self._max_lines:
                del self._lines[0]
                self._dropped += 1

    def clear(self):
        """Drop the backlog without rewinding: a new report starts here.

        Live readers keep their position and simply see nothing new, rather than
        being stranded ahead of a buffer that restarted at zero.
        """
        with self._lock:
            self._dropped += len(self._lines)
            self._lines.clear()

    def since(self, cursor):
        """Lines written after `cursor`, plus the position to pass in next time.

        A cursor left behind by eviction is pulled forward to the oldest line
        still held: that reader missed lines, but it keeps streaming instead of
        going quiet.
        """
        with self._lock:
            start = max(cursor - self._dropped, 0)
            return self._lines[start:], self._dropped + len(self._lines)
