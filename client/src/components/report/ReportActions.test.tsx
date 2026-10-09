import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import ReportActions from './ReportActions';

describe('ReportActions', () => {
  it('keeps export and save disabled until there are results, and generate clickable', () => {
    const onGenerate = vi.fn();
    const onExport = vi.fn();
    render(
      <ReportActions
        onGenerate={onGenerate}
        exports={[{ label: 'Export Excel', onClick: onExport }]}
        onSave={() => {}}
        hasResults={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Export Excel' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Save to app' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));
    expect(onGenerate).toHaveBeenCalledTimes(1);
    expect(onExport).not.toHaveBeenCalled();
  });

  it('shows Schedule only when a handler is given and there are results', () => {
    const { rerender } = render(
      <ReportActions onGenerate={() => {}} hasResults onSchedule={() => {}} />
    );
    expect(screen.getByRole('button', { name: /schedule/i })).toBeEnabled();
    rerender(<ReportActions onGenerate={() => {}} hasResults={false} onSchedule={() => {}} />);
    expect(screen.getByRole('button', { name: /schedule/i })).toBeDisabled();
    rerender(<ReportActions onGenerate={() => {}} hasResults />);
    expect(screen.queryByRole('button', { name: /schedule/i })).toBeNull();
  });

  it('disables generate and refresh while a report is running', () => {
    render(<ReportActions onGenerate={() => {}} onRefresh={() => {}} loading hasResults />);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeDisabled();
  });
});
