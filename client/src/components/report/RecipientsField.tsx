import { TextField } from '@mui/material';

interface RecipientsFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Caption under the field; defaults to the separator rule the dialog applies. */
  helperText?: string;
}

/** One line of email addresses; the form splits it on commas or semicolons. */
const RecipientsField = ({
  label,
  value,
  onChange,
  helperText = 'Separate addresses with commas or semicolons',
}: RecipientsFieldProps) => (
  <TextField
    label={label}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    helperText={helperText}
    slotProps={{ htmlInput: { inputMode: 'email' } }}
    autoComplete="off"
    fullWidth
    size="small"
  />
);

export default RecipientsField;
