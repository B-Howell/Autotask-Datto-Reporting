import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { credentialsApi } from '@/api';
import type { CredentialsStatus } from '@/api';
import useToastStore from '@/store/toastStore';
import useCredentials from './useCredentials';

vi.mock('@/api', () => ({
  credentialsApi: {
    fetchCredentials: vi.fn(),
    testCredentials: vi.fn(),
    saveCredentials: vi.fn(),
  },
}));

const STAMP = '2026-10-09T19:00:00+00:00';
const missing: CredentialsStatus = {
  demoMode: false,
  keySource: 'file',
  fields: [
    {
      name: 'datto_platform',
      vendor: 'datto',
      secret: false,
      configured: false,
      source: 'missing',
      last4: '',
      updated_at: null,
      last_tested_at: null,
      last_test_ok: null,
    },
  ],
};
const stored: CredentialsStatus = {
  ...missing,
  fields: [
    {
      ...missing.fields[0],
      configured: true,
      source: 'stored',
      updated_at: STAMP,
      last_tested_at: STAMP,
      last_test_ok: true,
    },
  ],
};

const mocked = vi.mocked(credentialsApi);

const loaded = async () => {
  mocked.fetchCredentials.mockResolvedValue(missing);
  const hook = renderHook(() => useCredentials());
  await waitFor(() => expect(hook.result.current.loading).toBe(false));
  return hook;
};

afterEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('useCredentials', () => {
  it('loads the status once on mount', async () => {
    const { result } = await loaded();
    expect(result.current.status).toEqual(missing);
    expect(result.current.error).toBeNull();
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(1);
  });

  it('reports a failed load through error and reloads on request', async () => {
    mocked.fetchCredentials.mockRejectedValueOnce(
      new Error('The stored credentials cannot be read')
    );
    const { result } = renderHook(() => useCredentials());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.status).toBeNull();
    expect(result.current.error).toBe('The stored credentials cannot be read');

    mocked.fetchCredentials.mockResolvedValueOnce(missing);
    await act(() => result.current.reload());
    expect(result.current.status).toEqual(missing);
    expect(result.current.error).toBeNull();
  });

  it('tests the given values and hands back both vendors, busy while in flight', async () => {
    const { result } = await loaded();
    const outcome = {
      autotask: { ok: false, message: 'Autotask credentials are incomplete' },
      datto: { ok: true, message: 'Signed in' },
    };
    let answer: (value: typeof outcome) => void = () => undefined;
    mocked.testCredentials.mockImplementationOnce(
      () => new Promise<typeof outcome>((resolve) => (answer = resolve))
    );
    let pending: Promise<typeof outcome> = Promise.resolve(outcome);
    act(() => {
      pending = result.current.test({ datto_platform: 'zinfandel' });
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      answer(outcome);
      await expect(pending).resolves.toEqual(outcome);
    });
    expect(result.current.busy).toBe(false);
    expect(mocked.testCredentials).toHaveBeenCalledWith({ datto_platform: 'zinfandel' });
  });

  it('keeps the status the save returns and toasts', async () => {
    const { result } = await loaded();
    mocked.saveCredentials.mockResolvedValue(stored);
    await act(() => result.current.save({ datto_platform: 'zinfandel' }));
    expect(mocked.saveCredentials).toHaveBeenCalledWith({ datto_platform: 'zinfandel' });
    expect(result.current.status).toEqual(stored);
    expect(useToastStore.getState().message).toBe('Credentials saved');
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(1);
  });

  it('lets a refused save reach the caller with the status untouched', async () => {
    const { result } = await loaded();
    mocked.saveCredentials.mockRejectedValue(new Error('Datto refused the credentials: 401'));
    await act(async () => {
      await expect(result.current.save({ datto_platform: 'x' })).rejects.toThrow(
        'Datto refused the credentials: 401'
      );
    });
    expect(result.current.status).toEqual(missing);
    expect(result.current.busy).toBe(false);
    expect(useToastStore.getState().open).toBe(false);
  });
});
