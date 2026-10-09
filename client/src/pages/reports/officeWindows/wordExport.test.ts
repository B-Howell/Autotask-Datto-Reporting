import { describe, expect, it } from 'vitest';
import { PNG_1X1 } from '@/test/fixtures';
import { pngImage } from '@/utils/reportImages';
import { buildOfficeWindowsDocx } from './wordExport';
import type { OfficeWindowsDocxInput } from './wordExport';

// jsdom's Blob has no arrayBuffer(); FileReader is the portable way to read it.
const blobBytes = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

const zipHeader = async (input: OfficeWindowsDocxInput) => {
  const blob = await buildOfficeWindowsDocx(input);
  return Array.from(new Uint8Array((await blobBytes(blob)).slice(0, 2)));
};

const base = {
  agencyName: 'Harbor Point Health',
  officeRows: [],
  osRows: [],
  showLicenses: false,
};

describe('buildOfficeWindowsDocx', () => {
  it('produces a docx (zip) without any images when none are supplied', async () => {
    expect(await zipHeader({ ...base, assets: {} })).toEqual([0x50, 0x4b]);
  });

  it('produces a docx with both icons and the logo embedded', async () => {
    const image = pngImage(PNG_1X1);
    expect(image).not.toBeNull();
    const assets = { officeIcon: image, windowsIcon: image, logo: image };
    expect(await zipHeader({ ...base, assets })).toEqual([0x50, 0x4b]);
  });
});
