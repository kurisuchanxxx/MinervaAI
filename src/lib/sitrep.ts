/**
 * SITREP generator.
 *
 * Turns a compact snapshot of what is on the map (counts + a few notable
 * entities within an area) into a situational report, in Italian or English.
 * Pure and deterministic so it can be unit-tested and so it always works with
 * no API key — an AI route may rewrite the prose, but this is the substance and
 * the fallback.
 */

export type SitrepLang = 'it' | 'en';

export interface SitrepArea {
  kind: 'viewport' | 'aoi';
  label?: string;
  center?: { lat: number; lng: number };
  radiusKm?: number;
}

export interface SitrepCounts {
  flights?: number;
  military?: number;
  jets?: number;
  ships?: number;
  earthquakes?: number;
  fires?: number;
  weather?: number;
  conflicts?: number;
  gdelt?: number;
  navWarnings?: number;
  gpsJamming?: number;
  cctv?: number;
}

export interface SitrepNotable {
  military?: { callsign: string; model?: string }[];
  earthquakes?: { magnitude: number; place: string }[];
  conflicts?: { label: string; severity?: string }[];
  navWarnings?: { navArea: string; msgNumber: number; category: string }[];
  gpsJamming?: { severity: number; count: number }[];
}

export interface SitrepInput {
  lang: SitrepLang;
  area: SitrepArea;
  counts: SitrepCounts;
  notable?: SitrepNotable;
  now?: number;
}

export interface Sitrep {
  title: string;
  timestamp: string;
  headline: string;
  sections: { heading: string; lines: string[] }[];
  /** Flat plain-text rendering, ready to copy or export. */
  text: string;
}

const T = {
  it: {
    title: 'RAPPORTO SITUAZIONALE',
    area: 'Area',
    viewport: 'vista corrente',
    generated: 'Generato',
    quiet: 'Nessuna attività rilevante rilevata nell’area al momento della generazione.',
    secAir: 'AVIAZIONE', secSea: 'MARITTIMO', secGeo: 'GEOFISICO', secConflict: 'CONFLITTI ED EVENTI', secSignals: 'SEGNALI E AVVISI', secAssessment: 'VALUTAZIONE',
    flights: (n: number) => `${n} aeromobili tracciati`,
    military: (n: number) => `${n} con profilo militare`,
    jets: (n: number) => `${n} jet privati/executive`,
    ships: (n: number) => `${n} navi in area`,
    quakes: (n: number) => `${n} eventi sismici recenti`,
    fires: (n: number) => `${n} focolai di incendio attivi`,
    weather: (n: number) => `${n} eventi meteo severi`,
    conflicts: (n: number) => `${n} zone di conflitto/tensione`,
    gdelt: (n: number) => `${n} eventi da fonti aperte (GDELT)`,
    nav: (n: number) => `${n} avvisi alla navigazione (NAVAREA)`,
    gps: (n: number) => `${n} zone di disturbo GPS segnalate`,
    notableQuakes: 'Sismi principali',
    notableConflicts: 'Zone attive',
    notableNav: 'Avvisi rilevanti',
    notableMil: 'Assetti militari',
    assessCalm: 'Quadro complessivamente stabile: nessun indicatore critico.',
    assessMil: 'Presenza militare aerea rilevata; monitorare i movimenti.',
    assessConflict: 'Attività di conflitto in corso nell’area: elevata attenzione.',
    assessSignals: 'Interferenze/avvisi ai naviganti attivi: navigazione satellitare e transiti potenzialmente compromessi.',
    assessSeismic: 'Attività sismica rilevante: possibili effetti a terra.',
    sourcesNote: 'Fonti: dati OSINT pubblici (OpenSky/ADS-B, USGS, NASA, NGA MSI, GDELT).',
  },
  en: {
    title: 'SITUATION REPORT',
    area: 'Area',
    viewport: 'current view',
    generated: 'Generated',
    quiet: 'No significant activity detected in the area at generation time.',
    secAir: 'AVIATION', secSea: 'MARITIME', secGeo: 'GEOPHYSICAL', secConflict: 'CONFLICT & EVENTS', secSignals: 'SIGNALS & WARNINGS', secAssessment: 'ASSESSMENT',
    flights: (n: number) => `${n} aircraft tracked`,
    military: (n: number) => `${n} with a military profile`,
    jets: (n: number) => `${n} private/business jets`,
    ships: (n: number) => `${n} vessels in area`,
    quakes: (n: number) => `${n} recent seismic events`,
    fires: (n: number) => `${n} active fire hotspots`,
    weather: (n: number) => `${n} severe weather events`,
    conflicts: (n: number) => `${n} conflict/tension zones`,
    gdelt: (n: number) => `${n} open-source events (GDELT)`,
    nav: (n: number) => `${n} navigational warnings (NAVAREA)`,
    gps: (n: number) => `${n} reported GPS interference zones`,
    notableQuakes: 'Top earthquakes',
    notableConflicts: 'Active zones',
    notableNav: 'Notable warnings',
    notableMil: 'Military assets',
    assessCalm: 'Overall stable picture: no critical indicators.',
    assessMil: 'Military air presence detected; monitor movements.',
    assessConflict: 'Active conflict activity in the area: heightened attention.',
    assessSignals: 'Active interference / mariner warnings: satellite navigation and transits potentially degraded.',
    assessSeismic: 'Significant seismic activity: possible ground effects.',
    sourcesNote: 'Sources: public OSINT (OpenSky/ADS-B, USGS, NASA, NGA MSI, GDELT).',
  },
} as const;

function catLabel(lang: SitrepLang, category: string): string {
  const map: Record<string, { it: string; en: string }> = {
    gnss: { it: 'disturbo GNSS', en: 'GNSS interference' },
    missile: { it: 'missile/lancio', en: 'missile/launch' },
    firing: { it: 'esercitazione a fuoco', en: 'firing exercise' },
    military: { it: 'attività militare', en: 'military activity' },
    general: { it: 'avviso', en: 'warning' },
  };
  return (map[category] ?? map.general)[lang];
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export function buildSitrep(input: SitrepInput): Sitrep {
  const { lang, area, counts, notable } = input;
  const t = T[lang];
  const now = new Date(input.now ?? Date.now());
  const timestamp = `${now.getUTCFullYear()}-${pad(now.getUTCMonth() + 1)}-${pad(now.getUTCDate())} ${pad(now.getUTCHours())}:${pad(now.getUTCMinutes())}Z`;

  const areaLabel =
    area.label ||
    (area.kind === 'aoi' && area.center
      ? `${area.center.lat.toFixed(2)}, ${area.center.lng.toFixed(2)}${area.radiusKm ? ` · ${Math.round(area.radiusKm)} km` : ''}`
      : t.viewport);

  const sections: { heading: string; lines: string[] }[] = [];
  const c = counts;

  const air: string[] = [];
  if (c.flights) air.push(t.flights(c.flights));
  if (c.military) air.push(t.military(c.military));
  if (c.jets) air.push(t.jets(c.jets));
  if (notable?.military?.length) {
    air.push(`${t.notableMil}: ${notable.military.slice(0, 5).map(m => m.callsign + (m.model ? ` (${m.model})` : '')).join(', ')}`);
  }
  if (air.length) sections.push({ heading: t.secAir, lines: air });

  if (c.ships) sections.push({ heading: t.secSea, lines: [t.ships(c.ships)] });

  const geo: string[] = [];
  if (c.earthquakes) geo.push(t.quakes(c.earthquakes));
  if (notable?.earthquakes?.length) {
    geo.push(`${t.notableQuakes}: ${notable.earthquakes.slice(0, 3).map(q => `M${q.magnitude.toFixed(1)} ${q.place}`).join('; ')}`);
  }
  if (c.fires) geo.push(t.fires(c.fires));
  if (c.weather) geo.push(t.weather(c.weather));
  if (geo.length) sections.push({ heading: t.secGeo, lines: geo });

  const conflict: string[] = [];
  if (c.conflicts) conflict.push(t.conflicts(c.conflicts));
  if (notable?.conflicts?.length) {
    conflict.push(`${t.notableConflicts}: ${notable.conflicts.slice(0, 5).map(z => z.label).join(', ')}`);
  }
  if (c.gdelt) conflict.push(t.gdelt(c.gdelt));
  if (conflict.length) sections.push({ heading: t.secConflict, lines: conflict });

  const signals: string[] = [];
  if (c.navWarnings) signals.push(t.nav(c.navWarnings));
  if (notable?.navWarnings?.length) {
    signals.push(`${t.notableNav}: ${notable.navWarnings.slice(0, 5).map(w => `NAVAREA ${w.navArea}/${w.msgNumber} (${catLabel(lang, w.category)})`).join('; ')}`);
  }
  if (c.gpsJamming) signals.push(t.gps(c.gpsJamming));
  if (signals.length) sections.push({ heading: t.secSignals, lines: signals });

  // Assessment
  const assess: string[] = [];
  if (c.conflicts) assess.push(t.assessConflict);
  if (c.navWarnings || c.gpsJamming) assess.push(t.assessSignals);
  if (c.military) assess.push(t.assessMil);
  if ((c.earthquakes ?? 0) >= 3) assess.push(t.assessSeismic);
  if (assess.length === 0) assess.push(t.assessCalm);
  sections.push({ heading: t.secAssessment, lines: assess });

  const anyActivity = sections.some(s => s.heading !== t.secAssessment && s.lines.length);
  const headline = anyActivity ? assess[0] : t.quiet;

  const lines: string[] = [];
  lines.push(`${t.title} — ${t.area}: ${areaLabel}`);
  lines.push(`${t.generated}: ${timestamp}`);
  lines.push('');
  if (!anyActivity) {
    lines.push(t.quiet);
  } else {
    for (const s of sections) {
      lines.push(`[${s.heading}]`);
      for (const l of s.lines) lines.push(`  • ${l}`);
      lines.push('');
    }
  }
  lines.push(t.sourcesNote);

  return {
    title: t.title,
    timestamp,
    headline,
    sections: anyActivity ? sections : [{ heading: t.secAssessment, lines: [t.quiet] }],
    text: lines.join('\n').trim(),
  };
}
