import { create } from 'zustand';

export type ToastSeverity = 'success' | 'error' | 'info' | 'warning';

interface ToastState {
  open: boolean;
  message: string;
  severity: ToastSeverity;
  showToast: (message: string, severity?: ToastSeverity) => void;
  hideToast: () => void;
}

// Global snackbar state, so non-React code (export helpers) can report outcomes
// through useToastStore.getState().showToast().
const useToastStore = create<ToastState>()((set) => ({
  open: false,
  message: '',
  severity: 'success',
  showToast: (message, severity = 'success') => set({ open: true, message, severity }),
  hideToast: () => set({ open: false }),
}));

export default useToastStore;
