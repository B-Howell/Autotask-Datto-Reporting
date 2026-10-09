import { useCallback, useEffect, useState } from 'react';
import { savedReportsApi } from '@/api';
import type { SavedReport } from '@/api';

/** The saved-report list: loaded on mount, refreshable, with optimistic delete. */
const useSavedReports = () => {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setReports(await savedReportsApi.fetchSavedReports());
    } catch (err) {
      console.error('Failed to load saved reports', err);
      setReports([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const remove = async (id: number) => {
    try {
      await savedReportsApi.deleteSavedReport(id);
      setReports((rs) => rs.filter((r) => r.id !== id));
    } catch (err) {
      console.error('Failed to delete report', err);
    }
  };

  return { reports, loading, reload: load, remove };
};

export default useSavedReports;
