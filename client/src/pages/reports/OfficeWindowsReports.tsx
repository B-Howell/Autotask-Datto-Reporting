import { useMemo, useState } from 'react';
import { Box } from '@mui/material';
import type { AgencyValue } from '@/api';
import {
  AgencySelect,
  ReportActions,
  ReportPage,
  ReportProgress,
  ReportToolbar,
} from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import useOfficeWindowsData from '@/hooks/useOfficeWindowsData';
import useAgencyStore from '@/store/agencyStore';
import { resolveAgencyValue, valueFor } from '@/utils/agencyGroups';
import DeviceListDialog from './officeWindows/DeviceListDialog';
import OfficeTable from './officeWindows/OfficeTable';
import ReportHeading from './officeWindows/ReportHeading';
import { installedOnly, reportTitle } from './officeWindows/reportRows';
import { reportedAgencyForSite } from './officeWindows/selectedAgency';
import SkuSettingsButton from './officeWindows/SkuSettingsButton';
import SkuSettingsDialog from './officeWindows/SkuSettingsDialog';
import { groupOfficeInstalls } from './officeWindows/skus';
import useDeviceModal from './officeWindows/useDeviceModal';
import useManualInputs from './officeWindows/useManualInputs';
import useOfficeWindowsExports from './officeWindows/useOfficeWindowsExports';
import WindowsTable from './officeWindows/WindowsTable';

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
    officeRows,
    osRows,
    officeLicenses: manual.officeLicenses,
    officeAvailable: manual.officeAvailable,
    osLicenses: manual.osLicenses,
  });

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
        <Box>
          <ReportHeading
            title={reportTitle(selectedCompany.name)}
            showLicenses={showLicenses}
            onShowLicensesChange={setShowLicenses}
          />
          {officeBreakdown.length > 0 && (
            <OfficeTable
              rows={officeRows}
              showLicenses={showLicenses}
              licenses={manual.officeLicenses}
              available={manual.officeAvailable}
              onLicenseChange={manual.setOfficeLicense}
              onAvailableChange={manual.setOfficeAvailable}
              onOpenDevices={devices.open}
            />
          )}
          {osRows.length > 0 && (
            <WindowsTable
              rows={osRows}
              showLicenses={showLicenses}
              licenses={manual.osLicenses}
              onLicenseChange={manual.setOsLicense}
              onOpenDevices={devices.open}
            />
          )}
        </Box>
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
    </ReportPage>
  );
};

export default OfficeWindowsReports;
