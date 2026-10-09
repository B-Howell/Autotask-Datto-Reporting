import { useMemo } from 'react';
import type { GridColDef } from '@mui/x-data-grid';
import type { DeviceRow } from '@/store/deviceDataStore';
import useDeviceReportStore from '@/store/deviceReportStore';

type DeviceColumn = GridColDef<DeviceRow>;

const ROW_NUMBER_FIELD = 'rowNumber';

const isColumn = (col: DeviceColumn | undefined): col is DeviceColumn => col !== undefined;

const pickColumns = (fields: string[], columns: DeviceColumn[]): DeviceColumn[] =>
  fields.map((f) => columns.find((c) => c.field === f)).filter(isColumn);

/**
 * The user's saved column choice applied to the current schema. A saved list is
 * respected exactly (only dropping fields the schema no longer has): auto-adding
 * new fields would re-show columns the user deliberately hid.
 */
const useVisibleColumns = (columns: DeviceColumn[]) => {
  const savedVisibleFields = useDeviceReportStore((s) => s.visibleFields);
  const setSavedVisibleFields = useDeviceReportStore((s) => s.setVisibleFields);

  const visibleFields = useMemo(() => {
    const allFields = columns.map((c) => c.field);
    if (!Array.isArray(savedVisibleFields)) return allFields;
    const allSet = new Set(allFields);
    return savedVisibleFields.filter((f) => allSet.has(f));
  }, [columns, savedVisibleFields]);

  const displayedColumns = useMemo(
    () => pickColumns(visibleFields, columns),
    [visibleFields, columns]
  );

  const chooserFields = visibleFields.filter((f) => f !== ROW_NUMBER_FIELD);
  const chooserColumns = columns.filter((c) => c.field !== ROW_NUMBER_FIELD);
  const exportColumns = pickColumns(chooserFields, columns);

  // The row-number column is never offered in the chooser, so it is re-pinned
  // to the front when the user's choice is saved.
  const applyVisibleFields = (fields: string[]) => {
    const hasRowNumber = columns.some((c) => c.field === ROW_NUMBER_FIELD);
    setSavedVisibleFields(hasRowNumber ? [ROW_NUMBER_FIELD, ...fields] : fields);
  };

  return { displayedColumns, chooserFields, chooserColumns, exportColumns, applyVisibleFields };
};

export default useVisibleColumns;
