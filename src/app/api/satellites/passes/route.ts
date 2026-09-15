import { NextResponse } from 'next/server';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { canReachLatitude, categoriseSatellite, findPasses, isLowEarthOrbit, type SatPassCategory, type SatellitePass } from '@/lib/sat-passes';

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
 */

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const CACHE_FILE = join(process.cwd(), '.next', 'cache', 'satellites-tle-cache.json');
const CACHE_TTL_MS = 5 * 60_000;
/** Above this, the response would cost more time than the answer is worth. */
const MAX_CANDIDATES = 220;

interface Tle { name: string; line1: string; line2: string }

let cache: { at: number; sats: Tle[] } | null = null;

function catalogue(): Tle[] {
  if (cache && Date.now() - cache.at < CACHE_TTL_MS) return cache.sats;
  let sats: Tle[] = [];
  try {
    if (existsSync(CACHE_FILE)) {
      const parsed = JSON.parse(readFileSync(CACHE_FILE, 'utf8')) as { sats?: Tle[] };
      sats = (parsed.sats ?? []).filter(s => s?.line1 && s?.line2 && s?.name);
    }
  } catch {
    // No catalogue means no prediction, not a broken page.
  }
  cache = { at: Date.now(), sats };
  return sats;
}

function num(raw: string | null, fallback: number, min: number, max: number): number {
  // `Number(null)` is 0, not NaN, so an absent parameter has to be rejected
  // before parsing — otherwise every default silently became the minimum.
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

export interface PassResult extends SatellitePass {
  name: string;
  category: SatPassCategory;
}

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }

  const hours = num(params.get('hours'), 24, 1, 72);
  const minElevation = num(params.get('minElevation'), 20, 0, 80);
  const wanted = params.get('category');
  const categories: SatPassCategory[] =
    wanted === 'recon' ? ['recon'] : wanted === 'imaging' ? ['imaging'] : ['recon', 'imaging'];

  const sats = catalogue();
  if (sats.length === 0) {
    return NextResponse.json(
      { error: 'Satellite catalogue not loaded yet — open the satellites layer once, then retry.', passes: [] },
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
    passes: results.slice(0, 60),
  });
}
