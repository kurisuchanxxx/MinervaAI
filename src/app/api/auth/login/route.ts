import { NextResponse } from 'next/server';
import { authMode, createSessionToken, parseUsers, SESSION_COOKIE, SESSION_TTL_SECONDS } from '@/lib/auth/session';
import { DUMMY_HASH, verifyPassword } from '@/lib/auth/password';
import { getClientIp, isRateLimited } from '@/lib/ssrf-guard';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Cross-site form posts must not be able to sign a visitor in. */
function sameOrigin(req: Request): boolean {
  const origin = req.headers.get('origin');
  if (!origin) return true; // same-origin fetches from older browsers omit it
  try {
    return new URL(origin).host === req.headers.get('host');
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  const mode = authMode();
  if (mode === 'disabled') return NextResponse.json({ ok: true, mode });
  if (mode === 'unconfigured') return NextResponse.json({ error: 'auth_unconfigured' }, { status: 503 });
  if (!sameOrigin(req)) return NextResponse.json({ error: 'bad_origin' }, { status: 403 });

  // Best effort on serverless (per instance), still slows guessing to a crawl.
  if (isRateLimited(`login:${getClientIp(req)}`, 5, 15 * 60_000)) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 });
  }

  let username = '';
  let password = '';
  try {
    const body = await req.json();
    username = typeof body?.username === 'string' ? body.username.trim() : '';
    password = typeof body?.password === 'string' ? body.password : '';
  } catch {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  if (!username || !password || password.length > 1024) {
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const user = parseUsers(process.env.MINERVA_USERS).find(u => u.username === username);
  // Always run scrypt so response time does not reveal which usernames exist.
  const ok = await verifyPassword(password, user?.hash ?? DUMMY_HASH);
  if (!user || !ok) {
    await new Promise(r => setTimeout(r, 400));
    return NextResponse.json({ error: 'invalid_credentials' }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true, user: user.username });
  res.cookies.set(SESSION_COOKIE, await createSessionToken(user.username, process.env.AUTH_SECRET!), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_TTL_SECONDS,
  });
  return res;
}
