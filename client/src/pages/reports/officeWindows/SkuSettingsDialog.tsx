import { Button, Checkbox, FormControlLabel, FormGroup, Typography } from '@mui/material';
import { SettingsDialog } from '@/components/report';
import { M365_DESKTOP_SKUS } from './skus';

interface SkuSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  visibleSkus: string[];
  onToggle: (sku: string) => void;
  onChange: (skus: string[]) => void;
}

/** Which Office 365 subscription lines this agency shows. */
const SkuSettingsDialog = ({
  open,
  onClose,
  visibleSkus,
  onToggle,
  onChange,
}: SkuSettingsDialogProps) => (
  <SettingsDialog
    open={open}
    onClose={onClose}
    title="Office 365 subscriptions"
    closeLabel="Done"
    actions={
      <>
        <Button onClick={() => onChange([])} disabled={!visibleSkus.length}>
          Clear all
        </Button>
        <Button
          onClick={() => onChange(M365_DESKTOP_SKUS)}
          disabled={visibleSkus.length === M365_DESKTOP_SKUS.length}
        >
          Select all
        </Button>
      </>
    }
  >
    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
      Tick the plans this agency holds. Only these appear under Office 365, and a line still has to
      carry a figure to reach the exported report. Saved for this agency.
    </Typography>
    <FormGroup>
      {M365_DESKTOP_SKUS.map((sku) => (
        <FormControlLabel
          key={sku}
          control={
            <Checkbox
              checked={visibleSkus.includes(sku)}
              onChange={() => onToggle(sku)}
              size="small"
            />
          }
          label={sku}
        />
      ))}
    </FormGroup>
  </SettingsDialog>
);

export default SkuSettingsDialog;
