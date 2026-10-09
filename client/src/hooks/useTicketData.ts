import { ticketsApi } from '@/api';
import type { EffectiveAgency, RepairTime, TicketDetails } from '@/api';
import useTicketDataStore from '@/store/ticketDataStore';
import { membersOf, valueFor } from '@/utils/agencyGroups';
import useTrackedReport from './useTrackedReport';

const sumCounts = (a: Record<string, number>, b: Record<string, number>) => {
  const out = { ...a };
  for (const [k, v] of Object.entries(b)) out[k] = (out[k] ?? 0) + v;
  return out;
};

// Averages are re-weighted by completed ticket count, so a group's figure is
// the true mean across its members rather than a mean of means.
const mergeRepairTimes = (a: Record<string, RepairTime>, b: Record<string, RepairTime>) => {
  const out: Record<string, RepairTime> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const av = a[k] ?? { average_days: 0, completed_tickets: 0 };
    const bv = b[k] ?? { average_days: 0, completed_tickets: 0 };
    const completed = av.completed_tickets + bv.completed_tickets;
    const days = av.average_days * av.completed_tickets + bv.average_days * bv.completed_tickets;
    out[k] = {
      average_days: completed ? +(days / completed).toFixed(2) : 0,
      completed_tickets: completed,
    };
  }
  return out;
};

export function mergeTicketDetails(a: TicketDetails, b: TicketDetails): TicketDetails {
  const phoneTotal =
    a.first_call_resolution.phone_tickets_total + b.first_call_resolution.phone_tickets_total;
  const phoneFcr =
    a.first_call_resolution.phone_tickets_fcr + b.first_call_resolution.phone_tickets_fcr;
  return {
    total_tickets: a.total_tickets + b.total_tickets,
    source_breakdown: sumCounts(a.source_breakdown, b.source_breakdown),
    priority_breakdown: sumCounts(a.priority_breakdown, b.priority_breakdown),
    issue_type_breakdown: sumCounts(a.issue_type_breakdown, b.issue_type_breakdown),
    avg_time_to_repair: mergeRepairTimes(a.avg_time_to_repair, b.avg_time_to_repair),
    first_call_resolution: {
      phone_tickets_total: phoneTotal,
      phone_tickets_fcr: phoneFcr,
      percentage: phoneTotal ? +((phoneFcr / phoneTotal) * 100).toFixed(2) : 0,
    },
  };
}

const useTicketData = () => {
  const ticketData = useTicketDataStore((s) => s.ticketData);
  const loading = useTicketDataStore((s) => s.loading);
  const selectedCompany = useTicketDataStore((s) => s.selectedCompany);
  const error = useTicketDataStore((s) => s.error);

  const { setTicketData, setLoading, setSelectedCompany, setError } = useTicketDataStore.getState();
  const runReport = useTrackedReport({ setLoading, setError });

  const fetchTicketDetails = (agency: EffectiveAgency, year: number, month: number) => {
    setTicketData(null);
    setSelectedCompany(valueFor(agency));
    return runReport({
      label: `Ticket Report · ${agency.name} · ${year}-${String(month).padStart(2, '0')}`,
      route: '/reports/tickets',
      run: async (signal) => {
        let merged: TicketDetails | null = null;
        for (const target of membersOf(agency)) {
          const data = await ticketsApi.fetchTicketDetails(target.id, year, month, { signal });
          merged = merged ? mergeTicketDetails(merged, data) : data;
        }
        return merged;
      },
      onSuccess: setTicketData,
    });
  };

  return { ticketData, loading, selectedCompany, error, fetchTicketDetails };
};

export default useTicketData;
