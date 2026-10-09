import { describe, expect, it } from 'vitest';
import { pngDimensions, pngImage, toDataUrl } from './reportImages';

// 1x1 transparent PNG
const PNG = Uint8Array.from(
  atob(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=='
  ),
  (c) => c.charCodeAt(0)
).buffer;

describe('reportImages', () => {
  it('reads width and height from the PNG header', () => {
    expect(pngDimensions(PNG)).toEqual({ width: 1, height: 1 });
  });

  it('returns null for bytes that are not a PNG', () => {
    expect(pngDimensions(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
  });

  it('encodes bytes as a png data url', () => {
    expect(toDataUrl(PNG, 'image/png').startsWith('data:image/png;base64,iVBOR')).toBe(true);
  });

  it('builds a report image from PNG bytes and null from anything else', () => {
    expect(pngImage(PNG)).toMatchObject({ width: 1, height: 1, format: 'PNG', bytes: PNG });
    expect(pngImage(null)).toBeNull();
    expect(pngImage(new Uint8Array([1, 2, 3]).buffer)).toBeNull();
  });
});
