import { describe, expect, it } from 'vitest';
import { latLngParams, numParam } from './query-params';

const q = (search: string) => new URLSearchParams(search);

describe('numeric query parameters', () => {
  it('uses the fallback when the parameter is absent', () => {
    // The bug this exists to prevent: Number(null) is 0, so an absent
    // parameter used to be clamped to the minimum instead of defaulting.
    expect(numParam(q(''), 'hours', { fallback: 24, min: 1, max: 72 })).toBe(24);
    expect(numParam(q('hours='), 'hours', { fallback: 24, min: 1, max: 72 })).toBe(24);
    expect(numParam(q('maxCloud='), 'maxCloud', { fallback: 100, min: 0, max: 100 })).toBe(100);
  });

  it('uses the fallback for values that are not numbers', () => {
    expect(numParam(q('hours=soon'), 'hours', { fallback: 24 })).toBe(24);
    expect(numParam(q('hours=NaN'), 'hours', { fallback: 24 })).toBe(24);
    expect(numParam(q('hours=Infinity'), 'hours', { fallback: 24 })).toBe(24);
  });

  it('reads and clamps real values, zero included', () => {
    expect(numParam(q('hours=6'), 'hours', { fallback: 24, min: 1, max: 72 })).toBe(6);
    expect(numParam(q('hours=500'), 'hours', { fallback: 24, min: 1, max: 72 })).toBe(72);
    expect(numParam(q('hours=-5'), 'hours', { fallback: 24, min: 1, max: 72 })).toBe(1);
    // An explicit zero is a real request, not an absent parameter.
    expect(numParam(q('maxCloud=0'), 'maxCloud', { fallback: 100, min: 0, max: 100 })).toBe(0);
  });

  it('can reject out-of-range values instead of clamping', () => {
    expect(numParam(q('lat=91'), 'lat', { fallback: 0, min: -90, max: 90, rejectOutOfRange: true })).toBe(0);
    expect(numParam(q('lat=45'), 'lat', { fallback: 0, min: -90, max: 90, rejectOutOfRange: true })).toBe(45);
  });
});

describe('coordinate parameters', () => {
  it('accepts a valid pair, including zeroes', () => {
    expect(latLngParams(q('lat=41.9&lng=12.5'))).toEqual({ lat: 41.9, lng: 12.5 });
    expect(latLngParams(q('lat=0&lng=0'))).toEqual({ lat: 0, lng: 0 });
  });

  it('rejects missing, unparseable or impossible coordinates', () => {
    expect(latLngParams(q(''))).toBeNull();
    expect(latLngParams(q('lat=41.9'))).toBeNull();
    expect(latLngParams(q('lat=here&lng=12.5'))).toBeNull();
    expect(latLngParams(q('lat=91&lng=12.5'))).toBeNull();
    expect(latLngParams(q('lat=41.9&lng=181'))).toBeNull();
  });
});
