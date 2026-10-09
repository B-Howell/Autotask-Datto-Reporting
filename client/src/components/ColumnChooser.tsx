import { useEffect, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Paper,
  Typography,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import KeyboardDoubleArrowLeftIcon from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRightIcon from '@mui/icons-material/KeyboardDoubleArrowRight';

export interface ChooserColumn {
  field: string;
  headerName?: string;
}

interface ColumnChooserProps {
  open: boolean;
  onClose: () => void;
  allColumns: ChooserColumn[];
  visibleFields: string[];
  onApply: (fields: string[]) => void;
}

/** Two-list dialog for choosing and ordering grid columns; changes apply on OK. */
const ColumnChooser = ({
  open,
  onClose,
  allColumns,
  visibleFields,
  onApply,
}: ColumnChooserProps) => {
  const [hidden, setHidden] = useState<ChooserColumn[]>([]);
  const [visible, setVisible] = useState<ChooserColumn[]>([]);
  const [selectedHidden, setSelectedHidden] = useState<Set<string>>(new Set());
  const [selectedVisible, setSelectedVisible] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    const visFields = new Set(visibleFields);
    const vis = allColumns.filter((c) => visFields.has(c.field));
    vis.sort((a, b) => visibleFields.indexOf(a.field) - visibleFields.indexOf(b.field));
    setVisible(vis);
    setHidden(allColumns.filter((c) => !visFields.has(c.field)));
    setSelectedHidden(new Set());
    setSelectedVisible(new Set());
  }, [open, allColumns, visibleFields]);

  const toggleIn =
    (selected: Set<string>, setter: (next: Set<string>) => void) => (field: string) => {
      const next = new Set(selected);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      setter(next);
    };

  // Re-shown columns return to their schema position rather than the end.
  const insertAtSchemaPositions = (current: ChooserColumn[], incoming: ChooserColumn[]) => {
    const schemaIndex = new Map(allColumns.map((c, i) => [c.field, i]));
    const result = [...current];
    for (const col of incoming) {
      const target = schemaIndex.get(col.field) ?? Number.MAX_SAFE_INTEGER;
      const insertAt = result.findIndex(
        (c) => (schemaIndex.get(c.field) ?? Number.MAX_SAFE_INTEGER) > target
      );
      if (insertAt === -1) result.push(col);
      else result.splice(insertAt, 0, col);
    }
    return result;
  };

  const moveRight = () => {
    const moving = hidden.filter((c) => selectedHidden.has(c.field));
    if (!moving.length) return;
    setVisible(insertAtSchemaPositions(visible, moving));
    setHidden(hidden.filter((c) => !selectedHidden.has(c.field)));
    setSelectedHidden(new Set());
  };

  const moveLeft = () => {
    const moving = visible.filter((c) => selectedVisible.has(c.field));
    if (!moving.length) return;
    setHidden([...hidden, ...moving]);
    setVisible(visible.filter((c) => !selectedVisible.has(c.field)));
    setSelectedVisible(new Set());
  };

  const moveAllRight = () => {
    setVisible(insertAtSchemaPositions(visible, hidden));
    setHidden([]);
    setSelectedHidden(new Set());
  };

  const moveAllLeft = () => {
    setHidden([...hidden, ...visible]);
    setVisible([]);
    setSelectedVisible(new Set());
  };

  const swap = (list: ChooserColumn[], i: number, j: number) => {
    const a = list[i]!;
    list[i] = list[j]!;
    list[j] = a;
  };

  const moveUp = () => {
    if (!selectedVisible.size) return;
    const next = [...visible];
    for (let i = 1; i < next.length; i++) {
      if (selectedVisible.has(next[i]!.field) && !selectedVisible.has(next[i - 1]!.field)) {
        swap(next, i - 1, i);
      }
    }
    setVisible(next);
  };

  const moveDown = () => {
    if (!selectedVisible.size) return;
    const next = [...visible];
    for (let i = next.length - 2; i >= 0; i--) {
      if (selectedVisible.has(next[i]!.field) && !selectedVisible.has(next[i + 1]!.field)) {
        swap(next, i, i + 1);
      }
    }
    setVisible(next);
  };

  const handleApply = () => {
    onApply(visible.map((c) => c.field));
    onClose();
  };

  const renderList = (
    cols: ChooserColumn[],
    selected: Set<string>,
    onToggle: (field: string) => void,
    emptyText: string
  ) => (
    <Paper variant="outlined" sx={{ flex: 1, minHeight: 320, maxHeight: 420, overflow: 'auto' }}>
      {cols.length === 0 ? (
        <Box sx={{ p: 2, color: 'text.secondary', fontStyle: 'italic' }}>{emptyText}</Box>
      ) : (
        <List dense disablePadding>
          {cols.map((col) => (
            <ListItemButton
              key={col.field}
              selected={selected.has(col.field)}
              onClick={() => onToggle(col.field)}
              sx={{ py: 0.5 }}
            >
              <ListItemText primary={col.headerName || col.field} />
            </ListItemButton>
          ))}
        </List>
      )}
    </Paper>
  );

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Choose Columns</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'stretch', mt: 1 }}>
          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Typography variant="overline" sx={{ color: 'text.secondary', mb: 0.5 }}>
              Available ({hidden.length})
            </Typography>
            {renderList(
              hidden,
              selectedHidden,
              toggleIn(selectedHidden, setSelectedHidden),
              'No hidden columns'
            )}
          </Box>

          <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 1 }}>
            <IconButton onClick={moveAllRight} disabled={!hidden.length} title="Show all">
              <KeyboardDoubleArrowRightIcon />
            </IconButton>
            <IconButton onClick={moveRight} disabled={!selectedHidden.size} title="Show selected">
              <ArrowForwardIcon />
            </IconButton>
            <IconButton onClick={moveLeft} disabled={!selectedVisible.size} title="Hide selected">
              <ArrowBackIcon />
            </IconButton>
            <IconButton onClick={moveAllLeft} disabled={!visible.length} title="Hide all">
              <KeyboardDoubleArrowLeftIcon />
            </IconButton>
          </Box>

          <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                mb: 0.5,
              }}
            >
              <Typography variant="overline" sx={{ color: 'text.secondary' }}>
                Showing ({visible.length})
              </Typography>
              <Box>
                <IconButton
                  size="small"
                  onClick={moveUp}
                  disabled={!selectedVisible.size}
                  title="Move selected up"
                >
                  <ArrowUpwardIcon fontSize="small" />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={moveDown}
                  disabled={!selectedVisible.size}
                  title="Move selected down"
                >
                  <ArrowDownwardIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
            {renderList(
              visible,
              selectedVisible,
              toggleIn(selectedVisible, setSelectedVisible),
              'No visible columns'
            )}
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button onClick={handleApply} variant="contained">
          Apply
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ColumnChooser;
