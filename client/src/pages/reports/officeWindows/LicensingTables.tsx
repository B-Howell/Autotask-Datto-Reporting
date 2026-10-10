import { Box } from '@mui/material';
import type { InstallBreakdownItem, ManualInputs } from '@/api';
import OfficeTable from './OfficeTable';
import ReportHeading from './ReportHeading';
import type { BundledOfficeRow } from './skus';
import WindowsTable from './WindowsTable';

interface LicensingTablesProps {
  title: string;
  showLicenses: boolean;
  onShowLicensesChange: (show: boolean) => void;
  /** Office installs grouped by SKU; the table renders only when there are Office installs at all. */
  officeRows: BundledOfficeRow[];
  hasOfficeInstalls: boolean;
  /** Windows versions with at least one install. */
  osRows: InstallBreakdownItem[];
  licenses: ManualInputs;
  available: ManualInputs;
  onOfficeLicenseChange: (key: string, value: string) => void;
  onOfficeAvailableChange: (name: string, value: string) => void;
  onOsLicenseChange: (name: string, value: string) => void;
  onOpenDevices: (title: string, devices: string[] | undefined) => void;
}

/** The licensing report body: its heading with the licence switch, then the Office and Windows tables that have rows. */
const LicensingTables = ({
  title,
  showLicenses,
  onShowLicensesChange,
  officeRows,
  hasOfficeInstalls,
  osRows,
  licenses,
  available,
  onOfficeLicenseChange,
  onOfficeAvailableChange,
  onOsLicenseChange,
  onOpenDevices,
}: LicensingTablesProps) => (
  <Box>
    <ReportHeading
      title={title}
      showLicenses={showLicenses}
      onShowLicensesChange={onShowLicensesChange}
    />
    {hasOfficeInstalls && (
      <OfficeTable
        rows={officeRows}
        showLicenses={showLicenses}
        licenses={licenses}
        available={available}
        onLicenseChange={onOfficeLicenseChange}
        onAvailableChange={onOfficeAvailableChange}
        onOpenDevices={onOpenDevices}
      />
    )}
    {osRows.length > 0 && (
      <WindowsTable
        rows={osRows}
        showLicenses={showLicenses}
        licenses={licenses}
        onLicenseChange={onOsLicenseChange}
        onOpenDevices={onOpenDevices}
      />
    )}
  </Box>
);

export default LicensingTables;
