import { Button } from '@mui/material';

export type DeviceView = 'spreadsheet' | 'postdata';

const TABS: { id: DeviceView; label: string }[] = [
  { id: 'spreadsheet', label: 'Spreadsheet' },
  { id: 'postdata', label: 'Post Data' },
];

interface ViewTabsProps {
  value: DeviceView;
  onChange: (view: DeviceView) => void;
}

const ViewTabs = ({ value, onChange }: ViewTabsProps) =>
  TABS.map((tab) => (
    <Button
      key={tab.id}
      variant={value === tab.id ? 'contained' : 'outlined'}
      size="small"
      onClick={() => onChange(tab.id)}
    >
      {tab.label}
    </Button>
  ));

export default ViewTabs;
