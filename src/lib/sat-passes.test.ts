import { describe, expect, it } from 'vitest';
import { canReachLatitude, categoriseSatellite, findPasses, inclinationDeg, isLowEarthOrbit, meanMotion } from './sat-passes';

/* A real ISS element set. Its epoch is fixed, so the propagation is
   deterministic: searching the day after the epoch always yields the same
   passes, which is what makes this testable without mocking time. */
const ISS_L1 = '1 25544U 98067A   24146.40251785  .00015505  00000-0  27885-3 0  9997';
const ISS_L2 = '2 25544  51.6402 189.7042 0004381 334.8091 106.8778 15.50091157454982';

/* A sun-synchronous imaging satellite: near-polar, so it reaches any latitude. */
const SENTINEL_L1 = '1 39634U 14016A   24146.47624458  .00000123  00000-0  36130-4 0  9993';
const SENTINEL_L2 = '2 39634  98.1817 209.5177 0001366  85.6033 274.5327 14.59198916540721';

describe('orbit geometry from the element set', () => {
  it('reads inclination off line 2', () => {
    expect(inclinationDeg(ISS_L2)).toBeCloseTo(51.64, 2);
    expect(inclinationDeg(SENTINEL_L2)).toBeCloseTo(98.18, 2);
  });

  it('knows which latitudes an orbit can reach', () => {
    // The ISS never goes near the poles.
    expect(canReachLatitude(ISS_L2, 45)).toBe(true);
    expect(canReachLatitude(ISS_L2, 78)).toBe(false);
    // A near-polar sun-synchronous orbit reaches everywhere.
    expect(canReachLatitude(SENTINEL_L2, 78)).toBe(true);
  });
});

describe('pass prediction', () => {
  // Rome, the day after the element set epoch.
  const rome = { lat: 41.9028, lng: 12.4964 };
  const from = new Date('2024-05-26T00:00:00Z');
  const to = new Date('2024-05-27T00:00:00Z');

  it('finds ISS passes over Rome and describes them coherently', () => {
    const passes = findPasses(ISS_L1, ISS_L2, rome, from, to, { minElevationDeg: 20 });
    expect(passes.length).toBeGreaterThan(0);

    for (const pass of passes) {
      expect(new Date(pass.start).getTime()).toBeLessThanOrEqual(new Date(pass.culmination).getTime());
      expect(new Date(pass.culmination).getTime()).toBeLessThanOrEqual(new Date(pass.end).getTime());
      expect(pass.maxElevation).toBeGreaterThanOrEqual(20);
      expect(pass.maxElevation).toBeLessThanOrEqual(90);
      expect(pass.culminationAzimuth).toBeGreaterThanOrEqual(0);
      expect(pass.culminationAzimuth).toBeLessThan(360);
      // A low-orbit pass is minutes, not hours.
      expect(pass.durationMinutes).toBeLessThan(20);
      // Slant range at 20°+ elevation is a few hundred to ~1500 km.
      expect(pass.rangeKm).toBeGreaterThan(300);
      expect(pass.rangeKm).toBeLessThan(2500);
    }
  });

  it('returns fewer passes as the elevation bar rises', () => {
    const low = findPasses(ISS_L1, ISS_L2, rome, from, to, { minElevationDeg: 10 });
    const high = findPasses(ISS_L1, ISS_L2, rome, from, to, { minElevationDeg: 60 });
    expect(high.length).toBeLessThanOrEqual(low.length);
  });

  it('finds nothing over a latitude the orbit never reaches', () => {
    const northPole = { lat: 89.5, lng: 0 };
    expect(findPasses(ISS_L1, ISS_L2, northPole, from, to, { minElevationDeg: 20 })).toHaveLength(0);
  });

  it('returns nothing for an unusable element set instead of throwing', () => {
    expect(findPasses('nonsense', 'also nonsense', rome, from, to)).toEqual([]);
  });

  it('honours the pass cap', () => {
    const passes = findPasses(ISS_L1, ISS_L2, rome, from, to, { minElevationDeg: 5, maxPasses: 2 });
    expect(passes.length).toBeLessThanOrEqual(2);
  });
});

describe('orbit altitude filter', () => {
  const GLONASS_L2 = '2 32393  64.6699 138.5290 0010064 232.3391 127.6041  2.13102380101823';

  it('reads mean motion and keeps only low orbits', () => {
    expect(meanMotion(ISS_L2)).toBeCloseTo(15.5, 1);
    expect(meanMotion(GLONASS_L2)).toBeCloseTo(2.13, 2);
    expect(isLowEarthOrbit(ISS_L2)).toBe(true);
    expect(isLowEarthOrbit(SENTINEL_L2)).toBe(true);
    // A navigation satellite stays above the horizon for hours and images
    // nothing; it must not compete with real imaging passes.
    expect(isLowEarthOrbit(GLONASS_L2)).toBe(false);
  });
});

describe('satellite categories', () => {
  it('never files a navigation constellation as reconnaissance', () => {
    // Russia names navigation satellites COSMOS too.
    expect(categoriseSatellite('COSMOS 2457 [GLONASS-M]')).toBe('other');
    expect(categoriseSatellite('NAVSTAR 81 (USA 319)')).toBe('other');
    expect(categoriseSatellite('GALILEO 27')).toBe('other');
    // Communications and relay satellites also fly under the COSMOS series.
    expect(categoriseSatellite('COSMOS 2530 (RODNIK-S)')).toBe('other');
    expect(categoriseSatellite('COSMOS 2488 (STRELA-3M)')).toBe('other');
    // A plain COSMOS with no programme tag stays a reconnaissance candidate.
    expect(categoriseSatellite('COSMOS 2576')).toBe('recon');
  });

  it('separates reconnaissance, commercial imaging and everything else', () => {
    expect(categoriseSatellite('USA 245')).toBe('recon');
    expect(categoriseSatellite('NROL-91')).toBe('recon');
    expect(categoriseSatellite('COSMOS 2576')).toBe('recon');
    expect(categoriseSatellite('SENTINEL-2B')).toBe('imaging');
    expect(categoriseSatellite('WORLDVIEW-3')).toBe('imaging');
    expect(categoriseSatellite('ICEYE-X12')).toBe('imaging');
    expect(categoriseSatellite('STARLINK-1234')).toBe('other');
    expect(categoriseSatellite('ISS (ZARYA)')).toBe('other');
  });
});
