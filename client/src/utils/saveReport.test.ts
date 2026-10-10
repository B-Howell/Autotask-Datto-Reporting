import { afterEach, describe, expect, it, vi } from 'vitest';
import { savedReportsApi } from '@/api';
import useToastStore from '@/store/toastStore';
import { fileStem, saveReportBlob } from './saveReport';

vi.mock('@/api', () => ({
  savedReportsApi: { uploadSavedReport: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('fileStem', () => {
  it('drops the extension and keeps the rest of the name', () => {
    expect(fileStem('Harbor Point Health Computer Inventory 10-9-26.xlsx')).toBe(
      'Harbor Point Health Computer Inventory 10-9-26'
    );
    expect(fileStem('report.final.pdf')).toBe('report.final');
  });

  it('leaves a name without an extension alone', () => {
    expect(fileStem('Quarterly Utilization')).toBe('Quarterly Utilization');
  });
});

describe('saveReportBlob', () => {
  it('titles the upload and the toast with the file stem unless a title is given', async () => {
    const upload = vi.mocked(savedReportsApi.uploadSavedReport);
    upload.mockResolvedValue({ id: 1, deduped: false });
    const blob = new Blob(['x']);

    await saveReportBlob({ blob, filename: 'Patch Summary 10-9-26.pdf', format: 'pdf' });
    expect(upload).toHaveBeenLastCalledWith(blob, 'Patch Summary 10-9-26.pdf', {
      format: 'pdf',
      title: 'Patch Summary 10-9-26',
    });
    expect(useToastStore.getState().message).toBe('Patch Summary 10-9-26 saved to app');

    await saveReportBlob({ blob, filename: 'Patch Summary 10-9-26.pdf', title: 'Patch report' });
    expect(upload).toHaveBeenLastCalledWith(blob, 'Patch Summary 10-9-26.pdf', {
      title: 'Patch report',
    });
  });
});
