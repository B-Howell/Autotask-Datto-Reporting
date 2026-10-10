import { useState } from 'react';
import { Box, Button, Chip, Paper, Stack, Typography } from '@mui/material';
import type {
  ConnectionTestResult,
  CredentialFieldName,
  CredentialFieldStatus,
  CredentialValues,
  CredentialVendor,
} from '@/api';
import useToastStore from '@/store/toastStore';
import { formatDateTime } from '@/utils/dates';
import { errorMessage } from '@/utils/reportJob';
import CredentialField from './CredentialField';

const VENDOR_LABELS: Record<CredentialVendor, string> = { autotask: 'Autotask', datto: 'Datto' };
const VENDORS = Object.keys(VENDOR_LABELS) as CredentialVendor[];

type Outcome =
  { kind: 'tested'; result: ConnectionTestResult } | { kind: 'failed'; message: string };

/** The trimmed, non-blank entries: what a test or save sends. */
const typedValues = (values: CredentialValues): CredentialValues => {
  const typed: CredentialValues = {};
  for (const [name, value] of Object.entries(values) as [CredentialFieldName, string][]) {
    const trimmed = value.trim();
    if (trimmed) typed[name] = trimmed;
  }
  return typed;
};

/** The vendor's most recent test, read from whichever of its stored rows carries it. */
const latestTest = (fields: CredentialFieldStatus[]): CredentialFieldStatus | null =>
  fields.reduce<CredentialFieldStatus | null>((latest, field) => {
    if (!field.last_tested_at) return latest;
    if (!latest?.last_tested_at || field.last_tested_at > latest.last_tested_at) return field;
    return latest;
  }, null);

// A vendor's refusal can run to a sentence; let the chip wrap rather than clip it.
const wrapLabel = { height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } };

const OutcomeChips = ({ outcome }: { outcome: Outcome }) => {
  if (outcome.kind === 'failed') {
    return <Chip color="error" variant="outlined" label={outcome.message} sx={wrapLabel} />;
  }
  return (
    <Stack direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap' }}>
      {VENDORS.map((vendor) => (
        <Chip
          key={vendor}
          color={outcome.result[vendor].ok ? 'success' : 'error'}
          variant="outlined"
          label={`${VENDOR_LABELS[vendor]}: ${outcome.result[vendor].message}`}
          sx={wrapLabel}
        />
      ))}
    </Stack>
  );
};

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
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const showToast = useToastStore((s) => s.showToast);
  const typed = typedValues(values);
  const lastTest = latestTest(fields);

  const runTest = async () => {
    try {
      setOutcome({ kind: 'tested', result: await onTest(typed) });
    } catch (err) {
      setOutcome({
        kind: 'failed',
        message: errorMessage(err) || 'The connection test did not run',
      });
    }
  };

  const runSave = async () => {
    try {
      await onSave(typed);
      setValues({});
      setOutcome(null);
    } catch (err) {
      const message = errorMessage(err) || 'The credentials were not saved';
      setOutcome({ kind: 'failed', message });
      showToast(message, 'error');
    }
  };

  return (
    <Paper component="section" variant="outlined" sx={{ p: 2, mb: 2 }}>
      <Typography variant="subtitle1" component="h3" sx={{ fontWeight: 600, mb: 2 }}>
        {VENDOR_LABELS[vendor]}
      </Typography>
      <Stack sx={{ gap: 2 }}>
        {fields.map((field) => (
          <CredentialField
            key={field.name}
            field={field}
            value={values[field.name] ?? ''}
            disabled={disabled || busy}
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
          onClick={() => void runTest()}
          disabled={disabled || busy}
        >
          Test connection
        </Button>
        <Button
          variant="contained"
          size="small"
          onClick={() => void runSave()}
          disabled={disabled || busy || Object.keys(typed).length === 0}
        >
          Save
        </Button>
      </Box>
      {outcome && (
        <Box sx={{ mt: 2 }}>
          <OutcomeChips outcome={outcome} />
        </Box>
      )}
    </Paper>
  );
};

export default VendorCredentialsCard;
