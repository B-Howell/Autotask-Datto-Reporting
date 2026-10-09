import { isAgencyGroup } from '@/api';
import type { Agency, EffectiveAgency } from '@/api';

/** The agency a report is titled for: a member of a group is reported under the group's name. */
export const reportedAgencyForSite = (
  site: string | null,
  agencies: Agency[],
  effectiveAgencies: EffectiveAgency[]
): EffectiveAgency | null => {
  if (!site) return null;
  const single = agencies.find((a) => a.site === site);
  if (!single) return null;
  const group = effectiveAgencies.find(
    (a) => isAgencyGroup(a) && a.members.some((m) => m.id === single.id)
  );
  return group ?? single;
};
