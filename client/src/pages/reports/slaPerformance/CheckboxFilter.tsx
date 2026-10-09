import type { SyntheticEvent } from 'react';
import { Autocomplete, Checkbox, TextField } from '@mui/material';

const ALL_OPTION = '@@ALL@@';

interface CheckboxFilterProps {
  label: string;
  options: string[];
  /** Empty means no filter, shown as "All" checked. */
  value: string[];
  onChange: (v: string[]) => void;
}

const CheckboxFilter = ({ label, options, value, onChange }: CheckboxFilterProps) => {
  const allSelected = value.length === 0;

  const handleChange = (_: SyntheticEvent, newValue: string[]) => {
    const pickedAll = newValue.includes(ALL_OPTION) && !allSelected;
    onChange(pickedAll ? [] : newValue.filter((v) => v !== ALL_OPTION));
  };

  return (
    <Autocomplete<string, true, false, false>
      multiple
      size="small"
      disableCloseOnSelect
      options={[ALL_OPTION, ...options]}
      value={allSelected ? [] : value}
      onChange={handleChange}
      getOptionLabel={(opt) => (opt === ALL_OPTION ? 'All' : opt)}
      renderOption={(props, option, { selected }) => {
        const isAll = option === ALL_OPTION;
        // React 19 rejects `key` arriving via spread, so pull it out first.
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Checkbox size="small" checked={isAll ? allSelected : selected} sx={{ mr: 1 }} />
            {isAll ? 'All' : option}
          </li>
        );
      }}
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder={allSelected ? 'All' : ''} />
      )}
      sx={{ minWidth: 220, flex: 1 }}
      limitTags={2}
    />
  );
};

export default CheckboxFilter;
