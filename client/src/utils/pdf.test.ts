import { describe, expect, it } from 'vitest';
import { PNG_1X1 } from '@/test/fixtures';
import { drawReportHeader, loadPdfLibraries } from './pdf';
import { pngImage } from './reportImages';

const TITLE = 'Harbor Point Health Office and Windows Installs';

describe('drawReportHeader', () => {
  it('starts the content lower when a logo is drawn', async () => {
    const { JsPDF } = await loadPdfLibraries();
    const logo = pngImage(PNG_1X1);
    expect(logo).not.toBeNull();

    const withoutLogo = drawReportHeader(new JsPDF({ unit: 'pt', format: 'letter' }), TITLE, null);
    const withLogo = drawReportHeader(new JsPDF({ unit: 'pt', format: 'letter' }), TITLE, logo);

    expect(withLogo).toBeGreaterThan(withoutLogo);
    // A 1 pt tall logo plus the 14 pt gap under it.
    expect(withLogo - withoutLogo).toBe(15);
  });
});
