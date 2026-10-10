import { Button, Paper, Typography } from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import type { CredentialsStatus } from '@/api';
import { ErrorBanner, LoadingRow } from '@/components/report';
import VendorCredentialsCard from './VendorCredentialsCard';
import useCredentials from './useCredentials';
import { VENDORS, vendorFields } from './vendors';

const HEADING_ID = 'vendor-credentials-heading';

const KEY_SOURCE_TEXT: Record<CredentialsStatus['keySource'], string> = {
  environment: 'from APP_SECRET_KEY',
  file: 'from the data directory key file',
};

const DEMO_CAPTION = 'Demo mode simulates the vendor clients; credentials are not used.';

/** The Settings card where an operator enters, tests and saves the Autotask and Datto keys. */
const CredentialsSection = () => {
  const { status, loading, error, reload, test, save, busy } = useCredentials();

  return (
    <Paper component="section" aria-labelledby={HEADING_ID} sx={{ p: 3, maxWidth: 600, mb: 3 }}>
      <Typography id={HEADING_ID} variant="h6" sx={{ mb: 1 }}>
        Vendor credentials
      </Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        Keys for the Autotask and Datto APIs, stored encrypted on the server. A changed value is
        tested against its vendor before it is saved, and a stored value is never shown again.
      </Typography>
      <ErrorBanner error={error} />
      {error && (
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={() => void reload()}
          sx={{ mb: 2 }}
        >
          Retry
        </Button>
      )}
      {loading && <LoadingRow message="Loading credentials…" />}
      {status && (
        <>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Master key: {KEY_SOURCE_TEXT[status.keySource]}
          </Typography>
          {status.demoMode && (
            <Typography variant="body2" sx={{ color: 'warning.main', mb: 2 }}>
              {DEMO_CAPTION}
            </Typography>
          )}
          {VENDORS.map((vendor) => (
            <VendorCredentialsCard
              key={vendor}
              vendor={vendor}
              fields={vendorFields(status.fields, vendor)}
              disabled={status.demoMode}
              busy={busy}
              onTest={test}
              onSave={save}
            />
          ))}
        </>
      )}
    </Paper>
  );
};

export default CredentialsSection;
