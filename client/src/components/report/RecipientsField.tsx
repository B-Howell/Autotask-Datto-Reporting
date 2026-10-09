import { TextField } from '@mui/material';
import { invalidAddresses } from './scheduleDraft';

interface RecipientsFieldProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /** Caption under the field; defaults to the separator rule the form applies. */
  helperText?: string;
}

/**
 * One line of email addresses; the form splits it on commas or semicolons.
 * An entry that cannot be an address turns the field red and names the entry,
 * the same check the server applies, so the mistake is seen before Save.
 */
const RecipientsField = ({
  label,
  value,
  onChange,
  helperText = 'Separate addresses with commas or semicolons',
}: RecipientsFieldProps) => {
  const invalid = invalidAddresses(value);
  return (
    <TextField
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      error={invalid.length > 0}
      helperText={invalid.length > 0 ? `Not an email address: ${invalid[0]}` : helperText}
      slotProps={{ htmlInput: { inputMode: 'email' } }}
      autoComplete="off"
      fullWidth
      size="small"
    />
  );
};

export default RecipientsField;
