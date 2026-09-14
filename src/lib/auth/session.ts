/**
 * RECON access sessions.
 *
 * The RECON toolkit (/api/osint/*, /api/scanner) runs lookups and scans from
 * this server's IP, so on a public deployment it sits behind a login. A session
 * is a signed cookie — `base64url(payload).base64url(HMAC-SHA256)` — verified
 * with Web Crypto only, so the same code runs in the middleware and in Node
 * route handlers.
 *
 * Configuration (see .env.example):
 *   AUTH_SECRET          ≥ 32 characters; rotating it signs everyone out.
 *   MINERVA_USERS        comma-separated `username:scrypt.<salt>.<hash>` entries,
 *                        produced by `node tools/hash-password.mjs <username>`.
 *   RECON_AUTH_DISABLED  `true` opens RECON without a login (private self-hosting only).
 *
 * Fails closed: with no secret or no users, RECON answers 503.
 */

export const SESSION_COOKIE = 'minerva_session';
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

/** Path prefixes that require a RECON session. */
export const PROTECTED_API_PREFIXES = ['/api/osint/', '/api/scanner'] as const;

export function isProtectedApiPath(pathname: string): boolean {
  return PROTECTED_API_PREFIXES.some(prefix =>
    prefix.endsWith('/') ? pathname.startsWith(prefix) : pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export interface SessionPayload {
  /** Username. */
  u: string;
  /** Expiry, seconds since epoch. */
  exp: number;
}

export type AuthMode = 'disabled' | 'unconfigured' | 'enabled';

const USERNAME_RE = /^[A-Za-z0-9_.-]{1,64}$/;

export interface UserRecord {
  username: string;
  /** `scrypt.<salt>.<hash>` */
  hash: string;
}

/** Parses MINERVA_USERS; malformed entries are skipped. */
export function parseUsers(raw: string | undefined): UserRecord[] {
  if (!raw) return [];
  return raw
    .split(',')
    .map(entry => entry.trim())
    .filter(Boolean)
    .map(entry => {
      const i = entry.indexOf(':');
      return i > 0 ? { username: entry.slice(0, i), hash: entry.slice(i + 1) } : null;
    })
    .filter((u): u is UserRecord => !!u && USERNAME_RE.test(u.username) && /^scrypt\.[\w-]+\.[\w-]+$/.test(u.hash));
}

export function authMode(env: Record<string, string | undefined> = process.env): AuthMode {
  if (env.RECON_AUTH_DISABLED === 'true') return 'disabled';
  const secret = env.AUTH_SECRET ?? '';
  if (secret.length < 32 || parseUsers(env.MINERVA_USERS).length === 0) return 'unconfigured';
  return 'enabled';
}

// ── base64url without Buffer (the middleware may run on the edge runtime) ──
function toBase64Url(bytes: Uint8Array): string {
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(s: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[\w-]*$/.test(s)) return null;
  try {
    const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4));
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSessionToken(username: string, secret: string, now = Date.now()): Promise<string> {
  const payload: SessionPayload = { u: username, exp: Math.floor(now / 1000) + SESSION_TTL_SECONDS };
  const body = toBase64Url(new TextEncoder().encode(JSON.stringify(payload)));
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', await hmacKey(secret), new TextEncoder().encode(body)));
  return `${body}.${toBase64Url(sig)}`;
}

/**
 * Returns the session if the token is authentic, unexpired and its user is
 * still listed in MINERVA_USERS — removing a user revokes their session.
 */
export async function verifySessionToken(
  token: string | undefined,
  env: Record<string, string | undefined> = process.env,
  now = Date.now(),
): Promise<SessionPayload | null> {
  if (!token || authMode(env) !== 'enabled') return null;
  const [body, sigPart, extra] = token.split('.');
  if (!body || !sigPart || extra !== undefined) return null;
  const sig = fromBase64Url(sigPart);
  if (!sig) return null;
  const valid = await crypto.subtle.verify('HMAC', await hmacKey(env.AUTH_SECRET!), sig, new TextEncoder().encode(body));
  if (!valid) return null;
  const raw = fromBase64Url(body);
  if (!raw) return null;
  let payload: SessionPayload;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return null;
  }
  if (typeof payload?.u !== 'string' || typeof payload?.exp !== 'number') return null;
  if (payload.exp * 1000 <= now) return null;
  if (!parseUsers(env.MINERVA_USERS).some(u => u.username === payload.u)) return null;
  return payload;
}
