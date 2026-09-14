import { NextResponse } from 'next/server';
import { parseNavWarnings, type NavWarning } from '@/lib/navwarnings';

/**
 * MinervaAI — Navigational (NAVAREA) warnings.
 * US NGA Maritime Safety broadcast warnings: firing exercises, missile/space
 * launches, GNSS interference, hazards. Keyless, updated slowly, so cached hard.
 */

export const dynamic = 'force-dynamic';

const SOURCE = 'https://msi.nga.mil/api/publications/broadcast-warn?output=json&status=active';
const TTL_MS = 30 * 60 * 1000;

let cache: { at: number; data: NavWarning[] } | null = null;

export async function GET() {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return NextResponse.json({ warnings: cache.data, cached: true, count: cache.data.length });
  }
  try {
    const res = await fetch(SOURCE, {
      headers: { 'User-Agent': 'MinervaAI-Intel/1.0', Accept: 'application/json' },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) throw new Error(`NGA MSI returned ${res.status}`);
    const warnings = parseNavWarnings(await res.json());
    cache = { at: Date.now(), data: warnings };
    return NextResponse.json({ warnings, cached: false, count: warnings.length });
  } catch (e) {
    if (cache) return NextResponse.json({ warnings: cache.data, cached: true, stale: true, count: cache.data.length });
    console.error('[MinervaAI] Nav-warnings fetch failed:', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'Failed to fetch navigational warnings', warnings: [] }, { status: 502 });
  }
}
