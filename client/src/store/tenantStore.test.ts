import { afterEach, describe, expect, it } from 'vitest';
import useTenantStore, { TENANT_DEFAULTS } from './tenantStore';

afterEach(() => useTenantStore.setState({ tenant: TENANT_DEFAULTS, loaded: false }));

describe('tenantStore', () => {
  it('starts from the defaults and replaces them wholesale on load', () => {
    expect(useTenantStore.getState().tenant).toEqual(TENANT_DEFAULTS);
    useTenantStore.getState().setTenant({ ...TENANT_DEFAULTS, firstReportYear: 2020 });
    expect(useTenantStore.getState().tenant.firstReportYear).toBe(2020);
  });

  it('builds a logo url from the tenant map', () => {
    useTenantStore
      .getState()
      .setTenant({ ...TENANT_DEFAULTS, logos: { 'Harbor Point': 'hp.png' } });
    expect(useTenantStore.getState().logoUrl('Harbor Point')).toBe('/api/tenant/logos/hp.png');
    expect(useTenantStore.getState().logoUrl('Nobody')).toBeNull();
  });
});
