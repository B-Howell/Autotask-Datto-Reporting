// The images an export embeds, read from disk instead of fetched over HTTP.
// The product icons live in client/public, the same files the browser fetches;
// the agency logo is whatever the caller sends, since the renderer has no
// tenant settings of its own.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { ReportAssets } from '@/utils/reportImages';
import { pngImage } from '@/utils/reportImages';

const PUBLIC_DIR = fileURLToPath(new URL('../public/', import.meta.url));

/** The bytes a Buffer views, copied out so a pooled Buffer's neighbours are not included. */
const toArrayBuffer = (buf: Buffer): ArrayBuffer =>
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) as ArrayBuffer;

async function readPng(path: string) {
  try {
    return pngImage(toArrayBuffer(await readFile(path)));
  } catch {
    return null;
  }
}

/** The product icons from client/public plus an optional base64 PNG logo sent by the server. */
export async function loadRendererAssets(logoBase64?: string | null): Promise<ReportAssets> {
  const [officeIcon, windowsIcon] = await Promise.all([
    readPng(`${PUBLIC_DIR}Office.png`),
    readPng(`${PUBLIC_DIR}Windows.png`),
  ]);
  const logo = logoBase64 ? pngImage(toArrayBuffer(Buffer.from(logoBase64, 'base64'))) : null;
  return { officeIcon, windowsIcon, logo };
}
