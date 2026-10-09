import { Paper, Typography } from '@mui/material';
import dayjs from 'dayjs';

interface ReportMetaProps {
  agencyName: string;
  deviceCount: number;
}

const ReportMeta = ({ agencyName, deviceCount }: ReportMetaProps) => (
  <Paper sx={{ p: 3, mb: 3 }}>
    <Typography variant="h6" sx={{ mb: 1 }}>
      Patch Management Summary Report
    </Typography>
    <Typography variant="body2" sx={{ mb: 0.5 }}>
      <b>Description:</b> This report shows the patch status by device
    </Typography>
    <Typography variant="body2" sx={{ mb: 0.5 }}>
      <b>Create Date:</b> {dayjs().format('DD MMM YYYY HH:mm').toUpperCase()}
    </Typography>
    <Typography variant="body2" sx={{ mb: 0.5 }}>
      <b>Sites:</b> {agencyName}
    </Typography>
    <Typography variant="body2">
      <b>Devices:</b> {deviceCount}
    </Typography>
  </Paper>
);

export default ReportMeta;
