import { NextResponse } from 'next/server';
import { parseScenes, type Scene } from '@/lib/imagery';
import { latLngParams, numParam } from '@/lib/query-params';

/**
 * MinervaAI — which dates an area was actually photographed.
 *
 * The before/after comparison runs on the daily GIBS mosaic, which always has
 * an image but only at 250 m. This tells the analyst when Sentinel-2 passed
 * over at 10 m and whether the sky was clear, so the two dates they compare are
 * dates worth comparing.
 *
 * Keyless: the Element84 STAC catalogue mirrors Copernicus on open AWS data.
 */

export const dynamic = 'force-dynamic';

const STAC_SEARCH = 'https://earth-search.aws.element84.com/v1/search';
const TTL_MS = 15 * 60_000;

const cache = new Map<string, { at: number; scenes: Scene[] }>();

export async function GET(req: Request) {
  const params = new URL(req.url).searchParams;
  const point = latLngParams(params);
  if (!point) {
    return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
  }
  const { lat, lng } = point;
  const days = numParam(params, 'days', { fallback: 45, min: 1, max: 120 });
  const maxCloud = numParam(params, 'maxCloud', { fallback: 100, min: 0, max: 100 });

  // A small box around the point: one Sentinel-2 tile is 110 km, so this only
  // has to be big enough to catch the tile the point falls in.
  const pad = 0.05;
  const key = `${lat.toFixed(2)},${lng.toFixed(2)},${days},${maxCloud}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    return NextResponse.json({ scenes: hit.scenes, cached: true });
  }

  const now = new Date();
  const from = new Date(now.getTime() - days * 86_400_000);

  try {
    const res = await fetch(STAC_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'User-Agent': 'MinervaAI-Intel/1.0' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        collections: ['sentinel-2-l2a'],
        bbox: [lng - pad, lat - pad, lng + pad, lat + pad],
        datetime: `${from.toISOString().slice(0, 19)}Z/${now.toISOString().slice(0, 19)}Z`,
        limit: 40,
        sortby: [{ field: 'properties.datetime', direction: 'desc' }],
        ...(maxCloud < 100 ? { query: { 'eo:cloud_cover': { lte: maxCloud } } } : {}),
      }),
    });
    if (!res.ok) throw new Error(`STAC search returned ${res.status}`);

    const scenes = parseScenes(await res.json());
    cache.set(key, { at: Date.now(), scenes });
    if (cache.size > 200) cache.clear();
    return NextResponse.json({ scenes, cached: false });
  } catch (e) {
    console.warn('[MinervaAI] Sentinel-2 scene search failed:', e instanceof Error ? e.message : e);
    return NextResponse.json(
      { error: 'Scene catalogue unavailable', scenes: [] },
      { status: 502 },
    );
  }
}
