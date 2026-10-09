import type { ReactNode } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle } from '@mui/material';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  /** Extra buttons placed before the close button. */
  actions?: ReactNode;
  closeLabel?: string;
  maxWidth?: 'xs' | 'sm' | 'md';
}

const SettingsDialog = ({
  open,
  onClose,
  title,
  children,
  actions,
  closeLabel = 'Close',
  maxWidth = 'sm',
}: SettingsDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth={maxWidth} fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent dividers>{children}</DialogContent>
    <DialogActions>
      {actions}
      <Button onClick={onClose} variant="contained">
        {closeLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default SettingsDialog;
