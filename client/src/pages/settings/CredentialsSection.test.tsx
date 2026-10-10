import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { ApiError, credentialsApi } from '@/api';
import type * as api from '@/api';
import type {
  ConnectionTestResult,
  CredentialFieldName,
  CredentialFieldStatus,
  CredentialsStatus,
} from '@/api';
import useToastStore from '@/store/toastStore';
import CredentialsSection from './CredentialsSection';

// The request functions are mocked; `ApiError` and `isUnreadable` stay real.
vi.mock('@/api', async (importOriginal) => {
  const actual = await importOriginal<typeof api>();
  return {
    ...actual,
    credentialsApi: {
      ...actual.credentialsApi,
      fetchCredentials: vi.fn(),
      testCredentials: vi.fn(),
      saveCredentials: vi.fn(),
      forgetCredentials: vi.fn(),
    },
  };
});

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

const withDattoTested = (last_test_ok: boolean): CredentialsStatus => ({
  ...status,
  fields: status.fields.map((f) =>
    f.name === 'datto_platform' ? stored('datto_platform', '', { last_test_ok }) : f
  ),
});

const bothTested: ConnectionTestResult = {
  autotask: { ok: true, message: 'Signed in as ops' },
  datto: { ok: false, message: 'Datto credentials are incomplete' },
};

const mocked = vi.mocked(credentialsApi);

const renderLoaded = async (overrides: Partial<CredentialsStatus> = {}) => {
  mocked.fetchCredentials.mockResolvedValue({ ...status, ...overrides });
  render(<CredentialsSection />);
  await screen.findByRole('region', { name: 'Autotask' });
};

const cardElement = (title: string) => screen.getByRole('region', { name: title });
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
    expect(screen.getByRole('region', { name: 'Vendor credentials' })).toBeInTheDocument();
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
    mocked.saveCredentials.mockResolvedValue(withDattoTested(true));
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
    expect(datto.queryByRole('status')).toBeNull();
  });

  it('shows both vendor results as a status after a test and refreshes the last-test row', async () => {
    await renderLoaded();
    mocked.testCredentials.mockResolvedValue(bothTested);
    mocked.fetchCredentials.mockResolvedValueOnce(withDattoTested(false));
    const autotask = card('Autotask');
    fireEvent.change(autotask.getByLabelText('Zone API URL'), {
      target: { value: 'https://example.invalid' },
    });
    fireEvent.click(autotask.getByRole('button', { name: 'Test connection' }));

    const chips = within(await autotask.findByRole('status'));
    expect(chips.getByText('Autotask: Signed in as ops')).toBeInTheDocument();
    expect(chips.getByText('Datto: Datto credentials are incomplete')).toBeInTheDocument();
    expect(mocked.testCredentials).toHaveBeenCalledWith({
      autotask_base_url: 'https://example.invalid',
    });
    expect(autotask.getByLabelText('Zone API URL')).toHaveValue('https://example.invalid');
    expect(
      card('Datto').getByText(`Last test failed, ${new Date(TESTED).toLocaleString()}`)
    ).toBeInTheDocument();
  });

  it('marks the pressed button busy, disables every button and leaves inputs editable', async () => {
    await renderLoaded();
    let answer: (result: ConnectionTestResult) => void = () => undefined;
    mocked.testCredentials.mockImplementationOnce(
      () => new Promise<ConnectionTestResult>((resolve) => (answer = resolve))
    );
    const autotask = card('Autotask');
    const datto = card('Datto');
    fireEvent.click(autotask.getByRole('button', { name: 'Test connection' }));

    const testing = await autotask.findByRole('button', { name: 'Testing…' });
    expect(testing).toBeDisabled();
    expect(within(testing).getByRole('progressbar')).toBeInTheDocument();
    expect(autotask.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(datto.getByRole('button', { name: 'Test connection' })).toBeDisabled();
    expect(datto.getByRole('button', { name: 'Save' })).toBeDisabled();
    expect(autotask.getByLabelText('Zone API URL')).toBeEnabled();
    expect(datto.getByLabelText('Platform')).toBeEnabled();

    answer(bothTested);
    expect(await autotask.findByRole('button', { name: 'Test connection' })).toBeEnabled();
    expect(datto.getByRole('button', { name: 'Test connection' })).toBeEnabled();
  });

  it('shows a refused save as a status chip, keeping the input, with the toast from the hook', async () => {
    await renderLoaded();
    mocked.saveCredentials.mockRejectedValue(
      new Error('Autotask refused the credentials: 401 Unauthorized')
    );
    const autotask = card('Autotask');
    fireEvent.change(autotask.getByLabelText('Secret'), { target: { value: 'hunter2' } });
    fireEvent.click(autotask.getByRole('button', { name: 'Save' }));

    const chips = within(await autotask.findByRole('status'));
    expect(
      chips.getByText('Autotask refused the credentials: 401 Unauthorized')
    ).toBeInTheDocument();
    expect(useToastStore.getState().severity).toBe('error');
    expect(useToastStore.getState().message).toBe(
      'Autotask refused the credentials: 401 Unauthorized'
    );
    expect(autotask.getByLabelText('Secret')).toHaveValue('hunter2');
    expect(autotask.getByRole('button', { name: 'Save' })).toBeEnabled();
  });

  it('shows the detail of a status that cannot be read and retries on request', async () => {
    mocked.fetchCredentials.mockRejectedValueOnce(
      new Error('The stored credentials cannot be decrypted with the current key')
    );
    render(<CredentialsSection />);
    expect(
      await screen.findByText(
        'Error: The stored credentials cannot be decrypted with the current key'
      )
    ).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Autotask' })).toBeNull();

    mocked.fetchCredentials.mockResolvedValueOnce(status);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(await screen.findByRole('region', { name: 'Autotask' })).toBeInTheDocument();
    expect(screen.queryByText(/cannot be decrypted/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });

  it('offers to forget the stored values when the status cannot be read, then reloads', async () => {
    mocked.fetchCredentials.mockRejectedValueOnce(
      new ApiError(503, 'Stored credentials cannot be read; check APP_SECRET_KEY or the key file')
    );
    render(<CredentialsSection />);
    await screen.findByRole('button', { name: 'Retry' });
    fireEvent.click(screen.getByRole('button', { name: 'Forget stored credentials' }));

    const dialog = within(
      await screen.findByRole('dialog', { name: 'Forget stored credentials?' })
    );
    expect(
      dialog.getByText(
        'This removes every stored Autotask and Datto value. Values set by the environment are unaffected. Continue?'
      )
    ).toBeInTheDocument();
    expect(mocked.forgetCredentials).not.toHaveBeenCalled();

    const nothingStored: CredentialsStatus = {
      ...status,
      fields: status.fields.map((f) => field(f.name)),
    };
    mocked.forgetCredentials.mockResolvedValue({ ...nothingStored, forgotten: true });
    mocked.fetchCredentials.mockResolvedValueOnce(nothingStored);
    fireEvent.click(dialog.getByRole('button', { name: 'Forget' }));

    expect(await screen.findByRole('region', { name: 'Autotask' })).toBeInTheDocument();
    expect(mocked.forgetCredentials).toHaveBeenCalledTimes(1);
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(2);
    expect(useToastStore.getState().message).toBe('Stored credentials forgotten');
    expect(screen.queryByText(/cannot be read/)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Forget stored credentials' })).toBeNull();
  });

  it('offers only Retry for a load error that is not the unreadable 503', async () => {
    mocked.fetchCredentials.mockRejectedValueOnce(new ApiError(500, 'Request failed (500)'));
    render(<CredentialsSection />);
    await screen.findByRole('button', { name: 'Retry' });
    expect(screen.getByText('Error: Request failed (500)')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Forget stored credentials' })).toBeNull();
  });

  it('shows one forget button, beside Retry, when a reload after a test is the 503', async () => {
    await renderLoaded();
    mocked.testCredentials.mockResolvedValue(bothTested);
    mocked.fetchCredentials.mockRejectedValueOnce(
      new ApiError(503, 'Stored credentials cannot be read; check APP_SECRET_KEY or the key file')
    );
    fireEvent.click(card('Autotask').getByRole('button', { name: 'Test connection' }));

    const retry = await screen.findByRole('button', { name: 'Retry' });
    const forget = screen.getAllByRole('button', { name: 'Forget stored credentials' });
    expect(forget).toHaveLength(1);
    expect(retry.compareDocumentPosition(forget[0])).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    expect(forget[0].compareDocumentPosition(cardElement('Autotask'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('offers to forget the stored values below the cards only while something is stored', async () => {
    await renderLoaded();
    const forget = screen.getByRole('button', { name: 'Forget stored credentials' });
    expect(forget).toBeEnabled();
    expect(forget.compareDocumentPosition(cardElement('Datto'))).toBe(
      Node.DOCUMENT_POSITION_PRECEDING
    );
    fireEvent.click(forget);
    const dialog = within(
      await screen.findByRole('dialog', { name: 'Forget stored credentials?' })
    );
    fireEvent.click(dialog.getByRole('button', { name: 'Cancel' }));
    expect(mocked.forgetCredentials).not.toHaveBeenCalled();
  });

  it('hides the forget button when every field is missing or set by the environment', async () => {
    await renderLoaded({
      fields: status.fields.map((f) => (f.name === 'autotask_username' ? f : field(f.name))),
    });
    expect(screen.queryByRole('button', { name: 'Forget stored credentials' })).toBeNull();
  });
});
