import { describe, expect, it } from 'vitest';
import type { CredentialFieldName, CredentialFieldStatus } from '@/api';
import { hasStoredField, vendorFields } from './vendors';

const field = (name: CredentialFieldName): CredentialFieldStatus => ({
  name,
  vendor: name.startsWith('autotask') ? 'autotask' : 'datto',
  secret: false,
  configured: false,
  source: 'missing',
  last4: '',
  updated_at: null,
  last_tested_at: null,
  last_test_ok: null,
});

describe('vendorFields', () => {
  it('lists a vendor in card order whatever order the server used, dropping unknown names', () => {
    const fields = [
      field('datto_platform'),
      field('autotask_base_url'),
      field('datto_api_key'),
      field('autotask_username'),
    ];
    expect(vendorFields(fields, 'datto').map((f) => f.name)).toEqual([
      'datto_api_key',
      'datto_platform',
    ]);
    expect(vendorFields(fields, 'autotask').map((f) => f.name)).toEqual([
      'autotask_username',
      'autotask_base_url',
    ]);
  });
});

describe('hasStoredField', () => {
  it('is true only when some field came from the store, not the environment', () => {
    const environment = { ...field('autotask_username'), source: 'environment' as const };
    expect(hasStoredField([field('datto_platform'), environment])).toBe(false);
    const stored = { ...field('datto_api_key'), source: 'stored' as const };
    expect(hasStoredField([environment, stored])).toBe(true);
  });
});
