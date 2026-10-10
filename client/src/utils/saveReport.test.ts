import { afterEach, describe, expect, it, vi } from 'vitest';
import { savedReportsApi } from '@/api';
import useToastStore from '@/store/toastStore';
import { saveReportBlob } from './saveReport';

vi.mock('@/api', () => ({
  savedReportsApi: { uploadSavedReport: vi.fn() },
}));

afterEach(() => {
  vi.clearAllMocks();
  useToastStore.getState().hideToast();
});

describe('saveReportBlob', () => {
  it('titles a report by its file name without the last extension', async () => {
    const upload = vi.mocked(savedReportsApi.uploadSavedReport);
    upload.mockResolvedValue({ id: 1, deduped: false });
    const blob = new Blob(['x']);
    const titleOf = async (filename: string) => {
      await saveReportBlob({ blob, filename });
      return upload.mock.lastCall?.[2]?.title;
    };

    expect(await titleOf('Harbor Point Health Computer Inventory 10-9-26.xlsx')).toBe(
      'Harbor Point Health Computer Inventory 10-9-26'
    );
    expect(await titleOf('report.final.pdf')).toBe('report.final');
    expect(await titleOf('Quarterly Utilization')).toBe('Quarterly Utilization');
  });

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
