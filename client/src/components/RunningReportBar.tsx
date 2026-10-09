import { Fragment, useEffect, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  LinearProgress,
  Paper,
  Typography,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useLocation, useNavigate } from 'react-router-dom';
import type { JobProgress } from '@/api';
import useServerJob from '@/hooks/useServerJob';
import useReportJobStore from '@/store/reportJobStore';
import type { ReportJob } from '@/store/reportJobStore';

const CACHED_LINE = /served from cache\s*\(synced_at=([^)]+)\)/i;

const whenSynced = (iso: string): string => {
  const d = new Date(/[Z+]/.test(iso) ? iso : `${iso}Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
};

// Log lines are written for whoever is debugging; strip the level tag and turn
// the cache hit into a sentence before showing them to the person waiting.
const humanize = (line: string | null | undefined): string | null => {
  if (!line) return null;
  const text = String(line)
    .replace(/^\[[A-Z]+\]\s*/, '')
    .trim();
  const cached = text.match(CACHED_LINE);
  if (cached) return `Already up to date, last synced ${whenSynced(cached[1]!)}`;
  return text || null;
};

const describe = (job: ReportJob): string => {
  const lastLog = job.logs.length ? job.logs[job.logs.length - 1] : null;
  if (job.status !== 'running') {
    return humanize(job.statusText) ?? humanize(lastLog) ?? 'Finished';
  }
  const p = job.progress;
  // Until the first phase arrives, the latest log line beats sitting on "Starting".
  if (!p) return humanize(lastLog) ?? humanize(job.statusText) ?? 'Starting…';
  if (p.total) {
    return `${p.phase}: ${(p.done ?? 0).toLocaleString()} of ${p.total.toLocaleString()}`;
  }
  return p.done ? `${p.phase}: ${p.done.toLocaleString()} so far` : p.phase;
};

// One bar for the whole run: each phase owns an equal slice, so the bar only
// ever moves forward even when a phase has no known total.
const overallPercent = (progress: JobProgress | null): number | null => {
  if (!progress?.step || !progress?.steps) return null;
  const slice = 100 / progress.steps;
  const within = progress.total ? Math.min(1, (progress.done ?? 0) / progress.total) : 0;
  return Math.min(100, (progress.step - 1) * slice + within * slice);
};

const elapsed = (from: number, to?: number): string => {
  const secs = Math.max(0, Math.round(((to ?? Date.now()) - from) / 1000));
  return secs < 60 ? `${secs}s` : `${Math.floor(secs / 60)}m ${secs % 60}s`;
};

type ChipColor = 'primary' | 'warning' | 'error' | 'success';

const stateOf = (job: ReportJob): { label: string; color: ChipColor } => {
  switch (job.status) {
    case 'running':
      return { label: 'Running', color: 'primary' };
    case 'cancelled':
      return { label: 'Cancelled', color: 'warning' };
    case 'error':
      return { label: 'Failed', color: 'error' };
    default:
      return { label: 'Complete', color: 'success' };
  }
};

interface JobRowProps {
  job: ReportJob;
  onDismiss: (id: string) => void;
  onCancel: (id: string) => void;
}

const JobRow = ({ job, onDismiss, onCancel }: JobRowProps) => {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const running = job.status === 'running';
  const percent = running ? overallPercent(job.progress) : null;
  const canGo = !running && job.status !== 'cancelled' && job.route && job.route !== pathname;
  const state = stateOf(job);

  const detail =
    job.status === 'error'
      ? job.error
      : job.status === 'cancelled'
        ? 'Cancelled: stopped before it finished, nothing was saved'
        : describe(job);

  return (
    <Box>
      {running &&
        (percent === null ? (
          <LinearProgress />
        ) : (
          <LinearProgress variant="determinate" value={percent} />
        ))}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, px: 2, py: 1 }}>
        <Chip size="small" label={state.label} color={state.color} />
        <Box sx={{ minWidth: 0, flex: 1 }}>
          <Typography variant="body2" noWrap sx={{ fontWeight: 500 }}>
            {job.label}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap component="div">
            {detail}
          </Typography>
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
          {running && job.progress?.step && `Step ${job.progress.step} of ${job.progress.steps} · `}
          {elapsed(job.startedAt, job.finishedAt)}
        </Typography>
        {canGo && (
          <Button size="small" variant="outlined" onClick={() => navigate(job.route!)}>
            Go to report
          </Button>
        )}
        {running ? (
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => onCancel(job.id)}
            title="Stop this report"
          >
            Cancel
          </Button>
        ) : (
          <IconButton
            size="small"
            onClick={() => onDismiss(job.id)}
            aria-label="Dismiss"
            title="Dismiss"
          >
            <CloseIcon />
          </IconButton>
        )}
      </Box>
    </Box>
  );
};

/**
 * Progress for every report in flight, pinned under the page content so a run
 * started on one page keeps reporting wherever the user goes next.
 */
const RunningReportBar = () => {
  useServerJob();

  const jobs = useReportJobStore((s) => s.jobs);
  const dismissJob = useReportJobStore((s) => s.dismissJob);
  const cancelJob = useReportJobStore((s) => s.cancelJob);
  const anyRunning = jobs.some((j) => j.status === 'running');

  // Elapsed time is derived at render, so it needs its own tick while anything runs.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!anyRunning) return undefined;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [anyRunning]);

  if (!jobs.length) return null;

  return (
    <Paper elevation={8} square sx={{ borderTop: 1, borderColor: 'divider', flexShrink: 0 }}>
      {jobs.map((job, i) => (
        <Fragment key={job.id}>
          {i > 0 && <Divider />}
          <JobRow job={job} onDismiss={dismissJob} onCancel={cancelJob} />
        </Fragment>
      ))}
    </Paper>
  );
};

export default RunningReportBar;
