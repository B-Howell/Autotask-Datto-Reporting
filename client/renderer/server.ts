// A small HTTP front for the renderer. The reporting server POSTs a report's
// data here and gets the finished file back, so scheduled deliveries carry
// the same bytes a user would download from the browser.
import { createServer } from 'node:http';
import type { IncomingMessage, Server, ServerResponse } from 'node:http';
import { pathToFileURL } from 'node:url';
import { REPORT_TYPES, render } from './render';
import type { RenderRequest } from './render';

const DEFAULT_PORT = 3100;
/** Loopback by default; a container sets 0.0.0.0 so the reporting server can reach it. */
const DEFAULT_HOST = '127.0.0.1';
/** Report payloads are JSON built from database rows; anything larger than this is a mistake. */
export const MAX_BODY_BYTES = 50 * 1024 * 1024;

/** A failure the caller caused, reported with its status instead of a 500. */
class RequestError extends Error {
  constructor(
    message: string,
    readonly status: number
  ) {
    super(message);
  }
}

/**
 * Collects the body up to the cap. Past the cap the request stops being read
 * (the listener comes off and the stream pauses) so the reply can go out
 * before the connection is closed; destroying the socket first would leave
 * the caller with a reset instead of a status.
 */
const readBody = (req: IncomingMessage, maxBytes: number): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    let size = 0;
    const onData = (chunk: Buffer) => {
      size += chunk.length;
      if (size > maxBytes) {
        req.removeListener('data', onData);
        req.pause();
        reject(new RequestError(`Request body exceeds ${maxBytes} bytes`, 413));
        return;
      }
      chunks.push(chunk);
    };
    req.on('data', onData);
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

const isObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseRequest = (body: Buffer): RenderRequest => {
  let parsed: unknown;
  try {
    parsed = JSON.parse(body.toString('utf8'));
  } catch {
    throw new RequestError('Request body is not valid JSON', 400);
  }
  if (!isObject(parsed)) throw new RequestError('Request body must be a JSON object', 400);
  const { reportType, data, options, filename, logoBase64 } = parsed;
  if (typeof reportType !== 'string' || typeof filename !== 'string') {
    throw new RequestError('Request needs a reportType and a filename', 400);
  }
  if (!isObject(data)) throw new RequestError('Request needs a data object', 400);
  return {
    reportType,
    data,
    options: isObject(options) ? options : {},
    filename,
    logoBase64: typeof logoBase64 === 'string' ? logoBase64 : null,
  };
};

const sendJson = (
  res: ServerResponse,
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): void => {
  const bytes = Buffer.from(JSON.stringify(body));
  res.writeHead(status, {
    'content-type': 'application/json',
    'content-length': bytes.length,
    ...headers,
  });
  res.end(bytes);
};

// RFC 5987 leaves these out of attr-char, but encodeURIComponent keeps them.
const encodeExtValue = (value: string): string =>
  encodeURIComponent(value).replace(
    /[!'()*]/g,
    (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`
  );

/**
 * The RFC 6266 form: a plain ASCII `filename` for clients that read only that,
 * and `filename*` carrying the exact name percent-encoded as UTF-8. The
 * fallback swaps non-ASCII characters and quotes for underscores.
 */
export const contentDisposition = (filename: string): string => {
  const ascii = filename.replace(/[^\x20-\x7e]|"/g, '_');
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeExtValue(filename)}`;
};

const handleRender = async (
  req: IncomingMessage,
  res: ServerResponse,
  maxBytes: number
): Promise<void> => {
  const request = parseRequest(await readBody(req, maxBytes));
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

export interface RendererServerOptions {
  /** The body cap; a test lowers it so the oversized path can run on a few bytes. */
  maxBodyBytes?: number;
}

/** The server, not yet listening, so a caller can pick the port and host. */
export function createRendererServer({
  maxBodyBytes = MAX_BODY_BYTES,
}: RendererServerOptions = {}): Server {
  return createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') {
        sendJson(res, 200, { ok: true, reportTypes: REPORT_TYPES });
      } else if (req.method === 'POST' && req.url === '/render') {
        await handleRender(req, res, maxBodyBytes);
      } else {
        sendJson(res, 404, { error: 'Not found' });
      }
    } catch (error) {
      const status = error instanceof RequestError ? error.status : 500;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`${req.method} ${req.url} -> ${status}: ${message}`);
      if (res.headersSent) {
        res.end();
      } else if (status === 413) {
        // The rest of the body is never read, so the connection cannot be
        // reused; say so, then drop it once the reply has gone out.
        res.once('finish', () => req.destroy());
        sendJson(res, status, { error: message }, { connection: 'close' });
      } else {
        sendJson(res, status, { error: message });
      }
    }
  });
}

/** Listens on `RENDERER_HOST` and `RENDERER_PORT`, logging one line when up. */
export function startRendererServer(): Server {
  const port = Number(process.env.RENDERER_PORT) || DEFAULT_PORT;
  const host = process.env.RENDERER_HOST || DEFAULT_HOST;
  return createRendererServer().listen(port, host, () => {
    console.log(`Renderer listening on http://${host}:${port} (${REPORT_TYPES.join(', ')})`);
  });
}

// Start only when run as the entry script, so a test can import the factory
// without binding a port.
const entry = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (entry === import.meta.url) startRendererServer();
