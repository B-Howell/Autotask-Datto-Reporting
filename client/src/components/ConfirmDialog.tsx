import type { ReactNode } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  /** Colours the confirm button for an action that cannot be undone. */
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}

/** A yes-or-no question before an action the user cannot take back. */
const ConfirmDialog = ({
  open,
  title,
  children,
  confirmLabel = 'Confirm',
  destructive = false,
  busy = false,
  onConfirm,
  onClose,
}: ConfirmDialogProps) => (
  <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
    <DialogTitle>{title}</DialogTitle>
    <DialogContent>
      <Typography variant="body2" color="text.secondary">
        {children}
      </Typography>
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose} disabled={busy}>
        Cancel
      </Button>
      <Button
        variant="contained"
        color={destructive ? 'error' : 'primary'}
        onClick={onConfirm}
        disabled={busy}
      >
        {confirmLabel}
      </Button>
    </DialogActions>
  </Dialog>
);

export default ConfirmDialog;
