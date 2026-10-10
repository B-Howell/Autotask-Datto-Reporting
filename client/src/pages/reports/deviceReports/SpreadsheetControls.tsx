import { Button } from '@mui/material';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import MissingFieldFilter from './MissingFieldFilter';

interface SpreadsheetControlsProps {
  onChooseColumns: () => void;
  /** The missing-field filter's value: `''`, `'all'` or an editable column label. */
  missingFilter: string;
  fieldLabels: string[];
  onFilterChange: (value: string) => void;
}

/** The toolbar controls that only apply to the spreadsheet view: the column chooser and the missing-field filter. */
const SpreadsheetControls = ({
  onChooseColumns,
  missingFilter,
  fieldLabels,
  onFilterChange,
}: SpreadsheetControlsProps) => (
  <>
    <Button
      variant="outlined"
      size="small"
      startIcon={<ViewColumnIcon />}
      onClick={onChooseColumns}
    >
      Columns
    </Button>
    <MissingFieldFilter value={missingFilter} fieldLabels={fieldLabels} onChange={onFilterChange} />
  </>
);

export default SpreadsheetControls;
