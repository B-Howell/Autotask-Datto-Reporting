import { useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import type { AgencyValue } from '@/api';
import {
  AgencySelect,
  ErrorBanner,
  MonthYearSelect,
  ReportActions,
  ReportPage,
  ReportToolbar,
} from '@/components/report';
import useEffectiveAgencies from '@/hooks/useEffectiveAgencies';
import useTicketData from '@/hooks/useTicketData';
import useAgencyStore from '@/store/agencyStore';
import { agencyNameFor, resolveAgencyValue } from '@/utils/agencyGroups';
import { MONTH_NAMES } from '@/utils/dates';
import type { MonthName } from '@/utils/dates';
import BreakdownCard from './tickets/BreakdownCard';
import FirstCallResolutionCard from './tickets/FirstCallResolutionCard';
import RepairTimeCard from './tickets/RepairTimeCard';

const countRows = (data: Record<string, number>) =>
  Object.entries(data).map(([key, value]) => ({ key, value }));

const Tickets = () => {
  const agencies = useAgencyStore((s) => s.agencies);
  const effectiveAgencies = useEffectiveAgencies();
  const { ticketData, loading, selectedCompany, error, fetchTicketDetails } = useTicketData();

  const [month, setMonth] = useState<MonthName>(MONTH_NAMES[new Date().getMonth()]);
  const [year, setYear] = useState(new Date().getFullYear());
  const [agencyValue, setAgencyValue] = useState<AgencyValue | ''>('');

  const fetchFor = (value: AgencyValue | '') => {
    const agency = resolveAgencyValue(value, effectiveAgencies);
    if (!agency) return;
    void fetchTicketDetails(agency, year, MONTH_NAMES.indexOf(month) + 1);
  };

  // Picking an agency runs the report straight away; Generate re-runs it for a new month/year.
  const handleAgencyChange = (value: AgencyValue | '') => {
    setAgencyValue(value);
    fetchFor(value);
  };

  const companyName = agencyNameFor(selectedCompany, agencies);
  const showResults = Boolean(ticketData && selectedCompany && !loading && !error);

  return (
    <ReportPage title="Ticket Reports">
      <ReportToolbar
        actions={
          <ReportActions
            onGenerate={() => fetchFor(agencyValue)}
            generateDisabled={!agencyValue}
            loading={loading}
          />
        }
      >
        <AgencySelect
          agencies={effectiveAgencies}
          value={agencyValue}
          onChange={handleAgencyChange}
        />
        <MonthYearSelect
          month={month}
          year={year}
          onMonthChange={setMonth}
          onYearChange={setYear}
        />
      </ReportToolbar>

      {loading && (
        <Box sx={{ mt: 4, textAlign: 'center' }}>
          <CircularProgress size={24} />
          <Typography sx={{ ml: 2, display: 'inline-block' }}>Loading ticket data...</Typography>
        </Box>
      )}
      <ErrorBanner error={error} />

      {showResults && ticketData && (
        <Box>
          <Typography variant="h6" sx={{ mb: 3, textAlign: 'center' }}>
            {companyName} Tickets for {month} {year}: {ticketData.total_tickets} Tickets
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'flex-start' }}>
            <BreakdownCard
              title="Source"
              columnLabel="Source Category"
              rows={countRows(ticketData.source_breakdown)}
            />
            <BreakdownCard
              title="Priority"
              columnLabel="Priority Category"
              rows={countRows(ticketData.priority_breakdown)}
            />
            {ticketData.avg_time_to_repair && (
              <RepairTimeCard repairTimes={ticketData.avg_time_to_repair} />
            )}
            <FirstCallResolutionCard resolution={ticketData.first_call_resolution} />
            <BreakdownCard
              title="Issue Type"
              columnLabel="Issue Type Category"
              rows={countRows(ticketData.issue_type_breakdown)}
            />
          </Box>
        </Box>
      )}
    </ReportPage>
  );
};

export default Tickets;
