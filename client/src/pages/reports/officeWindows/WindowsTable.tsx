import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { InstallBreakdownItem, ManualInputs } from '@/api';
import { WINDOWS_ICON } from '@/utils/assets';
import InstallsSection from './InstallsSection';
import LicenseField from './LicenseField';

interface WindowsTableProps {
  rows: InstallBreakdownItem[];
  showLicenses: boolean;
  licenses: ManualInputs;
  onLicenseChange: (name: string, value: string) => void;
  onOpenDevices: (title: string, devices: string[] | undefined) => void;
}

const WindowsTable = ({
  rows,
  showLicenses,
  licenses,
  onLicenseChange,
  onOpenDevices,
}: WindowsTableProps) => (
  <InstallsSection icon={WINDOWS_ICON} title="Windows Installs">
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: showLicenses ? '50%' : '70%' }}>
              Product
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 'bold', width: showLicenses ? '25%' : '30%' }}
            >
              Installs
            </TableCell>
            {showLicenses && (
              <TableCell align="right" sx={{ fontWeight: 'bold', width: '25%' }}>
                Licenses
              </TableCell>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((item) => (
            <TableRow
              key={item.name}
              hover
              onClick={() => onOpenDevices(item.name, item.devices)}
              sx={{ cursor: 'pointer' }}
            >
              <TableCell
                sx={{ fontSize: 16, py: 1, color: 'primary.main', textDecoration: 'underline' }}
              >
                {item.name}
              </TableCell>
              <TableCell align="right" sx={{ fontSize: 16, py: 1 }}>
                {item.installs}
              </TableCell>
              {showLicenses && (
                <TableCell
                  align="right"
                  sx={{ fontSize: 16, py: 1 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <LicenseField
                    value={licenses[item.name] || ''}
                    onChange={(v) => onLicenseChange(item.name, v)}
                    placeholder="Enter"
                    width={90}
                  />
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </InstallsSection>
);

export default WindowsTable;
