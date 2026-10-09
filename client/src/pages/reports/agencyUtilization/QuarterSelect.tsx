import { Box, MenuItem, TextField, Typography } from '@mui/material';
import type { QuarterChoice } from './quarters';

interface QuarterSelectProps {
  choices: QuarterChoice[];
  value: string;
  onChange: (key: string) => void;
}

const QuarterSelect = ({ choices, value, onChange }: QuarterSelectProps) => (
  <TextField
    select
    label="Quarter"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    size="small"
    sx={{ minWidth: 260 }}
  >
    {choices.map((c) => (
      <MenuItem key={c.key} value={c.key}>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'baseline' }}>
          <span>{c.label}</span>
          <Typography variant="caption" color="text.secondary">
            {c.detail}
          </Typography>
        </Box>
      </MenuItem>
    ))}
  </TextField>
);

export default QuarterSelect;
