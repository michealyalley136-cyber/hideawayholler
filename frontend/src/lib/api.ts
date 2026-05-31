const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export async function api<T>(
  path: string,
  options: Omit<RequestInit, 'body'> & { body?: unknown } = {}
): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      ...(body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || data.message || 'Request failed';

    if (typeof window !== 'undefined') {
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

    throw new ApiError(res.status, message);
  }
  return data as T;
}

export const uploadsUrl = process.env.NEXT_PUBLIC_UPLOADS_URL || 'http://localhost:4000/uploads';

export function fileUrl(path?: string | null) {
  if (!path) return null;
  return `${uploadsUrl}/${path}`;
}
