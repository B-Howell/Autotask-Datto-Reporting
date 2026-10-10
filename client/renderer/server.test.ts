// @vitest-environment node
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { contentDisposition, createRendererServer } from './server';

const BODY_CAP = 1024;

let server: Server;
let base: string;

const listen = (s: Server): Promise<string> =>
  new Promise((resolve) => {
    s.listen(0, '127.0.0.1', () => {
      const { port } = s.address() as AddressInfo;
      resolve(`http://127.0.0.1:${port}`);
    });
  });

const post = (body: string) =>
  fetch(`${base}/render`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body,
  });

const deviceRequest = JSON.stringify({
  reportType: 'devices',
  data: {
    sheets: [
      {
        sheet: [
          ['Product', 'Reference Name'],
          ['Laptop', 'HPH-LT-0001'],
        ],
        ids: [50001],
        companyName: 'Harbor Point',
      },
    ],
  },
  options: { columns: ['Reference Name'] },
  filename: 'Harbor Point Inventory.xlsx',
});

describe('renderer server', () => {
  beforeAll(async () => {
    server = createRendererServer({ maxBodyBytes: BODY_CAP });
    base = await listen(server);
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  // Every failure logs one line; keep it out of the test output.
  afterEach(() => vi.restoreAllMocks());

  it('reports the report types on /health', async () => {
    const res = await fetch(`${base}/health`);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.reportTypes).toContain('devices');
  });

  it('answers 400 for a body that is not JSON', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post('{nope');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request body is not valid JSON' });
  });

  it('answers 400 when data is missing', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(JSON.stringify({ reportType: 'devices', filename: 'x.xlsx' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Request needs a data object' });
  });

  it('answers 400 for an unknown report type', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(JSON.stringify({ reportType: 'nope', data: {}, filename: 'x' }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Unknown report type: nope' });
  });

  it('answers 413 and closes the connection for a body over the cap', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await post(JSON.stringify({ pad: 'x'.repeat(BODY_CAP * 2) }));
    expect(res.status).toBe(413);
    expect(res.headers.get('connection')).toBe('close');
    expect(await res.json()).toEqual({ error: `Request body exceeds ${BODY_CAP} bytes` });
  });

  it('answers 404 elsewhere', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await fetch(`${base}/nothing`);
    expect(res.status).toBe(404);
  });

  // The first exceljs import is slow under load, so this read gets longer than the default.
  it('returns the file with its name in the disposition header', async () => {
    const res = await post(deviceRequest);
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('spreadsheetml');
    expect(res.headers.get('content-disposition')).toBe(
      `attachment; filename="Harbor Point Inventory.xlsx"; filename*=UTF-8''Harbor%20Point%20Inventory.xlsx`
    );
    const bytes = new Uint8Array(await res.arrayBuffer());
    expect(Number(res.headers.get('content-length'))).toBe(bytes.length);
    expect(Array.from(bytes.subarray(0, 2))).toEqual([0x50, 0x4b]);
  }, 20_000);
});

describe('contentDisposition', () => {
  it('gives an ASCII fallback and the exact name as UTF-8', () => {
    expect(contentDisposition('Café "West" (Q1)*.pdf')).toBe(
      `attachment; filename="Caf_ _West_ (Q1)*.pdf"; filename*=UTF-8''Caf%C3%A9%20%22West%22%20%28Q1%29%2A.pdf`
    );
  });
});
