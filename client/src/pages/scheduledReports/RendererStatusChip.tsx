import { useCallback, useState } from 'react';
import { Chip, Tooltip } from '@mui/material';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import { schedulesApi } from '@/api';
import usePolling from '@/hooks/usePolling';
import { errorMessage } from '@/utils/reportJob';

const CHECK_MS = 60000;

type Health = { ok: true } | { ok: false; message: string };

const checkHealth = async (): Promise<Health> => {
  try {
    const result = await schedulesApi.fetchRendererHealth();
    return result.ok
      ? { ok: true }
      : { ok: false, message: 'The renderer reported itself unhealthy' };
  } catch (err) {
    return { ok: false, message: errorMessage(err, 'No response') };
  }
};

/** Whether the report renderer answers its health check, rechecked every minute. */
const RendererStatusChip = () => {
  const [health, setHealth] = useState<Health | null>(null);
  const check = useCallback(() => checkHealth().then(setHealth), []);
  usePolling(check, CHECK_MS);

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
