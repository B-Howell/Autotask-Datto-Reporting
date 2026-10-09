import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';
import useToastStore from '@/store/toastStore';

/** Bottom-right snackbar, rendered once at the root and driven by the toast store. */
const Toaster = () => {
  const open = useToastStore((s) => s.open);
  const message = useToastStore((s) => s.message);
  const severity = useToastStore((s) => s.severity);
  const hideToast = useToastStore((s) => s.hideToast);

  return (
    <Snackbar
      open={open}
      autoHideDuration={4000}
      onClose={(_e, reason) => {
        if (reason !== 'clickaway') hideToast();
      }}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={hideToast} severity={severity} variant="filled" sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default Toaster;
