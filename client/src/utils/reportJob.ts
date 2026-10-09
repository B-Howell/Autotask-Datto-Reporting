import useReportJobStore from '@/store/reportJobStore';
import type { JobProgress } from '@/api';

// Structured progress arrives on the same SSE stream as the human log, tagged
// so the two can be told apart. Mirrors PROGRESS_PREFIX in server/core/progress.py.
export const PROGRESS_PREFIX = '[PROGRESS] ';

const FLUSH_MS = 200;

export interface ReportJobOptions<T> {
  /** What the status bar calls this report. */
  label: string;
  /** SSE endpoint carrying its log and progress lines. */
  logsUrl?: string;
  /** Performs the fetch. Receives an abort signal wired to the status bar's Cancel. */
  run: (signal: AbortSignal) => Promise<T>;
  /** Receives batches of log lines, for pages that show their own log panel. */
  onLogs?: (lines: string[]) => void;
  /** The page showing this report, so the status bar can offer a way back to it. */
  route?: string;
}

/**
 * Runs a report as one of the app's tracked jobs: opens its log stream, feeds
 * the status bar, and closes everything however the run ends.
 */
export async function runReportJob<T>({
  label,
  logsUrl,
  run,
  onLogs,
  route,
}: ReportJobOptions<T>): Promise<T> {
  const { startJob, appendJobLog, setJobProgress, finishJob, setJobAbort } =
    useReportJobStore.getState();
  const jobId = startJob(label, route ?? null);

  const controller = new AbortController();
  setJobAbort(jobId, () => controller.abort());

  // Log lines are batched: a long report emits far more of them than React
  // should re-render for. Progress is applied immediately.
  let buffer: string[] = [];
  const emit = () => {
    if (!buffer.length) return;
    const lines = buffer;
    buffer = [];
    lines.forEach((line) => appendJobLog(jobId, line));
    onLogs?.(lines);
  };
  const flushTimer = setInterval(emit, FLUSH_MS);

  let source: EventSource | null = null;
  if (logsUrl) {
    source = new EventSource(logsUrl);
    source.onmessage = (event: MessageEvent<string>) => {
      if (event.data.startsWith(PROGRESS_PREFIX)) {
        try {
          setJobProgress(
            jobId,
            JSON.parse(event.data.slice(PROGRESS_PREFIX.length)) as JobProgress
          );
        } catch {
          /* a malformed progress line is not worth failing the report over */
        }
        return;
      }
      buffer.push(event.data);
    };
    // A dropped log stream says nothing about whether the report is still running.
    source.onerror = () => {};
  }

  try {
    const data = await run(controller.signal);
    finishJob(jobId);
    return data;
  } catch (err) {
    finishJob(jobId, { error: errorMessage(err) });
    throw err;
  } finally {
    clearInterval(flushTimer);
    emit();
    source?.close();
  }
}

export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function isAbortError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'AbortError';
}
