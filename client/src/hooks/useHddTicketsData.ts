import { hddTicketsApi } from '@/api';
import useHddTicketsStore from '@/store/hddTicketsStore';
import useTrackedReport from './useTrackedReport';

const useHddTicketsData = () => {
  const devices = useHddTicketsStore((s) => s.devices);
  const deviceCount = useHddTicketsStore((s) => s.deviceCount);
  const loading = useHddTicketsStore((s) => s.loading);
  const logs = useHddTicketsStore((s) => s.logs);
  const companyValue = useHddTicketsStore((s) => s.companyValue);
  const generatedLabel = useHddTicketsStore((s) => s.generatedLabel);

  const { setDevices, setDeviceCount, setLoading, setLogs, setCompanyValue, setGeneratedLabel } =
    useHddTicketsStore.getState();
  const runReport = useTrackedReport({ setLoading, setLogs });

  /** An empty `companyIds` means every configured agency. */
  const fetchHddTickets = (companyIds: number[], label: string) => {
    setGeneratedLabel(label);
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
    generatedLabel,
    setCompanyValue,
    fetchHddTickets,
  };
};

export default useHddTicketsData;
