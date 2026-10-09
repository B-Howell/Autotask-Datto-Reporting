import { Box, Paper, Typography } from '@mui/material';
import type { PatchDevice } from '@/api';
import { DataTable } from '@/components/report';
import type { DataColumn } from '@/components/report';
import { formatReboot } from './formatters';
import { STATUS_COLORS } from './statusColors';

const COLUMNS: DataColumn<PatchDevice>[] = [
  { key: 'hostname', label: 'Device Name', render: (d) => d.hostname },
  { key: 'description', label: 'Description', render: (d) => d.description },
  { key: 'last_user', label: 'Last User', render: (d) => d.last_user },
  {
    key: 'last_reboot',
    label: 'Last Reboot',
    render: (d) => (
      <Box component="span" sx={{ whiteSpace: 'nowrap' }}>
        {formatReboot(d.last_reboot)}
      </Box>
    ),
  },
  { key: 'installed', label: 'Installed', align: 'center', render: (d) => d.installed },
  {
    key: 'approved_pending',
    label: 'Approved Pending',
    align: 'center',
    render: (d) => d.approved_pending,
  },
  { key: 'not_approved', label: 'Not Approved', align: 'center', render: (d) => d.not_approved },
  {
    key: 'status',
    label: 'Patch Status',
    render: (d) => (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box
          sx={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            bgcolor: STATUS_COLORS[d.status],
            flexShrink: 0,
          }}
        />
        {d.status_label}
      </Box>
    ),
  },
];

interface WorkstationTableProps {
  devices: PatchDevice[];
}

const WorkstationTable = ({ devices }: WorkstationTableProps) => (
  <Paper sx={{ p: 2, mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>
      Workstations
    </Typography>
    <DataTable<PatchDevice>
      columns={COLUMNS}
      rows={devices}
      rowKey={(d, i) => `${d.hostname}-${i}`}
    />
  </Paper>
);

export default WorkstationTable;
