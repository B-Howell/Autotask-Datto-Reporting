import { useEffect, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { schedulesApi } from '@/api';

const CHECK_MS = 60000;

type Health = { ok: true } | { ok: false; message: string };

/** Whether the report renderer answers its health check, rechecked every minute. */
const RendererStatusChip = () => {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    const check = async () => {
      try {
        const result = await schedulesApi.fetchRendererHealth();
        setHealth(
          result.ok
            ? { ok: true }
            : { ok: false, message: 'The renderer reported itself unhealthy' }
        );
      } catch (err) {
        setHealth({ ok: false, message: err instanceof Error ? err.message : 'No response' });
      }
    };
    void check();
    const timer = setInterval(() => void check(), CHECK_MS);
    return () => clearInterval(timer);
  }, []);

  if (health === null) return <Chip label="Checking renderer…" size="small" variant="outlined" />;
  if (health.ok) {
    return (
      <Chip
        icon={<CheckCircleOutlineIcon />}
        label="Renderer ready"
        size="small"
        color="success"
        variant="outlined"
      />
    );
  }
  return (
    <Tooltip title={health.message}>
      <Chip
        icon={<ErrorOutlineIcon />}
        label="Renderer unreachable"
        size="small"
        color="error"
        variant="outlined"
      />
    </Tooltip>
  );
};

export default RendererStatusChip;
