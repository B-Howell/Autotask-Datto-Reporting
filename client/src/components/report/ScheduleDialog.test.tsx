import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import ScheduleDialog from './ScheduleDialog';

const draft = {
  reportType: 'devices' as const,
  agencyKey: '1000',
  agencyName: 'Harbor Point Health',
  options: { columns: ['Product'] },
};

describe('ScheduleDialog', () => {
  it('requires a recipient and a subject before it can be saved', () => {
    const onSave = vi.fn();
    render(<ScheduleDialog open draft={draft} onClose={() => {}} onSave={onSave} />);
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^to$/i), {
      target: { value: 'a@example.com, b@example.com' },
    });
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        preset: expect.objectContaining({
          name: 'Harbor Point Health Device inventory',
          report_type: 'devices',
        }),
        schedule: expect.objectContaining({
          recipients_to: ['a@example.com', 'b@example.com'],
          day_of_month: 1,
          hour: 7,
        }),
      })
    );
  });

  it('prefills the subject with the agency placeholder only for agency reports', () => {
    render(<ScheduleDialog open draft={draft} onClose={() => {}} onSave={() => {}} />);
    expect(screen.getByLabelText(/^subject$/i)).toHaveValue('{agency} {report} {period}');
    expect(screen.getByLabelText(/^to$/i)).toHaveAttribute('inputmode', 'email');
  });

  it('starts over from the defaults when it is given a new draft', () => {
    const { rerender } = render(
      <ScheduleDialog open draft={draft} onClose={() => {}} onSave={() => {}} />
    );
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText(/^name$/i), { target: { value: 'Edited' } });
    rerender(
      <ScheduleDialog
        open
        draft={{ ...draft, reportType: 'patch' }}
        onClose={() => {}}
        onSave={() => {}}
      />
    );
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('Harbor Point Health Patch management');
    expect(screen.getByLabelText(/^to$/i)).toHaveValue('');
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeDisabled();
  });

  it('drops the agency from the name and subject of an agency-wide report', () => {
    const onSave = vi.fn();
    render(
      <ScheduleDialog
        open
        draft={{ reportType: 'sla', agencyKey: null, agencyName: '', options: {} }}
        onClose={() => {}}
        onSave={onSave}
      />
    );
    expect(screen.getByLabelText(/^name$/i)).toHaveValue('SLA performance');
    expect(screen.getByLabelText(/^subject$/i)).toHaveValue('{report} {period}');
  });

  it('clears the subject to block saving and splits cc on semicolons', () => {
    const onSave = vi.fn();
    render(<ScheduleDialog open draft={draft} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: 'a@example.com' } });
    fireEvent.change(screen.getByLabelText(/^cc$/i), {
      target: { value: ' c@example.com;; d@example.com ' },
    });
    fireEvent.change(screen.getByLabelText(/^subject$/i), { target: { value: '   ' } });
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^subject$/i), { target: { value: 'Monthly' } });
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    expect(onSave.mock.calls[0][0].schedule.recipients_cc).toEqual([
      'c@example.com',
      'd@example.com',
    ]);
  });

  it('flags an entry that is not an address and blocks saving until it is fixed', () => {
    render(<ScheduleDialog open draft={draft} onClose={() => {}} onSave={() => {}} />);
    fireEvent.change(screen.getByLabelText(/^to$/i), {
      target: { value: 'a@example.com, bogus' },
    });
    expect(screen.getByText('Not an email address: bogus')).toBeInTheDocument();
    expect(screen.getByLabelText(/^to$/i)).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^cc$/i), { target: { value: 'nobody' } });
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: 'a@example.com' } });
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/^cc$/i), { target: { value: '' } });
    expect(screen.getByRole('button', { name: /save schedule/i })).toBeEnabled();
  });

  it('sends each address once however it is capitalised', () => {
    const onSave = vi.fn();
    render(<ScheduleDialog open draft={draft} onClose={() => {}} onSave={onSave} />);
    fireEvent.change(screen.getByLabelText(/^to$/i), {
      target: { value: 'Ops@example.com; ops@example.com, OPS@EXAMPLE.COM' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    expect(onSave.mock.calls[0][0].schedule.recipients_to).toEqual(['Ops@example.com']);
  });

  it('offers a format choice for the Office and Windows report and stores it in the options', () => {
    const onSave = vi.fn();
    render(
      <ScheduleDialog
        open
        draft={{ ...draft, reportType: 'office_windows', options: { showLicenses: true } }}
        onClose={() => {}}
        onSave={onSave}
      />
    );
    fireEvent.change(screen.getByLabelText(/^to$/i), { target: { value: 'a@example.com' } });
    fireEvent.click(screen.getByLabelText(/pdf/i));
    fireEvent.click(screen.getByRole('button', { name: /save schedule/i }));
    expect(onSave.mock.calls[0][0].preset.options).toEqual({ showLicenses: true, format: 'pdf' });
  });
});
