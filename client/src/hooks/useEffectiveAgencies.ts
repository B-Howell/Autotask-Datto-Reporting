import { useMemo } from 'react';
import type { EffectiveAgency } from '@/api';
import useAgencyStore from '@/store/agencyStore';
import useTenantStore from '@/store/tenantStore';
import { getEffectiveAgencies } from '@/utils/agencyGroups';

/** The agency dropdown entries: raw agencies with the tenant's groups collapsed. */
const useEffectiveAgencies = (): EffectiveAgency[] => {
  const agencies = useAgencyStore((s) => s.agencies);
  const groups = useTenantStore((s) => s.tenant.groups);
  return useMemo(() => getEffectiveAgencies(agencies, groups), [agencies, groups]);
};

export default useEffectiveAgencies;
