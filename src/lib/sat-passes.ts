/**
 * Satellite passes over a point on the ground.
 *
 * Analysts ask two questions about an area: what is overhead now, and when is
 * the next imaging satellite going to see it. This answers the second from
 * public orbital elements — the same TLEs the map already propagates.
 *
 * A pass is the span where the satellite rises above a minimum elevation as
 * seen from the observer; the culmination (highest elevation) is the moment it
 * has the best look at the target.
 */

import * as satellite from 'satellite.js';

export interface Observer {
  lat: number;
  lng: number;
  /** Metres above sea level; 0 is fine for this purpose. */
  altitudeM?: number;
}

export interface SatellitePass {
  /** ISO timestamp the satellite crosses the minimum elevation. */
  start: string;
  /** ISO timestamp of highest elevation. */
  culmination: string;
  end: string;
  /** Degrees above the horizon at culmination. */
  maxElevation: number;
  /** Compass bearing of the satellite at culmination, degrees. */
  culminationAzimuth: number;
  /** Slant range at culmination, km. */
  rangeKm: number;
  durationMinutes: number;
}

export interface PassSearchOptions {
  /** Ignore anything that never gets this high above the horizon. */
  minElevationDeg?: number;
  /** Coarse sampling interval. 60 s finds every LEO pass; passes last minutes. */
  stepSeconds?: number;
  /** Refinement interval used inside a detected pass. */
  refineSeconds?: number;
  /** Cap on returned passes. */
  maxPasses?: number;
}

const DEFAULTS: Required<PassSearchOptions> = {
  minElevationDeg: 20,
  stepSeconds: 60,
  refineSeconds: 10,
  maxPasses: 12,
};

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;

interface Look {
  elevationDeg: number;
  azimuthDeg: number;
  rangeKm: number;
}

/** Where the satellite is in the observer's sky, or null if the TLE will not propagate. */
export function lookAngles(satrec: satellite.SatRec, observer: Observer, when: Date): Look | null {
  try {
    const propagated = satellite.propagate(satrec, when);
    const position = propagated?.position;
    if (!position || typeof position === 'boolean') return null;
    const gmst = satellite.gstime(when);
    const ecf = satellite.eciToEcf(position, gmst);
    const look = satellite.ecfToLookAngles(
      { longitude: observer.lng * RAD, latitude: observer.lat * RAD, height: (observer.altitudeM ?? 0) / 1000 },
      ecf,
    );
    return {
      elevationDeg: look.elevation * DEG,
      azimuthDeg: (look.azimuth * DEG + 360) % 360,
      rangeKm: look.rangeSat,
    };
  } catch {
    return null;
  }
}

/** Orbit inclination in degrees, read straight off TLE line 2. */
export function inclinationDeg(line2: string): number | null {
  const value = Number.parseFloat(line2.substring(8, 16));
  return Number.isFinite(value) ? value : null;
}

/**
 * A satellite can only pass over latitudes its inclination reaches — a 51.6°
 * orbit never gets near the poles. Skipping those before propagating is what
 * keeps a whole-catalogue search affordable. The margin covers the slant range
 * at which a satellite is still well above the horizon.
 */
export function canReachLatitude(line2: string, lat: number, marginDeg = 12): boolean {
  const inc = inclinationDeg(line2);
  if (inc === null) return true;
  // Retrograde orbits (inclination > 90°) reach latitude 180 - inclination.
  const reach = inc > 90 ? 180 - inc : inc;
  return Math.abs(lat) <= reach + marginDeg;
}

/**
 * Finds passes in [from, to]. Coarse steps detect the pass, then the edges and
 * the culmination are refined so the reported times are minute-accurate rather
 * than rounded to the sampling interval.
 */
export function findPasses(
  line1: string,
  line2: string,
  observer: Observer,
  from: Date,
  to: Date,
  options: PassSearchOptions = {},
): SatellitePass[] {
  const opts = { ...DEFAULTS, ...options };
  let satrec: satellite.SatRec;
  try {
    satrec = satellite.twoline2satrec(line1, line2);
  } catch {
    return [];
  }

  const passes: SatellitePass[] = [];
  const stepMs = opts.stepSeconds * 1000;
  let current: { startMs: number; best: Look & { atMs: number } } | null = null;

  for (let ms = from.getTime(); ms <= to.getTime(); ms += stepMs) {
    const look = lookAngles(satrec, observer, new Date(ms));
    const above = !!look && look.elevationDeg >= opts.minElevationDeg;

    if (above && look) {
      if (!current) current = { startMs: ms, best: { ...look, atMs: ms } };
      else if (look.elevationDeg > current.best.elevationDeg) current.best = { ...look, atMs: ms };
    } else if (current) {
      passes.push(finishPass(satrec, observer, current, ms, opts));
      current = null;
      if (passes.length >= opts.maxPasses) return passes;
    }
  }

  // A pass still in progress at the end of the window is real; it is just clipped.
  if (current) passes.push(finishPass(satrec, observer, current, to.getTime(), opts));
  return passes.slice(0, opts.maxPasses);
}

function finishPass(
  satrec: satellite.SatRec,
  observer: Observer,
  current: { startMs: number; best: Look & { atMs: number } },
  endMs: number,
  opts: Required<PassSearchOptions>,
): SatellitePass {
  const refineMs = opts.refineSeconds * 1000;
  const stepMs = opts.stepSeconds * 1000;

  // Walk back from the first sample above the threshold to find the crossing.
  let start = current.startMs;
  for (let ms = current.startMs - stepMs; ms < current.startMs; ms += refineMs) {
    const look = lookAngles(satrec, observer, new Date(ms));
    if (look && look.elevationDeg >= opts.minElevationDeg) { start = ms; break; }
  }
  let end = endMs;
  for (let ms = endMs - stepMs; ms < endMs; ms += refineMs) {
    const look = lookAngles(satrec, observer, new Date(ms));
    if (look && look.elevationDeg < opts.minElevationDeg) { end = ms; break; }
  }

  // Refine the culmination around the best coarse sample.
  let best = { ...current.best };
  for (let ms = current.best.atMs - stepMs; ms <= current.best.atMs + stepMs; ms += refineMs) {
    const look = lookAngles(satrec, observer, new Date(ms));
    if (look && look.elevationDeg > best.elevationDeg) best = { ...look, atMs: ms };
  }

  return {
    start: new Date(start).toISOString(),
    culmination: new Date(best.atMs).toISOString(),
    end: new Date(end).toISOString(),
    maxElevation: Math.round(best.elevationDeg * 10) / 10,
    culminationAzimuth: Math.round(best.azimuthDeg),
    rangeKm: Math.round(best.rangeKm),
    durationMinutes: Math.max(1, Math.round((end - start) / 60_000)),
  };
}

/** Revolutions per day, from the mean motion field of TLE line 2. */
export function meanMotion(line2: string): number | null {
  const value = Number.parseFloat(line2.substring(52, 63));
  return Number.isFinite(value) && value > 0 ? value : null;
}

/**
 * Whether the orbit is low enough to image the ground.
 *
 * This is the filter that keeps the answer meaningful. Russia names most of
 * its satellites COSMOS, navigation constellations included, and a GLONASS
 * satellite at 19,000 km sits above 20° elevation for two hours at a time — it
 * would crowd out every real imaging pass while telling the analyst nothing.
 * Imaging satellites orbit low and fast: above 11 revolutions a day (period
 * under ~130 minutes), which no MEO or Molniya orbit reaches.
 */
export function isLowEarthOrbit(line2: string, minRevsPerDay = 11): boolean {
  const revs = meanMotion(line2);
  return revs !== null && revs >= minRevsPerDay;
}

export type SatPassCategory = 'recon' | 'imaging' | 'other';

/**
 * Name patterns for satellites that look at the ground. Deliberately explicit:
 * a name-based guess is only worth showing when the name really does identify
 * a known programme.
 */
const RECON_PATTERNS = [
  /^USA[- ]?\d/, /NROL/, /LACROSSE/, /ONYX/, /^KH[- ]?\d/, /MENTOR/, /ORION/, /TRUMPET/,
  /COSMOS/, /YAOGAN/, /SHIJIAN/, /OFEQ/, /HELIOS/, /^CSO[- ]/, /SAR[- ]?LUPE/, /SARAH/,
];

const IMAGING_PATTERNS = [
  /WORLDVIEW/, /GEOEYE/, /PLEIADES/, /^SPOT[- ]?\d/, /SKYSAT/, /FLOCK/, /^PLANET/, /ICEYE/,
  /CAPELLA/, /SENTINEL[- ]?[12]/, /LANDSAT/, /KOMPSAT/, /TERRASAR/, /TANDEM[- ]?X/, /^PAZ/,
  /UMBRA/, /BLACKSKY/, /SUPERVIEW/, /JILIN/, /GAOFEN/, /CARTOSAT/, /RADARSAT/, /COSMO[- ]?SKYMED/,
];

/**
 * Programmes that are not looking at the ground, whatever else the name
 * matches. Russia files navigation, communications and relay satellites under
 * the same COSMOS series as its reconnaissance ones, and the programme name in
 * brackets is the only thing that tells them apart.
 */
const NOT_IMAGING = [
  /GLONASS/, /NAVSTAR/, /GALILEO/, /BEIDOU/, /GPS /, /TDRS/, /METEOSAT/, /GOES/,
  /RODNIK/, /STRELA/, /GONETS/, /PARUS/, /MERIDIAN/, /LUCH/, /RADUGA/, /GEIZER/, /POTOK/,
];

export function categoriseSatellite(name: string): SatPassCategory {
  const upper = name.toUpperCase();
  if (NOT_IMAGING.some(p => p.test(upper))) return 'other';
  if (RECON_PATTERNS.some(p => p.test(upper))) return 'recon';
  if (IMAGING_PATTERNS.some(p => p.test(upper))) return 'imaging';
  return 'other';
}
