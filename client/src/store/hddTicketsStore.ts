import { create } from 'zustand';
import type { AgencyValue, HddTicketDevice } from '@/api';
import { applyUpdater } from './reportDataStore';
import type { Updater } from './reportDataStore';

interface HddTicketsState {
  devices: HddTicketDevice[];
  deviceCount: number;
  loading: boolean;
  logs: string[];
  companyValue: AgencyValue | '';
  generatedLabel: string;
  setDevices: (devices: HddTicketDevice[]) => void;
  setDeviceCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setLogs: (logs: Updater<string[]>) => void;
  setCompanyValue: (value: AgencyValue | '') => void;
  setGeneratedLabel: (label: string) => void;
}

const useHddTicketsStore = create<HddTicketsState>()((set) => ({
  devices: [],
  deviceCount: 0,
  loading: false,
  logs: [],
  companyValue: '',
  generatedLabel: '',

  setDevices: (devices) => set({ devices }),
  setDeviceCount: (deviceCount) => set({ deviceCount }),
  setLoading: (loading) => set({ loading }),
  setLogs: (logs) => set((state) => ({ logs: applyUpdater(state.logs, logs) })),
  setCompanyValue: (companyValue) => set({ companyValue }),
  setGeneratedLabel: (generatedLabel) => set({ generatedLabel }),
}));

export default useHddTicketsStore;
