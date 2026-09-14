import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { authMode, SESSION_COOKIE, verifySessionToken } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

/** Tells the RECON panel whether to show the tools or the login form. */
export async function GET() {
  const mode = authMode();
  if (mode !== 'enabled') {
    return NextResponse.json({ mode, authenticated: mode === 'disabled', user: null }, { headers: { 'Cache-Control': 'no-store' } });
  }
  const session = await verifySessionToken((await cookies()).get(SESSION_COOKIE)?.value);
  return NextResponse.json(
    { mode, authenticated: !!session, user: session?.u ?? null, expiresAt: session ? session.exp * 1000 : null },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
