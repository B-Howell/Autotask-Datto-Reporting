import { describe, expect, it } from 'vitest';
import { PNG_1X1 } from '@/test/fixtures';
import { pngDimensions, pngImage, toDataUrl } from './reportImages';

/** A copy of the 1x1 PNG with one byte range overwritten. */
const patched = (offset: number, values: number[]): ArrayBuffer => {
  const copy = new Uint8Array(PNG_1X1.slice(0));
  copy.set(values, offset);
  return copy.buffer;
};

describe('reportImages', () => {
  it('reads width and height from the PNG header', () => {
    expect(pngDimensions(PNG_1X1)).toEqual({ width: 1, height: 1 });
  });

  it('returns null for bytes that are not a PNG', () => {
    expect(pngDimensions(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
  });

  it('returns null when the first chunk is not IHDR', () => {
    expect(pngDimensions(patched(12, [0x49, 0x44, 0x41, 0x54]))).toBeNull();
  });

  it('returns null when the width or height is zero', () => {
    expect(pngDimensions(patched(16, [0, 0, 0, 0]))).toBeNull();
    expect(pngDimensions(patched(20, [0, 0, 0, 0]))).toBeNull();
  });

  it('encodes bytes as a png data url', () => {
    expect(toDataUrl(PNG_1X1, 'image/png').startsWith('data:image/png;base64,iVBOR')).toBe(true);
  });

  it('builds a report image from PNG bytes and null from anything else', () => {
    expect(pngImage(PNG_1X1)).toMatchObject({
      width: 1,
      height: 1,
      format: 'PNG',
      bytes: PNG_1X1,
    });
    expect(pngImage(null)).toBeNull();
    expect(pngImage(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
  });
});
