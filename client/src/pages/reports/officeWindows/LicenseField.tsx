import { TextField } from '@mui/material';

interface LicenseFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  /** Fixed width in px; fills the cell when omitted. */
  width?: number;
}

/** The right-aligned numeric input used for licence figures in both tables. */
const LicenseField = ({ value, onChange, placeholder, width }: LicenseFieldProps) => (
  <TextField
    value={value}
    onChange={(e) => onChange(e.target.value)}
    size="small"
    fullWidth={width === undefined}
    sx={width === undefined ? undefined : { width }}
    slotProps={{
      htmlInput: { style: { textAlign: 'right', fontSize: 16 }, inputMode: 'numeric' },
    }}
    placeholder={placeholder}
  />
);

export default LicenseField;
