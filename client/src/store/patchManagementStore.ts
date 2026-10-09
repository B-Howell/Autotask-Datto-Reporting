import { create } from 'zustand';
import type { AgencyValue, EffectiveAgency, PatchDevice, PatchSummaryItem } from '@/api';
import { applyUpdater } from './reportDataStore';
import type { Updater } from './reportDataStore';

interface PatchManagementState {
  summary: PatchSummaryItem[];
  devices: PatchDevice[];
  deviceCount: number;
  loading: boolean;
  selectedSite: string | null;
  logs: string[];
  companyValue: AgencyValue | '';
  /** The agency or group the current results belong to. */
  generatedAgency: EffectiveAgency | null;
  syncedAt: string | null;
  setSummary: (summary: PatchSummaryItem[]) => void;
  setDevices: (devices: PatchDevice[]) => void;
  setDeviceCount: (count: number) => void;
  setLoading: (loading: boolean) => void;
  setSelectedSite: (site: string | null) => void;
  setLogs: (logs: Updater<string[]>) => void;
  setCompanyValue: (value: AgencyValue | '') => void;
  setGeneratedAgency: (agency: EffectiveAgency | null) => void;
  setSyncedAt: (iso: string | null) => void;
}

const usePatchManagementStore = create<PatchManagementState>()((set) => ({
  summary: [],
  devices: [],
  deviceCount: 0,
  loading: false,
  selectedSite: null,
  logs: [],
  companyValue: '',
  generatedAgency: null,
  syncedAt: null,

  setSummary: (summary) => set({ summary }),
  setDevices: (devices) => set({ devices }),
  setDeviceCount: (deviceCount) => set({ deviceCount }),
  setLoading: (loading) => set({ loading }),
  setSelectedSite: (selectedSite) => set({ selectedSite }),
  setLogs: (logs) => set((state) => ({ logs: applyUpdater(state.logs, logs) })),
  setCompanyValue: (companyValue) => set({ companyValue }),
  setGeneratedAgency: (generatedAgency) => set({ generatedAgency }),
  setSyncedAt: (syncedAt) => set({ syncedAt }),
}));

export default usePatchManagementStore;
