import {
  Box,
  Button,
  Checkbox,
  FormControl,
  FormControlLabel,
  FormLabel,
  List,
  ListItem,
  Radio,
  RadioGroup,
  TextField,
  Typography,
} from '@mui/material';
import { SettingsDialog } from '@/components/report';
import type { Rates, ViewMode } from '@/store/annualUtilizationStore';
import { RATED_DEPARTMENTS } from './departments';

interface ViewModeFieldProps {
  value: ViewMode;
  onChange: (mode: ViewMode) => void;
}

const ViewModeField = ({ value, onChange }: ViewModeFieldProps) => (
  <FormControl sx={{ mb: 3 }}>
    <FormLabel sx={{ fontWeight: 700, mb: 0.5 }}>Report View</FormLabel>
    <RadioGroup value={value} onChange={(e) => onChange(e.target.value as ViewMode)} row>
      <FormControlLabel value="table" control={<Radio size="small" />} label="Table" />
      <FormControlLabel value="spreadsheet" control={<Radio size="small" />} label="Spreadsheet" />
    </RadioGroup>
  </FormControl>
);

interface RateFieldsProps {
  rates: Rates;
  onChange: (rates: Rates) => void;
}

const RateFields = ({ rates, onChange }: RateFieldsProps) => (
  <Box sx={{ mb: 3 }}>
    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
      Hourly Rates
    </Typography>
    {RATED_DEPARTMENTS.map((d) => (
      <Box key={d.department} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Typography variant="body2" sx={{ flex: 1 }}>
          {d.department}
        </Typography>
        <TextField
          value={rates[d.department] ?? d.rate}
          onChange={(e) => onChange({ ...rates, [d.department]: e.target.value })}
          size="small"
          slotProps={{
            htmlInput: { style: { textAlign: 'right', width: '4em' }, inputMode: 'numeric' },
            input: {
              startAdornment: (
                <Typography variant="body2" sx={{ mr: 0.5 }}>
                  $
                </Typography>
              ),
              endAdornment: (
                <Typography variant="body2" sx={{ ml: 0.5 }}>
                  /hr
                </Typography>
              ),
            },
          }}
        />
      </Box>
    ))}
  </Box>
);

interface CompanyChecklistProps {
  allCompanies: string[];
  /** null means every company is shown. */
  selected: Set<string> | null;
  onChange: (selected: Set<string>) => void;
}

const CompanyChecklist = ({ allCompanies, selected, onChange }: CompanyChecklistProps) => {
  const toggle = (company: string) => {
    const next = new Set(selected ?? allCompanies);
    if (next.has(company)) next.delete(company);
    else next.add(company);
    onChange(next);
  };
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Companies
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        Select which companies appear as tabs and in the export.
      </Typography>
      <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
        <Button size="small" onClick={() => onChange(new Set(allCompanies))}>
          Select all
        </Button>
        <Button size="small" onClick={() => onChange(new Set())}>
          Deselect all
        </Button>
      </Box>
      <List dense sx={{ maxHeight: 300, overflow: 'auto' }}>
        {allCompanies.map((c) => (
          <ListItem key={c} disablePadding sx={{ px: 1 }}>
            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={!selected || selected.has(c)}
                  onChange={() => toggle(c)}
                />
              }
              label={c}
              sx={{ width: '100%' }}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

interface ReportSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  rates: Rates;
  onRatesChange: (rates: Rates) => void;
  allCompanies: string[];
  selectedCompanies: Set<string> | null;
  onSelectedCompaniesChange: (selected: Set<string>) => void;
}

const ReportSettingsDialog = ({
  open,
  onClose,
  viewMode,
  onViewModeChange,
  rates,
  onRatesChange,
  allCompanies,
  selectedCompanies,
  onSelectedCompaniesChange,
}: ReportSettingsDialogProps) => (
  <SettingsDialog open={open} onClose={onClose} title="Report Settings" maxWidth="xs">
    <ViewModeField value={viewMode} onChange={onViewModeChange} />
    <RateFields rates={rates} onChange={onRatesChange} />
    <CompanyChecklist
      allCompanies={allCompanies}
      selected={selectedCompanies}
      onChange={onSelectedCompaniesChange}
    />
  </SettingsDialog>
);

export default ReportSettingsDialog;
