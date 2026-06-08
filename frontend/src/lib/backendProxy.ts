import { NextRequest, NextResponse } from 'next/server';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.BACKEND_API_URL?.trim() || '';
export const apiOrigin = configuredApiUrl ? configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/, '') : '';

function copyHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name);
  if (value) target.set(name, value);
}

export function resolveBackendTargetPath(joinedPath: string) {
  const legacySosAction = joinedPath.match(/^admin\/sos\/([^/]+)\/(acknowledge|resolve|mute)$/);
  if (legacySosAction) return `admin/sos/${legacySosAction[2]}`;
  if (joinedPath === 'dashboard/admin' || joinedPath === 'admin/dashboard') return 'admin-dashboard';
  return joinedPath;
}

export async function proxyToBackend(req: NextRequest, targetPath: string, options?: { sosAlertId?: string }) {
  if (!apiOrigin) {
    return NextResponse.json(
      { error: 'Backend API is not configured for the portal proxy.', code: 'BACKEND_API_NOT_CONFIGURED' },
      { status: 500 }
    );
  }

  const targetUrl = new URL(`${apiOrigin}/api/${targetPath}`);
  targetUrl.search = req.nextUrl.search;

  const headers = new Headers();
  copyHeader(req.headers, headers, 'accept');
  copyHeader(req.headers, headers, 'authorization');
  if (!headers.has('content-type')) {
    headers.set('content-type', 'application/json');
  }

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const rawBody = await req.arrayBuffer();
    if (options?.sosAlertId) {
      let existing: Record<string, unknown> = {};
      if (rawBody.byteLength > 0) {
        try {
          existing = JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>;
        } catch {
          existing = {};
        }
      }
      init.body = JSON.stringify({ ...existing, sosAlertId: options.sosAlertId });
    } else {
      init.body = rawBody;
    }
  }

  try {
    const response = await fetch(targetUrl, init);
    const responseHeaders = new Headers();
    copyHeader(response.headers, responseHeaders, 'content-type');
    responseHeaders.set('cache-control', 'no-store');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown network error';
    console.error('[backend-proxy] Backend request failed', {
      path: targetUrl.pathname,
      errorName: err instanceof Error ? err.name : 'UnknownError',
      errorMessage: message,
    });

    return NextResponse.json(
      {
        error: 'Unable to reach the HollerHub backend from the portal proxy.',
        code: 'BACKEND_PROXY_NETWORK_ERROR',
      },
      { status: 502 }
    );
  }
}
