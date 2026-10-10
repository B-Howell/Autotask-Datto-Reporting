import { useState } from 'react';
import { Button } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ConfirmDialog from '@/components/ConfirmDialog';

interface ForgetCredentialsButtonProps {
  disabled?: boolean;
  busy?: boolean;
  onForget: () => Promise<void>;
}

/** Asks before removing every stored vendor value; the way back in once the master key is lost. */
const ForgetCredentialsButton = ({
  disabled = false,
  busy = false,
  onForget,
}: ForgetCredentialsButtonProps) => {
  const [open, setOpen] = useState(false);

  const confirm = async () => {
    await onForget();
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        color="error"
        size="small"
        startIcon={<DeleteOutlineIcon />}
        onClick={() => setOpen(true)}
        disabled={disabled || busy}
      >
        Forget stored credentials
      </Button>
      <ConfirmDialog
        open={open}
        title="Forget stored credentials?"
        confirmLabel="Forget"
        destructive
        busy={busy}
        onConfirm={() => void confirm()}
        onClose={() => setOpen(false)}
      >
        This removes every stored Autotask and Datto value. Values set by the environment are
        unaffected. Continue?
      </ConfirmDialog>
    </>
  );
};

export default ForgetCredentialsButton;
