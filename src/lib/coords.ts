/**
 * Coordinate formatting for the analyst readout.
 *
 * Three formats operators actually use: decimal degrees, degrees-minutes-
 * seconds, and MGRS (the NATO military grid). The active format is a per-viewer
 * preference; the map itself always works in lng/lat.
 */
import { forward as mgrsForward } from 'mgrs';

export type CoordFormat = 'dd' | 'dms' | 'mgrs';
export const COORD_FORMATS: CoordFormat[] = ['dd', 'dms', 'mgrs'];
export const COORD_FORMAT_STORAGE_KEY = 'minerva.coordFormat';

export function isCoordFormat(v: unknown): v is CoordFormat {
  return v === 'dd' || v === 'dms' || v === 'mgrs';
}

/** Decimal degrees, e.g. `41.9028, 12.4964`. */
export function formatDD(lat: number, lng: number): string {
  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

function dmsPart(value: number, positive: string, negative: string, degWidth: number): string {
  const hemi = value >= 0 ? positive : negative;
  const abs = Math.abs(value);
  const deg = Math.floor(abs);
  const minFloat = (abs - deg) * 60;
  const min = Math.floor(minFloat);
  const sec = (minFloat - min) * 60;
  return `${String(deg).padStart(degWidth, '0')}°${String(min).padStart(2, '0')}'${sec.toFixed(1).padStart(4, '0')}"${hemi}`;
}

/** Degrees/minutes/seconds, e.g. `41°54'10.1"N 012°29'47.0"E` (longitude padded to 3°). */
export function formatDMS(lat: number, lng: number): string {
  return `${dmsPart(lat, 'N', 'S', 2)} ${dmsPart(lng, 'E', 'W', 3)}`;
}

/**
 * MGRS grid reference at 1 m precision, e.g. `33TTG9233542015`.
 * MGRS is undefined beyond ±80° latitude (UPS territory), which mgrs.forward
 * throws on; callers get null there and should fall back to another format.
 */
export function formatMGRS(lat: number, lng: number): string | null {
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat > 84 || lat < -80) return null;
  try {
    return mgrsForward([lng, lat], 5);
  } catch {
    return null;
  }
}

/** Formats with the given style, falling back to decimal degrees when MGRS is undefined. */
export function formatCoord(lat: number, lng: number, format: CoordFormat): string {
  if (format === 'dms') return formatDMS(lat, lng);
  if (format === 'mgrs') return formatMGRS(lat, lng) ?? formatDD(lat, lng);
  return formatDD(lat, lng);
}

/** Short uppercase tag for the format switch. */
export function coordFormatLabel(format: CoordFormat): string {
  return format === 'dd' ? 'DD' : format === 'dms' ? 'DMS' : 'MGRS';
}
