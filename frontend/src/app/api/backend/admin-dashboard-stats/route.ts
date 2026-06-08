import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export const runtime = 'nodejs';

// Single-segment Vercel-safe proxy for admin dashboard metrics.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, 'admin/sos/dashboard-stats');
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
