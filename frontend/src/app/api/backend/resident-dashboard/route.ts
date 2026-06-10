import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export const runtime = 'nodejs';

// Single-segment Vercel-safe proxy for resident dashboard details.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, 'resident-dashboard');
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
