import { useState } from 'react';

interface DeviceModalState {
  open: boolean;
  title: string;
  devices: string[];
}

/** Which product's device list is showing. Closing keeps the content so the dialog fades out intact. */
const useDeviceModal = () => {
  const [modal, setModal] = useState<DeviceModalState>({ open: false, title: '', devices: [] });
  const open = (title: string, devices: string[] | undefined) =>
    setModal({ open: true, title, devices: devices || [] });
  const close = () => setModal((s) => ({ ...s, open: false }));
  return { modal, open, close };
};

export default useDeviceModal;
