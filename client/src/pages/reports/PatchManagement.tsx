import { useMemo, useRef } from 'react';
import { Box } from '@mui/material';
import {
  AgencySelect,
  EmptyState,
  ReportActions,
  ReportPage,
  ReportProgress,
  ReportScheduleDialog,
  ReportToolbar,
  useScheduleDialog,
} from '@/components/report';
import type { DonutSlice } from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import usePatchManagementData from '@/hooks/usePatchManagementData';
import { resolveAgencyValue, valueFor } from '@/utils/agencyGroups';
import { loadBrowserAssets } from '@/utils/reportImages';
import PatchSummaryCard from './patchManagement/PatchSummaryCard';
import ReportMeta from './patchManagement/ReportMeta';
import WorkstationTable from './patchManagement/WorkstationTable';
import { captureSvgAsPng } from './patchManagement/chartCapture';
import { buildPatchPdf, savePatchPdf } from './patchManagement/pdfExport';
import { STATUS_COLORS } from './patchManagement/statusColors';

const PatchManagement = () => {
  const effectiveAgencies = useEffectiveAgencies();
  const {
    summary,
    devices,
    deviceCount,
    loading,
    logs,
    companyValue,
    generatedAgency,
    setCompanyValue,
    fetchPatchManagement,
  } = usePatchManagementData();
  const chartRef = useRef<HTMLDivElement>(null);

  const total = useMemo(() => summary.reduce((n, s) => n + s.count, 0), [summary]);
  const slices = useMemo<DonutSlice[]>(
    () =>
      summary.map((s) => ({
        id: s.status,
        label: s.label,
        value: s.count,
        color: STATUS_COLORS[s.status],
      })),
    [summary]
  );
  const hasResults = !loading && generatedAgency !== null && deviceCount > 0;
  const schedule = useScheduleDialog(() =>
    hasResults && generatedAgency
      ? {
          reportType: 'patch',
          agencyKey: String(valueFor(generatedAgency)),
          agencyName: generatedAgency.name,
          options: {},
        }
      : null
  );

  const handleGenerate = () => {
    const agency = companyValue ? resolveAgencyValue(companyValue, effectiveAgencies) : null;
    if (agency) fetchPatchManagement(agency);
  };

  // Export downloads and keeps a copy in the app; Save to app only keeps the copy.
  const exportPdf = async (download: boolean) => {
    if (!generatedAgency) return;
    const [chart, assets] = await Promise.all([
      captureSvgAsPng(chartRef.current),
      loadBrowserAssets(generatedAgency.name),
    ]);
    const built = await buildPatchPdf({
      agency: generatedAgency,
      summary,
      devices,
      total,
      chart,
      assets,
    });
    if (download) built.doc.save(built.filename);
    await savePatchPdf(built, generatedAgency);
  };

  return (
    <ReportPage title="Patch Management">
      <ReportToolbar
        actions={
          <ReportActions
            onGenerate={handleGenerate}
            generateDisabled={!companyValue}
            loading={loading}
            exports={[{ label: 'Export to PDF', onClick: () => exportPdf(true) }]}
            onSave={() => exportPdf(false)}
            onSchedule={schedule.openDialog}
            hasResults={hasResults}
          />
        }
      >
        <AgencySelect
          agencies={effectiveAgencies}
          value={companyValue}
          onChange={setCompanyValue}
        />
      </ReportToolbar>

      {loading && <ReportProgress message="Loading patch data…" logs={logs} tail={20} />}

      {!loading && generatedAgency && deviceCount === 0 && (
        <EmptyState>No workstations with patch data found for {generatedAgency.name}.</EmptyState>
      )}

      {hasResults && generatedAgency && (
        <Box>
          <ReportMeta agencyName={generatedAgency.name} deviceCount={deviceCount} />
          <PatchSummaryCard slices={slices} total={total} chartRef={chartRef} />
          <WorkstationTable devices={devices} />
        </Box>
      )}
      <ReportScheduleDialog schedule={schedule} />
    </ReportPage>
  );
};

export default PatchManagement;
