import { NextRequest } from 'next/server';
import { proxyToBackend } from '@/lib/backendProxy';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  return proxyToBackend(req, 'profiles/resident-dashboard');
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
