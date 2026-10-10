import { describe, expect, it } from 'vitest';
import {
  agencyPresetDraft,
  agencyWidePresetDraft,
  hasFormatChoice,
  isEmailAddress,
} from './scheduleDraft';

const agency = { id: 1000, name: 'Harbor Point Health', site: 'harbor' };
const group = { name: 'Harbor Point', members: [agency] };

describe('agencyPresetDraft', () => {
  it('keys a single agency by its id and a group by its group key', () => {
    expect(agencyPresetDraft('patch', agency)).toEqual({
      reportType: 'patch',
      agencyKey: '1000',
      agencyName: 'Harbor Point Health',
      options: {},
    });
    expect(agencyPresetDraft('hdd_tickets', group).agencyKey).toBe('group:Harbor Point');
  });

  it('carries the options it is given', () => {
    const draft = agencyPresetDraft('office_windows', agency, { format: 'docx' });
    expect(draft.options).toEqual({ format: 'docx' });
  });
});

describe('agencyWidePresetDraft', () => {
  it('names no agency and defaults to empty options', () => {
    expect(agencyWidePresetDraft('sla')).toEqual({
      reportType: 'sla',
      agencyKey: null,
      agencyName: '',
      options: {},
    });
    expect(agencyWidePresetDraft('annual_utilization', { companies: ['A'] }).options).toEqual({
      companies: ['A'],
    });
  });
});

describe('hasFormatChoice', () => {
  it('is true only for the Office and Windows report', () => {
    expect(hasFormatChoice(agencyPresetDraft('office_windows', agency))).toBe(true);
    expect(hasFormatChoice(agencyPresetDraft('patch', agency))).toBe(false);
    expect(hasFormatChoice(agencyWidePresetDraft('sla'))).toBe(false);
  });
});

describe('isEmailAddress', () => {
  it('accepts anything with an @ and nothing without one', () => {
    expect(isEmailAddress('ops@example.com')).toBe(true);
    expect(isEmailAddress('ops.example.com')).toBe(false);
    expect(isEmailAddress('')).toBe(false);
  });
});
