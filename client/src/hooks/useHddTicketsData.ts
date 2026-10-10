import { hddTicketsApi } from '@/api';
import type { AgencyValue } from '@/api';
import useHddTicketsStore from '@/store/hddTicketsStore';
import useTrackedReport from './useTrackedReport';

const useHddTicketsData = () => {
  const devices = useHddTicketsStore((s) => s.devices);
  const deviceCount = useHddTicketsStore((s) => s.deviceCount);
  const loading = useHddTicketsStore((s) => s.loading);
  const logs = useHddTicketsStore((s) => s.logs);
  const companyValue = useHddTicketsStore((s) => s.companyValue);
  const generatedValue = useHddTicketsStore((s) => s.generatedValue);
  const generatedLabel = useHddTicketsStore((s) => s.generatedLabel);

  const { setDevices, setDeviceCount, setLoading, setLogs, setCompanyValue, setGenerated } =
    useHddTicketsStore.getState();
  const runReport = useTrackedReport({ setLoading, setLogs });

  /**
   * `value` is the dropdown value the run is for, kept so the page can describe
   * the results later; an empty `companyIds` means every configured agency.
   */
  const fetchHddTickets = (value: AgencyValue, companyIds: number[], label: string) => {
    setGenerated(value, label);
    return runReport({
      label: 'HDD Storage Tickets',
      route: '/reports/hdd-tickets',
      logsUrl: hddTicketsApi.HDD_LOGS_URL,
      run: (signal) => hddTicketsApi.fetchHddTickets(companyIds, { signal }),
      onSuccess: (data) => {
        setDevices(data.devices);
        setDeviceCount(data.device_count);
      },
      onFailure: () => {
        setDevices([]);
        setDeviceCount(0);
      },
    });
  };

  return {
    devices,
    deviceCount,
    loading,
    logs,
    companyValue,
    generatedValue,
    generatedLabel,
    setCompanyValue,
    fetchHddTickets,
  };
};

export default useHddTicketsData;
