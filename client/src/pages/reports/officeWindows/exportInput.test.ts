import { describe, expect, it } from 'vitest';
import { officeWindowsExportInput } from './exportInput';

const breakdown = {
  office_installs: [{ name: 'Office LTSC Standard 2024', installs: 3, devices: ['HPH-LT-0001'] }],
  windows_installs: [
    { name: 'Windows 11', installs: 5, devices: ['HPH-LT-0001'] },
    { name: 'Windows 10', installs: 0, devices: [] },
  ],
};

describe('officeWindowsExportInput', () => {
  it('folds the saved figures into one office row and one installed OS row', () => {
    const input = officeWindowsExportInput(
      breakdown,
      { 'Office LTSC Standard 2024': '4', 'Windows 11': '6' },
      'Harbor Point Health',
      false
    );
    expect(input.agencyName).toBe('Harbor Point Health');
    expect(input.showLicenses).toBe(false);
    expect(input.officeRows).toEqual([
      {
        name: 'Office LTSC Standard 2024',
        installs: '3',
        isGroup: undefined,
        isChild: undefined,
        license: '4',
        available: '',
      },
    ]);
    expect(input.osRows).toEqual([{ name: 'Windows 11', installs: 5, license: '6' }]);
  });

  it('nests the visible Office 365 plans with a figure under one family row', () => {
    const office_installs = [
      { name: 'Microsoft 365 Apps for business', installs: 2, devices: ['HPH-LT-0001'] },
      { name: 'Microsoft 365 Apps for enterprise', installs: 1, devices: ['HPH-LT-0002'] },
    ];
    const saved = {
      'officeLicense::visibleSkus': JSON.stringify(['Office 365 E3', 'Microsoft 365 E3']),
      'Microsoft 365 E3': '3',
      'available::Office 365 E3': '1',
    };
    const input = officeWindowsExportInput(
      { ...breakdown, office_installs },
      saved,
      'Harbor Point Health',
      true
    );
    expect(input.showLicenses).toBe(true);
    expect(input.officeRows.map((r) => [r.name, r.installs, r.license, r.available])).toEqual([
      ['Office 365', '3', '', ''],
      ['Microsoft 365 E3', '', '3', ''],
      ['Office 365 E3', '', '', '1'],
    ]);
  });
});
