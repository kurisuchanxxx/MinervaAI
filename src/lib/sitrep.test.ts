import { describe, expect, it } from 'vitest';
import { buildSitrep, type SitrepInput } from './sitrep';

const base: SitrepInput = {
  lang: 'it',
  area: { kind: 'viewport' },
  counts: {},
  now: Date.UTC(2026, 0, 2, 8, 5),
};

describe('SITREP', () => {
  it('reports a quiet area', () => {
    const r = buildSitrep(base);
    expect(r.text).toContain('RAPPORTO SITUAZIONALE');
    expect(r.text).toContain('Nessuna attività');
    expect(r.timestamp).toBe('2026-01-02 08:05Z');
  });

  it('summarises activity in Italian with sections and assessment', () => {
    const r = buildSitrep({
      ...base,
      counts: { flights: 40, military: 3, earthquakes: 4, conflicts: 1, navWarnings: 2, gpsJamming: 1 },
      notable: {
        military: [{ callsign: 'RCH451', model: 'C17' }],
        conflicts: [{ label: 'Ucraina' }],
        navWarnings: [{ navArea: '4', msgNumber: 517, category: 'firing' }],
      },
    });
    expect(r.text).toContain('AVIAZIONE');
    expect(r.text).toContain('profilo militare');
    expect(r.text).toContain('RCH451 (C17)');
    expect(r.text).toContain('NAVAREA 4/517');
    expect(r.text).toContain('VALUTAZIONE');
    expect(r.headline).toMatch(/conflitto/i);
  });

  it('produces English output', () => {
    const r = buildSitrep({ ...base, lang: 'en', counts: { flights: 10 } });
    expect(r.text).toContain('SITUATION REPORT');
    expect(r.text).toContain('aircraft tracked');
  });
});
