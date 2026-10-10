import { TextField } from '@mui/material';
import type { CredentialFieldStatus } from '@/api';
import { formatDateTime } from '@/utils/dates';
import { FIELD_LABELS } from './vendors';

/** What the server holds for the field today, without the value itself. */
const hint = (field: CredentialFieldStatus): string => {
  if (field.source === 'environment') return 'Set by the environment, read-only';
  if (field.source === 'missing') return 'Not configured';
  const tail = field.last4 ? `, ends with ${field.last4}` : '';
  return `Stored${tail}, saved ${formatDateTime(field.updated_at)}`;
};

interface CredentialFieldProps {
  field: CredentialFieldStatus;
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/** One credential input: it starts blank, and blank means the stored value is kept. */
const CredentialField = ({ field, value, disabled = false, onChange }: CredentialFieldProps) => (
  <TextField
    name={field.name}
    label={FIELD_LABELS[field.name]}
    type={field.secret ? 'password' : 'text'}
    value={value}
    onChange={(event) => onChange(event.target.value)}
    helperText={hint(field)}
    disabled={disabled || field.source === 'environment'}
    autoComplete="off"
    fullWidth
    size="small"
  />
);

export default CredentialField;
