"""Named log streams: one buffer per report type, served to the browser over SSE.

A report writes human log lines and [PROGRESS] lines to its stream while it
runs; the page that started it (or any page, via the status bar) follows the
stream with EventSource. Each report type has its own buffer so two reports
running at once never interleave their output.
"""

import asyncio

from sse_starlette.sse import EventSourceResponse

from core import jobs
from core.log_buffer import LogBuffer

_POLL_SECONDS = 0.25
_buffers: dict[str, LogBuffer] = {}


def get_buffer(name):
    buffer = _buffers.get(name)
    if buffer is None:
        buffer = _buffers[name] = LogBuffer()
    return buffer


def sse_response(name):
    """Stream new lines from the named buffer until the client disconnects."""
    buffer = get_buffer(name)

    async def follow():
        cursor = 0
        while True:
            await asyncio.sleep(_POLL_SECONDS)
            lines, cursor = buffer.since(cursor)
            for line in lines:
                # EventSourceResponse frames each item as an SSE "data:" line
                # itself; wrapping here too once produced "data: data: ...".
                yield line

    return EventSourceResponse(follow())


def report_logger(name, job_id=None, clear=True):
    """A logger for one report run: writes to stdout and the named stream.

    With a job id it also feeds the server-side job record and checks for a
    cancellation on every line, which is how a running report gets stopped.
    """
    buffer = get_buffer(name)
    if clear:
        buffer.clear()

    def log(message):
        print(message)
        buffer.append(message)
        if job_id is not None:
            jobs.note(job_id, message)
            jobs.raise_if_cancelled(job_id)

    return log
