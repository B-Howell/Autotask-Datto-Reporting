// A small HTTP front for the renderer. The reporting server POSTs a report's
// data here and gets the finished file back, so scheduled deliveries carry
// the same bytes a user would download from the browser.
import { createServer } from 'node:http';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { REPORT_TYPES, render } from './render';
import type { RenderRequest } from './render';

const PORT = Number(process.env.RENDERER_PORT) || 3100;
/** Report payloads are JSON built from database rows; anything larger than this is a mistake. */
const MAX_BODY_BYTES = 50 * 1024 * 1024;

/** A failure the caller caused, reported with its status instead of a 500. */
class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

const readBody = (req: IncomingMessage): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    req.on('data', (chunk: Buffer) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(new RequestError(`Request body exceeds ${MAX_BODY_BYTES} bytes`, 400));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const parseRequest = (body: Buffer): RenderRequest => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    throw new RequestError('Request body is not valid JSON', 400);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new RequestError('Request body must be a JSON object', 400);
  }
  const req = parsed as Partial<RenderRequest>;
  if (typeof req.reportType !== 'string' || typeof req.filename !== 'string') {
    throw new RequestError('Request needs a reportType and a filename', 400);
  }
  return {
    reportType: req.reportType,
    data: req.data,
    options: typeof req.options === 'object' && req.options !== null ? req.options : {},
    filename: req.filename,
    logoBase64: typeof req.logoBase64 === 'string' ? req.logoBase64 : null,
  };
};

const sendJson = (res: ServerResponse, status: number, body: unknown): void => {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': bytes.length,
  });
  res.end(bytes);
};

/** RFC 5987 form so a file name with spaces or non-ASCII characters survives the header. */
const contentDisposition = (filename: string): string =>
  `attachment; filename="${encodeURIComponent(filename)}"`;

const handleRender = async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
  const request = parseRequest(await readBody(req));
  let result;
  try {
    result = await render(request);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Unknown report type')) {
      throw new RequestError(error.message, 400);
    }
    throw error;
  }
  res.writeHead(200, {
    'content-type': result.contentType,
    'content-length': result.bytes.length,
    'content-disposition': contentDisposition(request.filename),
  });
  res.end(result.bytes);
};

const server = createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      sendJson(res, 200, { ok: true, reportTypes: REPORT_TYPES });
    } else if (req.method === 'POST' && req.url === '/render') {
      await handleRender(req, res);
    } else {
      sendJson(res, 404, { error: 'Not found' });
    }
  } catch (error) {
    const status = error instanceof RequestError ? error.status : 500;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`${req.method} ${req.url} -> ${status}: ${message}`);
    if (!res.headersSent) sendJson(res, status, { error: message });
    else res.end();
  }
});

server.listen(PORT, () => {
  console.log(`Renderer listening on http://localhost:${PORT} (${REPORT_TYPES.join(', ')})`);
});
