import { MenuItem, TextField } from '@mui/material';
import type { AgencyValue, EffectiveAgency } from '@/api';
import { valueFor } from '@/utils/agencyGroups';

export const ALL_AGENCIES = 'all';

interface AgencySelectProps {
  agencies: EffectiveAgency[];
  value: AgencyValue | '';
  onChange: (value: AgencyValue | '') => void;
  /** Offer an "All Agencies" entry whose value is ALL_AGENCIES. */
  includeAll?: boolean;
  label?: string;
}

const AgencySelect = ({
  agencies,
  value,
  onChange,
  includeAll = false,
  label = 'Select Agency',
}: AgencySelectProps) => (
  <TextField
    select
    label={label}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    size="small"
    sx={{ minWidth: 240 }}
  >
    {includeAll && <MenuItem value={ALL_AGENCIES}>All Agencies</MenuItem>}
    {agencies.map((a) => (
      <MenuItem key={valueFor(a)} value={valueFor(a)}>
        {a.name}
      </MenuItem>
    ))}
  </TextField>
);

export default AgencySelect;
