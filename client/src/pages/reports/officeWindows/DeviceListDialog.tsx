import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

interface DeviceListDialogProps {
  open: boolean;
  title: string;
  devices: string[];
  onClose: () => void;
}

/** The devices behind one product row, sorted by name. */
const DeviceListDialog = ({ open, title, devices, onClose }: DeviceListDialogProps) => (
  <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
    <DialogTitle>
      {title} — {devices.length} {devices.length === 1 ? 'device' : 'devices'}
    </DialogTitle>
    <DialogContent dividers>
      {devices.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic' }}>
          No devices in this category.
        </Typography>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          {[...devices].sort().map((d) => (
            <Typography
              key={d}
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                px: 1,
                py: 0.5,
                borderRadius: 0.5,
                bgcolor: 'action.hover',
              }}
            >
              {d}
            </Typography>
          ))}
        </Box>
      )}
    </DialogContent>
    <DialogActions>
      <Button onClick={onClose}>Close</Button>
    </DialogActions>
  </Dialog>
);

export default DeviceListDialog;
