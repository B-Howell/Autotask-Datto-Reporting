import { create } from 'zustand';

const STORAGE_KEY = 'deviceReport.visibleFields';

interface DeviceReportState {
  /** null means no preference saved: show every column. */
  visibleFields: string[] | null;
  setVisibleFields: (fields: string[]) => void;
}

const loadVisibleFields = (): string[] | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? (JSON.parse(stored) as string[]) : null;
  } catch {
    return null;
  }
};

const useDeviceReportStore = create<DeviceReportState>()((set) => ({
  visibleFields: loadVisibleFields(),
  setVisibleFields: (fields) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fields));
    } catch {
      /* storage unavailable: the preference lasts for this session only */
    }
    set({ visibleFields: fields });
  },
}));

export default useDeviceReportStore;
