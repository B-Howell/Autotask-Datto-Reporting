import { useCallback, useEffect, useState } from 'react';
import { credentialsApi } from '@/api';
import type { ConnectionTestResult, CredentialValues, CredentialsStatus } from '@/api';
import useToastStore from '@/store/toastStore';
import { errorMessage } from '@/utils/reportJob';

/**
 * The vendor credential status plus the actions the Settings section takes on it.
 *
 * Every toast about a save or a forget is raised here; `test` and `save` still
 * reject with the server's detail so the card that asked can show it beside its
 * own inputs. A test is followed by a reload, because the server stamps the
 * outcome on the stored rows; a save that goes through replaces the status with
 * the one the server returns, so no second fetch is needed there. A forget
 * reloads too, so a status that could not be read is fetched afresh and its
 * error cleared.
 */
const useCredentials = () => {
  const [status, setStatus] = useState<CredentialsStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [unreadable, setUnreadable] = useState(false);
  const [busy, setBusy] = useState(false);
  const showToast = useToastStore((s) => s.showToast);

  const reload = useCallback(async () => {
    try {
      setStatus(await credentialsApi.fetchCredentials());
      setError(null);
      setUnreadable(false);
    } catch (err) {
      setError(errorMessage(err, 'The credential status could not be loaded'));
      setUnreadable(credentialsApi.isUnreadable(err));
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
        showToast(errorMessage(err, 'The credentials were not saved'), 'error');
        throw err;
      }
    });

  // The one action offered while the status is unreadable: nothing is
  // decrypted on the server, so it answers even after the key is lost.
  const forget = (): Promise<void> =>
    whileBusy(async () => {
      try {
        await credentialsApi.forgetCredentials();
      } catch (err) {
        showToast(errorMessage(err, 'The stored credentials were not forgotten'), 'error');
        return;
      }
      showToast('Stored credentials forgotten');
      await reload();
    });

  return { status, loading, error, unreadable, reload, test, save, forget, busy };
};

export default useCredentials;
