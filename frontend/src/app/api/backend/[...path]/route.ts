import { NextRequest, NextResponse } from 'next/server';
import { proxyToBackend, resolveBackendTargetPath } from '@/lib/backendProxy';

export const runtime = 'nodejs';

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

async function proxyBackendRequest(req: NextRequest, context: RouteContext) {
  const { path = [] } = await context.params;
  const joinedPath = path.map(encodeURIComponent).join('/');
  const legacySosAction = joinedPath.match(/^admin\/sos\/([^/]+)\/(acknowledge|resolve|mute)$/);
  const targetPath = resolveBackendTargetPath(joinedPath);

  if (joinedPath === 'dashboard/admin') {
    console.info('[backend-proxy] Rewriting legacy dashboard route', {
      from: joinedPath,
      to: targetPath,
    });
  }

  return proxyToBackend(req, targetPath, legacySosAction ? { sosAlertId: legacySosAction[1] } : undefined);
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
