import { create } from 'zustand';
import type { UtilizationEntry, UtilizationReport } from '@/api';
import type { Rates } from '@/pages/reports/annualUtilization/departments';
import { applyUpdater } from './reportDataStore';
import type { ReportDataState, Updater } from './reportDataStore';

export type ViewMode = 'table' | 'spreadsheet';

const SELECTED_KEY = 'annualUtil_selectedCompanies';
const RATES_KEY = 'annualUtil_rates';
const VIEW_KEY = 'annualUtil_viewMode';

interface AnnualUtilizationState extends ReportDataState<UtilizationReport> {
  /** null means "no preference saved": every company is shown. */
  selectedCompanies: Set<string> | null;
  rates: Rates;
  viewMode: ViewMode;
  // The raw entries and the open tab belong to the report, not the page, so
  // they survive navigating away mid-read.
  entries: UtilizationEntry[] | null;
  entriesFor: string | null;
  tab: string;
  setEntries: (entries: UtilizationEntry[] | null) => void;
  setEntriesFor: (key: string | null) => void;
  setTab: (tab: string) => void;
  setSelectedCompanies: (companies: Set<string> | null) => void;
  setRates: (rates: Rates) => void;
  setViewMode: (mode: ViewMode) => void;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage unavailable: the preference lasts for this session only */
  }
}

const loadSelected = (): Set<string> | null => {
  const stored = readJson<string[]>(SELECTED_KEY);
  return stored ? new Set(stored) : null;
};

const loadViewMode = (): ViewMode =>
  localStorage.getItem(VIEW_KEY) === 'spreadsheet' ? 'spreadsheet' : 'table';

const useAnnualUtilizationStore = create<AnnualUtilizationState>()((set) => ({
  data: null,
  loading: false,
  error: null,
  logs: [],
  selectedCompanies: loadSelected(),
  rates: readJson<Rates>(RATES_KEY) ?? {},
  viewMode: loadViewMode(),
  entries: null,
  entriesFor: null,
  tab: '',

  setData: (data) => set({ data }),
  setEntries: (entries) => set({ entries }),
  setEntriesFor: (entriesFor) => set({ entriesFor }),
  setTab: (tab) => set({ tab }),
  setLoading: (loading) => set({ loading }),
  setError: (error) => set({ error }),
  setLogs: (logs: Updater<string[]>) => set((state) => ({ logs: applyUpdater(state.logs, logs) })),

  setSelectedCompanies: (selectedCompanies) => {
    if (selectedCompanies) writeJson(SELECTED_KEY, [...selectedCompanies]);
    else localStorage.removeItem(SELECTED_KEY);
    set({ selectedCompanies });
  },

  setRates: (rates) => {
    writeJson(RATES_KEY, rates);
    set({ rates });
  },

  setViewMode: (viewMode) => {
    localStorage.setItem(VIEW_KEY, viewMode);
    set({ viewMode });
  },
}));

export default useAnnualUtilizationStore;
