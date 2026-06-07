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
  const targetUrl = new URL(`${apiOrigin}/api/${path.map(encodeURIComponent).join('/')}`);
  targetUrl.search = req.nextUrl.search;

  const headers = new Headers();
  copyHeader(req.headers, headers, 'accept');
  copyHeader(req.headers, headers, 'authorization');
  copyHeader(req.headers, headers, 'content-type');

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: 'no-store',
  };

  if (req.method !== 'GET' && req.method !== 'HEAD') {
    init.body = await req.arrayBuffer();
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
