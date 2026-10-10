import { useCallback, useEffect, useState } from 'react';
import { credentialsApi } from '@/api';
import type { ConnectionTestResult, CredentialValues, CredentialsStatus } from '@/api';
import useToastStore from '@/store/toastStore';
import { errorMessage } from '@/utils/reportJob';

/**
 * The vendor credential status plus the two actions the Settings cards take on it.
 *
 * Every toast about a save is raised here; `test` and `save` still reject with
 * the server's detail so the card that asked can show it beside its own inputs.
 * A test is followed by a reload, because the server stamps the outcome on the
 * stored rows; a save that goes through replaces the status with the one the
 * server returns, so no second fetch is needed there.
 */
const useCredentials = () => {
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const reload = useCallback(async () => {
    try {
      setStatus(await credentialsApi.fetchCredentials());
      setError(null);
    } catch (err) {
      setError(errorMessage(err) || 'The credential status could not be loaded');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  // One request at a time: every card's buttons disable while either vendor is probed.
  const whileBusy = async <T>(action: () => Promise<T>): Promise<T> => {
    setBusy(true);
    try {
      return await action();
    } finally {
      setBusy(false);
    }
  };

  const test = (values: CredentialValues): Promise<ConnectionTestResult> =>
    whileBusy(async () => {
      const result = await credentialsApi.testCredentials(values);
      await reload();
      return result;
    });

  const save = (values: CredentialValues): Promise<void> =>
    whileBusy(async () => {
      try {
        setStatus(await credentialsApi.saveCredentials(values));
        showToast('Credentials saved');
      } catch (err) {
        showToast(errorMessage(err) || 'The credentials were not saved', 'error');
        throw err;
      }
    });

  return { status, loading, error, reload, test, save, busy };
};

export default useCredentials;
