export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

interface RequestOptions {
  signal?: AbortSignal;
}

// Every API response is served with no-store headers, but the fetch cache mode
// is set too so a service worker or proxy never answers from a stale copy.
async function request<T>(url: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init });
  if (!res.ok) throw new ApiError(res.status, await errorDetail(res));
  return (await res.json()) as T;
}

// FastAPI reports a 4xx reason as {"detail": "..."}; surface that rather than a
// bare status code.
async function errorDetail(res: Response): Promise<string> {
  const fallback = `Request failed (${res.status})`;
  try {
    const body = (await res.json()) as { detail?: unknown };
    return typeof body.detail === 'string' ? body.detail : fallback;
  } catch {
    return fallback;
  }
}

export function getJson<T>(url: string, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, { signal: options.signal });
}

export function postJson<T>(url: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
  return request<T>(url, {
    method: 'POST',
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
    signal: options.signal,
  });
}

export function putJson<T>(url: string, body: unknown): Promise<T> {
  return request<T>(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export function postForm<T>(url: string, form: FormData): Promise<T> {
  return request<T>(url, { method: 'POST', body: form });
}

export function deleteJson<T>(url: string): Promise<T> {
  return request<T>(url, { method: 'DELETE' });
}

export function query(params: Record<string, string | number | boolean | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== false) search.set(key, String(value));
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}
