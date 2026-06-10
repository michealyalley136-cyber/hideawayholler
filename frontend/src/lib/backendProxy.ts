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
  if (joinedPath === 'admin/sos/dashboard-stats') return 'admin/sos/dashboard-stats';
  if (joinedPath === 'super-admin/sos-logs') return 'admin/sos/super-admin-logs';
  if (joinedPath.startsWith('lease-download')) return joinedPath;
  if (joinedPath.startsWith('lease-detail')) return joinedPath;
  const legacyLeaseDownload = joinedPath.match(/^leases\/([^/]+)\/download$/);
  if (legacyLeaseDownload) return `lease-download?leaseId=${encodeURIComponent(legacyLeaseDownload[1])}`;
  const legacyLeaseDetail = joinedPath.match(/^leases\/([^/]+)$/);
  if (legacyLeaseDetail && legacyLeaseDetail[1] !== 'my') {
    return `lease-detail?leaseId=${encodeURIComponent(legacyLeaseDetail[1])}`;
  }
  if (
    joinedPath === 'dashboard/admin' ||
    joinedPath === 'admin/dashboard' ||
    joinedPath === 'admin-dashboard-stats'
  ) {
    return 'admin-dashboard';
  }
  if (joinedPath === 'dashboard/resident') return 'dashboard/resident';
  if (joinedPath === 'profiles/resident-dashboard') return 'profiles/resident-dashboard';
  if (joinedPath === 'super-admin/clients/hideaway-holler') return 'super-admin-hideaway-holler';
  if (joinedPath === 'business-billing/super-admin/clients/hideaway-holler') return 'super-admin-hideaway-holler';
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
  copyHeader(req.headers, headers, 'content-type');
  if (!headers.has('content-type') && req.method !== 'GET' && req.method !== 'HEAD') {
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
