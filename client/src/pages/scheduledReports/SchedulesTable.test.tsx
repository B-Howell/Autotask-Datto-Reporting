import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ReportSchedule } from '@/api';
import SchedulesTable, { EMPTY_TEXT } from './SchedulesTable';

const STAMP = '2026-10-09T19:00:00+00:00';
const NEXT = '2026-11-01T07:00:00+00:00';
const schedule: ReportSchedule = {
  id: 9,
  preset_id: 4,
  preset: {
    id: 4,
    name: 'Harbor Point Health Device inventory',
    report_type: 'devices',
    agency_key: '1000',
    agency_name: 'Harbor Point Health',
    options: {},
    created_at: STAMP,
    updated_at: STAMP,
  },
  day_of_month: 1,
  hour: 7,
  recipients_to: ['ops@example.com'],
  recipients_cc: ['lead@example.com'],
  subject: '{report} {period}',
  body: '',
  enabled: true,
  next_run_at: NEXT,
  last_run_at: STAMP,
  last_status: 'error',
  last_error: 'DELIVERY_WEBHOOK_URL is not set',
  created_at: STAMP,
  updated_at: STAMP,
};

const handlers = () => ({
  onSelect: vi.fn(),
  onRunNow: vi.fn(),
  onToggle: vi.fn(),
  onDelete: vi.fn(),
});

describe('SchedulesTable', () => {
  it('renders the preset, slot, recipients, next run and last status, and runs the row', () => {
    const h = handlers();
    render(<SchedulesTable schedules={[schedule]} selectedId={null} runningId={null} {...h} />);

    expect(screen.getByText('Harbor Point Health Device inventory')).toBeInTheDocument();
    expect(screen.getByText('Device inventory / Harbor Point Health')).toBeInTheDocument();
    expect(screen.getByText('Day 1 at 07:00')).toBeInTheDocument();
    expect(screen.getByText('ops@example.com')).toBeInTheDocument();
    expect(screen.getByText('cc lead@example.com')).toBeInTheDocument();
    expect(screen.getByText(new Date(NEXT).toLocaleString())).toBeInTheDocument();
    expect(screen.getByText('error')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Run now' }));
    expect(h.onRunNow).toHaveBeenCalledWith(9);
    expect(h.onSelect).not.toHaveBeenCalled();
  });

  it('selects on a row click, toggles through the switch and asks to delete', () => {
    const h = handlers();
    render(<SchedulesTable schedules={[schedule]} selectedId={null} runningId={null} {...h} />);

    fireEvent.click(screen.getByText('Day 1 at 07:00'));
    expect(h.onSelect).toHaveBeenCalledWith(9);
    fireEvent.click(screen.getByRole('switch', { name: 'Disable schedule' }));
    expect(h.onToggle).toHaveBeenCalledWith(9, false);
    fireEvent.click(screen.getByRole('button', { name: 'Delete schedule' }));
    expect(h.onDelete).toHaveBeenCalledWith(9);
  });

  it('selects a focused row with Enter or Space but not from a button inside it', () => {
    const h = handlers();
    render(<SchedulesTable schedules={[schedule]} selectedId={9} runningId={null} {...h} />);
    const row = screen.getByText('Day 1 at 07:00').closest('tr') as HTMLElement;
    expect(row).toHaveAttribute('tabindex', '0');
    expect(row).toHaveAttribute('aria-selected', 'true');

    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyDown(row, { key: ' ' });
    expect(h.onSelect).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(screen.getByRole('button', { name: 'Run now' }), { key: 'Enter' });
    expect(h.onSelect).toHaveBeenCalledTimes(2);
  });

  it('shows the empty state when there are no schedules', () => {
    render(<SchedulesTable schedules={[]} selectedId={null} runningId={null} {...handlers()} />);
    expect(screen.getByText(EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
  });

  it('disables Run now only for the schedule in flight', () => {
    const h = handlers();
    render(
      <SchedulesTable
        schedules={[schedule, { ...schedule, id: 10 }]}
        selectedId={null}
        runningId={9}
        {...h}
      />
    );
    const buttons = screen.getAllByRole('button', { name: 'Run now' });
    expect(buttons[0]).toBeDisabled();
    expect(buttons[1]).toBeEnabled();
  });
});
