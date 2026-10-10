import { useState } from 'react';
import { Button } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import type { AgencyValue } from '@/api';
import ColumnChooser from '@/components/ColumnChooser';
import DeviceSpreadsheet from '@/components/DeviceSpreadsheet';
import PostData from '@/components/PostData';
import {
  AgencySelect,
  ReportActions,
  ReportPage,
  ReportToolbar,
  ScheduleDialog,
  useScheduleDialog,
} from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import useReportingData from '@/hooks/useReportingData';
import useAgencyStore from '@/store/agencyStore';
import useThemeStore from '@/store/themeStore';
import { agencyNameFor, resolveAgencyValue } from '@/utils/agencyGroups';
import { fileDateStamp } from '@/utils/dates';
import { deliverBlob } from '@/utils/saveReport';
import { buildDeviceWorkbook } from './deviceReports/excelExport';
import MissingFieldFilter from './deviceReports/MissingFieldFilter';
import { devicePresetDraft } from './deviceReports/presetDraft';
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
  const schedule = useScheduleDialog(() =>
    hasData ? devicePresetDraft({ selectedCompany, agencyName, exportColumns }) : null
  );

  const handleGenerate = () => {
    const agency = resolveAgencyValue(agencyValue, effectiveAgencies);
    if (!agency) return;
    setActiveTab('spreadsheet');
    void fetchDevices(agency);
  };

  const handleExport = async (save: boolean) => {
    const blob = await buildDeviceWorkbook(exportColumns, rows);
    const label = agencyName || 'Device';
    const filename = `${label} Computer Inventory ${fileDateStamp()}.xlsx`;
    await deliverBlob({
      blob,
      filename,
      save,
      meta: {
        agencyName: label,
        agencyId: typeof selectedCompany === 'number' ? selectedCompany : '',
        reportType: 'devices',
        format: 'xlsx',
        title: filename.replace(/\.xlsx$/, ''),
      },
    });
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
                  ? [{ label: 'Download XLSX', onClick: () => handleExport(false) }]
                  : []
              }
              onSave={onSpreadsheet ? () => handleExport(true) : undefined}
              onSchedule={schedule.openDialog}
              hasResults={hasData}
            />
          </>
        }
      >
        <AgencySelect agencies={effectiveAgencies} value={agencyValue} onChange={setAgencyValue} />
        {hasData && <ViewTabs value={activeTab} onChange={setActiveTab} />}
        {hasData && onSpreadsheet && (
          <>
            <Button
              variant="outlined"
              size="small"
              startIcon={<ViewColumnIcon />}
              onClick={() => setChooserOpen(true)}
            >
              Columns
            </Button>
            <MissingFieldFilter
              value={missingFilter}
              fieldLabels={Object.keys(editableCols)}
              onChange={handleFilterChange}
            />
          </>
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
      {schedule.draft && (
        <ScheduleDialog
          open={schedule.open}
          draft={schedule.draft}
          onClose={schedule.closeDialog}
          onSave={schedule.save}
          saving={schedule.saving}
        />
      )}
    </ReportPage>
  );
};

export default DeviceReports;
