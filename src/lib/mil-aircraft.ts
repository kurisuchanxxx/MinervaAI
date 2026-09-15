/**
 * Military aircraft: what an airframe is for, and whether it is holding.
 *
 * ADS-B gives a type designator and a track, not a mission. Two things an
 * analyst reads off that:
 *
 *   - Role. A tanker or an ISR platform means something different from a
 *     transport on a schedule, so the type code is mapped to a role.
 *   - Loitering. Tankers and ISR aircraft fly racetracks; a transit does not.
 *     An aircraft that stays inside a small circle for a long time while
 *     airborne is orbiting, and where it orbits is the interesting part.
 *
 * Pure functions — the feed shape stays in the API route, the judgement lives
 * here where it can be tested.
 */

import { haversine } from './geo';

export type MilRole =
  | 'tanker'
  | 'isr'
  | 'awacs'
  | 'patrol'
  | 'transport'
  | 'fighter'
  | 'bomber'
  | 'helicopter'
  | 'uav'
  | 'trainer'
  | 'vip'
  | 'other';

/**
 * ICAO type designator → role.
 *
 * Only consulted for traffic already classified as military, which is what
 * makes airliner frames meaningful here: a military A330 is moving people or
 * fuel either way, so it is called a transport. The tanker variants are not
 * distinguishable from ADS-B — an A330 MRTT files as plain `A332` — so a
 * refuelling role is only claimed for types whose designator says so (KC-…).
 */
const ROLE_BY_TYPE: Record<string, MilRole> = {
  // Air-to-air refuelling
  KC10: 'tanker', KC46: 'tanker', KC35: 'tanker', K35R: 'tanker', K35E: 'tanker',
  KDC1: 'tanker', VC10: 'tanker', KC30: 'tanker',

  // Airborne early warning / battle management
  E3CF: 'awacs', E3TF: 'awacs', E3: 'awacs', E767: 'awacs', E7: 'awacs', E2: 'awacs', E2C: 'awacs', E2D: 'awacs',

  // Intelligence, surveillance, reconnaissance
  RC135: 'isr', R135: 'isr', RC12: 'isr', U2: 'isr', EP3: 'isr', E8A: 'isr', E8C: 'isr',
  E6B: 'isr', E4B: 'isr',

  // Maritime patrol / anti-submarine
  P8A: 'patrol', P8: 'patrol', P3: 'patrol', P3C: 'patrol', ATP: 'patrol', CN35: 'patrol',

  // Airlift
  C17: 'transport', C5M: 'transport', C130: 'transport', C30J: 'transport', C160: 'transport',
  A400: 'transport', C27J: 'transport', C295: 'transport', C40A: 'transport', C21: 'transport',
  E390: 'transport', M28: 'transport', C12: 'transport', BE20: 'transport', B350: 'transport',
  PC6T: 'transport', E121: 'transport', DHC6: 'transport', CASA: 'transport',
  // Airliner frames in military service: strategic transport, and the frames
  // the tanker and VIP variants share.
  A310: 'transport', A319: 'transport', A320: 'transport', A332: 'transport', A333: 'transport',
  A343: 'transport', A359: 'transport', B737: 'transport', B738: 'transport', B752: 'transport',
  B763: 'transport', E170: 'transport', E175: 'transport', E190: 'transport', E195: 'transport',

  // Fast jets
  F15: 'fighter', F16: 'fighter', F18: 'fighter', F22: 'fighter', F35: 'fighter', A10: 'fighter',
  F117: 'fighter', F5: 'fighter', F4: 'fighter', EUFI: 'fighter', RFAL: 'fighter', TORD: 'fighter',
  TYP: 'fighter', GR4: 'fighter', J39: 'fighter', MG29: 'fighter', S27: 'fighter', M2000: 'fighter',
  MIR2: 'fighter', AV8B: 'fighter',

  // Bombers
  B1B: 'bomber', B2: 'bomber', B52: 'bomber', T95: 'bomber', T160: 'bomber', T22M: 'bomber',

  // Rotary and tiltrotor
  V22: 'helicopter', MV22: 'helicopter', CH47: 'helicopter', UH60: 'helicopter', H60: 'helicopter',
  AH64: 'helicopter', AH1Z: 'helicopter', CH53: 'helicopter', NH90: 'helicopter', EH10: 'helicopter',
  A139: 'helicopter', LYNX: 'helicopter', PUMA: 'helicopter', EC35: 'helicopter', EC45: 'helicopter',
  H145: 'helicopter', H135: 'helicopter', H160: 'helicopter', H47: 'helicopter', AS55: 'helicopter',
  AS32: 'helicopter', H225: 'helicopter', EC75: 'helicopter', A109: 'helicopter', AS65: 'helicopter',

  // Uncrewed
  MQ9: 'uav', RQ4: 'uav', MQ4: 'uav', MQ1: 'uav', Q4: 'uav', Q9: 'uav', TB2: 'uav', RQ170: 'uav',

  // Training
  T6: 'trainer', T38: 'trainer', HAWK: 'trainer', M346: 'trainer', PC21: 'trainer', T45: 'trainer',
  TEX2: 'trainer', G115: 'trainer', G120: 'trainer', G12T: 'trainer', Z42: 'trainer', PC7: 'trainer',
  PC9: 'trainer', MF17: 'trainer', SF26: 'trainer',

  // Command / government transport
  VC25: 'vip', C32A: 'vip', C37A: 'vip', C37B: 'vip', CL60: 'vip', GLF4: 'vip', GLF5: 'vip', FA7X: 'vip',
};

/** Role from an ICAO type designator; `other` when the type says nothing useful. */
export function roleForType(typeCode: string | null | undefined): MilRole {
  if (!typeCode) return 'other';
  return ROLE_BY_TYPE[typeCode.trim().toUpperCase()] ?? 'other';
}

/** Roles whose presence is worth calling out on its own in a report. */
export const NOTABLE_ROLES: MilRole[] = ['tanker', 'isr', 'awacs', 'uav', 'bomber', 'patrol'];

export interface TrackSample {
  lat: number;
  lng: number;
  /** Epoch milliseconds. */
  ts: number;
}

export interface LoiterVerdict {
  /** True when the track looks like a holding pattern rather than a transit. */
  orbiting: boolean;
  samples: number;
  spanMinutes: number;
  /** Farthest sample from the centre of the track, in km. */
  radiusKm: number;
  centre: { lat: number; lng: number } | null;
}

export interface LoiterOptions {
  /** Samples needed before a verdict is possible. */
  minSamples?: number;
  /** The track has to cover at least this long. */
  minSpanMinutes?: number;
  /** An aircraft in transit leaves this circle; one in a racetrack does not. */
  maxRadiusKm?: number;
  /** Samples older than this are ignored, so a finished orbit stops counting. */
  windowMinutes?: number;
}

const DEFAULTS: Required<LoiterOptions> = {
  minSamples: 3,
  minSpanMinutes: 12,
  // A jet at 400 kt covers ~120 km in 10 minutes; 60 km is comfortably inside
  // that, and comfortably outside the few km of position noise.
  maxRadiusKm: 60,
  windowMinutes: 75,
};

/**
 * Decides whether a series of positions is a holding pattern.
 *
 * Deliberately geometric rather than heading-based: the feed is polled every
 * few minutes, far too coarsely to integrate turn rate, but plenty to see that
 * an aircraft has not gone anywhere.
 */
export function detectLoiter(samples: TrackSample[], options: LoiterOptions = {}, now = Date.now()): LoiterVerdict {
  const opts = { ...DEFAULTS, ...options };
  const recent = samples
    .filter(s => now - s.ts <= opts.windowMinutes * 60_000)
    .sort((a, b) => a.ts - b.ts);

  const empty: LoiterVerdict = { orbiting: false, samples: recent.length, spanMinutes: 0, radiusKm: 0, centre: null };
  if (recent.length < opts.minSamples) return empty;

  const spanMinutes = (recent[recent.length - 1].ts - recent[0].ts) / 60_000;
  const centre = {
    lat: recent.reduce((sum, s) => sum + s.lat, 0) / recent.length,
    lng: recent.reduce((sum, s) => sum + s.lng, 0) / recent.length,
  };
  const radiusKm = recent.reduce((max, s) => Math.max(max, haversine([centre.lng, centre.lat], [s.lng, s.lat])), 0);

  return {
    orbiting: spanMinutes >= opts.minSpanMinutes && radiusKm <= opts.maxRadiusKm,
    samples: recent.length,
    spanMinutes: Math.round(spanMinutes),
    radiusKm: Math.round(radiusKm * 10) / 10,
    centre,
  };
}

/** Keeps a bounded per-aircraft position history between feed refreshes. */
export function appendSample(
  history: Map<string, TrackSample[]>,
  id: string,
  sample: TrackSample,
  { maxSamples = 30, windowMinutes = 75 }: { maxSamples?: number; windowMinutes?: number } = {},
): void {
  const previous = history.get(id) ?? [];
  // The feed republishes the same snapshot between polls; an identical
  // timestamp would otherwise inflate the sample count without adding track.
  if (previous.some(s => s.ts === sample.ts)) return;
  const cutoff = sample.ts - windowMinutes * 60_000;
  const next = [...previous.filter(s => s.ts >= cutoff), sample].slice(-maxSamples);
  history.set(id, next);
}
