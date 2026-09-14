'use client';

import { useCallback, useMemo, useState } from 'react';
import { Loader2, FileText, Copy, Check, Download, RefreshCw } from 'lucide-react';
import { defineMessages, useLang, useT } from '@/lib/i18n';
import type { Sitrep, SitrepCounts, SitrepNotable } from '@/lib/sitrep';

/**
 * One-click situational report over the currently loaded map data. The counts
 * are read from what the app already holds, so it needs no extra fetch beyond
 * the report call, and the structured report renders even with no AI key.
 */

const MESSAGES = defineMessages({
  en: {
    title: 'SITREP',
    subtitle: 'Situational report over active layers',
    generate: 'GENERATE SITREP',
    regenerate: 'REGENERATE',
    generating: 'GENERATING…',
    copy: 'Copy',
    copied: 'Copied',
    download: 'Download .txt',
    empty: 'Enable some layers, then generate a report.',
    aiTag: 'AI narrative',
    heuristicTag: 'Auto-generated',
    failed: 'Could not generate the report.',
  },
  it: {
    title: 'SITREP',
    subtitle: 'Rapporto situazionale sui livelli attivi',
    generate: 'GENERA SITREP',
    regenerate: 'RIGENERA',
    generating: 'GENERAZIONE…',
    copy: 'Copia',
    copied: 'Copiato',
    download: 'Scarica .txt',
    empty: 'Attiva alcuni livelli, poi genera il rapporto.',
    aiTag: 'Sintesi AI',
    heuristicTag: 'Generato automaticamente',
    failed: 'Impossibile generare il rapporto.',
  },
});

type SitrepData = Record<string, unknown[]> & Record<string, unknown>;

interface SitrepResponse extends Sitrep {
  narrative: string | null;
  source: 'gemini' | 'heuristic';
}

function len(v: unknown): number {
  return Array.isArray(v) ? v.length : 0;
}

type Row = Record<string, unknown>;
function rows(v: unknown): Row[] {
  return Array.isArray(v) ? (v as Row[]) : [];
}
function str(v: unknown): string | undefined {
  return typeof v === 'string' ? v : undefined;
}
function n(v: unknown): number {
  return typeof v === 'number' ? v : 0;
}

/** Reads counts and a few notable items from the app's loaded data. */
function digest(data: SitrepData): { counts: SitrepCounts; notable: SitrepNotable } {
  const military = rows(data.military_flights);
  const quakes = rows(data.earthquakes);
  const conflicts = rows(data.conflicts).length ? rows(data.conflicts) : rows(data.war_alerts);
  const nav = rows(data.nav_warnings);
  const jam = rows(data.gps_jamming);

  const counts: SitrepCounts = {
    flights: len(data.commercial_flights) + len(data.private_flights) + len(data.private_jets) + military.length,
    military: military.length,
    jets: len(data.private_jets),
    ships: len(data.maritime_ships),
    earthquakes: quakes.length,
    fires: len(data.fires),
    weather: len(data.weather_events),
    conflicts: conflicts.length,
    gdelt: len(data.gdelt) + len(data.gdelt_events),
    navWarnings: nav.length,
    gpsJamming: jam.length,
    cctv: len(data.cctv),
  };

  const notable: SitrepNotable = {
    military: military.slice(0, 5).map(m => ({ callsign: str(m.callsign) || str(m.icao24) || '—', model: str(m.model) })),
    earthquakes: [...quakes]
      .sort((a, b) => n(b.magnitude) - n(a.magnitude))
      .slice(0, 3)
      .map(q => ({ magnitude: n(q.magnitude), place: str(q.place) || str(q.location) || '' })),
    conflicts: conflicts.slice(0, 5).map(z => ({ label: str(z.label) || str(z.name) || str(z.title) || '—', severity: str(z.severity) })),
    navWarnings: nav.slice(0, 5).map(w => ({ navArea: String(w.navArea ?? '?'), msgNumber: n(w.msgNumber), category: String(w.category ?? 'general') })),
    gpsJamming: jam.slice(0, 3).map(z => ({ severity: n(z.severity), count: n(z.count) })),
  };
  return { counts, notable };
}

export default function SitrepPanel({ data }: { data: SitrepData }) {
  const t = useT(MESSAGES);
  const { lang } = useLang();
  const [report, setReport] = useState<SitrepResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);

  const { counts, notable } = useMemo(() => digest(data), [data]);
  const total = useMemo(() => Object.values(counts).reduce((a, b) => a + (b || 0), 0), [counts]);

  const generate = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch('/api/sitrep', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lang, area: { kind: 'viewport' }, counts, notable }),
      });
      if (!res.ok) throw new Error('sitrep failed');
      setReport(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [lang, counts, notable]);

  const fullText = report ? (report.narrative ? `${report.narrative}\n\n${report.text}` : report.text) : '';

  const copy = useCallback(() => {
    navigator.clipboard?.writeText(fullText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }).catch(() => {});
  }, [fullText]);

  const download = useCallback(() => {
    const blob = new Blob([fullText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sitrep-${report?.timestamp?.replace(/[: ]/g, '-') || Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [fullText, report]);

  return (
    <div className="glass-panel pointer-events-auto flex flex-col overflow-hidden w-80 max-h-[70vh]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)]">
        <FileText className="w-3.5 h-3.5 text-[var(--gold-primary)]" />
        <div className="flex flex-col">
          <span className="hud-text text-[11px] text-[var(--text-primary)]">{t('title')}</span>
          <span className="text-[8px] font-mono text-[var(--text-muted)]">{t('subtitle')}</span>
        </div>
      </div>

      <div className="px-4 py-3 overflow-y-auto flex-1 min-h-0">
        {!report && !loading && (
          <p className="text-[11px] text-[var(--text-muted)] leading-relaxed mb-3">
            {total === 0 ? t('empty') : t('subtitle')}
          </p>
        )}

        {loading && (
          <div className="flex items-center justify-center gap-2 py-8 text-[10px] font-mono tracking-widest text-[var(--text-muted)]">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {t('generating')}
          </div>
        )}

        {error && <p role="alert" className="text-[11px] text-[var(--alert-red)] mb-3">{t('failed')}</p>}

        {report && !loading && (
          <div className="mb-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[8px] font-mono px-1.5 py-[1px] rounded border border-[var(--cyan-primary)]/30 text-[var(--cyan-primary)]/80">
                {report.source === 'gemini' ? t('aiTag') : t('heuristicTag')}
              </span>
              <span className="text-[8px] font-mono text-[var(--text-muted)]">{report.timestamp}</span>
            </div>
            {report.narrative && (
              <p className="text-[11px] leading-relaxed text-[var(--text-primary)] mb-3">{report.narrative}</p>
            )}
            <pre className="text-[10px] leading-relaxed text-[var(--text-secondary)] whitespace-pre-wrap font-mono">{report.text}</pre>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 px-3 py-2.5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]">
        <button
          onClick={generate}
          disabled={loading}
          className="flex-1 flex items-center justify-center gap-2 rounded border border-[var(--gold-primary)]/40 bg-[var(--gold-primary)]/10 py-2 text-[10px] font-mono font-bold tracking-widest text-[var(--gold-primary)] hover:bg-[var(--gold-primary)]/20 disabled:opacity-60"
        >
          {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : report ? <RefreshCw className="w-3 h-3" /> : null}
          {loading ? t('generating') : report ? t('regenerate') : t('generate')}
        </button>
        {report && !loading && (
          <>
            <button onClick={copy} title={copied ? t('copied') : t('copy')} aria-label={t('copy')} className="p-2 rounded border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10">
              {copied ? <Check className="w-3.5 h-3.5 text-[var(--alert-green)]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
            <button onClick={download} title={t('download')} aria-label={t('download')} className="p-2 rounded border border-white/10 text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/10">
              <Download className="w-3.5 h-3.5" />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
