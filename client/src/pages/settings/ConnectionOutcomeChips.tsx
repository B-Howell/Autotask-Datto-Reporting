import { Chip, Stack } from '@mui/material';
import type { ConnectionTestResult } from '@/api';
import { VENDOR_LABELS, VENDORS } from './vendors';

/** What a card shows after an action: both vendors' answers, or the detail of a refusal. */
export type ConnectionOutcome =
  { kind: 'tested'; result: ConnectionTestResult } | { kind: 'failed'; message: string };

// A vendor's refusal can run to a sentence; let the chip wrap rather than clip it.
const wrapLabel = { height: 'auto', '& .MuiChip-label': { whiteSpace: 'normal', py: 0.5 } };

interface ConnectionOutcomeChipsProps {
  outcome: ConnectionOutcome;
}

/** The outcome of a connection test or save as chips, announced as a status update. */
const ConnectionOutcomeChips = ({ outcome }: ConnectionOutcomeChipsProps) => (
  <Stack role="status" direction="row" useFlexGap sx={{ gap: 1, flexWrap: 'wrap', mt: 2 }}>
    {outcome.kind === 'failed' ? (
      <Chip color="error" variant="outlined" label={outcome.message} sx={wrapLabel} />
    ) : (
      VENDORS.map((vendor) => (
        <Chip
          key={vendor}
          color={outcome.result[vendor].ok ? 'success' : 'error'}
          variant="outlined"
          label={`${VENDOR_LABELS[vendor]}: ${outcome.result[vendor].message}`}
          sx={wrapLabel}
        />
      ))
    )}
  </Stack>
);

export default ConnectionOutcomeChips;
