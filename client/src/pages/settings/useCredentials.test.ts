import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, credentialsApi } from '@/api';
import type * as api from '@/api';
import type { CredentialsStatus } from '@/api';
import useToastStore from '@/store/toastStore';
import useCredentials from './useCredentials';

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
    expect(result.current.unreadable).toBe(false);

    mocked.fetchCredentials.mockResolvedValueOnce(missing);
    await act(() => result.current.reload());
    expect(result.current.status).toEqual(missing);
    expect(result.current.error).toBeNull();
  });

  it('flags the 503 for unreadable stored values until a load succeeds', async () => {
    mocked.fetchCredentials.mockRejectedValueOnce(
      new ApiError(503, 'Stored credentials cannot be read; check APP_SECRET_KEY or the key file')
    );
    const { result } = renderHook(() => useCredentials());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadable).toBe(true);
    expect(result.current.error).toBe(
      'Stored credentials cannot be read; check APP_SECRET_KEY or the key file'
    );

    mocked.fetchCredentials.mockRejectedValueOnce(new ApiError(500, 'Request failed (500)'));
    await act(() => result.current.reload());
    expect(result.current.unreadable).toBe(false);
    expect(result.current.error).toBe('Request failed (500)');

    mocked.fetchCredentials.mockResolvedValueOnce(missing);
    await act(() => result.current.reload());
    expect(result.current.unreadable).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('tests the given values, busy until the status is reloaded, and hands back both vendors', async () => {
    const { result } = await loaded();
    const outcome = {
      autotask: { ok: false, message: 'Autotask credentials are incomplete' },
      datto: { ok: true, message: 'Signed in' },
    };
    let answer: (value: typeof outcome) => void = () => undefined;
    mocked.testCredentials.mockImplementationOnce(
      () => new Promise<typeof outcome>((resolve) => (answer = resolve))
    );
    // The server stamps the outcome on the stored rows, so the reload sees it.
    mocked.fetchCredentials.mockResolvedValueOnce(stored);
    let pending: Promise<typeof outcome> = Promise.resolve(outcome);
    act(() => {
      pending = result.current.test({ datto_platform: 'zinfandel' });
    });
    expect(result.current.busy).toBe(true);
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(1);
    await act(async () => {
      answer(outcome);
      await expect(pending).resolves.toEqual(outcome);
    });
    expect(result.current.busy).toBe(false);
    expect(mocked.testCredentials).toHaveBeenCalledWith({ datto_platform: 'zinfandel' });
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(2);
    expect(result.current.status).toEqual(stored);
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

  it('toasts a refused save as an error and lets it reach the caller, status untouched', async () => {
    const { result } = await loaded();
    mocked.saveCredentials.mockRejectedValue(new Error('Datto refused the credentials: 401'));
    await act(async () => {
      await expect(result.current.save({ datto_platform: 'x' })).rejects.toThrow(
        'Datto refused the credentials: 401'
      );
    });
    expect(result.current.status).toEqual(missing);
    expect(result.current.busy).toBe(false);
    expect(useToastStore.getState().severity).toBe('error');
    expect(useToastStore.getState().message).toBe('Datto refused the credentials: 401');
  });

  it('forgets the stored values, busy until the status is reloaded, and toasts', async () => {
    const { result } = await loaded();
    let answer: (value: typeof forgotten) => void = () => undefined;
    const forgotten = { ...missing, forgotten: true as const };
    mocked.forgetCredentials.mockImplementationOnce(
      () => new Promise<typeof forgotten>((resolve) => (answer = resolve))
    );
    mocked.fetchCredentials.mockResolvedValueOnce(missing);
    let pending: Promise<void> = Promise.resolve();
    act(() => {
      pending = result.current.forget();
    });
    expect(result.current.busy).toBe(true);
    await act(async () => {
      answer(forgotten);
      await pending;
    });
    expect(result.current.busy).toBe(false);
    expect(mocked.forgetCredentials).toHaveBeenCalledTimes(1);
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(2);
    expect(useToastStore.getState().message).toBe('Stored credentials forgotten');
  });

  it('clears an unreadable load once the stored values are forgotten', async () => {
    mocked.fetchCredentials.mockRejectedValueOnce(
      new ApiError(503, 'Stored credentials cannot be read')
    );
    const { result } = renderHook(() => useCredentials());
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.unreadable).toBe(true);
    mocked.forgetCredentials.mockResolvedValue({ ...missing, forgotten: true });
    mocked.fetchCredentials.mockResolvedValueOnce(missing);
    await act(() => result.current.forget());
    expect(result.current.error).toBeNull();
    expect(result.current.unreadable).toBe(false);
    expect(result.current.status).toEqual(missing);
  });

  it('toasts a refused forget as an error without reloading', async () => {
    const { result } = await loaded();
    mocked.forgetCredentials.mockRejectedValue(new Error('Demo mode simulates the vendor clients'));
    await act(() => result.current.forget());
    expect(result.current.busy).toBe(false);
    expect(mocked.fetchCredentials).toHaveBeenCalledTimes(1);
    expect(useToastStore.getState().severity).toBe('error');
    expect(useToastStore.getState().message).toBe('Demo mode simulates the vendor clients');
  });
});
