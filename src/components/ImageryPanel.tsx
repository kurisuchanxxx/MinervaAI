'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Images, Loader2, RefreshCw } from 'lucide-react';
import { defineMessages, localeOf, useLang, useT } from '@/lib/i18n';
import { defaultDates, gibsImageUrl, IMAGERY_LAYERS, layerById, type BBox } from '@/lib/imagery';

/**
 * Before/after satellite comparison over the current view.
 *
 * The two images are stacked and the top one is clipped by a draggable divider,
 * which is the way this comparison is normally read: one scene, one moment in
 * time on each side of the line.
 */

const MESSAGES = defineMessages({
  en: {
    title: 'BEFORE / AFTER',
    subtitle: 'Satellite change comparison',
    before: 'Before',
    after: 'After',
    layer: 'Imagery',
    trueColor: 'True colour (VIIRS/NOAA-20)',
    trueColorSnpp: 'True colour (VIIRS/SNPP)',
    nightLights: 'Night lights',
    thermal: 'Fire / burn scars',
    load: 'LOAD COMPARISON',
    reload: 'RELOAD',
    loading: 'LOADING…',
    drag: 'Drag the divider to compare',
    noView: 'Move the map to choose an area.',
    resolution: 'Daily global mosaic, ~250 m per pixel.',
    scenes: 'Sentinel-2 passes (10 m)',
    scenesHint: 'Clear-sky dates worth comparing. Click one to use it.',
    cloud: '{n}% cloud',
    cloudUnknown: 'cloud n/a',
    noScenes: 'No Sentinel-2 pass in the last 45 days.',
    scenesFailed: 'Scene catalogue unavailable.',
    imageFailed: 'Imagery not available for this date.',
  },
  it: {
    title: 'PRIMA / DOPO',
    subtitle: 'Confronto satellitare dei cambiamenti',
    before: 'Prima',
    after: 'Dopo',
    layer: 'Immagini',
    trueColor: 'Colori reali (VIIRS/NOAA-20)',
    trueColorSnpp: 'Colori reali (VIIRS/SNPP)',
    nightLights: 'Luci notturne',
    thermal: 'Incendi / aree bruciate',
    load: 'CARICA CONFRONTO',
    reload: 'RICARICA',
    loading: 'CARICAMENTO…',
    drag: 'Trascina il divisorio per confrontare',
    noView: 'Sposta la mappa per scegliere un’area.',
    resolution: 'Mosaico globale giornaliero, ~250 m per pixel.',
    scenes: 'Passaggi Sentinel-2 (10 m)',
    scenesHint: 'Date con cielo sereno, utili da confrontare. Clicca per usarne una.',
    cloud: '{n}% nuvole',
    cloudUnknown: 'nuvole n.d.',
    noScenes: 'Nessun passaggio Sentinel-2 negli ultimi 45 giorni.',
    scenesFailed: 'Catalogo scene non disponibile.',
    imageFailed: 'Immagine non disponibile per questa data.',
  },
});

type MsgKey = keyof typeof MESSAGES.en & string;

interface Scene {
  id: string;
  date: string;
  cloudCover: number;
  platform: string | null;
}

interface Props {
  bounds: BBox | null;
  centre: { lat: number; lng: number } | null;
}

export default function ImageryPanel({ bounds, centre }: Props) {
  const t = useT(MESSAGES);
  const { lang } = useLang();
  const locale = localeOf(lang);

  const initial = useMemo(() => defaultDates(), []);
  const [before, setBefore] = useState(initial.before);
  const [after, setAfter] = useState(initial.after);
  const [layerId, setLayerId] = useState('trueColor');
  const [loaded, setLoaded] = useState<{ before: string; after: string; viewKey: string } | null>(null);
  const [split, setSplit] = useState(50);
  const [scenes, setScenes] = useState<Scene[] | null>(null);
  const [scenesError, setScenesError] = useState(false);
  const [failed, setFailed] = useState<{ before: boolean; after: boolean }>({ before: false, after: false });
  const dragging = useRef(false);
  const frameRef = useRef<HTMLDivElement>(null);

  /* The comparison is only meaningful for the area it was loaded for, so a
     moved map invalidates it. The view the images were built for is carried in
     the same state as the dates, so staleness is a plain comparison during
     render — no effect writing state, and no stale pair shown for a frame. */
  const viewKey = bounds ? `${bounds.west},${bounds.south},${bounds.east},${bounds.north}` : '';
  const stale = loaded !== null && loaded.viewKey !== viewKey;

  const centreLat = centre?.lat;
  const centreLng = centre?.lng;
  useEffect(() => {
    if (centreLat === undefined || centreLng === undefined) return;
    let cancelled = false;
    fetch(`/api/imagery/scenes?lat=${centreLat.toFixed(3)}&lng=${centreLng.toFixed(3)}`)
      .then(res => (res.ok ? res.json() : Promise.reject(new Error('scenes'))))
      .then(data => { if (!cancelled) { setScenes(data.scenes ?? []); setScenesError(false); } })
      .catch(() => { if (!cancelled) { setScenes([]); setScenesError(true); } });
    return () => { cancelled = true; };
  }, [centreLat, centreLng]);

  const urlFor = useCallback(
    (date: string) =>
      bounds ? gibsImageUrl({ layer: layerById(layerId).gibs, bbox: bounds, date, width: 640, height: 480 }) : '',
    [bounds, layerId],
  );

  /* Plain function on purpose: the button is disabled without bounds, and the
     compiler memoises it better than a hand-written dependency list. */
  function load() {
    if (!bounds) return;
    setFailed({ before: false, after: false });
    setLoaded({ before, after, viewKey: `${bounds.west},${bounds.south},${bounds.east},${bounds.north}` });
    setSplit(50);
  }

  const moveSplit = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    setSplit(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  }, []);

  useEffect(() => {
    const onMove = (e: MouseEvent) => { if (dragging.current) moveSplit(e.clientX); };
    const onUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => { window.removeEventListener('mousemove', onMove); window.removeEventListener('mouseup', onUp); };
  }, [moveSplit]);

  const dayLabel = (iso: string) =>
    new Date(`${iso}T12:00:00Z`).toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div className="glass-panel pointer-events-auto flex flex-col overflow-hidden w-[22rem] max-h-[80vh]">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.3)]">
        <Images className="w-3.5 h-3.5 text-[var(--cyan-primary)]" />
        <div className="flex flex-col">
          <span className="hud-text text-[11px] text-[var(--text-primary)]">{t('title')}</span>
          <span className="text-[8px] font-mono text-[var(--text-muted)]">{t('subtitle')}</span>
        </div>
      </div>

      <div className="px-3 py-3 overflow-y-auto flex-1 min-h-0 flex flex-col gap-3">
        {!bounds && <p className="text-[11px] text-[var(--text-muted)]">{t('noView')}</p>}

        <label className="flex flex-col gap-1">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('layer')}</span>
          <select
            value={layerId}
            onChange={e => { setLayerId(e.target.value); setLoaded(null); }}
            className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
          >
            {IMAGERY_LAYERS.map(l => <option key={l.id} value={l.id}>{t(l.id as MsgKey)}</option>)}
          </select>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('before')}</span>
            <input
              type="date"
              value={before}
              max={after}
              onChange={e => { setBefore(e.target.value); setLoaded(null); }}
              className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('after')}</span>
            <input
              type="date"
              value={after}
              min={before}
              onChange={e => { setAfter(e.target.value); setLoaded(null); }}
              className="bg-black/40 border border-white/10 rounded px-2 py-1.5 text-[11px] font-mono text-[var(--text-primary)] outline-none focus:border-[var(--cyan-primary)]/60"
            />
          </label>
        </div>

        {loaded && !stale && (
          <div className="flex flex-col gap-1">
            <div
              ref={frameRef}
              className="relative w-full aspect-[4/3] overflow-hidden rounded border border-white/10 bg-black select-none"
              onMouseDown={e => { dragging.current = true; moveSplit(e.clientX); }}
              onTouchMove={e => moveSplit(e.touches[0].clientX)}
            >
              {/* eslint-disable @next/next/no-img-element */}
              <img
                src={urlFor(loaded.after)}
                alt={t('after')}
                className="absolute inset-0 w-full h-full object-cover"
                onError={() => setFailed(f => ({ ...f, after: true }))}
              />
              {/* Clipping the full-size image keeps both frames in register;
                  resizing a wrapper would squash the "before" side instead. */}
              <img
                src={urlFor(loaded.before)}
                alt={t('before')}
                className="absolute inset-0 w-full h-full object-cover"
                style={{ clipPath: `inset(0 ${100 - split}% 0 0)` }}
                onError={() => setFailed(f => ({ ...f, before: true }))}
              />
              {/* eslint-enable @next/next/no-img-element */}
              <div
                className="absolute top-0 bottom-0 w-[2px] bg-[var(--cyan-primary)] cursor-ew-resize"
                style={{ left: `${split}%` }}
                role="separator"
                aria-label={t('drag')}
              >
                <span className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 left-1/2 w-4 h-4 rounded-full bg-[var(--cyan-primary)] shadow" />
              </div>
              <span className="absolute bottom-1 left-1 text-[9px] font-mono px-1.5 py-[1px] rounded bg-black/70 text-[var(--text-primary)]">
                {dayLabel(loaded.before)}
              </span>
              <span className="absolute bottom-1 right-1 text-[9px] font-mono px-1.5 py-[1px] rounded bg-black/70 text-[var(--text-primary)]">
                {dayLabel(loaded.after)}
              </span>
            </div>
            <p className="text-[8px] font-mono text-[var(--text-muted)]/70">{t('drag')} · {t('resolution')}</p>
            {(failed.before || failed.after) && (
              <p role="alert" className="text-[10px] text-[var(--alert-red)]">{t('imageFailed')}</p>
            )}
          </div>
        )}

        <div className="border-t border-white/[0.06] pt-2">
          <span className="text-[9px] font-mono uppercase tracking-widest text-[var(--text-muted)]">{t('scenes')}</span>
          {scenes === null && (
            <div className="flex items-center gap-2 py-3 text-[10px] font-mono text-[var(--text-muted)]">
              <Loader2 className="w-3 h-3 animate-spin" /> {t('loading')}
            </div>
          )}
          {scenesError && <p className="text-[10px] text-[var(--alert-red)] mt-1">{t('scenesFailed')}</p>}
          {scenes && scenes.length === 0 && !scenesError && (
            <p className="text-[10px] text-[var(--text-muted)] mt-1">{t('noScenes')}</p>
          )}
          {scenes && scenes.length > 0 && (
            <>
              <p className="text-[8px] font-mono text-[var(--text-muted)]/70 mb-1">{t('scenesHint')}</p>
              <div className="flex flex-wrap gap-1">
                {scenes.slice(0, 12).map(s => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => { setAfter(s.date); setLoaded(null); }}
                    className="px-1.5 py-1 rounded border border-white/10 text-[9px] font-mono text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-white/5"
                    title={s.platform ?? undefined}
                  >
                    {s.date.slice(5)}{' '}
                    <span style={{ color: s.cloudCover < 0 ? 'inherit' : s.cloudCover < 20 ? 'var(--alert-green)' : s.cloudCover < 60 ? 'var(--gold-primary)' : 'var(--alert-red)' }}>
                      {s.cloudCover < 0 ? t('cloudUnknown') : t('cloud', { n: s.cloudCover })}
                    </span>
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5 border-t border-[rgba(255,255,255,0.05)] bg-[rgba(0,0,0,0.2)]">
        <button
          onClick={load}
          disabled={!bounds}
          className="w-full flex items-center justify-center gap-2 rounded border border-[var(--cyan-primary)]/40 bg-[var(--cyan-primary)]/10 py-2 text-[10px] font-mono font-bold tracking-widest text-[var(--cyan-primary)] hover:bg-[var(--cyan-primary)]/20 disabled:opacity-60"
        >
          {loaded ? <RefreshCw className="w-3 h-3" /> : null}
          {loaded ? t('reload') : t('load')}
        </button>
      </div>
    </div>
  );
}
