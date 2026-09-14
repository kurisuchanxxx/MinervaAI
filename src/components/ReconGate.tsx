'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Loader2, Lock, LogOut, Radar, ShieldAlert } from 'lucide-react';
import { defineMessages, useT } from '@/lib/i18n';

/**
 * Login gate for the RECON toolkit. The server enforces access (middleware on
 * /api/osint/* and /api/scanner); this component only decides whether to show
 * the tools or the sign-in form, and flips back to the form when a request
 * comes back 401.
 */

const MESSAGES = defineMessages({
  en: {
    restricted: 'RESTRICTED ACCESS',
    restrictedBody: 'RECON tools run lookups and scans from the server, so they are limited to authorised users.',
    username: 'Username',
    password: 'Password',
    signIn: 'SIGN IN',
    signingIn: 'SIGNING IN…',
    invalid: 'Invalid username or password.',
    rateLimited: 'Too many attempts. Try again in a few minutes.',
    expired: 'Session expired. Sign in again.',
    network: 'Could not reach the server.',
    unconfigured: 'RECON NOT CONFIGURED',
    unconfiguredBody: 'Set AUTH_SECRET and MINERVA_USERS in the deployment environment variables, then redeploy.',
    checking: 'CHECKING ACCESS…',
    retry: 'RETRY',
    signOut: 'Sign out',
    signedInAs: 'Signed in as {user}',
    authorisedUse: 'Only investigate targets you are authorised to.',
  },
  it: {
    restricted: 'ACCESSO RISERVATO',
    restrictedBody: 'Gli strumenti RECON eseguono ricerche e scansioni dal server: sono riservati agli utenti autorizzati.',
    username: 'Utente',
    password: 'Password',
    signIn: 'ACCEDI',
    signingIn: 'ACCESSO…',
    invalid: 'Utente o password non validi.',
    rateLimited: 'Troppi tentativi. Riprova tra qualche minuto.',
    expired: 'Sessione scaduta. Accedi di nuovo.',
    network: 'Impossibile contattare il server.',
    unconfigured: 'RECON NON CONFIGURATO',
    unconfiguredBody: 'Imposta AUTH_SECRET e MINERVA_USERS nelle variabili d’ambiente del deploy, poi ripubblica.',
    checking: 'VERIFICA ACCESSO…',
    retry: 'RIPROVA',
    signOut: 'Esci',
    signedInAs: 'Accesso come {user}',
    authorisedUse: 'Indaga solo su obiettivi per cui sei autorizzato.',
  },
});

type Status = 'loading' | 'anonymous' | 'authenticated' | 'disabled' | 'unconfigured' | 'error';
type Notice = 'invalid' | 'rateLimited' | 'expired' | 'network' | null;

interface ReconSession {
  user: string | null;
  /** False when the deployment runs RECON without a login. */
  canSignOut: boolean;
  signOut: () => Promise<void>;
  /** Returns true (and shows the login form) when a RECON response says the session is gone. */
  handleUnauthorized: (res: Response) => boolean;
}

const ReconSessionContext = createContext<ReconSession | null>(null);

export function useReconSession(): ReconSession {
  const ctx = useContext(ReconSessionContext);
  if (!ctx) throw new Error('useReconSession must be used inside <ReconGate>');
  return ctx;
}

export default function ReconGate({ children }: { children: ReactNode }) {
  const t = useT(MESSAGES);
  const [status, setStatus] = useState<Status>('loading');
  const [user, setUser] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** Resolves the current session. Only callbacks set state, so it can start from an effect. */
  const load = useCallback(() => {
    return fetch('/api/auth/session', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user ?? null);
        setStatus(data.mode === 'disabled' ? 'disabled' : data.mode === 'unconfigured' ? 'unconfigured' : data.authenticated ? 'authenticated' : 'anonymous');
      })
      .catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const retry = () => {
    setStatus('loading');
    load();
  };

  const signIn = async (e: FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setNotice(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      if (res.ok) {
        const data = await res.json();
        setPassword('');
        setUser(data.user ?? null);
        setStatus(data.mode === 'disabled' ? 'disabled' : 'authenticated');
      } else if (res.status === 429) {
        setNotice('rateLimited');
      } else if (res.status === 503) {
        setStatus('unconfigured');
      } else {
        setNotice('invalid');
      }
    } catch {
      setNotice('network');
    } finally {
      setSubmitting(false);
    }
  };

  const signOut = useCallback(async () => {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch { /* cookie expires anyway */ }
    setUser(null);
    setNotice(null);
    setStatus('anonymous');
  }, []);

  const handleUnauthorized = useCallback((res: Response) => {
    if (res.status !== 401) return false;
    setUser(null);
    setNotice('expired');
    setStatus('anonymous');
    return true;
  }, []);

  const session = useMemo<ReconSession>(
    () => ({ user, canSignOut: status === 'authenticated', signOut, handleUnauthorized }),
    [user, status, signOut, handleUnauthorized],
  );

  if (status === 'authenticated' || status === 'disabled') {
    return <ReconSessionContext.Provider value={session}>{children}</ReconSessionContext.Provider>;
  }

  return (
    <div className="glass-panel pointer-events-auto flex flex-col overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)]">
        <Radar className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
        <span className="hud-text text-[11px] text-[var(--text-primary)]">RECON TOOLKIT</span>
        <Lock className="w-3 h-3 ml-auto text-[var(--gold-primary)]" aria-hidden="true" />
      </div>

      <div className="px-4 py-5">
        {status === 'loading' && (
          <div className="flex items-center justify-center gap-2 py-8 text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('checking')}
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <p className="text-[11px] text-[var(--alert-red)]">{t('network')}</p>
            <button type="button" onClick={retry} className="px-3 py-1.5 rounded border border-white/15 text-[10px] font-mono tracking-widest text-[var(--text-primary)] hover:bg-white/10">
              {t('retry')}
            </button>
          </div>
        )}

        {status === 'unconfigured' && (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <ShieldAlert className="w-6 h-6 text-[var(--gold-primary)]" />
            <p className="hud-text text-[11px] text-[var(--gold-primary)]">{t('unconfigured')}</p>
            <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">{t('unconfiguredBody')}</p>
          </div>
        )}

        {status === 'anonymous' && (
          <form onSubmit={signIn} className="flex flex-col gap-3">
            <div className="flex flex-col items-center gap-1.5 text-center mb-1">
              <Lock className="w-5 h-5 text-[var(--gold-primary)]" />
              <p className="hud-text text-[11px] text-[var(--gold-primary)]">{t('restricted')}</p>
              <p className="text-[11px] leading-relaxed text-[var(--text-muted)]">{t('restrictedBody')}</p>
            </div>

            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('username')}</span>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                autoComplete="username"
                autoCapitalize="none"
                spellCheck={false}
                required
                className="bg-black/40 border border-white/10 rounded px-2.5 py-2 text-[12px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('password')}</span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete="current-password"
                required
                className="bg-black/40 border border-white/10 rounded px-2.5 py-2 text-[12px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
              />
            </label>

            {notice && (
              <p role="alert" className={`text-[11px] ${notice === 'expired' ? 'text-[var(--gold-primary)]' : 'text-[var(--alert-red)]'}`}>
                {t(notice)}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex items-center justify-center gap-2 rounded border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 py-2 text-[10px] font-mono font-bold tracking-widest text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20 disabled:opacity-60"
            >
              {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
              {submitting ? t('signingIn') : t('signIn')}
            </button>

            <p className="text-[9px] text-center text-[var(--text-muted)]/70">{t('authorisedUse')}</p>
          </form>
        )}
      </div>
    </div>
  );
}

/** User chip + sign-out button for the RECON panel header. */
export function ReconSessionControls({ size = 'sm' }: { size?: 'sm' | 'lg' }) {
  const t = useT(MESSAGES);
  const { user, canSignOut, signOut } = useReconSession();
  if (!canSignOut) return null;
  const icon = size === 'lg' ? 'w-4 h-4' : 'w-3.5 h-3.5';
  return (
    <span className="flex items-center gap-1.5 min-w-0">
      {user && (
        <span className="hidden sm:inline max-w-[90px] truncate text-[9px] font-mono tracking-wider text-[var(--text-muted)]" title={t('signedInAs', { user })}>
          {user}
        </span>
      )}
      <button
        type="button"
        onClick={signOut}
        className="p-1.5 -m-0.5 rounded text-[var(--text-muted)] hover:text-[var(--alert-red)] hover:bg-white/10 transition-colors"
        title={t('signOut')}
        aria-label={t('signOut')}
      >
        <LogOut className={icon} />
      </button>
    </span>
  );
}
