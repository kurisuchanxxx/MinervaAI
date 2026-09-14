import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { authMode, isProtectedApiPath, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

/**
 * Access control for the RECON endpoints.
 *
 * /api/osint/* and /api/scanner run lookups and scans from this server's
 * address, so on a public deployment they require a signed-in user. Everything
 * else — the map and its feeds — stays open and never reaches this code.
 *
 * The upstream project also POSTed every page view, and the visitor's IP
 * address, to a self-hosted analytics container on each request. That is
 * personal data leaving the request path without consent, and the host only
 * ever resolved inside the original author's Docker network, so it was dead
 * weight here. It is gone; add your own analytics deliberately if you want them.
 */

async function guardRecon(request: NextRequest) {
  const mode = authMode();
  if (mode === 'disabled') return NextResponse.next();
  if (mode === 'unconfigured') {
    return NextResponse.json(
      { error: 'RECON access is not configured on this deployment (AUTH_SECRET / MINERVA_USERS).', code: 'auth_unconfigured' },
      { status: 503, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE)?.value);
  if (!session) {
    return NextResponse.json(
      { error: 'Login required for RECON tools.', code: 'auth_required' },
      { status: 401, headers: { 'Cache-Control': 'no-store' } },
    );
  }
  return NextResponse.next();
}

export async function middleware(request: NextRequest) {
  if (isProtectedApiPath(request.nextUrl.pathname)) return guardRecon(request);
  return NextResponse.next();
}

/**
 * Only the RECON routes. Nothing else pays for this middleware — in particular
 * not the MapLibre worker under /vendor or the basemap style, which are on the
 * map's critical path.
 */
export const config = {
  matcher: ['/api/osint/:path*', '/api/scanner', '/api/scanner/:path*'],
};
