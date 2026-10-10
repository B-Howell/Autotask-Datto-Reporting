import { useState } from 'react';
import { Button } from '@mui/material';
import type { AgencyValue } from '@/api';
import ColumnChooser from '@/components/ColumnChooser';
import DeviceSpreadsheet from '@/components/DeviceSpreadsheet';
import PostData from '@/components/PostData';
import {
  AgencySelect,
  ReportActions,
  ReportPage,
  ReportScheduleDialog,
  ReportToolbar,
  useScheduleDialog,
} from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import useReportingData from '@/hooks/useReportingData';
import useAgencyStore from '@/store/agencyStore';
import useThemeStore from '@/store/themeStore';
import { agencyNameFor, resolveAgencyValue } from '@/utils/agencyGroups';
import { devicePresetDraft } from './deviceReports/presetDraft';
import SpreadsheetControls from './deviceReports/SpreadsheetControls';
import useDeviceExport from './deviceReports/useDeviceExport';
import useVisibleColumns from './deviceReports/useVisibleColumns';
import ViewTabs from './deviceReports/ViewTabs';
import type { DeviceView } from './deviceReports/ViewTabs';

const DeviceReports = () => {
  const agencies = useAgencyStore((s) => s.agencies);
  const effectiveAgencies = useEffectiveAgencies();
  const isDark = useThemeStore((s) => s.mode) === 'dark';
  const {
    columns,
    rows,
    allRows,
    loading,
    logs,
    selectedCompany,
    page,
    missingFilter,
    editableCols,
    editedCells,
    fetchDevices,
    setPage,
    processRowUpdate,
    postChanges,
    handleFilterChange,
  } = useReportingData();
  const { displayedColumns, chooserFields, chooserColumns, exportColumns, applyVisibleFields } =
    useVisibleColumns(columns);

  const [activeTab, setActiveTab] = useState<DeviceView>('spreadsheet');
  const [agencyValue, setAgencyValue] = useState<AgencyValue | ''>('');
  const [chooserOpen, setChooserOpen] = useState(false);

  const agencyName = agencyNameFor(selectedCompany, agencies);
  const hasData = selectedCompany !== null && allRows.length > 0 && !loading;
  const onSpreadsheet = activeTab === 'spreadsheet';
  const pendingEdits = Object.keys(editedCells).length;
  const exportDevices = useDeviceExport({ exportColumns, rows, agencyName, selectedCompany });
  const schedule = useScheduleDialog(() =>
    hasData ? devicePresetDraft({ selectedCompany, agencyName, exportColumns }) : null
  );

  const handleGenerate = () => {
    const agency = resolveAgencyValue(agencyValue, effectiveAgencies);
    if (!agency) return;
    setActiveTab('spreadsheet');
    void fetchDevices(agency);
  };

  return (
    <ReportPage title="Device Reports">
      <ReportToolbar
        actions={
          <>
            {pendingEdits > 0 && (
              <Button variant="outlined" size="small" color="secondary" onClick={postChanges}>
                Post {pendingEdits} change{pendingEdits === 1 ? '' : 's'} to Autotask
              </Button>
            )}
            <ReportActions
              onGenerate={handleGenerate}
              generateDisabled={!agencyValue}
              loading={loading}
              exports={
                onSpreadsheet
                  ? [{ label: 'Download XLSX', onClick: () => exportDevices(false) }]
                  : []
              }
              onSave={onSpreadsheet ? () => exportDevices(true) : undefined}
              onSchedule={schedule.openDialog}
              hasResults={hasData}
            />
          </>
        }
      >
        <AgencySelect agencies={effectiveAgencies} value={agencyValue} onChange={setAgencyValue} />
        {hasData && <ViewTabs value={activeTab} onChange={setActiveTab} />}
        {hasData && onSpreadsheet && (
          <SpreadsheetControls
            onChooseColumns={() => setChooserOpen(true)}
            missingFilter={missingFilter}
            fieldLabels={Object.keys(editableCols)}
            onFilterChange={handleFilterChange}
          />
        )}
      </ReportToolbar>

      {onSpreadsheet ? (
        <DeviceSpreadsheet
          title={agencyName}
          columns={displayedColumns}
          rows={rows}
          hasData={hasData}
          loading={loading}
          lastLogLine={logs[logs.length - 1] ?? ''}
          isDark={isDark}
          page={page}
          setPage={setPage}
          processRowUpdate={processRowUpdate}
        />
      ) : (
        <PostData columns={columns} rows={rows} />
      )}

      <ColumnChooser
        open={chooserOpen}
        onClose={() => setChooserOpen(false)}
        allColumns={chooserColumns}
        visibleFields={chooserFields}
        onApply={applyVisibleFields}
      />
      <ReportScheduleDialog schedule={schedule} />
    </ReportPage>
  );
};

export default DeviceReports;
