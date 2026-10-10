import { useCallback, useState } from 'react';
import type { OfficeWindowsFormat, PresetInput, ScheduleInput } from '@/api';
import {
  defaultName,
  defaultSubject,
  hasFormatChoice,
  invalidAddresses,
  splitAddresses,
} from './scheduleDraft';
import type { PresetDraft } from './scheduleDraft';

export interface ScheduleFormValues {
  name: string;
  to: string;
  cc: string;
  subject: string;
  body: string;
  dayOfMonth: number;
  hour: number;
  format: OfficeWindowsFormat;
}

export interface SchedulePayload {
  preset: PresetInput;
  schedule: Omit<ScheduleInput, 'preset_id'>;
}

const initialValues = (draft: PresetDraft): ScheduleFormValues => ({
  name: defaultName(draft),
  to: '',
  cc: '',
  subject: defaultSubject(draft),
  body: '',
  dayOfMonth: 1,
  hour: 7,
  format: draft.options.format === 'pdf' ? 'pdf' : 'docx',
});

const toPayload = (draft: PresetDraft, values: ScheduleFormValues): SchedulePayload => ({
  preset: {
    name: values.name.trim(),
    report_type: draft.reportType,
    agency_key: draft.agencyKey,
    agency_name: draft.agencyName,
    options: hasFormatChoice(draft) ? { ...draft.options, format: values.format } : draft.options,
  },
  schedule: {
    day_of_month: values.dayOfMonth,
    hour: values.hour,
    recipients_to: splitAddresses(values.to),
    recipients_cc: splitAddresses(values.cc),
    subject: values.subject.trim(),
    body: values.body,
  },
});

/**
 * The Schedule dialog's field state, prefilled from the draft.
 *
 * Edits are stored together with the draft they were made against, so a new
 * draft (the dialog opened again for another report) shows fresh defaults
 * without an effect or a remount; the stale edits are simply never read.
 */
export default function useScheduleForm(draft: PresetDraft) {
  const [edited, setEdited] = useState<{ draft: PresetDraft; values: ScheduleFormValues } | null>(
    null
  );
  const values = edited?.draft === draft ? edited.values : initialValues(draft);

  const update = useCallback(
    (patch: Partial<ScheduleFormValues>) =>
      setEdited((prev) => ({
        draft,
        values: { ...(prev?.draft === draft ? prev.values : initialValues(draft)), ...patch },
      })),
    [draft]
  );

  const payload = toPayload(draft, values);
  const valid =
    payload.schedule.recipients_to.length > 0 &&
    payload.schedule.subject !== '' &&
    invalidAddresses(values.to).length === 0 &&
    invalidAddresses(values.cc).length === 0;
  return { values, update, payload, valid };
}
