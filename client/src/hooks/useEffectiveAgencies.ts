import { useMemo } from 'react';
import type { EffectiveAgency } from '@/api';
import useAgencyStore from '@/store/agencyStore';
import { getEffectiveAgencies } from '@/utils/agencyGroups';

/** The agency dropdown entries: raw agencies with configured groups collapsed. */
const useEffectiveAgencies = (): EffectiveAgency[] => {
  const agencies = useAgencyStore((s) => s.agencies);
  return useMemo(() => getEffectiveAgencies(agencies), [agencies]);
};

export default useEffectiveAgencies;
