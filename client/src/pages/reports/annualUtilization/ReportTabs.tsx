import type { SyntheticEvent } from 'react';
import { Tab, Tabs } from '@mui/material';
import { RAW_TAB } from './fiscalYear';

const DIVIDER_TAB = '__divider__';

interface ReportTabsProps {
  value: string;
  onChange: (tab: string) => void;
  companies: string[];
}

/** Summary and Datto, a divider, then one tab per selected agency. */
const ReportTabs = ({ value, onChange, companies }: ReportTabsProps) => (
  <Tabs
    value={value}
    onChange={(_e: SyntheticEvent, v: string) => {
      if (v !== DIVIDER_TAB) onChange(v);
    }}
    variant="scrollable"
    scrollButtons="auto"
    sx={{ borderBottom: 1, borderColor: 'divider' }}
  >
    <Tab value="" label="Summary" />
    <Tab value={RAW_TAB} label="Datto" />
    <Tab
      value={DIVIDER_TAB}
      disabled
      sx={{
        minWidth: 0,
        px: 0,
        mx: 1,
        borderRight: 2,
        borderColor: 'divider',
        opacity: '1 !important',
        cursor: 'default',
      }}
      label=""
    />
    {companies.map((c) => (
      <Tab key={c} value={c} label={c} />
    ))}
  </Tabs>
);

export default ReportTabs;
