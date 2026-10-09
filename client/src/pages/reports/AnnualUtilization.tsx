import { useEffect, useMemo, useState } from 'react';
import { Box, IconButton, Paper, Typography } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import type { Dayjs } from 'dayjs';
import { utilizationApi } from '@/api';
import type { UtilizationReport } from '@/api';
import { ErrorBanner, ReportActions, ReportPage, ReportToolbar } from '@/components/report';
import useAnnualUtilizationStore from '@/store/annualUtilizationStore';
import { deliverBlob } from '@/utils/saveReport';
import AgencyDetailTable from './annualUtilization/AgencyDetailTable';
import { annualWorkbookFilename, buildAnnualWorkbook } from './annualUtilization/excelExport';
import { RAW_TAB, defaultStartMonth, rangeOrDefault } from './annualUtilization/fiscalYear';
import { gridForTab } from './annualUtilization/gridModels';
import RawEntriesTable from './annualUtilization/RawEntriesTable';
import ReportSettingsDialog from './annualUtilization/ReportSettingsDialog';
import ReportTabs from './annualUtilization/ReportTabs';
import SpreadsheetView from './annualUtilization/SpreadsheetView';
import { hrs } from './annualUtilization/summary';
import type { Summary } from './annualUtilization/summary';
import SummaryTable from './annualUtilization/SummaryTable';
import useAnnualReport from './annualUtilization/useAnnualReport';
import YearStartPicker from './annualUtilization/YearStartPicker';

const AnnualUtilization = () => {
  const [startMonth, setStartMonth] = useState<Dayjs | null>(defaultStartMonth);
  const selected = useMemo(() => rangeOrDefault(startMonth), [startMonth]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // Which page of the raw sheet is showing is about this visit, so it stays local.
  const [entryPage, setEntryPage] = useState(0);

  const viewMode = useAnnualUtilizationStore((s) => s.viewMode);
  const setViewMode = useAnnualUtilizationStore((s) => s.setViewMode);
  const setRates = useAnnualUtilizationStore((s) => s.setRates);
  const selectedCompanies = useAnnualUtilizationStore((s) => s.selectedCompanies);
  const setSelectedCompanies = useAnnualUtilizationStore((s) => s.setSelectedCompanies);

  const report = useAnnualReport();
  const { utilData, summary, summaryRows, detail, entries, tab, setTab, companies } = report;

  useEffect(() => setEntryPage(0), [report.entriesFor]);

  const grid = useMemo(
    () => gridForTab(tab, { summary, summaryRows, entries, detail }),
    [tab, summary, summaryRows, entries, detail]
  );

  const exportExcel = async (save: boolean) => {
    const input = report.workbookInput;
    if (!utilData || !input) return;
    // The raw sheet is part of the report; if its load failed, try once more here.
    const raw = input.entries.length
      ? input.entries
      : (await utilizationApi.fetchUtilizationEntries(utilData.start, utilData.end)).entries || [];
    const filename = annualWorkbookFilename(utilData);
    const blob = await buildAnnualWorkbook({ ...input, entries: raw });
    await deliverBlob({
      blob,
      filename,
      save,
      meta: {
        agencyName: 'All Agencies',
        reportType: 'annual_utilization',
        format: 'xlsx',
        title: filename.replace(/\.xlsx$/, ''),
      },
    });
  };

  const renderView = (data: UtilizationReport, built: Summary) => {
    if (viewMode === 'spreadsheet') return <SpreadsheetView grid={grid} />;
    if (tab === RAW_TAB) {
      return <RawEntriesTable entries={entries} page={entryPage} onPageChange={setEntryPage} />;
    }
    if (tab === '')
      return <SummaryTable summary={built} rows={summaryRows} onSelectCompany={setTab} />;
    return <AgencyDetailTable company={tab} periodLabel={data.periodLabel} detail={detail} />;
  };

  return (
    <ReportPage title="Annual Utilization">
      <ReportToolbar
        actions={
          <ReportActions
            onGenerate={() => report.generate(selected.start, selected.end, false)}
            onRefresh={() => report.generate(selected.start, selected.end, true)}
            loading={report.loading}
            hasResults={!!utilData}
            exports={[{ label: 'Export to Excel', onClick: () => exportExcel(false) }]}
            onSave={() => exportExcel(true)}
          />
        }
      >
        <YearStartPicker value={startMonth} onChange={setStartMonth} range={selected} />
        {utilData && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              {companies.length} of {report.allCompanies.length} agencies ·{' '}
              {hrs(utilData.grandTotal)} hours
            </Typography>
            <IconButton
              size="small"
              onClick={() => setSettingsOpen(true)}
              aria-label="Report settings"
              title="Choose which agencies appear"
            >
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Box>
        )}
      </ReportToolbar>

      <ErrorBanner error={report.error} />

      <ReportSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        rates={report.rates}
        onRatesChange={setRates}
        allCompanies={report.allCompanies}
        selectedCompanies={selectedCompanies}
        onSelectedCompaniesChange={setSelectedCompanies}
      />

      {utilData && summary && (
        <Paper sx={{ mb: 3 }}>
          <ReportTabs value={tab} onChange={setTab} companies={companies} />
          <Box sx={{ p: 2 }}>{renderView(utilData, summary)}</Box>
        </Paper>
      )}
    </ReportPage>
  );
};

export default AnnualUtilization;
