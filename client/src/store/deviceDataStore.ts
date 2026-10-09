import { create } from 'zustand';
import type { GridColDef } from '@mui/x-data-grid';
import type { AgencyValue } from '@/api';
import type { DeviceRow, EditableCols } from '@/pages/reports/deviceReports/sheetRows';
import { applyUpdater } from './reportDataStore';
import type { Updater } from './reportDataStore';

// The row and editable-column shapes are defined with the sheet merger that
// produces them; they are re-exported here for the grid and its components.
export type { DeviceRow, EditableCols };

/** Edited cells keyed as `${rowId}-${field}`. */
export type EditedCells = Record<string, boolean>;

interface DeviceDataState {
  columns: GridColDef<DeviceRow>[];
  rows: DeviceRow[];
  allRows: DeviceRow[];
  loading: boolean;
  logs: string[];
  selectedCompany: AgencyValue | null;
  page: number;
  editedCells: EditedCells;
  missingFilter: string;
  editableCols: EditableCols;
  setColumns: (columns: GridColDef<DeviceRow>[]) => void;
  setRows: (rows: Updater<DeviceRow[]>) => void;
  setAllRows: (rows: Updater<DeviceRow[]>) => void;
  setLoading: (loading: boolean) => void;
  setLogs: (logs: Updater<string[]>) => void;
  setSelectedCompany: (value: AgencyValue | null) => void;
  setPage: (page: number) => void;
  setEditedCells: (cells: Updater<EditedCells>) => void;
  setMissingFilter: (filter: string) => void;
  setEditableCols: (cols: EditableCols) => void;
}

// Fetched device-report state, kept outside the page so it survives navigation.
// Column-visibility preferences live separately in deviceReportStore.
const useDeviceDataStore = create<DeviceDataState>()((set) => ({
  columns: [],
  rows: [],
  allRows: [],
  loading: false,
  logs: [],
  selectedCompany: null,
  page: 0,
  editedCells: {},
  missingFilter: '',
  editableCols: {},

  setColumns: (columns) => set({ columns }),
  setRows: (rows) => set((state) => ({ rows: applyUpdater(state.rows, rows) })),
  setAllRows: (allRows) => set((state) => ({ allRows: applyUpdater(state.allRows, allRows) })),
  setLoading: (loading) => set({ loading }),
  setLogs: (logs) => set((state) => ({ logs: applyUpdater(state.logs, logs) })),
  setSelectedCompany: (selectedCompany) => set({ selectedCompany }),
  setPage: (page) => set({ page }),
  setEditedCells: (editedCells) =>
    set((state) => ({ editedCells: applyUpdater(state.editedCells, editedCells) })),
  setMissingFilter: (missingFilter) => set({ missingFilter }),
  setEditableCols: (editableCols) => set({ editableCols }),
}));

export default useDeviceDataStore;
