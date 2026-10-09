import { Paper, Typography } from '@mui/material';
import type { HddTicketDevice } from '@/api';
import { DataTable } from '@/components/report';
import type { DataColumn } from '@/components/report';

const COLUMNS: DataColumn<HddTicketDevice>[] = [
  { key: 'device_name', label: 'Device Name', render: (d) => d.device_name },
  { key: 'ticket_count', label: 'HDD Tickets', align: 'center', render: (d) => d.ticket_count },
  { key: 'last_user', label: 'Last User', render: (d) => d.last_user },
  {
    key: 'c_drive_gb',
    label: 'C: Drive Size',
    align: 'center',
    render: (d) => (d.c_drive_gb != null ? `${d.c_drive_gb} GB` : '—'),
  },
];

interface HddDeviceTableProps {
  label: string;
  devices: HddTicketDevice[];
  deviceCount: number;
}

const HddDeviceTable = ({ label, devices, deviceCount }: HddDeviceTableProps) => (
  <Paper sx={{ p: 2 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>
      {label} — {deviceCount} device{deviceCount === 1 ? '' : 's'}
    </Typography>
    <DataTable columns={COLUMNS} rows={devices} rowKey={(d, i) => `${d.device_name}-${i}`} />
  </Paper>
);

export default HddDeviceTable;
