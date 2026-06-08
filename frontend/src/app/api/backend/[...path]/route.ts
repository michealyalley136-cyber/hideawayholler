import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim() || process.env.BACKEND_API_URL?.trim() || '';
const apiOrigin = configuredApiUrl ? configuredApiUrl.replace(/\/+$/, '').replace(/\/api$/, '') : '';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

function copyHeader(source: Headers, target: Headers, name: string) {
  const value = source.get(name);
  if (value) target.set(name, value);
}

async function proxyBackendRequest(req: NextRequest, context: RouteContext) {
  if (!apiOrigin) {
    return NextResponse.json(
      { error: 'Backend API is not configured for the portal proxy.', code: 'BACKEND_API_NOT_CONFIGURED' },
      { status: 500 }
    );
  }

  const { path = [] } = await context.params;
  const joinedPath = path.map(encodeURIComponent).join('/');

  // Legacy SOS action URLs like /admin/sos/:id/acknowledge 404 on the backend Vercel
  // deployment. Rewrite them to single-segment routes with sosAlertId in the body so
  // cached older frontend bundles still work.
  const legacySosAction = joinedPath.match(/^admin\/sos\/([^/]+)\/(acknowledge|resolve|mute)$/);
  const targetPath = legacySosAction ? `admin/sos/${legacySosAction[2]}` : joinedPath;
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
    if (legacySosAction) {
      let existing: Record<string, unknown> = {};
      if (rawBody.byteLength > 0) {
        try {
          existing = JSON.parse(new TextDecoder().decode(rawBody)) as Record<string, unknown>;
        } catch {
          existing = {};
        }
      }
      init.body = JSON.stringify({ ...existing, sosAlertId: legacySosAction[1] });
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

export async function GET(req: NextRequest, context: RouteContext) {
  return proxyBackendRequest(req, context);
}

export async function POST(req: NextRequest, context: RouteContext) {
  return proxyBackendRequest(req, context);
}

export async function PUT(req: NextRequest, context: RouteContext) {
  return proxyBackendRequest(req, context);
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  return proxyBackendRequest(req, context);
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  return proxyBackendRequest(req, context);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}
