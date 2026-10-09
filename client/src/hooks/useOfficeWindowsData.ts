import { officeWindowsApi } from '@/api';
import type { EffectiveAgency, InstallBreakdownItem } from '@/api';
import useOfficeWindowsStore from '@/store/officeWindowsStore';
import { membersOf } from '@/utils/agencyGroups';
import useTrackedReport from './useTrackedReport';

// A grouped agency merges each member's counts; the per-product device lists
// are unioned so the drill-down stays accurate.
function mergeBreakdowns(
  existing: InstallBreakdownItem[],
  incoming: InstallBreakdownItem[]
): InstallBreakdownItem[] {
  const map = new Map(existing.map((e) => [e.name, { ...e, devices: [...e.devices] }]));
  for (const item of incoming) {
    const slot = map.get(item.name) ?? { name: item.name, installs: 0, devices: [] };
    slot.installs += item.installs;
    slot.devices = [...new Set([...slot.devices, ...item.devices])];
    map.set(item.name, slot);
  }
  return [...map.values()];
}

const useOfficeWindowsData = () => {
  const osBreakdown = useOfficeWindowsStore((s) => s.osBreakdown);
  const officeBreakdown = useOfficeWindowsStore((s) => s.officeBreakdown);
  const loading = useOfficeWindowsStore((s) => s.loading);
  const selectedSite = useOfficeWindowsStore((s) => s.selectedSite);
  const logs = useOfficeWindowsStore((s) => s.logs);

  const { setOsBreakdown, setOfficeBreakdown, setLoading, setSelectedSite, setLogs } =
    useOfficeWindowsStore.getState();

  const runReport = useTrackedReport({ setLoading, setLogs });

  const fetchOfficeWindowsBreakdown = (agency: EffectiveAgency) => {
    const targets = membersOf(agency);
    const first = targets[0];
    if (!first) return Promise.resolve();
    setSelectedSite(first.site);

    // One job for the whole agency: a group is a single report to whoever is waiting.
    return runReport({
      label: `Office / Windows · ${agency.name}`,
      route: '/reports/office-windows',
      logsUrl: officeWindowsApi.officeWindowsLogsUrl(first.id, first.site),
      run: async (signal) => {
        let windows: InstallBreakdownItem[] = [];
        let office: InstallBreakdownItem[] = [];
        for (const target of targets) {
          const data = await officeWindowsApi.fetchOfficeWindowsBreakdown(target.id, target.site, {
            signal,
          });
          windows = mergeBreakdowns(windows, data.windows_installs);
          office = mergeBreakdowns(office, data.office_installs);
        }
        return { windows, office };
      },
      onSuccess: ({ windows, office }) => {
        setOsBreakdown(windows);
        setOfficeBreakdown(office);
      },
      onFailure: () => {
        setOsBreakdown([]);
        setOfficeBreakdown([]);
      },
    });
  };

  return {
    osBreakdown,
    officeBreakdown,
    loading,
    selectedSite,
    logs,
    fetchOfficeWindowsBreakdown,
  };
};

export default useOfficeWindowsData;
