/**
 * Numeric query parameters, read safely.
 *
 * `Number(null)` is 0, not NaN, so the obvious
 *
 *     const n = Number(params.get('x')); if (!Number.isFinite(n)) return fallback;
 *
 * silently turns an absent parameter into zero — and then clamping pins it to
 * the minimum. That bug shipped twice here: a 24-hour search window became one
 * hour, and a "any cloud cover" filter became "zero per cent cloud", which
 * matches almost no satellite scene. Absent is checked before parsing.
 */

export interface NumParamOptions {
  fallback: number;
  min?: number;
  max?: number;
  /** Reject values outside [min, max] instead of clamping them into range. */
  rejectOutOfRange?: boolean;
}

export function numParam(
  params: URLSearchParams,
  name: string,
  { fallback, min = -Infinity, max = Infinity, rejectOutOfRange = false }: NumParamOptions,
): number {
  const raw = params.get(name);
  if (raw === null || raw.trim() === '') return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value)) return fallback;
  if (rejectOutOfRange && (value < min || value > max)) return fallback;
  return Math.min(max, Math.max(min, value));
}

/** A coordinate pair, or null when either is missing or out of range. */
export function latLngParams(params: URLSearchParams): { lat: number; lng: number } | null {
  const lat = Number(params.get('lat'));
  const lng = Number(params.get('lng'));
  if (params.get('lat') === null || params.get('lng') === null) return null;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return { lat, lng };
}
