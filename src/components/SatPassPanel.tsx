'use client';

import { useCallback, useState } from 'react';
import { Loader2, Satellite, RefreshCw } from 'lucide-react';
import { defineMessages, localeOf, useLang, useT } from '@/lib/i18n';
import { formatCoord } from '@/lib/coords';

/**
 * When an imaging satellite will next see the area on screen.
 *
 * The observer is the map centre, so the question the panel answers is always
 * "this place, in front of me" — no separate coordinate entry to keep in sync
 * with where the operator is actually looking.
 */

const MESSAGES = defineMessages({
  en: {
    title: 'SATELLITE PASSES',
    subtitle: 'Imaging & recon overhead at map centre',
    compute: 'COMPUTE PASSES',
    recompute: 'RECOMPUTE',
    computing: 'PROPAGATING…',
    none: 'No passes above {deg}° in the next {h} h.',
    failed: 'Could not compute passes.',
    notLoaded: 'Turn the satellites layer on once so the catalogue loads, then retry.',
    searched: '{n} satellites searched',
    recon: 'RECON',
    imaging: 'IMAGING',
    elevation: 'max elev.',
    window: 'Window',
    minElev: 'Min elevation',
    hours: '{h} h',
    centre: 'Centre',
    passHint: 'Higher elevation means a better look at the target.',
  },
  it: {
    title: 'PASSAGGI SATELLITI',
    subtitle: 'Osservazione e ricognizione sul centro mappa',
    compute: 'CALCOLA PASSAGGI',
    recompute: 'RICALCOLA',
    computing: 'PROPAGAZIONE…',
    none: 'Nessun passaggio sopra {deg}° nelle prossime {h} h.',
    failed: 'Impossibile calcolare i passaggi.',
    notLoaded: 'Attiva una volta il livello satelliti per caricare il catalogo, poi riprova.',
    searched: '{n} satelliti esaminati',
    recon: 'RICOGNIZIONE',
    imaging: 'OSSERVAZIONE',
    elevation: 'elev. max',
    window: 'Finestra',
    minElev: 'Elevazione min.',
    hours: '{h} h',
    centre: 'Centro',
    passHint: 'Più alta è l’elevazione, migliore è la vista sull’obiettivo.',
  },
});

interface Pass {
  name: string;
  category: 'recon' | 'imaging' | 'other';
  start: string;
  culmination: string;
  end: string;
  maxElevation: number;
  culminationAzimuth: number;
  rangeKm: number;
  durationMinutes: number;
}

export default function SatPassPanel({ centre }: { centre: { lat: number; lng: number } | null }) {
  const t = useT(MESSAGES);
  const { lang } = useLang();
  const locale = localeOf(lang);
  const [passes, setPasses] = useState<Pass[] | null>(null);
  const [searched, setSearched] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<'failed' | 'notLoaded' | null>(null);
  const [hours, setHours] = useState(24);
  const [minElevation, setMinElevation] = useState(20);

  const compute = useCallback(async () => {
    if (!centre) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/satellites/passes?lat=${centre.lat.toFixed(4)}&lng=${centre.lng.toFixed(4)}&hours=${hours}&minElevation=${minElevation}`);
      if (res.status === 503) { setError('notLoaded'); setPasses(null); return; }
      if (!res.ok) throw new Error('passes failed');
      const data = await res.json();
      setPasses(data.passes ?? []);
      setSearched(data.searched ?? 0);
    } catch {
      setError('failed');
      setPasses(null);
    } finally {
      setLoading(false);
    }
  }, [centre, hours, minElevation]);

  const time = (iso: string) =>
    new Date(iso).toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit', hour12: false });
  const day = (iso: string) =>
    new Date(iso).toLocaleDateString(locale, { day: '2-digit', month: 'short' });

  return (
    <div className="glass-panel pointer-events-auto flex flex-col overflow-hidden w-80 max-h-[70vh]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)]">
        <Satellite className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
        <div className="flex flex-col">
          <span className="hud-text text-[11px] text-[var(--text-primary)]">{t('title')}</span>
          <span className="text-[8px] font-mono text-[var(--text-muted)]">{t('subtitle')}</span>
        </div>
      </div>

      <div className="px-3 py-3 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3">
        <div className="text-[9px] font-mono text-[var(--text-muted)] flex justify-between">
          <span>{t('centre')}</span>
          <span className="text-[var(--gold-primary)] tabular-nums">
            {centre ? formatCoord(centre.lat, centre.lng, 'dd') : '—'}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('window')}</span>
            <select
              value={hours}
              onChange={e => setHours(Number(e.target.value))}
              className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
            >
              {[6, 12, 24, 48].map(h => <option key={h} value={h}>{t('hours', { h })}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('minElev')}</span>
            <select
              value={minElevation}
              onChange={e => setMinElevation(Number(e.target.value))}
              className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
            >
              {[10, 20, 40, 60].map(d => <option key={d} value={d}>{d}°</option>)}
            </select>
          </label>
        </div>

        {loading && (
          <div className="flex items-center justify-center gap-2 py-6 text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('computing')}
          </div>
        )}

        {error && <p role="alert" className="text-[11px] text-[var(--alert-red)]">{t(error)}</p>}

        {passes && !loading && passes.length === 0 && (
          <p className="text-[11px] text-[var(--text-muted)]">{t('none', { deg: minElevation, h: hours })}</p>
        )}

        {passes && passes.length > 0 && !loading && (
          <>
            <div className="flex flex-col gap-1.5">
              {passes.map((p, i) => (
                <div key={`${p.name}-${p.culmination}-${i}`} className="border border-white/[0.06] rounded px-2 py-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[var(--text-primary)] truncate">{p.name}</span>
                    <span
                      className="text-[8px] font-mono px-1 py-[1px] rounded flex-shrink-0"
                      style={{
                        color: p.category === 'recon' ? '#FF6B6B' : '#4DD0E1',
                        border: `1px solid ${p.category === 'recon' ? 'rgba(255,107,107,0.4)' : 'rgba(77,208,225,0.4)'}`,
                      }}
                    >
                      {t(p.category === 'recon' ? 'recon' : 'imaging')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-mono text-[var(--text-muted)] mt-0.5 tabular-nums">
                    <span>{day(p.culmination)} {time(p.start)}–{time(p.end)}</span>
                    <span className="text-[var(--gold-primary)]">{t('elevation')} {p.maxElevation}°</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-[8px] font-mono text-[var(--text-muted)]/70">
              {t('searched', { n: searched })} · {t('passHint')}
            </p>
          </>
        )}
      </div>

      <div className="px-3 py-2.5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]">
        <button
          onClick={compute}
          disabled={loading || !centre}
          className="w-full flex items-center justify-center gap-2 rounded border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 py-2 text-[10px] font-mono font-bold tracking-widest text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : passes ? <RefreshCw className="w-3 h-3" /> : null}
          {loading ? t('computing') : passes ? t('recompute') : t('compute')}
        </button>
      </div>
    </div>
  );
}
