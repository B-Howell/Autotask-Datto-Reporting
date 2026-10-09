import { describe, expect, it } from 'vitest';
import { buildOfficeWindowsDocx } from './wordExport';

// jsdom's Blob has no arrayBuffer(); FileReader is the portable way to read it.
const blobBytes = (blob: Blob) =>
  new Promise<ArrayBuffer>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as ArrayBuffer);
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(blob);
  });

describe('buildOfficeWindowsDocx', () => {
  it('produces a docx (zip) without any images when none are supplied', async () => {
    const blob = await buildOfficeWindowsDocx({
      agencyName: 'Harbor Point Health',
      officeRows: [],
      osRows: [],
      showLicenses: false,
      assets: {},
    });
    const head = new Uint8Array((await blobBytes(blob)).slice(0, 2));
    expect(Array.from(head)).toEqual([0x50, 0x4b]);
  });
});
