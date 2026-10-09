import { MenuItem, TextField } from '@mui/material';
import useTenantStore from '@/store/tenantStore';
import { MONTH_NAMES, reportYears } from '@/utils/dates';
import type { MonthName } from '@/utils/dates';

interface MonthYearSelectProps {
  month: MonthName;
  year: number;
  onMonthChange: (month: MonthName) => void;
  onYearChange: (year: number) => void;
}

const MonthYearSelect = ({ month, year, onMonthChange, onYearChange }: MonthYearSelectProps) => {
  const firstYear = useTenantStore((s) => s.tenant.firstReportYear);
  return (
    <>
      <TextField
        select
        label="Month"
        value={month}
        onChange={(e) => onMonthChange(e.target.value as MonthName)}
        size="small"
        sx={{ minWidth: 130 }}
      >
        {MONTH_NAMES.map((m) => (
          <MenuItem key={m} value={m}>
            {m}
          </MenuItem>
        ))}
      </TextField>
      <TextField
        select
        label="Year"
        value={year}
        onChange={(e) => onYearChange(Number(e.target.value))}
        size="small"
        sx={{ minWidth: 100 }}
      >
        {reportYears(new Date(), firstYear).map((y) => (
          <MenuItem key={y} value={y}>
            {y}
          </MenuItem>
        ))}
      </TextField>
    </>
  );
};

export default MonthYearSelect;
