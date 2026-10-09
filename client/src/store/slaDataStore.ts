import type { SlaReport } from '@/api';
import { createReportDataStore } from './reportDataStore';

const useSlaDataStore = createReportDataStore<SlaReport>();

export default useSlaDataStore;
