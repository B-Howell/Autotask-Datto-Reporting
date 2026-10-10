import { useId } from 'react';
import { FormControl, FormControlLabel, FormLabel, Radio, RadioGroup } from '@mui/material';
import type { OfficeWindowsFormat } from '@/api';

interface FormatRadioGroupProps {
  value: OfficeWindowsFormat;
  onChange: (format: OfficeWindowsFormat) => void;
}

/** The Word-or-PDF choice for a report that can go out as either. */
const FormatRadioGroup = ({ value, onChange }: FormatRadioGroupProps) => {
  const labelId = useId();
  return (
    <FormControl>
      <FormLabel id={labelId}>Format</FormLabel>
      <RadioGroup
        row
        aria-labelledby={labelId}
        value={value}
        onChange={(event) => onChange(event.target.value as OfficeWindowsFormat)}
      >
        <FormControlLabel value="docx" control={<Radio size="small" />} label="Word (docx)" />
        <FormControlLabel value="pdf" control={<Radio size="small" />} label="PDF" />
      </RadioGroup>
    </FormControl>
  );
};

export default FormatRadioGroup;
