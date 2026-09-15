import { describe, expect, it } from 'vitest';
import { clampBBox, daysAgo, defaultDates, gibsImageUrl, isoDate, layerById, parseScenes } from './imagery';

const rome = { west: 12.3, south: 41.8, east: 12.7, north: 42.0 };

describe('GIBS request building', () => {
  it('puts the bounding box in latitude,longitude order as WMS 1.3.0 requires', () => {
    const url = new URL(gibsImageUrl({ layer: 'L', bbox: rome, date: '2026-09-12' }));
    // Not "12.3,41.8,…": swapping these returns imagery of a different place.
    expect(url.searchParams.get('BBOX')).toBe('41.8,12.3,42,12.7');
    expect(url.searchParams.get('CRS')).toBe('EPSG:4326');
    expect(url.searchParams.get('VERSION')).toBe('1.3.0');
    expect(url.searchParams.get('TIME')).toBe('2026-09-12');
    expect(url.searchParams.get('LAYERS')).toBe('L');
  });

  it('keeps the box inside the world and orders the corners', () => {
    const wild = clampBBox({ west: 200, south: 95, east: -400, north: -120 });
    expect(wild.west).toBeGreaterThanOrEqual(-180);
    expect(wild.east).toBeLessThanOrEqual(180);
    expect(wild.south).toBeLessThanOrEqual(wild.north);
    expect(wild.west).toBeLessThanOrEqual(wild.east);
  });

  it('rounds the pixel dimensions', () => {
    const url = new URL(gibsImageUrl({ layer: 'L', bbox: rome, date: '2026-09-12', width: 640.6, height: 480.2 }));
    expect(url.searchParams.get('WIDTH')).toBe('641');
    expect(url.searchParams.get('HEIGHT')).toBe('480');
  });

  it('falls back to a real layer for an unknown id', () => {
    expect(layerById('nope').gibs).toBeTruthy();
    expect(layerById('nightLights').kind).toBe('night');
  });
});

describe('dates', () => {
  const anchor = new Date('2026-09-15T10:00:00Z');

  it('formats and subtracts in UTC', () => {
    expect(isoDate(anchor)).toBe('2026-09-15');
    expect(daysAgo(1, anchor)).toBe('2026-09-14');
    expect(daysAgo(30, anchor)).toBe('2026-08-16');
  });

  it('defaults the "after" image to yesterday, since today is often not published yet', () => {
    const { before, after } = defaultDates(anchor);
    expect(after).toBe('2026-09-14');
    expect(before).toBe('2026-08-15');
  });
});

describe('Sentinel-2 scene parsing', () => {
  const payload = {
    features: [
      {
        id: 'S2A_33TTG_20260913_0_L2A',
        properties: { datetime: '2026-09-13T10:06:31Z', 'eo:cloud_cover': 1.4, platform: 'sentinel-2a' },
        assets: { thumbnail: { href: 'https://example.invalid/thumb.jpg' } },
      },
      { id: 'no-datetime', properties: {}, assets: {} },
      { properties: { datetime: '2026-09-11T10:06:31Z' } },
    ],
  };

  it('keeps the fields the panel shows and drops unusable items', () => {
    const scenes = parseScenes(payload);
    expect(scenes).toHaveLength(1);
    expect(scenes[0]).toMatchObject({
      date: '2026-09-13',
      cloudCover: 1,
      thumbnail: 'https://example.invalid/thumb.jpg',
      platform: 'sentinel-2a',
    });
  });

  it('marks unknown cloud cover rather than pretending it is clear', () => {
    const scenes = parseScenes({ features: [{ id: 'x', properties: { datetime: '2026-09-13T00:00:00Z' } }] });
    expect(scenes[0].cloudCover).toBe(-1);
    expect(scenes[0].thumbnail).toBeNull();
  });

  it('collapses overlapping tiles to one entry per date, keeping the clearest', () => {
    const twoTiles = {
      features: [
        { id: 'a', properties: { datetime: '2026-09-13T10:06:31Z', 'eo:cloud_cover': 42 } },
        { id: 'b', properties: { datetime: '2026-09-13T10:06:29Z', 'eo:cloud_cover': 3 } },
        { id: 'c', properties: { datetime: '2026-09-11T10:06:31Z', 'eo:cloud_cover': 9 } },
      ],
    };
    const scenes = parseScenes(twoTiles);
    expect(scenes.map(s => s.date)).toEqual(['2026-09-13', '2026-09-11']);
    expect(scenes[0].cloudCover).toBe(3);
  });

  it('prefers a measured cloud cover over an unknown one', () => {
    const mixed = {
      features: [
        { id: 'a', properties: { datetime: '2026-09-13T10:06:31Z' } },
        { id: 'b', properties: { datetime: '2026-09-13T10:06:29Z', 'eo:cloud_cover': 55 } },
      ],
    };
    expect(parseScenes(mixed)[0].cloudCover).toBe(55);
  });

  it('survives anything that is not a STAC response', () => {
    expect(parseScenes(null)).toEqual([]);
    expect(parseScenes({})).toEqual([]);
    expect(parseScenes({ features: 'nope' })).toEqual([]);
  });
});
