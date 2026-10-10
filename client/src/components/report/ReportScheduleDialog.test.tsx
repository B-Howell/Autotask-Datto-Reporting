import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ReportScheduleDialog from './ReportScheduleDialog';

const schedule = {
  open: true,
  draft: null,
  closeDialog: () => {},
  save: async () => {},
  saving: false,
};

describe('ReportScheduleDialog', () => {
  it('mounts nothing until a draft exists', () => {
    const { container } = render(<ReportScheduleDialog schedule={schedule} />);
    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('shows the dialog for the draft with its report label in the title', () => {
    render(
      <ReportScheduleDialog
        schedule={{
          ...schedule,
          draft: { reportType: 'sla', agencyKey: null, agencyName: '', options: {} },
        }}
      />
    );
    expect(screen.getByRole('dialog', { name: 'Schedule SLA performance' })).toBeInTheDocument();
  });
});
