import { useMemo, useState } from 'react';
import type { SlaTicket } from '@/api';

export type SlaFilterKey = 'company' | 'queue' | 'priority' | 'resource';

export type SlaFilterValues = Record<SlaFilterKey, string[]>;

export const SLA_FILTERS: { key: SlaFilterKey; label: string; field: keyof SlaTicket }[] = [
  { key: 'company', label: 'Company', field: 'companyName' },
  { key: 'queue', label: 'Queue', field: 'queue' },
  { key: 'priority', label: 'Priority', field: 'priority' },
  { key: 'resource', label: 'Resource', field: 'resource' },
];

const NO_FILTERS: SlaFilterValues = { company: [], queue: [], priority: [], resource: [] };

const distinctValues = (tickets: SlaTicket[], field: keyof SlaTicket): string[] =>
  [...new Set(tickets.map((t) => String(t[field] ?? '')).filter(Boolean))].sort();

/** Multi-select filter state over the fetched tickets; an empty selection means "all". */
const useSlaFilters = (tickets: SlaTicket[] | undefined) => {
  const [values, setValues] = useState<SlaFilterValues>(NO_FILTERS);

  const options = useMemo<SlaFilterValues>(() => {
    const source = tickets ?? [];
    return {
      company: distinctValues(source, 'companyName'),
      queue: distinctValues(source, 'queue'),
      priority: distinctValues(source, 'priority'),
      resource: distinctValues(source, 'resource'),
    };
  }, [tickets]);

  const filteredTickets = useMemo(() => {
    if (!tickets) return [];
    return tickets.filter((t) =>
      SLA_FILTERS.every(
        ({ key, field }) => !values[key].length || values[key].includes(String(t[field]))
      )
    );
  }, [tickets, values]);

  const setFilter = (key: SlaFilterKey, selected: string[]) =>
    setValues((prev) => ({ ...prev, [key]: selected }));

  const hasActive = SLA_FILTERS.some(({ key }) => values[key].length > 0);

  return {
    values,
    options,
    filteredTickets,
    hasActive,
    setFilter,
    clear: () => setValues(NO_FILTERS),
  };
};

export default useSlaFilters;
