import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { credentialsApi } from '@/api';
import type { CredentialFieldName, CredentialFieldStatus, CredentialsStatus } from '@/api';
import useToastStore from '@/store/toastStore';
import CredentialsSection from './CredentialsSection';

vi.mock('@/api', () => ({
  credentialsApi: {
    fetchCredentials: vi.fn(),
    testCredentials: vi.fn(),
    saveCredentials: vi.fn(),
  },
}));

const SAVED = '2026-10-09T19:00:00+00:00';
const TESTED = '2026-10-10T08:30:00+00:00';

const field = (
  name: CredentialFieldName,
  overrides: Partial<CredentialFieldStatus> = {}
): CredentialFieldStatus => ({
  name,
  vendor: name.startsWith('autotask') ? 'autotask' : 'datto',
  secret: !['autotask_username', 'autotask_base_url', 'datto_platform'].includes(name),
  configured: false,
  source: 'missing',
  last4: '',
  updated_at: null,
  last_tested_at: null,
  last_test_ok: null,
  ...overrides,
});

const stored = (
  name: CredentialFieldName,
  last4: string,
  overrides: Partial<CredentialFieldStatus> = {}
) =>
  field(name, {
    configured: true,
    source: 'stored',
    last4,
    updated_at: SAVED,
    last_tested_at: TESTED,
    last_test_ok: false,
    ...overrides,
  });

const status: CredentialsStatus = {
  demoMode: false,
  keySource: 'environment',
  fields: [
    field('autotask_username', { configured: true, source: 'environment' }),
    stored('autotask_secret', '1234'),
    stored('autotask_integration_code', ''),
    field('autotask_base_url'),
    field('datto_api_key'),
    field('datto_api_secret'),
    field('datto_platform'),
  ],
};

const mocked = vi.mocked(credentialsApi);

const renderLoaded = async (overrides: Partial<CredentialsStatus> = {}) => {
  mocked.fetchCredentials.mockResolvedValue({ ...status, ...overrides });
  render(<CredentialsSection />);
  await screen.findByText('Autotask');
};

const cardElement = (title: string) => screen.getByText(title).closest('section') as HTMLElement;
const card = (title: string) => within(cardElement(title));
const inputNames = (title: string) =>
  Array.from(cardElement(title).querySelectorAll('input')).map((input) => input.name);

afterEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('CredentialsSection', () => {
  it('lists each vendor card with labelled fields, helper texts and the key source', async () => {
    await renderLoaded();
    expect(screen.getByText('Master key: from APP_SECRET_KEY')).toBeInTheDocument();

    const autotask = card('Autotask');
    expect(inputNames('Autotask')).toEqual([
      'autotask_username',
      'autotask_secret',
      'autotask_integration_code',
      'autotask_base_url',
    ]);
    expect(inputNames('Datto')).toEqual(['datto_api_key', 'datto_api_secret', 'datto_platform']);
    expect(autotask.getByLabelText('Username')).toBeDisabled();
    expect(autotask.getByText('Set by the environment, read-only')).toBeInTheDocument();
    expect(autotask.getByLabelText('Secret')).toHaveAttribute('type', 'password');
    expect(
      autotask.getByText(`Stored, ends with 1234, saved ${new Date(SAVED).toLocaleString()}`)
    ).toBeInTheDocument();
    expect(autotask.getByLabelText('Integration code')).toHaveAttribute('type', 'password');
    expect(
      autotask.getByText(`Stored, saved ${new Date(SAVED).toLocaleString()}`)
    ).toBeInTheDocument();
    expect(autotask.getByLabelText('Zone API URL')).toHaveAttribute('type', 'text');
    expect(autotask.getByText('Not configured')).toBeInTheDocument();
    expect(
      autotask.getByText(`Last test failed, ${new Date(TESTED).toLocaleString()}`)
    ).toBeInTheDocument();

    const datto = card('Datto');
    expect(datto.getByLabelText('API key')).toHaveAttribute('type', 'password');
    expect(datto.getByLabelText('API secret')).toHaveAttribute('type', 'password');
    expect(datto.getByLabelText('Platform')).toHaveAttribute('type', 'text');
    expect(datto.getAllByText('Not configured')).toHaveLength(3);
    expect(datto.queryByText(/Last test/)).toBeNull();
    expect(screen.getAllByText('Leave a field blank to keep its stored value')).toHaveLength(2);
  });

  it('names the key file as the other source', async () => {
    await renderLoaded({ keySource: 'file' });
    expect(screen.getByText('Master key: from the data directory key file')).toBeInTheDocument();
  });

  it('disables both cards in demo mode with the caption', async () => {
    await renderLoaded({ demoMode: true });
    expect(
      screen.getByText('Demo mode simulates the vendor clients; credentials are not used.')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Platform')).toBeDisabled();
    for (const button of screen.getAllByRole('button')) expect(button).toBeDisabled();
  });

  it('saves only the typed values of the card, then clears them', async () => {
    await renderLoaded();
    const datto = card('Datto');
    const save = datto.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();

    fireEvent.change(datto.getByLabelText('Platform'), { target: { value: ' zinfandel ' } });
    expect(save).toBeEnabled();
    mocked.saveCredentials.mockResolvedValue({
      ...status,
      fields: status.fields.map((f) =>
        f.name === 'datto_platform' ? stored('datto_platform', '', { last_test_ok: true }) : f
      ),
    });
    fireEvent.click(save);

    await waitFor(() =>
      expect(mocked.saveCredentials).toHaveBeenCalledWith({ datto_platform: 'zinfandel' })
    );
    await waitFor(() => expect(datto.getByLabelText('Platform')).toHaveValue(''));
    expect(useToastStore.getState().message).toBe('Credentials saved');
    expect(
      datto.getByText(`Last test passed, ${new Date(TESTED).toLocaleString()}`)
    ).toBeInTheDocument();
    expect(datto.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('shows both vendor results after a connection test', async () => {
    await renderLoaded();
    mocked.testCredentials.mockResolvedValue({
      autotask: { ok: true, message: 'Signed in as ops' },
      datto: { ok: false, message: 'Datto credentials are incomplete' },
    });
    const autotask = card('Autotask');
    fireEvent.change(autotask.getByLabelText('Zone API URL'), {
      target: { value: 'https://example.invalid' },
    });
    fireEvent.click(autotask.getByRole('button', { name: 'Test connection' }));

    expect(await autotask.findByText('Autotask: Signed in as ops')).toBeInTheDocument();
    expect(autotask.getByText('Datto: Datto credentials are incomplete')).toBeInTheDocument();
    expect(mocked.testCredentials).toHaveBeenCalledWith({
      autotask_base_url: 'https://example.invalid',
    });
    expect(autotask.getByLabelText('Zone API URL')).toHaveValue('https://example.invalid');
  });

  it('shows a refused save in the card and toasts it, keeping the input', async () => {
    await renderLoaded();
    mocked.saveCredentials.mockRejectedValue(
      new Error('Autotask refused the credentials: 401 Unauthorized')
    );
    const autotask = card('Autotask');
    fireEvent.change(autotask.getByLabelText('Secret'), { target: { value: 'hunter2' } });
    fireEvent.click(autotask.getByRole('button', { name: 'Save' }));

    expect(
      await autotask.findByText('Autotask refused the credentials: 401 Unauthorized')
    ).toBeInTheDocument();
    expect(useToastStore.getState().severity).toBe('error');
    expect(useToastStore.getState().message).toBe(
      'Autotask refused the credentials: 401 Unauthorized'
    );
    expect(autotask.getByLabelText('Secret')).toHaveValue('hunter2');
  });

  it('shows the detail of a status that cannot be read', async () => {
    mocked.fetchCredentials.mockRejectedValue(
      new Error('The stored credentials cannot be decrypted with the current key')
    );
    render(<CredentialsSection />);
    expect(
      await screen.findByText(
        'Error: The stored credentials cannot be decrypted with the current key'
      )
    ).toBeInTheDocument();
    expect(screen.queryByText('Autotask')).toBeNull();
  });
});
