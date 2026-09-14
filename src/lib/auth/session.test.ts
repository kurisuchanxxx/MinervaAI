import { describe, expect, it } from 'vitest';
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { authMode, createSessionToken, isProtectedApiPath, parseUsers, verifySessionToken } from './session';
import { hashPassword, verifyPassword, DUMMY_HASH } from './password';

const SECRET = 'x'.repeat(40);

async function envWith(users: string[]) {
  return { AUTH_SECRET: SECRET, MINERVA_USERS: users.join(',') };
}

describe('RECON auth configuration', () => {
  it('fails closed without a secret or users', () => {
    expect(authMode({})).toBe('unconfigured');
    expect(authMode({ AUTH_SECRET: 'short', MINERVA_USERS: 'a:scrypt.aa.bb' })).toBe('unconfigured');
    expect(authMode({ AUTH_SECRET: SECRET, MINERVA_USERS: '' })).toBe('unconfigured');
    expect(authMode({ AUTH_SECRET: SECRET, MINERVA_USERS: 'a:plaintext' })).toBe('unconfigured');
    expect(authMode({ AUTH_SECRET: SECRET, MINERVA_USERS: 'a:scrypt.aa.bb' })).toBe('enabled');
    expect(authMode({ RECON_AUTH_DISABLED: 'true' })).toBe('disabled');
  });

  it('parses user lists and skips malformed entries', () => {
    expect(parseUsers('alice:scrypt.s1.h1, bob:scrypt.s2.h2,bad entry,:scrypt.a.b').map(u => u.username)).toEqual(['alice', 'bob']);
  });
});

describe('passwords', () => {
  it('verifies the right password only', async () => {
    const hash = await hashPassword('correct horse');
    expect(await verifyPassword('correct horse', hash)).toBe(true);
    expect(await verifyPassword('wrong horse', hash)).toBe(false);
    expect(await verifyPassword('anything', DUMMY_HASH)).toBe(false);
  });
});

describe('session tokens', () => {
  it('accepts a fresh token for a listed user', async () => {
    const env = await envWith(['alice:scrypt.aa.bb']);
    const token = await createSessionToken('alice', SECRET);
    expect((await verifySessionToken(token, env))?.u).toBe('alice');
  });

  it('rejects tampered, expired, foreign-secret and revoked tokens', async () => {
    const env = await envWith(['alice:scrypt.aa.bb']);
    const token = await createSessionToken('alice', SECRET);
    const [body, sig] = token.split('.');
    const forged = btoa(JSON.stringify({ u: 'alice', exp: 9_999_999_999 })).replace(/=+$/, '');
    expect(await verifySessionToken(`${forged}.${sig}`, env)).toBeNull();
    expect(await verifySessionToken(`${body}.${sig}x`, env)).toBeNull();
    expect(await verifySessionToken(token, env, Date.now() + 13 * 3600_000)).toBeNull();
    expect(await verifySessionToken(await createSessionToken('alice', 'y'.repeat(40)), env)).toBeNull();
    expect(await verifySessionToken(token, await envWith(['bob:scrypt.aa.bb']))).toBeNull();
    expect(await verifySessionToken(undefined, env)).toBeNull();
  });
});

describe('protected paths', () => {
  it('covers every RECON route and nothing public', () => {
    const osintDir = fileURLToPath(new URL('../../app/api/osint/', import.meta.url));
    for (const route of readdirSync(osintDir, { withFileTypes: true }).filter(e => e.isDirectory())) {
      expect(isProtectedApiPath(`/api/osint/${route.name}`)).toBe(true);
    }
    expect(isProtectedApiPath('/api/scanner')).toBe(true);
    expect(isProtectedApiPath('/api/scannerx')).toBe(false);
    expect(isProtectedApiPath('/api/flights')).toBe(false);
    expect(isProtectedApiPath('/api/auth/login')).toBe(false);
  });
});
