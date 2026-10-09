import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import type { ManualInputs } from '@/api';
import { OFFICE_ICON } from '@/utils/assets';
import InstallsSection from './InstallsSection';
import LicenseField from './LicenseField';
import type { BundledOfficeRow } from './skus';

interface OfficeTableProps {
  rows: BundledOfficeRow[];
  showLicenses: boolean;
  licenses: ManualInputs;
  available: ManualInputs;
  onLicenseChange: (key: string, value: string) => void;
  onAvailableChange: (key: string, value: string) => void;
  onOpenDevices: (title: string, devices: string[] | undefined) => void;
}

const stop = (e: React.MouseEvent) => e.stopPropagation();

/** Office 365 as a family heading over its subscription lines, then each perpetual edition. */
const OfficeTable = ({
  rows,
  showLicenses,
  licenses,
  available,
  onLicenseChange,
  onAvailableChange,
  onOpenDevices,
}: OfficeTableProps) => (
  <InstallsSection icon={OFFICE_ICON} title="Office">
    <TableContainer>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold', width: showLicenses ? '40%' : '70%' }}>
              Product
            </TableCell>
            <TableCell
              align="right"
              sx={{ fontWeight: 'bold', width: showLicenses ? '20%' : '30%' }}
            >
              Installs
            </TableCell>
            {showLicenses && (
              <>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: '20%' }}>
                  Licenses
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold', width: '20%' }}>
                  Available
                </TableCell>
              </>
            )}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((item) => (
            <TableRow
              key={item.key}
              hover={!item.isChild}
              onClick={() => {
                if (!item.isChild) onOpenDevices(item.name, item.devices);
              }}
              sx={{
                cursor: item.isChild ? 'default' : 'pointer',
                // The group heading carries the family total; its variants sit
                // beneath it without a divider between.
                '& td': { borderBottom: item.isGroup ? 'none' : undefined },
              }}
            >
              <TableCell
                sx={{
                  fontSize: 16,
                  py: item.isGroup ? 1.25 : 0.75,
                  pl: item.isChild ? 4 : 2,
                  fontWeight: item.isGroup ? 600 : 400,
                  // Only rows backed by detected installs open a device list,
                  // so only those are styled as links.
                  color: item.isChild ? 'text.secondary' : 'primary.main',
                  textDecoration: item.isChild ? 'none' : 'underline',
                }}
              >
                {item.name}
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  fontSize: 16,
                  py: item.isGroup ? 1.25 : 0.75,
                  fontWeight: item.isGroup ? 600 : 400,
                }}
              >
                {item.isChild ? '' : item.installs}
              </TableCell>
              {showLicenses && (
                <>
                  <TableCell align="right" sx={{ py: 0.5 }} onClick={stop}>
                    {/* The family row is a heading: the licence figures belong
                        to the subscriptions listed beneath it. */}
                    {!item.isGroup && (
                      <LicenseField
                        value={licenses[item.key] || ''}
                        onChange={(v) => onLicenseChange(item.key, v)}
                        placeholder="—"
                      />
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 0.5 }} onClick={stop}>
                    {/* Only the subscriptions track availability: a perpetual
                        edition has a licence count and nothing to draw down against. */}
                    {item.isChild && (
                      <LicenseField
                        value={available[item.key] || ''}
                        onChange={(v) => onAvailableChange(item.key, v)}
                        placeholder="—"
                      />
                    )}
                  </TableCell>
                </>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  </InstallsSection>
);

export default OfficeTable;
