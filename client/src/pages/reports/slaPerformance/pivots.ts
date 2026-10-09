import type { SlaPivotRow, SlaTicket } from '@/api';

export const GRAND_TOTAL = 'Grand Total';

export const PRIORITY_ORDER = ['P1 Critical', 'P2 Important', 'P3 Moderate', 'P4 Minor'];

export interface SubIssuePivotRow {
  subIssueType: string;
  avgFirstResponseMet: number;
  avgResolvedMet: number;
  ticketCount: number;
}

export interface IssueTypePivotRow {
  issueType: string;
  avgFirstResponseMet: number;
  avgResolvedMet: number;
  ticketCount: number;
  children?: SubIssuePivotRow[];
}

interface MetBucket {
  fr: number[];
  res: number[];
}

const newBucket = (): MetBucket => ({ fr: [], res: [] });

const avg = (arr: number[]): number =>
  arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;

const pushMet = (bucket: MetBucket, t: SlaTicket): void => {
  if (t.firstResponseMet !== null && t.firstResponseMet !== undefined)
    bucket.fr.push(t.firstResponseMet ? 1 : 0);
  if (t.resolvedMet !== null && t.resolvedMet !== undefined) bucket.res.push(t.resolvedMet ? 1 : 0);
};

const summarise = (bucket: MetBucket) => ({
  avgFirstResponseMet: avg(bucket.fr),
  avgResolvedMet: avg(bucket.res),
  ticketCount: Math.max(bucket.fr.length, bucket.res.length),
});

const sortedEntries = <T>(record: Record<string, T>): [string, T][] =>
  Object.entries(record).sort(([a], [b]) => a.localeCompare(b));

/** One row per key value plus a Grand Total row, each averaging the met flags. */
export function buildPivot(
  tickets: SlaTicket[],
  keyOf: (t: SlaTicket) => string,
  totalLabel = GRAND_TOTAL
): SlaPivotRow[] {
  if (!tickets.length) return [];
  const stats: Record<string, MetBucket> = {};
  const all = newBucket();
  tickets.forEach((t) => {
    const k = keyOf(t) || '(blank)';
    stats[k] ??= newBucket();
    pushMet(stats[k], t);
    pushMet(all, t);
  });
  const rows = sortedEntries(stats).map(([resource, s]) => ({ resource, ...summarise(s) }));
  rows.push({ resource: totalLabel, ...summarise(all) });
  return rows;
}

/** Known priorities in P1..P4 order, unknown ones after them alphabetically, Grand Total last. */
export function sortByPriority(rows: SlaPivotRow[]): SlaPivotRow[] {
  const total = rows.find((r) => r.resource === GRAND_TOTAL);
  const others = rows.filter((r) => r.resource !== GRAND_TOTAL);
  others.sort((a, b) => {
    const ia = PRIORITY_ORDER.indexOf(a.resource);
    const ib = PRIORITY_ORDER.indexOf(b.resource);
    if (ia === -1 && ib === -1) return a.resource.localeCompare(b.resource);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });
  return total ? [...others, total] : others;
}

interface IssueBucket extends MetBucket {
  children: Record<string, MetBucket>;
}

/** Issue type rows with their sub-issue children, plus a Grand Total row. */
export function buildIssueTypePivot(tickets: SlaTicket[]): IssueTypePivotRow[] {
  if (!tickets.length) return [];
  const groups: Record<string, IssueBucket> = {};
  const all = newBucket();
  tickets.forEach((t) => {
    const issue = t.issueType || '(blank)';
    const sub = t.subIssueType || '(blank)';
    groups[issue] ??= { ...newBucket(), children: {} };
    groups[issue].children[sub] ??= newBucket();
    pushMet(groups[issue], t);
    pushMet(groups[issue].children[sub], t);
    pushMet(all, t);
  });
  const rows: IssueTypePivotRow[] = sortedEntries(groups).map(([issueType, s]) => ({
    issueType,
    ...summarise(s),
    children: sortedEntries(s.children).map(([subIssueType, c]) => ({
      subIssueType,
      ...summarise(c),
    })),
  }));
  rows.push({ issueType: GRAND_TOTAL, ...summarise(all) });
  return rows;
}
