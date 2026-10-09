import { savedReportsApi } from '@/api';
import type { SaveReportResponse } from '@/api';
import type { SavedReportMeta } from '@/api/savedReports';
import useToastStore from '@/store/toastStore';
import { errorMessage } from './reportJob';

export interface SaveReportArgs extends SavedReportMeta {
  blob: Blob;
  filename: string;
}

/** Uploads a generated report so it appears under Saved Reports, with a toast either way. */
export async function saveReportBlob({
  blob,
  filename,
  ...meta
}: SaveReportArgs): Promise<SaveReportResponse> {
  const label = meta.title || filename;
  try {
    const data = await savedReportsApi.uploadSavedReport(blob, filename, { ...meta, title: label });
    useToastStore.getState().showToast(`${label} saved to app`, 'success');
    return data;
  } catch (err) {
    useToastStore.getState().showToast(`Save failed: ${errorMessage(err)}`, 'error');
    throw err;
  }
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface DeliverArgs {
  blob: Blob;
  filename: string;
  /** true: save to the app only. false: download and also save. */
  save?: boolean;
  meta?: SavedReportMeta;
}

// Exporting always keeps a copy in the app; the server de-duplicates by
// filename so re-exports do not pile up.
export async function deliverBlob({
  blob,
  filename,
  save = false,
  meta = {},
}: DeliverArgs): Promise<SaveReportResponse | null> {
  if (!save) downloadBlob(blob, filename);
  try {
    return await saveReportBlob({ blob, filename, ...meta });
  } catch {
    return null;
  }
}
