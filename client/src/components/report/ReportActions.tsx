import { Button } from '@mui/material';
import DownloadIcon from '@mui/icons-material/Download';

export interface ExportAction {
  label: string;
  onClick: () => void;
}

interface ReportActionsProps {
  onGenerate: () => void;
  generateDisabled?: boolean;
  loading?: boolean;
  /** Download buttons, shown only once there is something to export. */
  exports?: ExportAction[];
  /** "Save to app" without a download. */
  onSave?: () => void;
  /** Re-pull from the vendor APIs, ignoring the cache. */
  onRefresh?: () => void;
  hasResults?: boolean;
}

const BUTTON_SX = { minWidth: 130 };

/** The right-hand button group every report shares, in a fixed order. */
const ReportActions = ({
  onGenerate,
  generateDisabled = false,
  loading = false,
  exports = [],
  onSave,
  onRefresh,
  hasResults = false,
}: ReportActionsProps) => (
  <>
    {exports.map((action) => (
      <Button
        key={action.label}
        variant="outlined"
        size="small"
        startIcon={<DownloadIcon />}
        onClick={action.onClick}
        disabled={!hasResults}
        sx={BUTTON_SX}
      >
        {action.label}
      </Button>
    ))}
    {onSave && (
      <Button
        variant="outlined"
        size="small"
        onClick={onSave}
        disabled={!hasResults}
        sx={BUTTON_SX}
      >
        Save to app
      </Button>
    )}
    {onRefresh && (
      <Button
        variant="outlined"
        size="small"
        onClick={onRefresh}
        disabled={loading}
        title="Re-pull from Autotask and Datto, ignoring the cache"
        sx={BUTTON_SX}
      >
        Refresh data
      </Button>
    )}
    <Button
      variant="contained"
      size="small"
      onClick={onGenerate}
      disabled={generateDisabled || loading}
      sx={BUTTON_SX}
    >
      Generate
    </Button>
  </>
);

export default ReportActions;
