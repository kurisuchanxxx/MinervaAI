/**
 * Satellite imagery for before/after comparison.
 *
 * Two sources, chosen because neither needs an API key:
 *
 *   - NASA GIBS serves a global mosaic for *every day*, so any two dates can be
 *     compared anywhere. The resolution is 250 m — enough for smoke, floods,
 *     burn scars and, in the day/night band, for a city losing its power.
 *   - Copernicus Sentinel-2 (through the Element84 STAC catalogue) is 10 m, but
 *     only passes a given spot every few days and only sees through clear sky.
 *     So it is used to tell the analyst *which* dates are actually worth
 *     comparing, with the cloud cover for each.
 */

export interface BBox {
  west: number;
  south: number;
  east: number;
  north: number;
}

export type ImageryKind = 'truecolor' | 'night' | 'thermal';

export interface ImageryLayer {
  id: string;
  /** GIBS layer identifier. */
  gibs: string;
  kind: ImageryKind;
}

export const IMAGERY_LAYERS: ImageryLayer[] = [
  { id: 'trueColor', gibs: 'VIIRS_NOAA20_CorrectedReflectance_TrueColor', kind: 'truecolor' },
  { id: 'trueColorSnpp', gibs: 'VIIRS_SNPP_CorrectedReflectance_TrueColor', kind: 'truecolor' },
  { id: 'nightLights', gibs: 'VIIRS_SNPP_DayNightBand_At_Sensor_Radiance', kind: 'night' },
  { id: 'thermal', gibs: 'MODIS_Terra_CorrectedReflectance_Bands721', kind: 'thermal' },
];

export function layerById(id: string): ImageryLayer {
  return IMAGERY_LAYERS.find(l => l.id === id) ?? IMAGERY_LAYERS[0];
}

const GIBS_WMS = 'https://gibs.earthdata.nasa.gov/wms/epsg4326/best/wms.cgi';

/** Keeps a viewport inside the valid range, and refuses to ask for a degenerate box. */
export function clampBBox(bbox: BBox): BBox {
  const west = Math.max(-180, Math.min(180, bbox.west));
  const east = Math.max(-180, Math.min(180, bbox.east));
  const south = Math.max(-90, Math.min(90, bbox.south));
  const north = Math.max(-90, Math.min(90, bbox.north));
  return {
    west: Math.min(west, east),
    east: Math.max(west, east),
    south: Math.min(south, north),
    north: Math.max(south, north),
  };
}

export interface GibsRequest {
  layer: string;
  bbox: BBox;
  /** YYYY-MM-DD. */
  date: string;
  width?: number;
  height?: number;
}

/**
 * Builds a GIBS WMS GetMap URL.
 *
 * The one thing that is easy to get wrong: WMS 1.3.0 with EPSG:4326 takes the
 * bounding box in **latitude, longitude** order, not the lon/lat order every
 * other part of this codebase uses. Swapping them silently returns imagery of
 * somewhere else entirely, which is why it is asserted in the tests.
 */
export function gibsImageUrl({ layer, bbox, date, width = 640, height = 480 }: GibsRequest): string {
  const b = clampBBox(bbox);
  const params = new URLSearchParams({
    SERVICE: 'WMS',
    REQUEST: 'GetMap',
    VERSION: '1.3.0',
    LAYERS: layer,
    CRS: 'EPSG:4326',
    BBOX: `${b.south},${b.west},${b.north},${b.east}`,
    WIDTH: String(Math.round(width)),
    HEIGHT: String(Math.round(height)),
    FORMAT: 'image/png',
    TIME: date,
  });
  return `${GIBS_WMS}?${params.toString()}`;
}

/** YYYY-MM-DD in UTC, which is what GIBS indexes by. */
export function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function daysAgo(days: number, from: Date = new Date()): string {
  return isoDate(new Date(from.getTime() - days * 86_400_000));
}

/**
 * GIBS publishes a day's mosaic some hours after acquisition, so "today" is
 * often still empty. Yesterday is the safe default for the "after" image.
 */
export function defaultDates(from: Date = new Date()): { before: string; after: string } {
  return { before: daysAgo(31, from), after: daysAgo(1, from) };
}

export interface Scene {
  id: string;
  /** Acquisition timestamp, ISO. */
  datetime: string;
  /** YYYY-MM-DD, ready to hand to the GIBS comparison. */
  date: string;
  cloudCover: number;
  thumbnail: string | null;
  platform: string | null;
}

/**
 * Normalises a STAC item collection into the few fields the panel shows.
 *
 * Adjacent Sentinel-2 tiles overlap, so a single point is usually covered by
 * two items per pass. The analyst is choosing a *date*, not a tile, so the
 * dates are collapsed and the clearest item of each is kept.
 */
export function parseScenes(payload: unknown, limit = 20): Scene[] {
  const features = (payload as { features?: unknown[] })?.features;
  if (!Array.isArray(features)) return [];
  const scenes: Scene[] = [];
  for (const raw of features) {
    const f = raw as {
      id?: string;
      properties?: Record<string, unknown>;
      assets?: Record<string, { href?: string }>;
    };
    const datetime = typeof f.properties?.datetime === 'string' ? f.properties.datetime : null;
    if (!f.id || !datetime) continue;
    const cloud = f.properties?.['eo:cloud_cover'];
    scenes.push({
      id: f.id,
      datetime,
      date: datetime.slice(0, 10),
      cloudCover: typeof cloud === 'number' ? Math.round(cloud) : -1,
      thumbnail: f.assets?.thumbnail?.href ?? null,
      platform: typeof f.properties?.platform === 'string' ? f.properties.platform : null,
    });
  }
  const bestByDate = new Map<string, Scene>();
  for (const scene of scenes) {
    const held = bestByDate.get(scene.date);
    // An unknown cloud cover (-1) must not beat a measured one.
    const better = !held || (scene.cloudCover >= 0 && (held.cloudCover < 0 || scene.cloudCover < held.cloudCover));
    if (better) bestByDate.set(scene.date, scene);
  }
  return [...bestByDate.values()]
    .sort((a, b) => b.datetime.localeCompare(a.datetime))
    .slice(0, limit);
}
