import type { ManualInputs } from '@/api';
import { loadBrowserAssets } from '@/utils/reportImages';
import { deliverBlob } from '@/utils/saveReport';
import { officeWindowsExportInput } from './exportInput';
import type { InstallBreakdowns } from './exportInput';
import { buildOfficeWindowsPdf } from './pdfExport';
import { REPORT_TYPE, reportFilename } from './reportRows';
import { buildOfficeWindowsDocx } from './wordExport';

interface ExportSources {
  /** null until a report has been generated; exports are no-ops without it. */
  agencyName: string | null;
  showLicenses: boolean;
  breakdown: InstallBreakdowns;
  manualInputs: ManualInputs;
}

const meta = (agencyName: string, format: 'docx' | 'pdf') => ({
  agencyName,
  reportType: REPORT_TYPE,
  format,
});

/** Word and PDF exports of the tables on screen; every export also keeps a copy in the app. */
const useOfficeWindowsExports = ({
  agencyName,
  showLicenses,
  breakdown,
  manualInputs,
}: ExportSources) => {
  // Rows and images are gathered here so the builders stay free of fetching.
  const input = async (name: string) => ({
    ...officeWindowsExportInput(breakdown, manualInputs, name, showLicenses),
    assets: await loadBrowserAssets(name),
  });

  const exportToWord = async (save: boolean) => {
    if (!agencyName) return;
    const filename = reportFilename(agencyName, 'docx');
    const blob = await buildOfficeWindowsDocx(await input(agencyName));
    await deliverBlob({ blob, filename, save, meta: meta(agencyName, 'docx') });
  };

  const exportToPdf = async () => {
    if (!agencyName) return;
    const { doc, filename } = await buildOfficeWindowsPdf(await input(agencyName));
    await deliverBlob({
      blob: doc.output('blob'),
      filename,
      meta: meta(agencyName, 'pdf'),
    });
  };

  return { exportToWord, exportToPdf };
};

export default useOfficeWindowsExports;
