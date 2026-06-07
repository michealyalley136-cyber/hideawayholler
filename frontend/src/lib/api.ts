const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();
const localApiUrl = 'http://localhost:5000';
const rawApiUrl = configuredApiUrl || (process.env.NODE_ENV !== 'production' ? localApiUrl : '');

export const apiOrigin = rawApiUrl ? rawApiUrl.replace(/\/+$/, '').replace(/\/api$/, '') : '';
export const apiUrl = apiOrigin ? `${apiOrigin}/api` : '';
const useBrowserProxy = typeof window !== 'undefined' && process.env.NODE_ENV === 'production';

if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
  console.info('[api] Runtime API configuration', {
    hasNextPublicApiUrl: Boolean(configuredApiUrl),
    hasResolvedApiOrigin: Boolean(apiOrigin),
    usesLocalDevFallback: apiOrigin === localApiUrl,
    nodeEnv: process.env.NODE_ENV,
  });
}

import { clearAuth, getStoredToken } from './auth';

export class ApiError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return getStoredToken();
}

function cleanApiPath(path: string) {
  return path.startsWith('/') ? path : `/${path}`;
}

function apiPath(path: string) {
  if (/^https?:\/\//.test(path)) return path;
  if (!apiUrl) {
    throw new ApiError(0, 'HollerHub API is not configured. Set NEXT_PUBLIC_API_URL to the deployed backend URL.');
  }
  const cleanPath = cleanApiPath(path);
  if (useBrowserProxy) return `/api/backend${cleanPath}`;
  return `${apiUrl}${cleanPath}`;
}

function errorMessageForNetworkFailure() {
  if (!apiOrigin) {
    return 'HollerHub API is not configured. Set NEXT_PUBLIC_API_URL to the deployed backend URL.';
  }

  if (apiOrigin === localApiUrl) {
    return `Unable to reach the backend health endpoint at ${apiOrigin}. Confirm the backend is running on ${localApiUrl}.`;
  }

  return `Unable to reach the backend health endpoint at ${apiOrigin}. Confirm the backend is deployed and NEXT_PUBLIC_API_URL is correct.`;
}

export async function apiHealth() {
  // Explicitly check the configured API health endpoint so the error message
  // can show the exact route we attempted.
  const healthUrl = apiUrl ? (useBrowserProxy ? '/api/backend/health' : `${apiUrl}/health`) : '';
  if (!healthUrl) {
    throw new ApiError(0, 'HollerHub API is not configured. Set NEXT_PUBLIC_API_URL to the backend base URL (e.g. https://hollerhub-api.vercel.app)');
  }

  try {
    console.info('[apiHealth] Checking backend health at', healthUrl);
    const res = await fetch(healthUrl, { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error('[apiHealth] Backend health check failed', { url: healthUrl, status: res.status, data });
      throw new ApiError(res.status, data.error || data.message || `Backend health check failed at ${healthUrl}`, data);
    }
    return data as { status: string; service: string };
  } catch (err) {
    if (err instanceof ApiError) throw err;
    console.error('[apiHealth] Backend health check network error', { url: healthUrl, err });
    throw new ApiError(0, `Unable to reach the backend health endpoint at ${healthUrl}. Confirm NEXT_PUBLIC_API_URL is correct.`, err);
  }
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown; suppressErrorLog?: boolean } = {}
): Promise<T> {
  const { body, headers, suppressErrorLog, ...rest } = options;
  const token = getToken();
  let url = '';
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;

  let res: Response;
  try {
    url = apiPath(path);
    res = await fetch(url, {
      ...rest,
      headers: {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: isFormData ? body : body ? JSON.stringify(body) : undefined,
    });

    if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
      console.debug('[api] response received', { url, method: rest.method || 'GET', status: res.status });
    }
  } catch (err) {
    if (!suppressErrorLog) {
      console.error('[api] Network error', { url, method: rest.method || 'GET', err });
    }
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
    if (!suppressErrorLog) {
      console.error('[api] Backend error response', { url, status: res.status, data });
    }

    const isAuthRequest = path === '/auth/login' || path === '/auth/register';
    if (typeof window !== 'undefined' && !isAuthRequest) {
      if (res.status === 401) {
        clearAuth();
        window.location.assign('/login');
        return new Promise<T>(() => {});
      }

      if (res.status === 403) {
        clearAuth();
        window.location.assign('/login');
        return new Promise<T>(() => {});
      }
    }

    throw new ApiError(res.status, message, data);
  }

  return data as T;
}

export const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL || (apiOrigin ? `${apiOrigin}/uploads` : '');

export function fileUrl(path?: string | null) {
  if (!path || !uploadsUrl) return null;
  return `${uploadsUrl}/${path}`;
}
