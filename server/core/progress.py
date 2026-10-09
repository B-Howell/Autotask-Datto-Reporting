"""Structured progress reporting for long-running report fetches.

Reports stream their log to the UI, but a log is written for whoever is
debugging: "Page 52: 500 time entries" tells the person waiting nothing about
how far along their report is. These helpers put a second, machine-readable line
on the same stream, naming what a phase ACHIEVES rather than the API call it
makes, and saying where it sits in the run.

The UI reads the prefix to tell the two apart, so a caller passing plain
`logger` keeps working unchanged.
"""

import json

# Mirrored by PROGRESS_PREFIX in client/src/utils/reportJob.ts.
PROGRESS_PREFIX = "[PROGRESS] "


def emit(logger, phase, done=None, total=None, step=None, steps=None):
    """Report a phase, optionally with progress through it and its position.

    `done`/`total` drive the count shown to the user; leave `total` as None when
    paginating an unknown number of pages, so the UI holds the bar rather than
    inventing a percentage. `step`/`steps` let several phases fill one bar.
    """
    logger(
        PROGRESS_PREFIX
        + json.dumps({"phase": phase, "done": done, "total": total, "step": step, "steps": steps})
    )


class Phases:
    """Emits progress for a fixed sequence of named phases.

    Holding the sequence means each phase knows its own position, so the UI can
    show one bar for the whole run instead of several that restart at zero.

        phases = Phases(logger, ["Collecting devices", "Building the sheet"])
        phases.start("Collecting devices")
        phases.update(done=120, total=400)
    """

    def __init__(self, logger, names):
        self.logger = logger
        self.names = list(names)
        self.current = None

    def start(self, name, done=None, total=None):
        self.current = name
        self.update(done=done, total=total)

    def update(self, done=None, total=None):
        if self.current is None:
            return
        step = self.names.index(self.current) + 1 if self.current in self.names else None
        emit(self.logger, self.current, done=done, total=total, step=step, steps=len(self.names))

    def done(self):
        """Mark the run finished, so the bar reaches the end rather than stopping short."""
        if self.names:
            self.start(self.names[-1], done=1, total=1)
