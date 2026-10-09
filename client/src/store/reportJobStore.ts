import { create } from 'zustand';
import { jobsApi } from '@/api';
import type { JobProgress, JobStatus, ServerJob } from '@/api';

export interface ReportJob {
  id: string;
  label: string;
  /** The page showing this report, so a finished job can offer a way back to it. */
  route: string | null;
  status: JobStatus;
  logs: string[];
  progress: JobProgress | null;
  statusText: string | null;
  error: string | null;
  startedAt: number;
  finishedAt?: number;
  /** Started in this tab: its own SSE stream is finer than the server poll. */
  local: boolean;
  abort?: () => void;
}

interface ReportJobState {
  /** Newest first. */
  jobs: ReportJob[];
  startJob: (label: string, route?: string | null) => string;
  appendJobLog: (id: string, line: string) => void;
  setJobProgress: (id: string, progress: JobProgress) => void;
  finishJob: (id: string, outcome?: { error?: unknown }) => void;
  adoptServerJob: (serverJob: ServerJob) => void;
  cancelJob: (id: string) => void;
  setJobAbort: (id: string, abort: () => void) => void;
  dismissJob: (id: string) => void;
}

// Finished jobs stay until dismissed, so someone who looked away still learns
// the report finished. The cap keeps the bar from growing without bound.
const MAX_JOBS = 6;
const LOG_TAIL = 200;

// The server names a run differently from the page that started it ("Utilization
// · <range>" versus "Annual Utilization · <range>"), so runs are matched on the
// range they both end with.
export const runKey = (label = ''): string => {
  const parts = String(label).split(' · ');
  return parts.length > 1 ? parts[parts.length - 1]! : String(label);
};

/** The report name without its period: "Annual Utilization" from "Annual Utilization · 2025". */
export const reportName = (label = ''): string => String(label).split(' · ')[0]!;

// Whichever source is further through the report wins, so a dropped SSE stream
// does not leave a row frozen mid-phase while the poll knows better.
export const isAhead = (next: JobProgress | null, prev: JobProgress | null): boolean => {
  if (!next) return false;
  if (!prev) return true;
  if ((next.step ?? 0) !== (prev.step ?? 0)) return (next.step ?? 0) > (prev.step ?? 0);
  return (next.done ?? 0) > (prev.done ?? 0);
};

type JobPatch = Partial<ReportJob> | ((job: ReportJob) => Partial<ReportJob>);

const patchJob = (state: ReportJobState, id: string, patch: JobPatch): Partial<ReportJobState> => {
  if (!state.jobs.some((j) => j.id === id)) return {};
  return {
    jobs: state.jobs.map((j) =>
      j.id === id ? { ...j, ...(typeof patch === 'function' ? patch(j) : patch) } : j
    ),
  };
};

const useReportJobStore = create<ReportJobState>()((set, get) => ({
  jobs: [],

  startJob: (label, route = null) => {
    const id = `${label}-${Date.now()}`;
    const job: ReportJob = {
      id,
      label,
      route,
      status: 'running',
      logs: [],
      progress: null,
      statusText: null,
      error: null,
      startedAt: Date.now(),
      local: true,
    };
    set((state) => ({
      jobs: [
        job,
        // Running a report again supersedes its existing row (and the row the
        // server contributed for it under its own name) rather than stacking.
        ...state.jobs.filter(
          (j) => reportName(j.label) !== reportName(label) && runKey(j.label) !== runKey(label)
        ),
      ].slice(0, MAX_JOBS),
    }));
    return id;
  },

  appendJobLog: (id, line) =>
    set((state) => patchJob(state, id, (j) => ({ logs: [...j.logs, line].slice(-LOG_TAIL) }))),

  setJobProgress: (id, progress) => set((state) => patchJob(state, id, { progress })),

  finishJob: (id, { error } = {}) =>
    set((state) => {
      // Cancelling aborts the request, so the run also lands here with an
      // error. The row already says cancelled; keep it that way.
      const job = state.jobs.find((j) => j.id === id);
      if (job?.status === 'cancelled') return {};
      return patchJob(state, id, {
        status: error ? 'error' : 'done',
        error: error ? String(error) : null,
        finishedAt: Date.now(),
      });
    }),

  adoptServerJob: (serverJob) =>
    set((state) => {
      const twin = state.jobs.find((j) => j.local && runKey(j.label) === runKey(serverJob.label));
      if (twin) {
        if (twin.status !== 'running') return {};
        const patch: Partial<ReportJob> = {};
        if (isAhead(serverJob.progress, twin.progress)) patch.progress = serverJob.progress;
        if (serverJob.status_text && serverJob.status_text !== twin.statusText) {
          patch.statusText = serverJob.status_text;
        }
        return Object.keys(patch).length ? patchJob(state, twin.id, patch) : {};
      }

      const existing = state.jobs.find((j) => j.id === serverJob.id);
      if (existing) {
        return patchJob(state, serverJob.id, {
          status: serverJob.status,
          progress: serverJob.progress ?? null,
          statusText: serverJob.status_text ?? existing.statusText,
          error: serverJob.error ?? null,
          finishedAt: serverJob.finished_at ? serverJob.finished_at * 1000 : existing.finishedAt,
        });
      }

      const adopted: ReportJob = {
        id: serverJob.id,
        label: serverJob.label,
        route: null,
        status: serverJob.status,
        progress: serverJob.progress ?? null,
        statusText: serverJob.status_text ?? null,
        error: serverJob.error ?? null,
        startedAt: (serverJob.started_at || Date.now() / 1000) * 1000,
        finishedAt: serverJob.finished_at ? serverJob.finished_at * 1000 : undefined,
        logs: [],
        local: false,
      };
      return { jobs: [adopted, ...state.jobs].slice(0, MAX_JOBS) };
    }),

  // The row stays, marked cancelled: a row that vanishes is indistinguishable
  // from one that never existed.
  cancelJob: (id) => {
    const job = get().jobs.find((j) => j.id === id);
    try {
      job?.abort?.();
    } catch {
      /* the request had already gone */
    }
    jobsApi.cancelCurrentJob().catch(() => {});
    set((state) =>
      patchJob(state, id, { status: 'cancelled', error: null, finishedAt: Date.now() })
    );
  },

  setJobAbort: (id, abort) => set((state) => patchJob(state, id, { abort })),

  dismissJob: (id) => {
    set((state) => ({ jobs: state.jobs.filter((j) => j.id !== id) }));
    // The server tracks one current report; clear it only once nothing is
    // running here, or the next poll re-adopts what was just dismissed.
    if (!get().jobs.some((j) => j.status === 'running')) {
      jobsApi.dismissCurrentJob().catch(() => {});
    }
  },
}));

export default useReportJobStore;
