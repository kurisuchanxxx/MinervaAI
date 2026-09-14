import { describe, expect, it } from 'vitest';
import ms from 'milsymbol';
import {
  buildSidc,
  deserializeSymbols,
  ECHELONS,
  serializeSymbols,
  SYMBOL_KINDS,
  symbolsToGeoJSON,
  type PlacedSymbol,
} from './milsym';

describe('SIDC assembly', () => {
  it('puts the affiliation in position 2 and keeps 15 characters', () => {
    expect(buildSidc({ kindId: 'infantry', affiliation: 'friend' })).toBe('SFGPUCI--------');
    expect(buildSidc({ kindId: 'infantry', affiliation: 'hostile' })[1]).toBe('H');
    expect(buildSidc({ kindId: 'infantry', affiliation: 'neutral' })[1]).toBe('N');
    expect(buildSidc({ kindId: 'infantry', affiliation: 'unknown' })[1]).toBe('U');
    expect(buildSidc({ kindId: 'infantry', affiliation: 'friend' })).toHaveLength(15);
  });

  it('puts the echelon in position 11', () => {
    const sidc = buildSidc({ kindId: 'armour', affiliation: 'friend', echelon: 'E' });
    expect(sidc[10]).toBe('E');
    expect(sidc).toHaveLength(15);
  });

  it('falls back to a drawable symbol for an unknown kind', () => {
    expect(new ms.Symbol(buildSidc({ kindId: 'nonsense', affiliation: 'friend' })).isValid()).toBe(true);
  });

  it('every catalogued kind renders for every affiliation and echelon', () => {
    for (const kind of SYMBOL_KINDS) {
      for (const affiliation of ['friend', 'hostile', 'neutral', 'unknown'] as const) {
        for (const echelon of ECHELONS) {
          const sidc = buildSidc({ kindId: kind.id, affiliation, echelon });
          expect(new ms.Symbol(sidc).isValid(), `${kind.id}/${affiliation}/${echelon || 'none'} → ${sidc}`).toBe(true);
        }
      }
    }
  });
});

describe('persistence and export', () => {
  const symbols: PlacedSymbol[] = [
    { id: 'a', kindId: 'armour', affiliation: 'hostile', echelon: 'F', lat: 48.5, lng: 31.2, label: '1 BTG', createdAt: 1_700_000_000_000 },
  ];

  it('round-trips through storage', () => {
    expect(deserializeSymbols(serializeSymbols(symbols))).toEqual(symbols);
  });

  it('survives corrupt or foreign storage content', () => {
    expect(deserializeSymbols(null)).toEqual([]);
    expect(deserializeSymbols('not json')).toEqual([]);
    expect(deserializeSymbols('{"a":1}')).toEqual([]);
    expect(deserializeSymbols('[{"id":"x"}]')).toEqual([]);
    const repaired = deserializeSymbols('[{"id":"x","kindId":"armour","lat":1,"lng":2,"affiliation":"bogus"}]');
    expect(repaired[0].affiliation).toBe('unknown');
  });

  it('exports GeoJSON carrying the SIDC', () => {
    const fc = symbolsToGeoJSON(symbols);
    expect(fc.features[0].geometry).toEqual({ type: 'Point', coordinates: [31.2, 48.5] });
    expect(fc.features[0].properties?.sidc).toBe(buildSidc(symbols[0]));
    expect(fc.features[0].properties?.label).toBe('1 BTG');
  });
});
