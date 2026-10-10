import { useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Box, Tab, Tabs, Typography } from '@mui/material';
import {
  ErrorBanner,
  MonthYearSelect,
  ReportActions,
  ReportPage,
  ReportProgress,
  ReportScheduleDialog,
  ReportToolbar,
  useScheduleDialog,
} from '@/components/report';
import useSlaData from '@/hooks/useSlaData';
import { MONTH_NAMES } from '@/utils/dates';
import type { MonthName } from '@/utils/dates';
import { deliverBlob } from '@/utils/saveReport';
import IssueTypePivotTable from './slaPerformance/IssueTypePivotTable';
import PivotTable from './slaPerformance/PivotTable';
import RawDataGrid from './slaPerformance/RawDataGrid';
import SlaFilters from './slaPerformance/SlaFilters';
import { buildSlaWorkbook, slaExportFilename } from './slaPerformance/excelExport';
import useSlaFilters from './slaPerformance/useSlaFilters';
import { slaWorkbookInput } from './slaPerformance/workbookInput';

// Default to last month, the most recent one with a complete set of tickets.
const lastMonth = (now = new Date()) => ({
  month: MONTH_NAMES[now.getMonth() === 0 ? 11 : now.getMonth() - 1],
  year: now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear(),
});

const SlaPerformance = () => {
  const [month, setMonth] = useState<MonthName>(() => lastMonth().month);
  const [year, setYear] = useState(() => lastMonth().year);
  const [tab, setTab] = useState(0);
  const { slaData, loading, error, logs, fetchSlaPerformance } = useSlaData();
  const filters = useSlaFilters(slaData?.tickets);
  const { filteredTickets } = filters;

  // The tables and the workbook show the same pivots, built once per filter change.
  const workbook = useMemo(() => slaWorkbookInput({ tickets: filteredTickets }), [filteredTickets]);
  const { pivot, pivotByPriority, pivotByIssueType } = workbook;

  const handleGenerate = () => fetchSlaPerformance(year, MONTH_NAMES.indexOf(month) + 1);

  const exportExcel = async (save: boolean) => {
    if (!slaData) return;
    const blob = await buildSlaWorkbook(workbook);
    const filename = slaExportFilename(slaData.month, slaData.year);
    await deliverBlob({
      blob,
      filename,
      save,
      meta: {
        agencyName: 'All Agencies',
        reportType: 'sla',
        format: 'xlsx',
        title: filename.replace(/\.xlsx$/, ''),
      },
    });
  };

  const companyCount = slaData?.companies ? Object.keys(slaData.companies).length : 0;
  const schedule = useScheduleDialog(() =>
    slaData ? { reportType: 'sla', agencyKey: null, agencyName: '', options: {} } : null
  );

  return (
    <ReportPage title="SLA Performance By Ticket">
      <ReportToolbar
        actions={
          <ReportActions
            onGenerate={handleGenerate}
            loading={loading}
            exports={[{ label: 'Export Excel', onClick: () => exportExcel(false) }]}
            onSave={() => exportExcel(true)}
            onSchedule={schedule.openDialog}
            hasResults={!!slaData}
          />
        }
      >
        <MonthYearSelect
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
        {slaData && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {filteredTickets.length} tickets across {companyCount} companies
          </Typography>
        )}
      </ReportToolbar>

      {loading && <ReportProgress message="Fetching SLA data..." logs={logs} />}
      <ErrorBanner error={error} />

      {slaData && !loading && (
        <Box>
          <SlaFilters
            values={filters.values}
            options={filters.options}
            hasActive={filters.hasActive}
            onChange={filters.setFilter}
            onClear={filters.clear}
          />
          <Tabs value={tab} onChange={(_e: SyntheticEvent, v: number) => setTab(v)} sx={{ mb: 2 }}>
            <Tab label="Report" />
            <Tab label="Pivot by Resource" />
            <Tab label="Pivot by Priority" />
            <Tab label="Pivot by Issue Type" />
          </Tabs>
          {tab === 0 && <RawDataGrid tickets={filteredTickets} />}
          {tab === 1 && <PivotTable pivot={pivot} rowLabel="Resource" />}
          {tab === 2 && <PivotTable pivot={pivotByPriority} rowLabel="Priority" />}
          {tab === 3 && <IssueTypePivotTable pivot={pivotByIssueType} />}
        </Box>
      )}
      <ReportScheduleDialog schedule={schedule} />
    </ReportPage>
  );
};

export default SlaPerformance;
