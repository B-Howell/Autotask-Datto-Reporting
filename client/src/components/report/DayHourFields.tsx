import { FormControl, FormHelperText, InputLabel, MenuItem, Select, Stack } from '@mui/material';

interface DayHourFieldsProps {
  dayOfMonth: number;
  hour: number;
  onChange: (patch: { dayOfMonth?: number; hour?: number }) => void;
}

const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const HOURS = Array.from({ length: 24 }, (_, i) => i);

const hourLabel = (hour: number) => `${String(hour).padStart(2, '0')}:00`;

/** The monthly slot a schedule fires in: a day of the month and an hour of that day. */
const DayHourFields = ({ dayOfMonth, hour, onChange }: DayHourFieldsProps) => (
  <Stack direction="row" spacing={2}>
    <FormControl size="small" fullWidth>
      <InputLabel id="schedule-day-label">Day of month</InputLabel>
      <Select
        labelId="schedule-day-label"
        label="Day of month"
        value={dayOfMonth}
        onChange={(event) => onChange({ dayOfMonth: Number(event.target.value) })}
      >
        {DAYS.map((day) => (
          <MenuItem key={day} value={day}>
            {day}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>31 means the last day of the month</FormHelperText>
    </FormControl>
    <FormControl size="small" fullWidth>
      <InputLabel id="schedule-hour-label">Hour</InputLabel>
      <Select
        labelId="schedule-hour-label"
        label="Hour"
        value={hour}
        onChange={(event) => onChange({ hour: Number(event.target.value) })}
      >
        {HOURS.map((value) => (
          <MenuItem key={value} value={value}>
            {hourLabel(value)}
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>in the server's schedule timezone</FormHelperText>
    </FormControl>
  </Stack>
);

export default DayHourFields;
