import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormLabel,
  Radio,
  RadioGroup,
  Stack,
  TextField,
} from '@mui/material';
import DayHourFields from './DayHourFields';
import RecipientsField from './RecipientsField';
import { REPORT_LABELS } from './scheduleDraft';
import type { PresetDraft } from './scheduleDraft';
import useScheduleForm from './useScheduleForm';
import type { SchedulePayload } from './useScheduleForm';

interface ScheduleDialogProps {
  open: boolean;
  draft: PresetDraft;
  onClose: () => void;
  onSave: (payload: SchedulePayload) => void;
  saving?: boolean;
}

const SUBJECT_HELP = 'Placeholders: {agency}, {report}, {period}, {date}';

/** Collects a monthly delivery for the report on screen: who gets it, when, and under what subject. */
const ScheduleDialog = ({ open, draft, onClose, onSave, saving = false }: ScheduleDialogProps) => {
  const { values, update, payload, valid } = useScheduleForm(draft);
  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Schedule {REPORT_LABELS[draft.reportType]}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField
            label="Name"
            value={values.name}
            onChange={(event) => update({ name: event.target.value })}
            fullWidth
            size="small"
          />
          <RecipientsField label="To" value={values.to} onChange={(to) => update({ to })} />
          <RecipientsField
            label="CC"
            value={values.cc}
            onChange={(cc) => update({ cc })}
            helperText="Optional"
          />
          <TextField
            label="Subject"
            value={values.subject}
            onChange={(event) => update({ subject: event.target.value })}
            helperText={SUBJECT_HELP}
            fullWidth
            size="small"
          />
          <TextField
            label="Body"
            value={values.body}
            onChange={(event) => update({ body: event.target.value })}
            helperText="Optional; the same placeholders apply"
            multiline
            minRows={3}
            fullWidth
            size="small"
          />
          <DayHourFields dayOfMonth={values.dayOfMonth} hour={values.hour} onChange={update} />
          {draft.reportType === 'office_windows' && (
            <FormControl>
              <FormLabel id="schedule-format-label">Format</FormLabel>
              <RadioGroup
                row
                aria-labelledby="schedule-format-label"
                value={values.format}
                onChange={(event) => update({ format: event.target.value as 'docx' | 'pdf' })}
              >
                <FormControlLabel
                  value="docx"
                  control={<Radio size="small" />}
                  label="Word (docx)"
                />
                <FormControlLabel value="pdf" control={<Radio size="small" />} label="PDF" />
              </RadioGroup>
            </FormControl>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>
          Cancel
        </Button>
        <Button variant="contained" onClick={() => onSave(payload)} disabled={!valid || saving}>
          Save schedule
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ScheduleDialog;
