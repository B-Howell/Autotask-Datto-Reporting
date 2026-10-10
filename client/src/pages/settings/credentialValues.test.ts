import { describe, expect, it } from 'vitest';
import type { CredentialFieldName, CredentialFieldStatus } from '@/api';
import { latestTest, typedValues } from './credentialValues';

const tested = (
  name: CredentialFieldName,
  last_tested_at: string | null,
  last_test_ok: boolean | null = true
): CredentialFieldStatus => ({
  name,
  vendor: 'datto',
  secret: false,
  configured: true,
  source: 'stored',
  last4: '',
  updated_at: null,
  last_tested_at,
  last_test_ok,
});

describe('typedValues', () => {
  it('trims each value and drops the blank ones', () => {
    expect(
      typedValues({
        datto_platform: '  zinfandel ',
        datto_api_key: '   ',
        datto_api_secret: '',
        autotask_username: 'ops',
      })
    ).toEqual({ datto_platform: 'zinfandel', autotask_username: 'ops' });
  });

  it('is empty for no entries', () => {
    expect(typedValues({})).toEqual({});
  });
});

describe('latestTest', () => {
  it('is null when no field was tested', () => {
    expect(latestTest([tested('datto_api_key', null, null), tested('datto_platform', null)])).toBe(
      null
    );
  });

  it('picks the most recent stamp and skips untested fields', () => {
    const fields = [
      tested('datto_api_key', '2026-10-09T08:00:00+00:00', false),
      tested('datto_api_secret', null, null),
      tested('datto_platform', '2026-10-10T08:00:00+00:00', true),
    ];
    expect(latestTest(fields)?.name).toBe('datto_platform');
  });

  it('keeps the first listed field on a tie', () => {
    const fields = [
      tested('datto_api_key', '2026-10-10T08:00:00+00:00', false),
      tested('datto_platform', '2026-10-10T08:00:00+00:00', true),
    ];
    expect(latestTest(fields)?.name).toBe('datto_api_key');
  });
});
