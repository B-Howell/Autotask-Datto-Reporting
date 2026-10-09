import type { Agency, AgencyGroup, AgencyValue, EffectiveAgency, GroupRule } from '@/api';
import { isAgencyGroup } from '@/api';

const GROUP_PREFIX = 'group:';

export const groupKey = (groupName: string): string => `${GROUP_PREFIX}${groupName}`;

export const isGroupKey = (value: unknown): value is string =>
  typeof value === 'string' && value.startsWith(GROUP_PREFIX);

export const groupNameFromKey = (key: string): string => key.slice(GROUP_PREFIX.length);

/**
 * Fold raw agencies into dropdown entries: known groups collapse, the rest pass
 * through. A group rule names one organisation that exists in Autotask as several
 * companies sharing a name prefix; the rules come from the tenant settings.
 */
export function getEffectiveAgencies(
  agencies: Agency[],
  groups: GroupRule[] = []
): EffectiveAgency[] {
  const grouped: AgencyGroup[] = [];
  const handledIds = new Set<number>();

  for (const group of groups) {
    const members = agencies.filter((a) => a.name && a.name.startsWith(group.matchPrefix));
    if (members.length >= 2) {
      grouped.push({
        name: group.name,
        members: members.map((m) => ({ id: m.id, site: m.site, name: m.name })),
      });
      members.forEach((m) => handledIds.add(m.id));
    }
  }

  const remaining = agencies.filter((a) => !handledIds.has(a.id));
  return [...grouped, ...remaining].sort((a, b) => a.name.localeCompare(b.name));
}

export function resolveAgencyValue(
  value: AgencyValue | '',
  effectiveAgencies: EffectiveAgency[]
): EffectiveAgency | null {
  if (isGroupKey(value)) {
    return effectiveAgencies.find((a) => isAgencyGroup(a) && groupKey(a.name) === value) ?? null;
  }
  const numeric = Number(value);
  return effectiveAgencies.find((a) => !isAgencyGroup(a) && a.id === numeric) ?? null;
}

export function valueFor(agency: EffectiveAgency): AgencyValue {
  return isAgencyGroup(agency) ? groupKey(agency.name) : agency.id;
}

/** The members a report must fetch for: the group's, or the agency itself. */
export function membersOf(agency: EffectiveAgency): Agency[] {
  return isAgencyGroup(agency) ? agency.members : [agency];
}

/** Display name for a stored dropdown value. */
export function agencyNameFor(value: AgencyValue | null, agencies: Agency[]): string {
  if (value === null) return '';
  if (isGroupKey(value)) return groupNameFromKey(value);
  return agencies.find((a) => a.id === value)?.name ?? '';
}
