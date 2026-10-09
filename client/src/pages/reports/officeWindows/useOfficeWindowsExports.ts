import { deliverBlob } from '@/utils/saveReport';
import { buildOfficeWindowsPdf } from './pdfExport';
import { REPORT_TYPE, buildReportRows, reportFilename } from './reportRows';
import type { ReportRowSources } from './reportRows';
import { buildOfficeWindowsDocx } from './wordExport';

interface ExportSources extends ReportRowSources {
  /** null until a report has been generated; exports are no-ops without it. */
  agencyName: string | null;
  showLicenses: boolean;
}

const meta = (agencyName: string, filename: string, format: 'docx' | 'pdf') => ({
  agencyName,
  reportType: REPORT_TYPE,
  format,
  title: filename.replace(new RegExp(`\\.${format}$`), ''),
});

/** Word and PDF exports of the tables on screen; every export also keeps a copy in the app. */
const useOfficeWindowsExports = ({ agencyName, showLicenses, ...rows }: ExportSources) => {
  const input = (name: string) => ({ agencyName: name, showLicenses, ...buildReportRows(rows) });

  const exportToWord = async (save: boolean) => {
    if (!agencyName) return;
    const filename = reportFilename(agencyName, 'docx');
    const blob = await buildOfficeWindowsDocx(input(agencyName));
    await deliverBlob({ blob, filename, save, meta: meta(agencyName, filename, 'docx') });
  };

  const exportToPdf = async () => {
    if (!agencyName) return;
    const { doc, filename } = await buildOfficeWindowsPdf(input(agencyName));
    await deliverBlob({
      blob: doc.output('blob'),
      filename,
      meta: meta(agencyName, filename, 'pdf'),
    });
  };

  return { exportToWord, exportToPdf };
};

export default useOfficeWindowsExports;
