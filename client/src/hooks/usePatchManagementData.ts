import { patchApi } from '@/api';
import type {
  EffectiveAgency,
  PatchDevice,
  PatchReport,
  PatchStatus,
  PatchSummaryItem,
} from '@/api';
import usePatchManagementStore from '@/store/patchManagementStore';
import { membersOf } from '@/utils/agencyGroups';
import useTrackedReport from './useTrackedReport';

// Donut order. Mirrors PATCH_STATUS_LABELS on the server so the summary is
// stable even when a site returns no devices.
export const PATCH_STATUS_ORDER: { status: PatchStatus; label: string }[] = [
  { status: 'FullyPatched', label: 'Fully Patched' },
  { status: 'ApprovedPending', label: 'Approved Pending' },
  { status: 'InstallError', label: 'Install Error' },
  { status: 'RebootRequired', label: 'Reboot Required' },
  { status: 'NoData', label: 'No Data' },
  { status: 'NoPolicy', label: 'No Policy' },
];

// Device-table order: worst first, the reverse of the legend.
const STATUS_SEVERITY: Record<PatchStatus, number> = {
  NoPolicy: 0,
  NoData: 1,
  RebootRequired: 2,
  InstallError: 3,
  ApprovedPending: 4,
  FullyPatched: 5,
};

/** Fold member-site reports into one: summed counts, devices sorted worst first, oldest snapshot. */
export function mergePatchReports(reports: PatchReport[]) {
  const counts = new Map<PatchStatus, number>(PATCH_STATUS_ORDER.map((s) => [s.status, 0]));
  const devices: PatchDevice[] = [];
  let syncedAt: string | null = null;
  for (const report of reports) {
    devices.push(...report.devices);
    for (const s of report.summary) counts.set(s.status, (counts.get(s.status) ?? 0) + s.count);
    // The oldest member snapshot, so "data as of" is not over-optimistic.
    if (report.synced_at && (!syncedAt || report.synced_at < syncedAt)) syncedAt = report.synced_at;
  }
  devices.sort((a, b) => {
    const sa = STATUS_SEVERITY[a.status] ?? 6;
    const sb = STATUS_SEVERITY[b.status] ?? 6;
    return sa !== sb ? sa - sb : a.hostname.localeCompare(b.hostname);
  });
  const summary: PatchSummaryItem[] = PATCH_STATUS_ORDER.map((s) => ({
    status: s.status,
    label: s.label,
    count: counts.get(s.status) ?? 0,
  }));
  return { devices, summary, syncedAt };
}

const usePatchManagementData = () => {
  const summary = usePatchManagementStore((s) => s.summary);
  const devices = usePatchManagementStore((s) => s.devices);
  const deviceCount = usePatchManagementStore((s) => s.deviceCount);
  const loading = usePatchManagementStore((s) => s.loading);
  const selectedSite = usePatchManagementStore((s) => s.selectedSite);
  const logs = usePatchManagementStore((s) => s.logs);
  const companyValue = usePatchManagementStore((s) => s.companyValue);
  const generatedAgency = usePatchManagementStore((s) => s.generatedAgency);
  const syncedAt = usePatchManagementStore((s) => s.syncedAt);

  const {
    setSummary,
    setDevices,
    setDeviceCount,
    setLoading,
    setSelectedSite,
    setLogs,
    setCompanyValue,
    setGeneratedAgency,
    setSyncedAt,
  } = usePatchManagementStore.getState();

  const runReport = useTrackedReport({ setLoading, setLogs });

  const fetchPatchManagement = (agency: EffectiveAgency, refresh = false) => {
    setGeneratedAgency(agency);
    const targets = membersOf(agency);
    setSelectedSite(targets[0]?.site ?? null);

    return runReport({
      label: `Patch Management · ${agency.name}`,
      route: '/reports/patch-management',
      logsUrl: patchApi.PATCH_LOGS_URL,
      run: async (signal) => {
        const reports: PatchReport[] = [];
        for (const target of targets) {
          reports.push(await patchApi.fetchPatchReport(target.site, { refresh, signal }));
        }
        return mergePatchReports(reports);
      },
      onSuccess: ({ devices, summary, syncedAt }) => {
        setDevices(devices);
        setDeviceCount(devices.length);
        setSummary(summary);
        setSyncedAt(syncedAt);
      },
      onFailure: () => {
        setDevices([]);
        setDeviceCount(0);
        setSummary([]);
      },
    });
  };

  return {
    summary,
    devices,
    deviceCount,
    loading,
    selectedSite,
    logs,
    companyValue,
    generatedAgency,
    syncedAt,
    setCompanyValue,
    fetchPatchManagement,
  };
};

export default usePatchManagementData;
