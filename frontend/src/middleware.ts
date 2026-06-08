import { NextRequest, NextResponse } from 'next/server';

const LEGACY_DASHBOARD_PATHS = new Set([
  '/api/backend/dashboard/admin',
  '/api/backend/admin/dashboard',
]);

export function middleware(request: NextRequest) {
  if (LEGACY_DASHBOARD_PATHS.has(request.nextUrl.pathname)) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = '/api/backend/admin-dashboard-stats';
    return NextResponse.rewrite(rewriteUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/backend/dashboard/admin', '/api/backend/admin/dashboard'],
};
