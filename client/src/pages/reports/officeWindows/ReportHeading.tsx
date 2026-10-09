import { Box, FormControlLabel, Switch, Typography } from '@mui/material';

interface ReportHeadingProps {
  title: string;
  showLicenses: boolean;
  onShowLicensesChange: (show: boolean) => void;
}

/** The report title with the switch that shows or hides the licence columns. */
const ReportHeading = ({ title, showLicenses, onShowLicensesChange }: ReportHeadingProps) => (
  <>
    <Typography variant="h6" sx={{ mb: 2, textAlign: 'center' }}>
      {title}
    </Typography>
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 2, mb: 3 }}>
      <FormControlLabel
        control={
          <Switch checked={showLicenses} onChange={(e) => onShowLicensesChange(e.target.checked)} />
        }
        label="Licenses"
      />
    </Box>
  </>
);

export default ReportHeading;
