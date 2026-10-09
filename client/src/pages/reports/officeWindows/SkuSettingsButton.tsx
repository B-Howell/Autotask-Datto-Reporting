import { IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface SkuSettingsButtonProps {
  /** The settings are saved per agency, so there is nothing to configure before a report runs. */
  enabled: boolean;
  onClick: () => void;
}

const SkuSettingsButton = ({ enabled, onClick }: SkuSettingsButtonProps) => (
  <Tooltip
    title={
      enabled
        ? 'Choose which Office 365 subscriptions appear'
        : 'Generate a report first — these settings are saved per agency'
    }
  >
    {/* span so the tooltip still fires while the button is disabled */}
    <span>
      <IconButton size="small" onClick={onClick} disabled={!enabled} aria-label="Report settings">
        <SettingsIcon fontSize="small" />
      </IconButton>
    </span>
  </Tooltip>
);

export default SkuSettingsButton;
