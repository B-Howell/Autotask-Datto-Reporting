import { describe, expect, it } from 'vitest';
import type { GridColDef } from '@mui/x-data-grid';
import { annualPresetDraft } from './annualUtilization/presetDraft';
import type { DeviceRow } from './deviceReports/sheetRows';
import { devicePresetDraft } from './deviceReports/presetDraft';
import { officeWindowsPresetDraft } from './officeWindows/presetDraft';

const column = (field: string, headerName?: string): GridColDef<DeviceRow> => ({
  field,
  headerName,
});

describe('devicePresetDraft', () => {
  it('captures the visible column names in their displayed order', () => {
    const draft = devicePresetDraft({
      selectedCompany: 1000,
      agencyName: 'Harbor Point Health',
      exportColumns: [column('serial', 'Serial Number'), column('name', 'Device Name')],
    });
    expect(draft).toEqual({
      reportType: 'devices',
      agencyKey: '1000',
      agencyName: 'Harbor Point Health',
      options: { columns: ['Serial Number', 'Device Name'] },
    });
  });

  it('keeps a group key as the agency key and blanks a column without a header', () => {
    const draft = devicePresetDraft({
      selectedCompany: 'group:Harbor Point',
      agencyName: 'Harbor Point',
      exportColumns: [column('rowNumber')],
    });
    expect(draft?.agencyKey).toBe('group:Harbor Point');
    expect(draft?.options.columns).toEqual(['']);
  });

  it('is null before a report has been generated', () => {
    expect(devicePresetDraft({ selectedCompany: null, agencyName: '', exportColumns: [] })).toBe(
      null
    );
  });
});

describe('officeWindowsPresetDraft', () => {
  it('starts as Word and records the licence column choice', () => {
    const draft = officeWindowsPresetDraft({
      agency: { id: 1000, name: 'Harbor Point Health', site: 'harbor' },
      showLicenses: false,
    });
    expect(draft).toEqual({
      reportType: 'office_windows',
      agencyKey: '1000',
      agencyName: 'Harbor Point Health',
      options: { format: 'docx', showLicenses: false },
    });
  });

  it('is null without a reported agency', () => {
    expect(officeWindowsPresetDraft({ agency: null, showLicenses: true })).toBe(null);
  });
});

describe('annualPresetDraft', () => {
  it('omits companies and rates when nothing has been chosen', () => {
    expect(annualPresetDraft({ companies: null, rates: {} })).toEqual({
      reportType: 'annual_utilization',
      agencyKey: null,
      agencyName: '',
      options: {},
    });
  });

  it('stores the saved selection as a list and the overrides as given', () => {
    const draft = annualPresetDraft({
      companies: new Set(['Harbor Point Health', 'Northfield Community Schools']),
      rates: { Administration: 95, Technical: '120' },
    });
    expect(draft.options).toEqual({
      companies: ['Harbor Point Health', 'Northfield Community Schools'],
      rates: { Administration: 95, Technical: '120' },
    });
  });
});
