'use client';

import { memo, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plane, Satellite, Sun, AlertTriangle, Camera,
  CloudLightning, Ship, Network, Database, Ghost,
  Flame, Tv, Radio, Mountain, Anchor, Megaphone, SlidersHorizontal
} from 'lucide-react';
import StyleStudio from './StyleStudio';
import { TERRAIN_MIN_ZOOM, type TerrainStatus } from '@/lib/map-terrain';
import { defineMessages, useT } from '@/lib/i18n';

const MESSAGES = defineMessages({
  en: {
    groupSdk: 'MinervaAI SDK',
    groupAviation: 'AVIATION',
    groupMaritime: 'MARITIME',
    groupSpace: 'SPACE TRACKING',
    groupSurveillance: 'SURVEILLANCE',
    groupHazards: 'NATURAL HAZARDS',
    groupThreats: 'THREATS & INTEL',
    groupNetwork: 'NETWORK INTEL',
    groupNetEvent: 'NET & EVENT INTEL',
    groupDisplay: 'DISPLAY',
    sdkSea: 'Maritime Lines',
    flights: 'Commercial',
    private: 'Private',
    jets: 'Private Jets',
    military: 'Military',
    maritime: 'Maritime / Naval',
    satellites: 'All Satellites',
    satComms: 'Starlink / Comms',
    satMilitary: 'Military / Intel',
    satNavigation: 'GPS / Navigation',
    satEarth: 'Earth Observation',
    satScience: 'Stations / Telescopes',
    cctv: 'CCTV Cameras',
    cctvPreviews: 'Live Previews',
    liveNews: 'Live News Feeds',
    earthquakes: 'Earthquakes',
    fires: 'Active Fires',
    weather: 'Severe Weather',
    infrastructure: 'Nuclear Facilities',
    globalIncidents: 'Global Incidents',
    gdeltEvents: 'GDELT Events',
    malware: 'Live Malware',
    cyberAttacks: 'Live Attacks',
    cfOutages: 'Internet Outages',
    cfAttacks: 'Attack Origins',
    dayNight: 'Day / Night Cycle',
    buildings3d: '3D Buildings',
    buildings3dDesc: 'City detail · zoom 14.5+',
    terrain3d: '3D Terrain',
    terrain3dDesc: 'Mountains · zoom 10+',
    terrainIdle: 'Terrain at zoom {zoom}+ · zoom in',
    terrainWaiting: 'Terrain starts when you stop moving',
    terrainLoading: 'Loading nearby terrain…',
    terrainError: 'Terrain unavailable; the map is still usable.',
    terrainOn: 'Terrain on',
    zoomToTerrain: 'Zoom to terrain',
    retryTerrain: 'Retry terrain',
    terrainNote: 'Nearby detail only · cached tiles',
    terrainCredits: 'Terrain credits',
    styleStudio: 'Style Studio',
    ghostProtocol: 'Ghost Protocol',
    activeCount: '{n} active',
    none: 'NONE',
    all: 'ALL',
    close: 'Close',
    dormantHint: 'Turn the layer above on to use this',
  },
  it: {
    groupSdk: 'MinervaAI SDK',
    groupAviation: 'AVIAZIONE',
    groupMaritime: 'MARITTIMO',
    groupSpace: 'SPAZIO',
    groupSurveillance: 'SORVEGLIANZA',
    groupHazards: 'RISCHI NATURALI',
    groupThreats: 'MINACCE & INTEL',
    groupNetwork: 'INTEL DI RETE',
    groupNetEvent: 'INTEL RETE & EVENTI',
    groupDisplay: 'VISUALIZZAZIONE',
    sdkSea: 'Rotte marittime',
    flights: 'Commerciali',
    private: 'Privati',
    jets: 'Jet privati',
    military: 'Militari',
    maritime: 'Marittimo / Navale',
    satellites: 'Tutti i satelliti',
    satComms: 'Starlink / Telecom',
    satMilitary: 'Militari / Intel',
    satNavigation: 'GPS / Navigazione',
    satEarth: 'Osservazione terrestre',
    satScience: 'Stazioni / Telescopi',
    cctv: 'Telecamere CCTV',
    cctvPreviews: 'Anteprime live',
    liveNews: 'Notizie in diretta',
    earthquakes: 'Terremoti',
    fires: 'Incendi attivi',
    weather: 'Meteo estremo',
    infrastructure: 'Impianti nucleari',
    globalIncidents: 'Incidenti globali',
    gdeltEvents: 'Eventi GDELT',
    malware: 'Malware live',
    cyberAttacks: 'Attacchi live',
    cfOutages: 'Interruzioni Internet',
    cfAttacks: 'Origini attacchi',
    dayNight: 'Ciclo giorno / notte',
    buildings3d: 'Edifici 3D',
    buildings3dDesc: 'Dettaglio città · zoom 14.5+',
    terrain3d: 'Rilievo 3D',
    terrain3dDesc: 'Montagne · zoom 10+',
    terrainIdle: 'Rilievo da zoom {zoom}+ · avvicinati',
    terrainWaiting: 'Il rilievo parte quando smetti di muoverti',
    terrainLoading: 'Caricamento rilievo vicino…',
    terrainError: 'Rilievo non disponibile; la mappa resta utilizzabile.',
    terrainOn: 'Rilievo attivo',
    zoomToTerrain: 'Zoom sul rilievo',
    retryTerrain: 'Riprova rilievo',
    terrainNote: 'Solo dettaglio vicino · tile in cache',
    terrainCredits: 'Crediti rilievo',
    styleStudio: 'Style Studio',
    ghostProtocol: 'Ghost Protocol',
    activeCount: '{n} attivi',
    none: 'NESSUNO',
    all: 'TUTTI',
    close: 'Chiudi',
    dormantHint: 'Attiva il livello superiore per usarlo',
  },
});

type MessageKey = keyof typeof MESSAGES.en;

interface LayerPanelProps {
  data: any;
  activeLayers: any;
  setActiveLayers: React.Dispatch<React.SetStateAction<any>>;
  isMobile?: boolean;
  theme?: 'core' | 'ghost';
  setTheme?: (theme: 'core' | 'ghost') => void;
  /** Server-side capabilities, e.g. { cloudflare: true }. Layers declaring a
   *  `requires` key stay hidden until the matching capability is present. */
  capabilities?: Record<string, boolean>;
  terrainStatus?: TerrainStatus;
  onTerrainRetry?: () => void;
  onTerrainFocus?: () => void;
  on3DModeSelected?: () => void;
}

interface LayerDef {
  key: string;
  /** Message key. */
  label: MessageKey;
  dataKey: string;
  /** Message key. */
  description?: MessageKey;
  /** Reads a bucket out of data.category_counts instead of a top-level array. */
  catKey?: string;
  /** Capability that must be configured server-side for this layer to appear. */
  requires?: string;
  /** Key of the layer this one modifies. Renders indented beneath it, and reads
   *  as inert while that parent is off — it has nothing to act on. */
  parent?: string;
}

interface LayerGroupDef {
  label: string;
  /** Message key. */
  fullLabel: MessageKey;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  layers: LayerDef[];
}

const LAYER_GROUPS: LayerGroupDef[] = [
  {
    label: 'SDK',
    fullLabel: 'groupSdk',
    icon: Network,
    layers: [
      { key: 'sdk_sea', label: 'sdkSea', dataKey: 'sdk_entities' },
    ],
  },
  {
    label: 'AVIATION',
    fullLabel: 'groupAviation',
    icon: Plane,
    layers: [
      { key: 'flights', label: 'flights', dataKey: 'commercial_flights' },
      { key: 'private', label: 'private', dataKey: 'private_flights' },
      { key: 'jets', label: 'jets', dataKey: 'private_jets' },
      { key: 'military', label: 'military', dataKey: 'military_flights' },
    ],
  },
  {
    label: 'MARITIME',
    fullLabel: 'groupMaritime',
    icon: Ship,
    layers: [
      { key: 'maritime', label: 'maritime', dataKey: 'maritime_ships,maritime_ports,maritime_chokepoints' },
    ],
  },
  {
    label: 'SPACE',
    fullLabel: 'groupSpace',
    icon: Satellite,
    layers: [
      { key: 'satellites', label: 'satellites', dataKey: 'satellites' },
      { key: 'sat_comms', label: 'satComms', dataKey: 'satellites', catKey: 'comms' },
      { key: 'sat_military', label: 'satMilitary', dataKey: 'satellites', catKey: 'military' },
      { key: 'sat_navigation', label: 'satNavigation', dataKey: 'satellites', catKey: 'navigation' },
      { key: 'sat_earth', label: 'satEarth', dataKey: 'satellites', catKey: 'earth_obs' },
      { key: 'sat_science', label: 'satScience', dataKey: 'satellites', catKey: 'science' },
    ],
  },
  {
    label: 'SURVEIL',
    fullLabel: 'groupSurveillance',
    icon: Camera,
    layers: [
      { key: 'cctv', label: 'cctv', dataKey: 'cameras' },
      { key: 'cctv_previews', label: 'cctvPreviews', dataKey: '', parent: 'cctv' },
      { key: 'live_news', label: 'liveNews', dataKey: 'live_feeds' },
    ],
  },
  {
    label: 'HAZARD',
    fullLabel: 'groupHazards',
    icon: CloudLightning,
    layers: [
      { key: 'earthquakes', label: 'earthquakes', dataKey: 'earthquakes' },
      { key: 'fires', label: 'fires', dataKey: 'fires' },
      { key: 'weather', label: 'weather', dataKey: 'weather_events' },
    ],
  },
  {
    label: 'THREAT',
    fullLabel: 'groupThreats',
    icon: AlertTriangle,
    layers: [
      { key: 'infrastructure', label: 'infrastructure', dataKey: 'infrastructure' },
      { key: 'global_incidents', label: 'globalIncidents', dataKey: 'gdelt' },
      { key: 'gdelt_events', label: 'gdeltEvents', dataKey: 'gdelt_events' },
    ],
  },
  {
    label: 'NETWORK',
    fullLabel: 'groupNetwork',
    icon: Network,
    layers: [
      { key: 'malware', label: 'malware', dataKey: 'malware_threats' },
      { key: 'cyber_attacks', label: 'cyberAttacks', dataKey: 'cyber_attacks' },
    ],
  },
  {
    label: 'NETINTEL',
    fullLabel: 'groupNetEvent',
    icon: Megaphone,
    layers: [
      { key: 'cf_outages', label: 'cfOutages', dataKey: 'cf_outages', requires: 'cloudflare' },
      { key: 'cf_attacks', label: 'cfAttacks', dataKey: 'cf_attack_origins', requires: 'cloudflare' },
    ],
  },
  {
    label: 'DISPLAY',
    fullLabel: 'groupDisplay',
    icon: Sun,
    layers: [
      { key: 'day_night', label: 'dayNight', dataKey: '' },
      { key: 'terrain_3d', label: 'buildings3d', description: 'buildings3dDesc', dataKey: '' },
      { key: 'terrain_elevation', label: 'terrain3d', description: 'terrain3dDesc', dataKey: '' },
    ],
  },
];

/* ── Minimal Toggle Switch ── */
/**
 * Presentational only. The row around it is the button, and a button inside a
 * button is invalid HTML — the browser reparents it, which breaks hydration and
 * silently drops the click handler on the inner control.
 */
function ToggleSwitch({ active }: { active: boolean }) {
  return (
    <span
      role="presentation"
      className="relative flex-shrink-0 block"
      style={{ width: 28, height: 14 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-all duration-300"
        style={{
          background: active ? 'rgba(255,255,255,0.2)' : 'transparent',
          border: active ? '1px solid rgba(255,255,255,0.35)' : '1px solid rgba(255,255,255,0.12)',
          boxShadow: active ? '0 0 8px rgba(255,255,255,0.1)' : 'none',
        }}
      />
      <motion.div
        className="absolute top-[2px] rounded-full"
        style={{
          width: 10,
          height: 10,
          background: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
          boxShadow: active ? '0 0 6px rgba(255,255,255,0.4)' : 'none',
        }}
        animate={{ left: active ? 16 : 2 }}
        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
      />
    </span>
  );
}

/**
 * The elbow that ties a sub-layer row to the layer above it. Indentation alone
 * reads as a typo at this size; the line is what says "this belongs to that".
 */
function SubLayerStem() {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute left-[6px] top-0 h-1/2 w-[8px] rounded-bl-[3px] border-b border-l border-white/[0.14]"
    />
  );
}

function LayerPanel({ data, activeLayers, setActiveLayers, isMobile, theme = 'core', setTheme, capabilities = {}, terrainStatus = 'idle', onTerrainRetry, onTerrainFocus, on3DModeSelected }: LayerPanelProps) {
  const t = useT(MESSAGES);
  const [hoveredGroup, setHoveredGroup] = useState<string | null>(null);
  /**
   * A pinned group stays open when the pointer leaves. Hover-only flyouts are
   * fine to glance at and impossible to work in — reaching for a toggle at the
   * far edge closes the thing you were reaching for.
   */
  const [pinnedGroup, setPinnedGroup] = useState<string | null>(null);
  const [studioOpen, setStudioOpen] = useState(false);

  useEffect(() => {
    if (!pinnedGroup) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPinnedGroup(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pinnedGroup]);

  const toggle = (key: string) => {
    if ((key === 'terrain_elevation' || key === 'terrain_3d') && !activeLayers[key]) on3DModeSelected?.();
    setActiveLayers((prev: any) => ({ ...prev, [key]: !prev[key] }));
  };
  const terrainDetails = activeLayers.terrain_elevation ? (
    <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[10px] text-white/60">
      <p role="status">{terrainStatus === 'idle' ? t('terrainIdle', { zoom: TERRAIN_MIN_ZOOM }) : terrainStatus === 'waiting' ? t('terrainWaiting') : terrainStatus === 'loading' ? t('terrainLoading') : terrainStatus === 'error' ? t('terrainError') : t('terrainOn')}</p>
      {terrainStatus === 'idle' && <button type="button" onClick={onTerrainFocus} className="mt-2 min-h-8 rounded border border-white/15 px-2 text-[var(--gold-primary)] hover:bg-white/10">{t('zoomToTerrain')}</button>}
      {terrainStatus === 'error' && <button type="button" onClick={onTerrainRetry} className="mt-2 min-h-8 rounded border border-white/15 px-2 text-[var(--gold-primary)] hover:bg-white/10">{t('retryTerrain')}</button>}
      <p className="mt-2 text-white/35">{t('terrainNote')}</p>
      <a className="mt-1 inline-block underline underline-offset-2" href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener noreferrer">{t('terrainCredits')}</a>
    </div>
  ) : null;

  /** Switch a whole group at once — off if any are on, otherwise all on. */
  const toggleGroup = (layers: LayerDef[]) => {
    const anyOn = layers.some(l => activeLayers[l.key]);
    if (!anyOn && layers.some(l => l.key === 'terrain_elevation' || l.key === 'terrain_3d')) on3DModeSelected?.();
    setActiveLayers((prev: any) => {
      const next = { ...prev };
      for (const l of layers) next[l.key] = !anyOn;
      return next;
    });
  };

  /* Drop layers whose backing capability is not configured, then drop any group
     left with nothing to show. */
  const visibleGroups = LAYER_GROUPS.map(g => ({
    ...g,
    layers: g.layers.filter(l => !l.requires || capabilities[l.requires]),
  })).filter(g => g.layers.length > 0);

  const getCount = (dk: string, catKey?: string): number | null => {
    if (!dk) return null;
    if (catKey && data.category_counts) {
      return data.category_counts[catKey] || 0;
    }
    let total = 0;
    let found = false;
    for (const k of dk.split(',')) {
      if (data[k] && Array.isArray(data[k])) {
        total += data[k].length;
        found = true;
      }
    }
    return found ? total : null;
  };

  /* ── MOBILE ── */
  if (isMobile) {
    return (
      <div className="flex flex-col gap-5 py-2">
        {visibleGroups.map((group) => (
          <div key={group.label} className="flex flex-col gap-2">
            <div className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/30 border-b border-white/[0.06] pb-1.5">
              {t(group.fullLabel)}
            </div>
            <div className="flex flex-col gap-1">
              {group.layers.map((layer) => {
                const isLayerActive = activeLayers[layer.key];
                const count = getCount(layer.dataKey, layer.catKey);
                const dormant = !!layer.parent && !activeLayers[layer.parent];
                return (
                  <button
                    key={layer.key}
                    onClick={() => toggle(layer.key)}
                    aria-pressed={!!isLayerActive}
                    aria-label={t(layer.label)}
                    className={`relative w-full flex items-center gap-3 py-2 rounded-md text-left hover:bg-white/[0.04] transition-colors ${layer.parent ? 'pl-[22px] pr-1' : 'px-1'} ${dormant ? 'opacity-40' : ''}`}
                  >
                    {layer.parent && <SubLayerStem />}
                    <ToggleSwitch active={!!isLayerActive} />
                    <span className={`text-[11px] font-mono uppercase tracking-wider flex-1 transition-colors ${isLayerActive ? 'text-white/80' : 'text-white/40'}`}>
                      {t(layer.label)}
                      {layer.description && <span className="block mt-0.5 text-[9px] normal-case tracking-normal text-white/35">{t(layer.description)}</span>}
                    </span>
                    {count !== null && (
                      <span className="text-[10px] font-mono tabular-nums text-white/25">
                        {count.toLocaleString()}
                      </span>
                    )}
                  </button>
                );
              })}
              {group.label === 'DISPLAY' && terrainDetails}
            </div>
          </div>
        ))}

        {/* MOBILE STYLE STUDIO */}
        <div className="flex items-center justify-between mt-2 pt-3 border-t border-white/[0.06] px-1">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/25 uppercase">{t('styleStudio')}</span>
          <button
            onClick={() => setStudioOpen(o => !o)}
            aria-pressed={studioOpen}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
            style={{
              background: studioOpen ? 'var(--hover-accent)' : 'transparent',
              boxShadow: studioOpen ? '0 0 12px var(--gold-glow)' : 'none',
            }}
          >
            <SlidersHorizontal className="w-4 h-4" style={{ color: studioOpen ? 'var(--gold-primary)' : 'rgba(255,255,255,0.25)' }} />
          </button>
        </div>
        <AnimatePresence>
          {studioOpen && <StyleStudio isMobile onClose={() => setStudioOpen(false)} />}
        </AnimatePresence>

        {/* MOBILE GHOST TOGGLE */}
        {setTheme && (
          <div className="flex items-center justify-between pt-3 border-t border-white/[0.06] px-1">
            <span className="text-[10px] font-mono tracking-[0.2em] text-white/25 uppercase">{t('ghostProtocol')}</span>
            <button
              onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
              style={{
                background: theme === 'ghost' ? 'rgba(179, 136, 255, 0.15)' : 'transparent',
                boxShadow: theme === 'ghost' ? '0 0 12px rgba(179, 136, 255, 0.3)' : 'none',
              }}
            >
              <Ghost className="w-4 h-4" style={{ color: theme === 'ghost' ? '#B388FF' : 'rgba(255,255,255,0.25)' }} />
            </button>
          </div>
        )}
      </div>
    );
  }

  /* ── DESKTOP ── */
  return (
    <motion.div
      initial={{ x: -60, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ type: 'spring', damping: 30, stiffness: 200, delay: 2.8 }}
      className="absolute top-0 left-0 h-full w-[48px] flex flex-col items-center pt-24 pb-6 z-50 pointer-events-auto"
      style={{
        background: 'rgba(0,0,0,0.15)',
        backdropFilter: 'blur(24px) saturate(1.2)',
        WebkitBackdropFilter: 'blur(24px) saturate(1.2)',
      }}
    >
      <div className="flex-1 flex flex-col items-center gap-1">
        {visibleGroups.map((group) => {
          /* Sub-layers modify a parent rather than draw anything of their own,
             so they do not count towards the rail's reading. */
          const counted = group.layers.filter(l => !l.parent);
          const groupActive = counted.some(l => activeLayers[l.key]);
          const isHovered = hoveredGroup === group.label;
          const Icon = group.icon;

          const activeCount = counted.filter(l => activeLayers[l.key]).length;
          const isPinned = pinnedGroup === group.label;
          const isOpen = isHovered || isPinned;

          return (
            <div
              key={group.label}
              className="relative flex items-center justify-center"
              onMouseEnter={() => setHoveredGroup(group.label)}
              onMouseLeave={() => setHoveredGroup(null)}
            >
              {/* A real button, not a div: this is keyboard reachable, focusable
                  and announced. Clicking pins the flyout open so it can be
                  worked in rather than only glanced at. */}
              <button
                onClick={() => setPinnedGroup(isPinned ? null : group.label)}
                aria-expanded={isOpen}
                aria-label={`${t(group.fullLabel)}${activeCount ? ` — ${t('activeCount', { n: activeCount })}` : ''}`}
                title={t(group.fullLabel)}
                className="relative w-10 h-10 flex items-center justify-center cursor-pointer rounded-lg transition-all duration-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-white/40"
                style={{
                  background: isPinned
                    ? 'rgba(255,255,255,0.10)'
                    : isHovered ? 'rgba(255,255,255,0.05)' : 'transparent',
                }}
              >
                <Icon
                  className="transition-all duration-300"
                  style={{
                    width: 16,
                    height: 16,
                    color: groupActive
                      ? 'rgba(255,255,255,0.75)'
                      : isOpen
                        ? 'rgba(255,255,255,0.45)'
                        : 'rgba(255,255,255,0.22)',
                    filter: groupActive ? 'drop-shadow(0 0 4px rgba(255,255,255,0.3))' : 'none',
                  }}
                />

                {/* How many layers in this group are live. Without it the rail
                    gives no reading at all until each icon is hovered in turn. */}
                {activeCount > 0 && (
                  <span
                    className="absolute top-1 right-1 min-w-[13px] h-[13px] px-[3px] rounded-full flex items-center justify-center text-[9px] font-mono tabular-nums leading-none"
                    style={{
                      background: 'rgba(0,229,255,0.9)',
                      color: '#04040A',
                      boxShadow: '0 0 6px rgba(0,229,255,0.5)',
                    }}
                  >
                    {activeCount}
                  </span>
                )}
              </button>

              {/* Flyout (LEFT side) */}
              <AnimatePresence>
                {isOpen && (
                  <motion.div
                    initial={{ opacity: 0, x: -8, filter: 'blur(4px)' }}
                    animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                    exit={{ opacity: 0, x: -4, filter: 'blur(2px)' }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute left-[52px] top-1/2 -translate-y-1/2 min-w-[220px] rounded-xl p-3 z-[100] pointer-events-auto"
                    style={{
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(40px) saturate(1.5)',
                      WebkitBackdropFilter: 'blur(40px) saturate(1.5)',
                      border: '1px solid rgba(255,255,255,0.06)',
                      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2.5 pb-1.5 border-b border-white/[0.04]">
                      <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/35 flex-1">
                        {t(group.fullLabel)}
                      </span>
                      {/* Switching eight satellite layers one at a time is the
                          kind of thing that makes a panel feel unfinished. */}
                      <button
                        onClick={(e) => { e.stopPropagation(); toggleGroup(group.layers); }}
                        className="px-1.5 py-0.5 rounded text-[10px] font-mono tracking-wider text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                      >
                        {activeCount > 0 ? t('none') : t('all')}
                      </button>
                      {isPinned && (
                        <button
                          onClick={(e) => { e.stopPropagation(); setPinnedGroup(null); }}
                          aria-label={t('close')}
                          className="px-1.5 py-0.5 rounded text-[10px] font-mono text-white/40 hover:text-white hover:bg-white/10 transition-colors"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                    <div className="flex flex-col gap-0.5">
                      {group.layers.map((layer) => {
                        const isLayerActive = activeLayers[layer.key];
                        const count = getCount(layer.dataKey, layer.catKey);
                        const dormant = !!layer.parent && !activeLayers[layer.parent];

                        return (
                          <button
                            key={layer.key}
                            onClick={() => toggle(layer.key)}
                            aria-pressed={!!isLayerActive}
                            aria-label={t(layer.label)}
                            title={dormant ? t('dormantHint') : undefined}
                            className={`relative w-full flex items-center gap-3 py-1.5 rounded-md hover:bg-white/[0.05] transition-colors cursor-pointer text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-white/30 ${layer.parent ? 'pl-[22px] pr-1' : 'px-1'} ${dormant ? 'opacity-40' : ''}`}
                          >
                            {layer.parent && <SubLayerStem />}
                            <ToggleSwitch active={!!isLayerActive} />
                            <span className={`text-[11px] font-mono uppercase tracking-wider flex-1 transition-colors duration-200 ${isLayerActive ? 'text-white/70' : 'text-white/35'}`}>
                              {t(layer.label)}
                              {layer.description && <span className="block mt-0.5 text-[9px] normal-case tracking-normal text-white/35">{t(layer.description)}</span>}
                            </span>
                            {count !== null && (
                              <span className={`text-[10px] font-mono tabular-nums transition-colors ${isLayerActive ? 'text-white/45' : 'text-white/20'}`}>
                                {count.toLocaleString()}
                              </span>
                            )}
                          </button>
                        );
                      })}
                      {group.label === 'DISPLAY' && terrainDetails}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Subtle separator */}
      <div className="w-5 h-px bg-white/[0.06] my-2" />

      {/* Style Studio */}
      <button
        onClick={() => setStudioOpen(o => !o)}
        aria-pressed={studioOpen}
        className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-500 cursor-pointer"
        style={{ background: studioOpen ? 'var(--hover-accent)' : 'transparent' }}
        title={t('styleStudio')}
      >
        <SlidersHorizontal
          className="transition-all duration-500"
          style={{
            width: 15,
            height: 15,
            color: studioOpen ? 'var(--gold-primary)' : 'rgba(255,255,255,0.15)',
            filter: studioOpen ? 'drop-shadow(0 0 6px var(--gold-glow))' : 'none',
          }}
        />
      </button>
      <AnimatePresence>
        {studioOpen && <StyleStudio onClose={() => setStudioOpen(false)} />}
      </AnimatePresence>

      {/* Ghost Protocol Toggle */}
      {setTheme && (
        <button
          onClick={() => setTheme(theme === 'core' ? 'ghost' : 'core')}
          className="w-10 h-10 flex items-center justify-center rounded-lg transition-all duration-500 cursor-pointer"
          style={{
            background: theme === 'ghost' ? 'rgba(179, 136, 255, 0.1)' : 'transparent',
          }}
          title={t('ghostProtocol')}
        >
          <Ghost
            className="transition-all duration-500"
            style={{
              width: 15,
              height: 15,
              color: theme === 'ghost' ? '#B388FF' : 'rgba(255,255,255,0.15)',
              filter: theme === 'ghost' ? 'drop-shadow(0 0 6px rgba(179, 136, 255, 0.5))' : 'none',
            }}
          />
        </button>
      )}
    </motion.div>
  );
}

export default memo(LayerPanel);
