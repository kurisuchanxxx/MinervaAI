import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { canReachLatitude, categoriseSatellite, findPasses, isLowEarthOrbit, type SatPassCategory, type SatellitePass } from '@/lib/sat-passes';
import { latLngParams, numParam } from '@/lib/query-params';

/**
 * MinervaAI — imaging satellite passes over a point.
 *
 * "When can this area be seen from orbit" is a routine analyst question, and
 * the answer comes from public elements: the same TLE catalogue the map already
 * caches on disk. Reconnaissance and commercial imaging satellites are what get
 * searched, because those are the ones whose overflight means something.
 *
 * Cost control matters here — the catalogue holds ~19,000 objects and each
 * propagation is real work. Two filters do the heavy lifting: only satellites
 * whose names identify a known imaging programme, and only orbits whose
 * inclination can reach the target latitude at all.
 *
 * The disk cache the satellites layer writes is an optimisation, not a
 * dependency: on a serverless platform the filesystem is per-instance and
 * empty on a cold start, so this route falls back to fetching the handful of
 * CelesTrak groups that actually contain imaging satellites. Without that it
 * answered 503 on any instance that had not served the map yet.
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CACHE_FILE = join(process.cwd(), '.next', 'cache', 'satellites-tle-cache.json');
const CACHE_TTL_MS = 5 * 60_000;
const REMOTE_TTL_MS = 6 * 3600_000;

/** The CelesTrak groups that hold Earth-imaging and reconnaissance satellites. */
const GROUPS = ['resource', 'military', 'radar', 'planet', 'spire', 'dmc'];
const CT = 'https://celestrak.org/NORAD/elements/gp.php?GROUP=';
const FMT = '&FORMAT=tle';
/** Above this, the response would cost more time than the answer is worth. */
const MAX_CANDIDATES = 220;

interface Tle { name: string; line1: string; line2: string }

let cache: { at: number; sats: Tle[]; source: 'disk' | 'celestrak' } | null = null;

function fromDisk(): Tle[] {
  try {
    if (!existsSync(CACHE_FILE)) return [];
    const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as { sats?: Tle[] };
    return (parsed.sats ?? []).filter(s => s?.line1 && s?.line2 && s?.name);
  } catch {
    // A corrupt cache is the same as no cache: fall through to the network.
    return [];
  }
}

/** Parses CelesTrak's three-line format into element sets. */
function parseTle(text: string): Tle[] {
  const lines = text.split(/\r?\n/).map(l => l.trimEnd());
  const sats: Tle[] = [];
  for (let i = 0; i + 2 < lines.length; i += 3) {
    const [name, line1, line2] = [lines[i]?.trim(), lines[i + 1], lines[i + 2]];
    if (name && line1?.startsWith('1 ') && line2?.startsWith('2 ')) sats.push({ name, line1, line2 });
  }
  return sats;
}

async function fromCelestrak(): Promise<Tle[]> {
  const responses = await Promise.allSettled(
    GROUPS.map(group =>
      fetch(`${CT}${group}${FMT}`, {
        headers: { 'User-Agent': 'MinervaAI-Intel/1.0' },
        signal: AbortSignal.timeout(8000),
      }).then(res => (res.ok ? res.text() : '')),
    ),
  );
  const byName = new Map<string, Tle>();
  for (const result of responses) {
    if (result.status !== 'fulfilled' || !result.value) continue;
    for (const sat of parseTle(result.value)) byName.set(sat.name, sat);
  }
  return [...byName.values()];
}

async function catalogue(): Promise<{ sats: Tle[]; source: 'disk' | 'celestrak' }> {
  const ttl = cache?.source === 'celestrak' ? REMOTE_TTL_MS : CACHE_TTL_MS;
  if (cache && Date.now() - cache.at < ttl && cache.sats.length > 0) return cache;

  const disk = fromDisk();
  if (disk.length > 0) {
    cache = { at: Date.now(), sats: disk, source: 'disk' };
    return cache;
  }

  const remote = await fromCelestrak();
  cache = { at: Date.now(), sats: remote, source: 'celestrak' };
  return cache;
}


export interface PassResult extends SatellitePass {
  name: string;
  category: SatPassCategory;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const point = latLngParams(params);
  if (!point) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }
  const { lat, lng } = point;
  const hours = numParam(params, 'hours', { fallback: 24, min: 1, max: 72 });
  const minElevation = numParam(params, 'minElevation', { fallback: 20, min: 0, max: 80 });
  const wanted = params.get('category');
  const categories: SatPassCategory[] =
    wanted === 'recon' ? ['recon'] : wanted === 'imaging' ? ['imaging'] : ['recon', 'imaging'];

  const { sats, source } = await catalogue();
  if (sats.length === 0) {
    return NextResponse.json(
      { error: 'Satellite element sets are unavailable right now — CelesTrak could not be reached.', passes: [] },
      { status: 503 },
    );
  }

  const candidates = sats
    .map(sat => ({ sat, category: categoriseSatellite(sat.name) }))
    .filter(c => categories.includes(c.category) && isLowEarthOrbit(c.sat.line2) && canReachLatitude(c.sat.line2, lat))
    .slice(0, MAX_CANDIDATES);

  const from = new Date();
  const to = new Date(from.getTime() + hours * 3600_000);
  const results: PassResult[] = [];

  for (const { sat, category } of candidates) {
    for (const pass of findPasses(sat.line1, sat.line2, { lat, lng }, from, to, { minElevationDeg: minElevation, maxPasses: 4 })) {
      results.push({ ...pass, name: sat.name, category });
    }
  }

  results.sort((a, b) => a.culmination.localeCompare(b.culmination));

  return NextResponse.json({
    observer: { lat, lng },
    windowHours: hours,
    minElevation,
    searched: candidates.length,
    catalogueSize: sats.length,
    catalogueSource: source,
    passes: results.slice(0, 60),
  });
}
