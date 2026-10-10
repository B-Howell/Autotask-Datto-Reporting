import { useCallback } from 'react';
import { utilizationApi } from '@/api';
import { deliverBlob } from '@/utils/saveReport';
import { annualWorkbookFilename, buildAnnualWorkbook } from './excelExport';
import type useAnnualReport from './useAnnualReport';

type AnnualReport = Pick<
  ReturnType<typeof useAnnualReport>,
  'utilData' | 'workbookInput' | 'entriesFor'
>;

/**
 * The annual page's "Export to Excel" and "Save to app" action. The raw sheet
 * is part of the report; a null `entriesFor` means its load failed inside the
 * job, so the entries are fetched once more here. A period with no entries has
 * a key and is not refetched.
 */
const useAnnualExport = ({ utilData, workbookInput, entriesFor }: AnnualReport) =>
  useCallback(
    async (save: boolean) => {
      if (!utilData || !workbookInput) return;
      const raw =
        entriesFor === null
          ? (await utilizationApi.fetchUtilizationEntries(utilData.start, utilData.end)).entries ||
            []
          : workbookInput.entries;
      const filename = annualWorkbookFilename(utilData);
      const blob = await buildAnnualWorkbook({ ...workbookInput, entries: raw });
      await deliverBlob({
        blob,
        filename,
        save,
        meta: {
          agencyName: 'All Agencies',
          reportType: 'annual_utilization',
          format: 'xlsx',
        },
      });
    },
    [utilData, workbookInput, entriesFor]
  );

export default useAnnualExport;
