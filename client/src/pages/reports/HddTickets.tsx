import {
  ALL_AGENCIES,
  AgencySelect,
  EmptyState,
  ReportActions,
  ReportPage,
  ReportProgress,
  ReportScheduleDialog,
  ReportToolbar,
  useScheduleDialog,
} from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import useHddTicketsData from '@/hooks/useHddTicketsData';
import { membersOf, resolveAgencyValue, valueFor } from '@/utils/agencyGroups';
import { fileDateStamp } from '@/utils/dates';
import { deliverBlob } from '@/utils/saveReport';
import { buildHddTicketsWorkbook } from './hddTickets/excelExport';
import HddDeviceTable from './hddTickets/HddDeviceTable';

const HddTickets = () => {
  const effectiveAgencies = useEffectiveAgencies();
  const {
    devices,
    deviceCount,
    loading,
    logs,
    companyValue,
    generatedValue,
    generatedLabel,
    setCompanyValue,
    fetchHddTickets,
  } = useHddTicketsData();

  const hasResults = !loading && Boolean(generatedLabel) && deviceCount > 0;
  const noResults = !loading && Boolean(generatedLabel) && deviceCount === 0;
  // A preset must name one agency, so an all-agencies run offers no Schedule
  // button; before any run the button shows disabled like the exports.
  const allAgenciesRun = generatedValue === ALL_AGENCIES;
  const generatedAgency = resolveAgencyValue(generatedValue, effectiveAgencies);
  const schedule = useScheduleDialog(() =>
    hasResults && generatedAgency
      ? {
          reportType: 'hdd_tickets',
          agencyKey: String(valueFor(generatedAgency)),
          agencyName: generatedAgency.name,
          options: {},
        }
      : null
  );

  const handleGenerate = () => {
    if (!companyValue) return;
    if (companyValue === ALL_AGENCIES) {
      void fetchHddTickets(companyValue, [], 'All Agencies');
      return;
    }
    const agency = resolveAgencyValue(companyValue, effectiveAgencies);
    if (!agency) return;
    void fetchHddTickets(
      companyValue,
      membersOf(agency).map((m) => m.id),
      agency.name
    );
  };

  const handleExport = async (save: boolean) => {
    const blob = await buildHddTicketsWorkbook(devices);
    const filename = `${generatedLabel} HDD Storage Tickets ${fileDateStamp()}.xlsx`;
    await deliverBlob({
      blob,
      filename,
      save,
      meta: {
        agencyName: generatedLabel,
        reportType: 'hdd_tickets',
        format: 'xlsx',
        title: filename.replace(/\.xlsx$/, ''),
      },
    });
  };

  return (
    <ReportPage title="HDD Storage Tickets">
      <ReportToolbar
        actions={
          <ReportActions
            onGenerate={handleGenerate}
            generateDisabled={!companyValue}
            loading={loading}
            exports={[{ label: 'Export Excel', onClick: () => handleExport(false) }]}
            onSave={() => handleExport(true)}
            onSchedule={allAgenciesRun ? undefined : schedule.openDialog}
            hasResults={hasResults}
          />
        }
      >
        <AgencySelect
          agencies={effectiveAgencies}
          value={companyValue}
          onChange={setCompanyValue}
          includeAll
        />
      </ReportToolbar>

      {loading && <ReportProgress message="Loading HDD ticket data…" logs={logs} />}
      {noResults && (
        <EmptyState>
          No active devices with Datto HDD tickets found for {generatedLabel}.
        </EmptyState>
      )}
      {hasResults && (
        <HddDeviceTable label={generatedLabel} devices={devices} deviceCount={deviceCount} />
      )}
      <ReportScheduleDialog schedule={schedule} />
    </ReportPage>
  );
};

export default HddTickets;
