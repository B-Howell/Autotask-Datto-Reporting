import { useMemo, useState } from 'react';
import { Typography } from '@mui/material';
import {
  ErrorBanner,
  ReportActions,
  ReportPage,
  ReportProgress,
  ReportScheduleDialog,
  ReportToolbar,
  useScheduleDialog,
} from '@/components/report';
import useUtilizationData from '@/hooks/useUtilizationData';
import useAgencyUtilizationStore from '@/store/agencyUtilizationStore';
import useTenantStore from '@/store/tenantStore';
import { deliverBlob } from '@/utils/saveReport';
import QuarterSelect from './agencyUtilization/QuarterSelect';
import UtilizationTable from './agencyUtilization/UtilizationTable';
import { buildQuarterlyWorkbook, utilizationExportFilename } from './agencyUtilization/excelExport';
import { defaultQuarterKey, quarterChoices } from './agencyUtilization/quarters';

const AgencyUtilization = () => {
  const earliestYear = useTenantStore((s) => s.tenant.earliestQuarterYear);
  const choices = useMemo(() => quarterChoices(earliestYear), [earliestYear]);
  const [quarterKey, setQuarterKey] = useState<string>(defaultQuarterKey);
  const selected = choices.find((c) => c.key === quarterKey) || choices[0];

  const { utilData, loading, error, logs, fetchUtilization } = useUtilizationData(
    useAgencyUtilizationStore,
    'Quarterly Utilization',
    '/reports/agency-utilization'
  );

  const handleGenerate = (refresh = false) =>
    fetchUtilization(selected.start, selected.end, { refresh });
  const schedule = useScheduleDialog(() =>
    utilData
      ? { reportType: 'quarterly_utilization', agencyKey: null, agencyName: '', options: {} }
      : null
  );

  const exportExcel = async (save: boolean) => {
    if (!utilData) return;
    const blob = await buildQuarterlyWorkbook(utilData);
    const filename = utilizationExportFilename(utilData);
    await deliverBlob({
      blob,
      filename,
      save,
      meta: {
        agencyName: 'All Agencies',
        reportType: 'utilization',
        format: 'xlsx',
        title: filename.replace(/\.xlsx$/, ''),
      },
    });
  };

  return (
    <ReportPage title="Quarterly Utilization">
      <ReportToolbar
        actions={
          <ReportActions
            onGenerate={() => handleGenerate(false)}
            loading={loading}
            exports={[{ label: 'Export Excel', onClick: () => exportExcel(false) }]}
            onSave={() => exportExcel(true)}
            onRefresh={() => handleGenerate(true)}
            onSchedule={schedule.openDialog}
            hasResults={!!utilData}
          />
        }
      >
        <QuarterSelect choices={choices} value={selected.key} onChange={setQuarterKey} />
        {utilData && (
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {utilData.rows?.length ?? 0} worker rows · {utilData.companies?.length ?? 0} companies ·{' '}
            {utilData.grandTotal?.toFixed(2)} hours
          </Typography>
        )}
      </ReportToolbar>

      {loading && <ReportProgress message="Fetching utilization data…" logs={logs} />}
      <ErrorBanner error={error} />

      {utilData && !loading && <UtilizationTable report={utilData} />}
      <ReportScheduleDialog schedule={schedule} />
    </ReportPage>
  );
};

export default AgencyUtilization;
