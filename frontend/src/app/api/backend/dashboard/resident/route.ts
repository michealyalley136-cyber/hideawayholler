import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export const runtime = 'nodejs';

// Vercel-safe explicit proxy for resident dashboard details.
export async function GET(req: NextRequest) {
  return proxyToBackend(req, 'dashboard/resident');
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
