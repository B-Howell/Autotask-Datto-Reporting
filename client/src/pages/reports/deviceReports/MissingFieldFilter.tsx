import { Checkbox, ListItemText, MenuItem, TextField } from '@mui/material';

const NONE = 'none';
const ALL = 'all';

const renderValue = (val: unknown) => {
  if (val === NONE || !val) return 'None';
  if (val === ALL) return 'All (any missing field)';
  return String(val);
};

interface MissingFieldFilterProps {
  /** `''` for no filter, `'all'` for any editable field, or an editable column label. */
  value: string;
  fieldLabels: string[];
  onChange: (value: string) => void;
}

/** Narrows the grid to end-user devices missing one (or any) editable Autotask field. */
const MissingFieldFilter = ({ value, fieldLabels, onChange }: MissingFieldFilterProps) => (
  <TextField
    select
    size="small"
    label="Filter"
    value={value || NONE}
    onChange={(e) => onChange(e.target.value === NONE ? '' : e.target.value)}
    slotProps={{ select: { renderValue } }}
    sx={{ minWidth: 260 }}
  >
    <MenuItem value={NONE}>
      <Checkbox size="small" checked={!value} />
      <ListItemText primary="None" />
    </MenuItem>
    <MenuItem value={ALL}>
      <Checkbox size="small" checked={value === ALL} />
      <ListItemText primary="All (any missing field)" />
    </MenuItem>
    {fieldLabels.map((label) => (
      <MenuItem key={label} value={label}>
        <Checkbox size="small" checked={value === label} />
        <ListItemText primary={label} />
      </MenuItem>
    ))}
  </TextField>
);

export default MissingFieldFilter;
