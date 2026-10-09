import { Button, Paper } from '@mui/material';
import CheckboxFilter from './CheckboxFilter';
import { SLA_FILTERS } from './useSlaFilters';
import type { SlaFilterKey, SlaFilterValues } from './useSlaFilters';

interface SlaFiltersProps {
  values: SlaFilterValues;
  options: SlaFilterValues;
  hasActive: boolean;
  onChange: (key: SlaFilterKey, selected: string[]) => void;
  onClear: () => void;
}

const SlaFilters = ({ values, options, hasActive, onChange, onClear }: SlaFiltersProps) => (
  <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
    {SLA_FILTERS.map(({ key, label }) => (
      <CheckboxFilter
        key={key}
        label={label}
        options={options[key]}
        value={values[key]}
        onChange={(selected) => onChange(key, selected)}
      />
    ))}
    {hasActive && (
      <Button size="small" onClick={onClear}>
        Clear
      </Button>
    )}
  </Paper>
);

export default SlaFilters;
