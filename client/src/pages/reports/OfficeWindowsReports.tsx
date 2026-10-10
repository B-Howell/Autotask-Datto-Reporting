import { useMemo, useState } from 'react';
import type { AgencyValue } from '@/api';
import {
  AgencySelect,
  ReportActions,
  ReportPage,
  ReportProgress,
  ReportScheduleDialog,
  ReportToolbar,
  useScheduleDialog,
} from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import useOfficeWindowsData from '@/hooks/useOfficeWindowsData';
import useAgencyStore from '@/store/agencyStore';
import { resolveAgencyValue, valueFor } from '@/utils/agencyGroups';
import DeviceListDialog from './officeWindows/DeviceListDialog';
import LicensingTables from './officeWindows/LicensingTables';
import { officeWindowsPresetDraft } from './officeWindows/presetDraft';
import { installedOnly, reportTitle } from './officeWindows/reportRows';
import { reportedAgencyForSite } from './officeWindows/selectedAgency';
import SkuSettingsButton from './officeWindows/SkuSettingsButton';
import SkuSettingsDialog from './officeWindows/SkuSettingsDialog';
import { groupOfficeInstalls } from './officeWindows/skus';
import useDeviceModal from './officeWindows/useDeviceModal';
import useManualInputs from './officeWindows/useManualInputs';
import useOfficeWindowsExports from './officeWindows/useOfficeWindowsExports';

const OfficeWindowsReports = () => {
  const companies = useAgencyStore((s) => s.agencies);
  const effectiveAgencies = useEffectiveAgencies();
  const { osBreakdown, officeBreakdown, loading, selectedSite, logs, fetchOfficeWindowsBreakdown } =
    useOfficeWindowsData();
  const manual = useManualInputs();
  const devices = useDeviceModal();

  const [companyValue, setCompanyValue] = useState<AgencyValue | ''>('');
  const [showLicenses, setShowLicenses] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const selectedCompany = useMemo(
    () => reportedAgencyForSite(selectedSite, companies, effectiveAgencies),
    [companies, effectiveAgencies, selectedSite]
  );
  const officeRows = useMemo(
    () => groupOfficeInstalls(officeBreakdown, manual.visibleSkus),
    [officeBreakdown, manual.visibleSkus]
  );
  const osRows = installedOnly(osBreakdown);
  const hasResults =
    !loading && !!selectedCompany && (osBreakdown.length > 0 || officeBreakdown.length > 0);

  const { exportToWord, exportToPdf } = useOfficeWindowsExports({
    agencyName: selectedCompany?.name ?? null,
    showLicenses,
    breakdown: { windows_installs: osBreakdown, office_installs: officeBreakdown },
    manualInputs: manual.values,
  });
  const schedule = useScheduleDialog(() =>
    hasResults ? officeWindowsPresetDraft({ agency: selectedCompany, showLicenses }) : null
  );

  const handleGenerate = () => {
    const agency = companyValue ? resolveAgencyValue(companyValue, effectiveAgencies) : null;
    if (!agency) return;
    manual.loadFor(String(valueFor(agency)));
    fetchOfficeWindowsBreakdown(agency);
  };

  return (
    <ReportPage title="Office / Windows Reports">
      <ReportToolbar
        actions={
          <>
            <SkuSettingsButton enabled={!!manual.agencyKey} onClick={() => setSettingsOpen(true)} />
            <ReportActions
              onGenerate={handleGenerate}
              generateDisabled={!companyValue}
              loading={loading}
              hasResults={hasResults}
              exports={[
                { label: 'Export to Word', onClick: () => exportToWord(false) },
                { label: 'Export to PDF', onClick: exportToPdf },
              ]}
              onSave={() => exportToWord(true)}
              onSchedule={schedule.openDialog}
            />
          </>
        }
      >
        <AgencySelect
          agencies={effectiveAgencies}
          value={companyValue}
          onChange={setCompanyValue}
        />
      </ReportToolbar>

      {loading && <ReportProgress message="Loading..." logs={logs} tail={20} />}

      {hasResults && selectedCompany && (
        <LicensingTables
          title={reportTitle(selectedCompany.name)}
          showLicenses={showLicenses}
          onShowLicensesChange={setShowLicenses}
          officeRows={officeRows}
          hasOfficeInstalls={officeBreakdown.length > 0}
          osRows={osRows}
          licenses={manual.values}
          available={manual.officeAvailable}
          onOfficeLicenseChange={manual.setOfficeLicense}
          onOfficeAvailableChange={manual.setOfficeAvailable}
          onOsLicenseChange={manual.setOsLicense}
          onOpenDevices={devices.open}
        />
      )}

      <SkuSettingsDialog
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        visibleSkus={manual.visibleSkus}
        onToggle={manual.toggleSku}
        onChange={manual.setVisibleSkus}
      />
      <DeviceListDialog
        open={devices.modal.open}
        title={devices.modal.title}
        devices={devices.modal.devices}
        onClose={devices.close}
      />
      <ReportScheduleDialog schedule={schedule} />
    </ReportPage>
  );
};

export default OfficeWindowsReports;
