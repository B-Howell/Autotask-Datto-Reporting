import { useState } from 'react';
import { Box, Button, CircularProgress, Paper, Stack, Typography } from '@mui/material';
import type {
  ConnectionTestResult,
  CredentialFieldStatus,
  CredentialValues,
  CredentialVendor,
} from '@/api';
import { formatDateTime } from '@/utils/dates';
import { errorMessage } from '@/utils/reportJob';
import ConnectionOutcomeChips from './ConnectionOutcomeChips';
import type { ConnectionOutcome } from './ConnectionOutcomeChips';
import CredentialField from './CredentialField';
import { latestTest, typedValues } from './credentialValues';
import { VENDOR_LABELS } from './vendors';

type Action = 'test' | 'save';

interface VendorCredentialsCardProps {
  vendor: CredentialVendor;
  fields: CredentialFieldStatus[];
  disabled: boolean;
  busy: boolean;
  onTest: (values: CredentialValues) => Promise<ConnectionTestResult>;
  onSave: (values: CredentialValues) => Promise<void>;
}

/** One vendor's fields with a connection test and a save; it owns only what has been typed. */
const VendorCredentialsCard = ({
  vendor,
  fields,
  disabled,
  busy,
  onTest,
  onSave,
}: VendorCredentialsCardProps) => {
  const [values, setValues] = useState<CredentialValues>({});
  const [outcome, setOutcome] = useState<ConnectionOutcome | null>(null);
  const [pending, setPending] = useState<Action | null>(null);
  const typed = typedValues(values);
  const canSave = Object.keys(typed).length > 0;
  const lastTest = latestTest(fields);
  const headingId = `${vendor}-credentials-heading`;

  // A rejection carries the server's detail; the hook has already toasted a refused save.
  const run = async (action: Action, task: () => Promise<void>, fallback: string) => {
    setPending(action);
    try {
      await task();
    } catch (err) {
      setOutcome({ kind: 'failed', message: errorMessage(err, fallback) });
    } finally {
      setPending(null);
    }
  };

  const runTest = () =>
    run(
      'test',
      async () => setOutcome({ kind: 'tested', result: await onTest(typed) }),
      'The connection test did not run'
    );

  const runSave = () =>
    run(
      'save',
      async () => {
        await onSave(typed);
        setValues({});
        setOutcome(null);
      },
      'The credentials were not saved'
    );

  const spinner = <CircularProgress size={16} color="inherit" />;

  return (
    <Paper component="section" aria-labelledby={headingId} variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography id={headingId} variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
        {VENDOR_LABELS[vendor]}
      </Typography>
      <Stack sx={{ gap: 2 }}>
        {fields.map((field) => (
          <CredentialField
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
            disabled={disabled}
            onChange={(value) => setValues((current) => ({ ...current, [field.name]: value }))}
          />
        ))}
      </Stack>
      <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
        Leave a field blank to keep its stored value
      </Typography>
      {lastTest && (
        <Typography variant="body2" sx={{ color: 'text.secondary', mt: 1 }}>
          Last test {lastTest.last_test_ok ? 'passed' : 'failed'},{' '}
          {formatDateTime(lastTest.last_tested_at)}
        </Typography>
      )}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, flexWrap: 'wrap' }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={pending === 'test' ? spinner : undefined}
          onClick={() => void runTest()}
          disabled={disabled || busy}
        >
          {pending === 'test' ? 'Testing…' : 'Test connection'}
        </Button>
        <Button
          variant="contained"
          size="small"
          startIcon={pending === 'save' ? spinner : undefined}
          onClick={() => void runSave()}
          disabled={disabled || busy || !canSave}
        >
          {pending === 'save' ? 'Saving…' : 'Save'}
        </Button>
      </Box>
      {outcome && <ConnectionOutcomeChips outcome={outcome} />}
    </Paper>
  );
};

export default VendorCredentialsCard;
