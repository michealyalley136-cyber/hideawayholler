const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const apiOrigin = rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '');
export const apiUrl = `${apiOrigin}/api`;

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

function apiPath(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${apiUrl}${cleanPath}`;
}

function errorMessageForNetworkFailure() {
  return `Unable to reach the HollerHub API at ${apiOrigin}. Confirm the backend is running on http://localhost:5000.`;
}

export async function apiHealth() {
  const url = `${apiUrl}/health`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[apiHealth] Backend health check failed', { url, status: res.status, data });
      throw new ApiError(res.status, data.error || data.message || 'Backend health check failed', data);
    }
    return data as { status: string; service: string };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[apiHealth] Backend health check network error', { url, err });
    throw new ApiError(0, errorMessageForNetworkFailure(), err);
  }
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = getToken();
  const url = apiPath(path);
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    res = await fetch(url, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    console.error('[api] Network error', { url, method: rest.method || 'GET', err });
    throw new ApiError(0, errorMessageForNetworkFailure(), err);
  }

  const text = await res.text();
  let data: any = {};
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!res.ok) {
    const message = data.error || data.message || `Request failed with status ${res.status}`;
    console.error('[api] Backend error response', { url, status: res.status, data });

    const isAuthRequest = path === '/auth/login' || path === '/auth/register';
    if (typeof window !== 'undefined' && !isAuthRequest) {
      if (res.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.assign('/login');
        return new Promise<T>(() => {});
      }

      if (res.status === 403) {
        window.location.assign('/portal');
        return new Promise<T>(() => {});
      }
    }

    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL || `${apiOrigin}/uploads`;

export function fileUrl(path?: string | null) {
  if (!path) return null;
  return `${uploadsUrl}/${path}`;
}
