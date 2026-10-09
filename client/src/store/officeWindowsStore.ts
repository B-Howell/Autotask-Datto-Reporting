import { create } from 'zustand';
import type { InstallBreakdownItem } from '@/api';
import { applyUpdater } from './reportDataStore';
import type { Updater } from './reportDataStore';

interface OfficeWindowsState {
  osBreakdown: InstallBreakdownItem[];
  officeBreakdown: InstallBreakdownItem[];
  loading: boolean;
  selectedSite: string | null;
  logs: string[];
  setOsBreakdown: (items: InstallBreakdownItem[]) => void;
  setOfficeBreakdown: (items: InstallBreakdownItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSelectedSite: (site: string | null) => void;
  setLogs: (logs: Updater<string[]>) => void;
}

const useOfficeWindowsStore = create<OfficeWindowsState>()((set) => ({
  osBreakdown: [],
  officeBreakdown: [],
  loading: false,
  selectedSite: null,
  logs: [],

  setOsBreakdown: (osBreakdown) => set({ osBreakdown }),
  setOfficeBreakdown: (officeBreakdown) => set({ officeBreakdown }),
  setLoading: (loading) => set({ loading }),
  setSelectedSite: (selectedSite) => set({ selectedSite }),
  setLogs: (logs) => set((state) => ({ logs: applyUpdater(state.logs, logs) })),
}));

export default useOfficeWindowsStore;
