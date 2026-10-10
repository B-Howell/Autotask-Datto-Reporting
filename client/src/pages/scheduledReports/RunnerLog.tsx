import { useEffect, useState } from 'react';
import { Box, Button, Paper, Typography } from '@mui/material';
import { schedulesApi } from '@/api';
import LogTailPanel from '@/components/LogTailPanel';

const KEEP_LINES = 200;

interface RunnerLogProps {
  running: boolean;
}

/**
 * The runner's live log: the stream is followed for as long as the page is
 * open, so lines from a run that started on its own are kept too. The panel
 * shows while a run is in flight and stays until dismissed.
 */
const RunnerLog = ({ running }: RunnerLogProps) => {
  const [lines, setLines] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const source = new EventSource(schedulesApi.scheduleLogsUrl());
    source.onmessage = (event: MessageEvent<string>) =>
      setLines((prev) => [...prev, event.data].slice(-KEEP_LINES));
    source.onerror = () => source.close();
    return () => source.close();
  }, []);

  // A new run brings the panel back after a dismissal.
  useEffect(() => {
    if (running) setDismissed(false);
  }, [running]);

  if (!running && (dismissed || lines.length === 0)) return null;

  const dismiss = () => {
    setLines([]);
    setDismissed(true);
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="h6">{running ? 'Run in progress' : 'Last run log'}</Typography>
        <Button size="small" onClick={dismiss} disabled={running}>
          Dismiss
        </Button>
      </Box>
      <LogTailPanel logs={lines} tail={KEEP_LINES} />
    </Paper>
  );
};

export default RunnerLog;
