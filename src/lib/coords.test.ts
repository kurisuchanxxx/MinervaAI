import { describe, expect, it } from 'vitest';
import { formatCoord, formatDD, formatDMS, formatMGRS, coordFormatLabel } from './coords';

describe('coordinate formatting', () => {
  it('decimal degrees', () => {
    expect(formatDD(41.9028, 12.4964)).toBe('41.9028, 12.4964');
  });

  it('degrees-minutes-seconds with hemispheres', () => {
    expect(formatDMS(41.9028, 12.4964)).toBe(`41°54'10.1"N 012°29'47.0"E`);
    expect(formatDMS(-33.8688, 151.2093)).toMatch(/S 151°/);
  });

  it('MGRS for a known point (Rome ≈ 33T TG)', () => {
    const s = formatMGRS(41.9028, 12.4964);
    expect(s).toMatch(/^33T[A-Z]{2}\d{10}$/);
  });

  it('MGRS is undefined at the poles and falls back to DD', () => {
    expect(formatMGRS(89, 10)).toBeNull();
    expect(formatCoord(89, 10, 'mgrs')).toBe(formatDD(89, 10));
  });

  it('labels', () => {
    expect(coordFormatLabel('mgrs')).toBe('MGRS');
  });
});
