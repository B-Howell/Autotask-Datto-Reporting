import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import type { EffectiveAgency } from '@/api';
import AgencySelect, { ALL_AGENCIES } from './AgencySelect';

const agencies: EffectiveAgency[] = [
  { id: 1000, site: 'site-a', name: 'Harbor Point Health' },
  { name: 'Example Schools', members: [{ id: 1, site: 's1', name: 'Example Schools - North' }] },
];

describe('AgencySelect', () => {
  it('lists every agency, a group by its group key, and the optional All entry', () => {
    const onChange = vi.fn();
    render(<AgencySelect agencies={agencies} value="" onChange={onChange} includeAll />);

    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Select Agency' }));
    const listbox = within(screen.getByRole('listbox'));
    expect(listbox.getByRole('option', { name: 'All Agencies' })).toBeInTheDocument();
    expect(listbox.getByRole('option', { name: 'Example Schools' })).toBeInTheDocument();

    fireEvent.click(listbox.getByRole('option', { name: 'Harbor Point Health' }));
    expect(onChange).toHaveBeenCalledWith(1000);
  });

  it('reports the All entry with its sentinel value', () => {
    const onChange = vi.fn();
    render(<AgencySelect agencies={agencies} value="" onChange={onChange} includeAll />);
    fireEvent.mouseDown(screen.getByRole('combobox', { name: 'Select Agency' }));
    fireEvent.click(screen.getByRole('option', { name: 'All Agencies' }));
    expect(onChange).toHaveBeenCalledWith(ALL_AGENCIES);
  });
});
