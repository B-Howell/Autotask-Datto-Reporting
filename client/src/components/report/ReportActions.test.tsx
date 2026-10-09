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

  it('disables generate and refresh while a report is running', () => {
    render(<ReportActions onGenerate={() => {}} onRefresh={() => {}} loading hasResults />);
    expect(screen.getByRole('button', { name: 'Generate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Refresh data' })).toBeDisabled();
  });
});
