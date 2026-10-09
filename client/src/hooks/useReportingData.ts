import type { GridCellParams, GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { devicesApi } from '@/api';
import type { DeviceChange, EffectiveAgency, SheetCell } from '@/api';
import { mergeSheets } from '@/pages/reports/deviceReports/sheetRows';
import type { DeviceRow, EditableCols, MemberSheet } from '@/pages/reports/deviceReports/sheetRows';
import useDeviceDataStore from '@/store/deviceDataStore';
import type { EditedCells } from '@/store/deviceDataStore';
import useToastStore from '@/store/toastStore';
import { membersOf, valueFor } from '@/utils/agencyGroups';
import { errorMessage } from '@/utils/reportJob';
import useTrackedReport from './useTrackedReport';

const TYPE_FIELD: `col${number}` = 'col0';
const END_USER_TYPES = new Set(['Desktop', 'Laptop', 'Tablet']);

const isEndUserDevice = (row: DeviceRow): boolean =>
  END_USER_TYPES.has(String(row[TYPE_FIELD] ?? ''));

const rowNumberColumn: GridColDef<DeviceRow> = {
  field: 'rowNumber',
  headerName: '#',
  width: 70,
  sortable: false,
  filterable: false,
  // Visible-row position, so numbers stay 1..N after sorting or filtering.
  renderCell: (params: GridRenderCellParams<DeviceRow>) =>
    params.api.getRowIndexRelativeToVisibleRows(params.id) + 1,
};

function buildColumns(header: SheetCell[], editableCols: EditableCols): GridColDef<DeviceRow>[] {
  const editableFields = new Set(Object.values(editableCols));
  return [
    rowNumberColumn,
    ...header.map((name, index): GridColDef<DeviceRow> => {
      const field: `col${number}` = `col${index}`;
      return {
        field,
        headerName: String(name ?? ''),
        flex: 1,
        sortable: true,
        minWidth: 150,
        editable: editableFields.has(field),
        cellClassName: (params: GridCellParams<DeviceRow>) =>
          useDeviceDataStore.getState().editedCells[`${params.id}-${params.field}`]
            ? 'edited-cell'
            : '',
      };
    }),
    { field: 'company', headerName: 'Company', flex: 1, sortable: true, minWidth: 200 },
  ];
}

const useReportingData = () => {
  const columns = useDeviceDataStore((s) => s.columns);
  const rows = useDeviceDataStore((s) => s.rows);
  const allRows = useDeviceDataStore((s) => s.allRows);
  const loading = useDeviceDataStore((s) => s.loading);
  const logs = useDeviceDataStore((s) => s.logs);
  const selectedCompany = useDeviceDataStore((s) => s.selectedCompany);
  const page = useDeviceDataStore((s) => s.page);
  const editedCells = useDeviceDataStore((s) => s.editedCells);
  const missingFilter = useDeviceDataStore((s) => s.missingFilter);
  const editableCols = useDeviceDataStore((s) => s.editableCols);

  const {
    setColumns,
    setRows,
    setAllRows,
    setLoading,
    setLogs,
    setSelectedCompany,
    setPage,
    setEditedCells,
    setMissingFilter,
    setEditableCols,
  } = useDeviceDataStore.getState();

  const runReport = useTrackedReport({ setLoading, setLogs });

  // A group fetches each member and stamps every row with the member name in
  // the synthetic "company" column.
  const fetchDevices = (agency: EffectiveAgency) => {
    const targets = membersOf(agency);
    const first = targets[0];
    if (!first) return Promise.resolve();
    setSelectedCompany(valueFor(agency));

    return runReport({
      label: `Device Report · ${agency.name}`,
      route: '/reports/device',
      logsUrl: devicesApi.deviceLogsUrl(first.id, first.site),
      run: async (signal) => {
        const sheets: MemberSheet[] = [];
        for (const target of targets) {
          const data = await devicesApi.fetchDeviceSheet(target.id, target.site, { signal });
          sheets.push({ sheet: data.sheet, ids: data.ids, companyName: target.name });
        }
        return sheets;
      },
      onSuccess: (sheets) => {
        const { header, rows, editableCols } = mergeSheets(sheets);
        setEditableCols(editableCols);
        setColumns(buildColumns(header, editableCols));
        setRows(rows);
        setAllRows(rows);
        setEditedCells({});
        setPage(0);
      },
      onFailure: () => {
        setColumns([]);
        setRows([]);
      },
    });
  };

  const processRowUpdate = (newRow: DeviceRow, oldRow: DeviceRow): DeviceRow => {
    const { editedCells: currentEdits, editableCols: currentEditableCols } =
      useDeviceDataStore.getState();
    const newEdits: EditedCells = { ...currentEdits };
    let hasChange = false;

    for (const field of Object.values(currentEditableCols)) {
      if (newRow[field] !== oldRow[field]) {
        newEdits[`${newRow.id}-${field}`] = true;
        hasChange = true;
      }
    }

    if (hasChange) {
      const replace = (list: DeviceRow[]) => list.map((r) => (r.id === newRow.id ? newRow : r));
      setEditedCells(newEdits);
      setRows(replace);
      setAllRows(replace);
    }
    return newRow;
  };

  /** Filter to end-user devices missing one editable field, or any (`all`), or none (``). */
  const handleFilterChange = (field: string) => {
    setMissingFilter(field);
    const { allRows: currentAllRows, editableCols: currentEditableCols } =
      useDeviceDataStore.getState();

    if (!field) {
      setRows(currentAllRows);
      return;
    }
    const cols =
      field === 'all' ? Object.values(currentEditableCols) : [currentEditableCols[field]];
    if (cols.some((c) => !c)) return;
    setRows(currentAllRows.filter((row) => isEndUserDevice(row) && cols.some((col) => !row[col!])));
  };

  /** Write every edited cell back to Autotask and report the outcome in a toast. */
  const postChanges = async () => {
    const state = useDeviceDataStore.getState();
    const { showToast } = useToastStore.getState();
    const changes: DeviceChange[] = [];
    let unwritable = 0;
    for (const key of Object.keys(state.editedCells)) {
      const [rowIdStr, colKey] = key.split('-');
      const row = state.allRows.find((r) => r.id === Number(rowIdStr));
      const fieldName = Object.keys(state.editableCols).find(
        (k) => state.editableCols[k] === colKey
      );
      if (!row || !fieldName) continue;
      if (row.autotaskId === null) {
        unwritable += 1;
        continue;
      }
      changes.push({
        deviceId: row.autotaskId,
        field: fieldName,
        value: String(row[colKey as `col${number}`] ?? ''),
      });
    }
    if (!changes.length) {
      showToast('Nothing to post: regenerate the report to pick up device ids', 'warning');
      return;
    }
    try {
      const { results } = await devicesApi.updateDevices(changes);
      const failed = results.filter((r) => r.status === 'error');
      if (failed.length || unwritable) {
        showToast(
          `${results.length - failed.length} device(s) updated, ${failed.length + unwritable} not written`,
          'warning'
        );
      } else {
        showToast(`${results.length} device(s) updated in Autotask`, 'success');
        setEditedCells({});
      }
    } catch (err) {
      showToast(`Update failed: ${errorMessage(err)}`, 'error');
    }
  };

  return {
    columns,
    rows,
    allRows,
    loading,
    logs,
    selectedCompany,
    page,
    editedCells,
    missingFilter,
    editableCols,
    fetchDevices,
    setPage,
    processRowUpdate,
    postChanges,
    handleFilterChange,
  };
};

export default useReportingData;
