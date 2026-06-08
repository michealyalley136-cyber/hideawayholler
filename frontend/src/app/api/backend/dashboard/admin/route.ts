import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export const runtime = 'nodejs';

// Legacy cached bundles call GET /api/backend/dashboard/admin directly.
// This explicit route rewrites to the production-safe backend path.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, 'admin-dashboard');
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
