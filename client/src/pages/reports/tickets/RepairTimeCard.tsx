import type { RepairTime } from '@/api';
import BreakdownCard from './BreakdownCard';

interface RepairTimeCardProps {
  repairTimes: Record<string, RepairTime>;
}

const RepairTimeCard = ({ repairTimes }: RepairTimeCardProps) => (
  <BreakdownCard
    title="Average Time to Repair (Days)"
    columnLabel="Priority Category"
    valueLabel="Avg Days"
    rows={Object.entries(repairTimes).map(([key, data]) => ({
      key,
      value: data.average_days || 'N/A',
    }))}
  />
);

export default RepairTimeCard;
