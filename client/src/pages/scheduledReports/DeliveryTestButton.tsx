import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { schedulesApi } from '@/api';
import { isEmailAddress } from '@/components/report';
import useToastStore from '@/store/toastStore';
import { errorMessage } from '@/utils/reportJob';

/** Sends a one-line message to one address through the delivery flow, to prove it is wired up. */
const DeliveryTestButton = () => {
  const [open, setOpen] = useState(false);
  const [address, setAddress] = useState('');
  const [sending, setSending] = useState(false);
  const showToast = useToastStore((s) => s.showToast);
  const recipient = address.trim();
  const valid = isEmailAddress(recipient);

  const send = async () => {
    setSending(true);
    try {
      await schedulesApi.sendTestEmail([recipient]);
      showToast(`Test message sent to ${recipient}`);
      setOpen(false);
    } catch (err) {
      showToast(errorMessage(err, 'The test message was not sent'), 'error');
    }
    setSending(false);
  };

  return (
    <>
      <Button
        variant="outlined"
        size="small"
        startIcon={<SendIcon />}
        onClick={() => setOpen(true)}
      >
        Send test email
      </Button>
      <Dialog
        open={open}
        onClose={sending ? undefined : () => setOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Send a test email</DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            A short message with no attachment goes out through the configured delivery flow.
          </DialogContentText>
          <TextField
            label="To"
            type="email"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && valid && !sending) void send();
            }}
            autoFocus
            fullWidth
            size="small"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)} disabled={sending}>
            Cancel
          </Button>
          <Button variant="contained" onClick={() => void send()} disabled={!valid || sending}>
            {sending ? 'Sending…' : 'Send'}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default DeliveryTestButton;
