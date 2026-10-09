import type { UtilizationReport } from '@/api';
import { createReportDataStore } from './reportDataStore';

const useAgencyUtilizationStore = createReportDataStore<UtilizationReport>();

export default useAgencyUtilizationStore;
