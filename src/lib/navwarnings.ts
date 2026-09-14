/**
 * Parsing for NGA Broadcast (NAVAREA) navigational warnings.
 *
 * The maritime safety warnings the US NGA publishes carry their positions in
 * free text as `DD-MM.mN DDD-MM.mW`. We pull those out, place each warning at
 * the mean of its positions, and tag the operationally interesting ones
 * (GNSS interference, live-fire / missile / exercise areas) so the map can
 * colour them. Kept pure and separate so it can be unit-tested without the network.
 */

export interface NavWarning {
  id: string;
  navArea: string;
  msgNumber: number;
  msgYear: number;
  subregion?: string;
  issueDate?: string;
  authority?: string;
  lat: number;
  lng: number;
  /** Number of positions found in the text — a rough footprint size. */
  positionCount: number;
  category: NavWarningCategory;
  text: string;
}

export type NavWarningCategory = 'gnss' | 'firing' | 'missile' | 'military' | 'general';

interface RawWarning {
  msgYear?: number;
  msgNumber?: number;
  navArea?: string;
  subregion?: string;
  text?: string;
  issueDate?: string;
  authority?: string;
  status?: string;
}

const POSITION_RE = /(\d{1,3})-(\d{2}(?:\.\d+)?)\s*([NS])\s+(\d{1,3})-(\d{2}(?:\.\d+)?)\s*([EW])/g;

export function parsePositions(text: string): [number, number][] {
  const out: [number, number][] = [];
  POSITION_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = POSITION_RE.exec(text))) {
    let lat = Number(m[1]) + Number(m[2]) / 60;
    let lng = Number(m[4]) + Number(m[5]) / 60;
    if (m[3] === 'S') lat = -lat;
    if (m[6] === 'W') lng = -lng;
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) out.push([lat, lng]);
  }
  return out;
}

export function categorize(text: string): NavWarningCategory {
  const t = text.toUpperCase();
  if (/\b(GPS|GNSS|GLONASS)\b/.test(t) && /(INTERFERENCE|JAMMING|DISRUPT|UNRELIABLE|DEGRAD)/.test(t)) return 'gnss';
  if (/(MISSILE|ROCKET LAUNCH|SPACE LAUNCH|LAUNCHING)/.test(t)) return 'missile';
  if (/(GUNNERY|FIRING|LIVE FIRE|LIVE-FIRE|NAVAL FIRING|WEAPON)/.test(t)) return 'firing';
  if (/(MILITARY|NAVAL EXERCISE|MILITARY EXERCISE|MILITARY OPERATION|WARSHIP)/.test(t)) return 'military';
  return 'general';
}

function mean(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

/** Turns the NGA payload into placeable warnings; entries without a position are dropped. */
export function parseNavWarnings(raw: unknown, limit = 600): NavWarning[] {
  const list: RawWarning[] =
    raw && typeof raw === 'object' && Array.isArray((raw as Record<string, unknown>)['broadcast-warn'])
      ? ((raw as Record<string, unknown>)['broadcast-warn'] as RawWarning[])
      : [];
  const warnings: NavWarning[] = [];
  for (const w of list) {
    const text = (w.text || '').trim();
    const positions = parsePositions(text);
    if (positions.length === 0) continue;
    // Mean of the (few) positions keeps a multi-point warning near its own footprint.
    const sample = positions.slice(0, 12);
    warnings.push({
      id: `${w.navArea ?? '?'}-${w.msgYear ?? 0}-${w.msgNumber ?? 0}`,
      navArea: w.navArea ?? '?',
      msgNumber: w.msgNumber ?? 0,
      msgYear: w.msgYear ?? 0,
      subregion: w.subregion || undefined,
      issueDate: w.issueDate || undefined,
      authority: w.authority || undefined,
      lat: Number(mean(sample.map(p => p[0])).toFixed(4)),
      lng: Number(mean(sample.map(p => p[1])).toFixed(4)),
      positionCount: positions.length,
      category: categorize(text),
      // The raw warnings can be long; the popup only needs the gist.
      text: text.length > 900 ? `${text.slice(0, 900)}…` : text,
    });
  }
  return warnings.slice(0, limit);
}
