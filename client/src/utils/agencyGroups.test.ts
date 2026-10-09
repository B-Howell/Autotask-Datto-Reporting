import { describe, expect, it } from 'vitest';
import type { Agency } from '@/api';
import {
  agencyNameFor,
  groupKey,
  membersOf,
  resolveAgencyValue,
  valueFor,
  getEffectiveAgencies,
} from './agencyGroups';

const agencies: Agency[] = [
  { id: 1002, site: 'site-b', name: 'Cedar Ridge Family Services' },
  { id: 1000, site: 'site-a', name: 'Harbor Point Health' },
  { id: 1001, site: 'site-c', name: 'Bluewater Public Library' },
];

describe('getEffectiveAgencies', () => {
  it('sorts agencies by name when no groups are configured', () => {
    expect(getEffectiveAgencies(agencies).map((a) => a.name)).toEqual([
      'Bluewater Public Library',
      'Cedar Ridge Family Services',
      'Harbor Point Health',
    ]);
  });

  it('collapses agencies that share a configured prefix into one group', () => {
    const withPrefix: Agency[] = [
      { id: 1, site: 'a', name: 'Northfield Schools' },
      { id: 2, site: 'b', name: 'Northfield Library' },
      { id: 3, site: 'c', name: 'Harbor Point' },
    ];
    const result = getEffectiveAgencies(withPrefix, [
      { name: 'Northfield', matchPrefix: 'Northfield ' },
    ]);
    expect(result.map((a) => a.name)).toEqual(['Harbor Point', 'Northfield']);
  });
});

describe('dropdown values', () => {
  it('round-trips a single agency through its numeric id', () => {
    const effective = getEffectiveAgencies(agencies);
    const value = valueFor(effective[2]!);
    expect(value).toBe(1000);
    expect(resolveAgencyValue(value, effective)?.name).toBe('Harbor Point Health');
    expect(membersOf(resolveAgencyValue(value, effective)!)).toEqual([agencies[1]]);
  });

  it('returns null for a value that matches nothing', () => {
    expect(resolveAgencyValue(9999, getEffectiveAgencies(agencies))).toBeNull();
    expect(resolveAgencyValue(groupKey('Nobody'), getEffectiveAgencies(agencies))).toBeNull();
  });

  it('names a stored value whether it is an id or a group key', () => {
    expect(agencyNameFor(1001, agencies)).toBe('Bluewater Public Library');
    expect(agencyNameFor(groupKey('Example Schools'), agencies)).toBe('Example Schools');
    expect(agencyNameFor(null, agencies)).toBe('');
  });
});
