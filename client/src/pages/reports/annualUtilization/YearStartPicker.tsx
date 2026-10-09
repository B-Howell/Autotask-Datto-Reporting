import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import type { Dayjs } from 'dayjs';
import type { DateRange } from './fiscalYear';

interface YearStartPickerProps {
  value: Dayjs | null;
  onChange: (value: Dayjs | null) => void;
  /** The twelve-month window the picked month opens. */
  range: DateRange;
}

const YearStartPicker = ({ value, onChange, range }: YearStartPickerProps) => (
  <LocalizationProvider dateAdapter={AdapterDayjs}>
    <DatePicker
      label="Year starting"
      value={value}
      onChange={onChange}
      views={['year', 'month']}
      openTo="month"
      format="MMMM YYYY"
      slotProps={{
        textField: {
          size: 'small',
          sx: { minWidth: 280 },
          helperText: `${range.detail}${range.incomplete ? ' · runs past today' : ''}`,
        },
      }}
    />
  </LocalizationProvider>
);

export default YearStartPicker;
