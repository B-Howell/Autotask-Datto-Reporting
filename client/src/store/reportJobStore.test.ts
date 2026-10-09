import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ServerJob } from '@/api';
import useReportJobStore, { isAhead, reportName, runKey } from './reportJobStore';

const serverJob = (overrides: Partial<ServerJob> = {}): ServerJob => ({
  id: 'Utilization · 2026-07-01 to 2026-09-30-123',
  label: 'Utilization · 2026-07-01 to 2026-09-30',
  status: 'running',
  progress: { phase: 'Collecting time entries', done: 500, total: null, step: 1, steps: 4 },
  status_text: null,
  error: null,
  started_at: 1000,
  finished_at: null,
  cancelled: false,
  ...overrides,
});

beforeEach(() => {
  useReportJobStore.setState({ jobs: [] });
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}')));
});

describe('label matching', () => {
  it('matches a local run to the server run by the period they both end with', () => {
    expect(runKey('Annual Utilization · 2025-09-01 to 2026-08-31')).toBe(
      '2025-09-01 to 2026-08-31'
    );
    expect(reportName('Annual Utilization · 2025-09-01 to 2026-08-31')).toBe('Annual Utilization');
  });

  it('prefers whichever progress is further along', () => {
    const early = { phase: 'a', done: 10, total: null, step: 1, steps: 3 };
    const later = { phase: 'b', done: 0, total: null, step: 2, steps: 3 };
    expect(isAhead(later, early)).toBe(true);
    expect(isAhead(early, later)).toBe(false);
    expect(isAhead(null, early)).toBe(false);
  });
});

describe('job rows', () => {
  it('re-running a report replaces its row instead of stacking a second one', () => {
    const { startJob } = useReportJobStore.getState();
    startJob('SLA Performance · 2026-08');
    startJob('SLA Performance · 2026-09');
    const jobs = useReportJobStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.label).toBe('SLA Performance · 2026-09');
  });

  it('adopts a server run the tab did not start, and updates it on later polls', () => {
    const { adoptServerJob } = useReportJobStore.getState();
    adoptServerJob(serverJob());
    adoptServerJob(serverJob({ status: 'done', finished_at: 2000 }));
    const jobs = useReportJobStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.status).toBe('done');
    expect(jobs[0]!.finishedAt).toBe(2_000_000);
  });

  it('lets the server poll carry a local run forward but never adds a twin row', () => {
    const { startJob, adoptServerJob } = useReportJobStore.getState();
    const id = startJob('Annual Utilization · 2026-07-01 to 2026-09-30');
    adoptServerJob(serverJob());
    const jobs = useReportJobStore.getState().jobs;
    expect(jobs).toHaveLength(1);
    expect(jobs[0]!.id).toBe(id);
    expect(jobs[0]!.progress?.done).toBe(500);
  });

  it('keeps a cancelled row marked cancelled even when the aborted request reports an error', () => {
    const { startJob, cancelJob, finishJob } = useReportJobStore.getState();
    const id = startJob('Device Report · Harbor Point Health');
    cancelJob(id);
    finishJob(id, { error: new Error('The user aborted a request.') });
    expect(useReportJobStore.getState().jobs[0]!.status).toBe('cancelled');
    expect(fetch).toHaveBeenCalledWith(
      '/api/jobs/current/cancel',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
