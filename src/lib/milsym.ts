/**
 * NATO military symbology (APP-6 / MIL-STD-2525C) for map annotation.
 *
 * Operators mark up a situation with standard symbols rather than coloured
 * dots: a symbol carries affiliation (friend / hostile / neutral / unknown),
 * what the unit is, and its echelon, all in one glyph an analyst reads at a
 * glance. The SIDC is the 15-character code that encodes it; milsymbol turns
 * that into the drawing.
 *
 * Only the code assembly lives here (pure, testable). Rendering to a canvas is
 * a thin wrapper, kept in this module so the symbol catalogue and the drawing
 * never drift apart.
 */

import ms from 'milsymbol';

export type Affiliation = 'friend' | 'hostile' | 'neutral' | 'unknown';

/** SIDC position 2 — the standard's affiliation letters. */
const AFFILIATION_CODE: Record<Affiliation, string> = {
  friend: 'F',
  hostile: 'H',
  neutral: 'N',
  unknown: 'U',
};

export const AFFILIATIONS: Affiliation[] = ['friend', 'hostile', 'neutral', 'unknown'];

/** Rough colour of each affiliation's frame, for UI chips outside the symbol itself. */
export const AFFILIATION_COLOR: Record<Affiliation, string> = {
  friend: '#80E0FF',
  hostile: '#FF8080',
  neutral: '#AAFFAA',
  unknown: '#FFFF80',
};

export type SymbolGroup = 'ground' | 'air' | 'sea' | 'installation';

export interface SymbolKind {
  id: string;
  group: SymbolGroup;
  /**
   * SIDC with the affiliation at position 2 left as `*`; everything else fixed.
   * Positions 11-12 carry the echelon, so they stay `-` here.
   */
  template: string;
}

/**
 * A working set of symbols, each verified to render. Deliberately short: a
 * usable palette beats an exhaustive one nobody can find anything in.
 */
export const SYMBOL_KINDS: SymbolKind[] = [
  { id: 'infantry', group: 'ground', template: 'S*GPUCI-----' },
  { id: 'mechInfantry', group: 'ground', template: 'S*GPUCIZ----' },
  { id: 'armour', group: 'ground', template: 'S*GPUCA-----' },
  { id: 'artillery', group: 'ground', template: 'S*GPUCF-----' },
  { id: 'recon', group: 'ground', template: 'S*GPUCR-----' },
  { id: 'airDefence', group: 'ground', template: 'S*GPUCD-----' },
  { id: 'sam', group: 'ground', template: 'S*GPUCDM----' },
  { id: 'missile', group: 'ground', template: 'S*GPUCM-----' },
  { id: 'engineer', group: 'ground', template: 'S*GPUCE-----' },
  { id: 'signal', group: 'ground', template: 'S*GPUUS-----' },
  { id: 'supply', group: 'ground', template: 'S*GPUSS-----' },
  { id: 'medical', group: 'ground', template: 'S*GPUSM-----' },
  { id: 'headquarters', group: 'ground', template: 'S*GPUH------' },

  { id: 'fighter', group: 'air', template: 'S*APMFF-----' },
  { id: 'attackAir', group: 'air', template: 'S*APMFA-----' },
  { id: 'transportAir', group: 'air', template: 'S*APMFC-----' },
  { id: 'tankerAir', group: 'air', template: 'S*APMFK-----' },
  { id: 'isrAir', group: 'air', template: 'S*APMFRW----' },
  { id: 'helicopter', group: 'air', template: 'S*APMH------' },
  { id: 'uav', group: 'air', template: 'S*APMFQ-----' },

  { id: 'surfaceCombatant', group: 'sea', template: 'S*SPC-------' },
  { id: 'carrier', group: 'sea', template: 'S*SPCLCV----' },
  { id: 'patrolBoat', group: 'sea', template: 'S*SPCLBB----' },
  { id: 'submarine', group: 'sea', template: 'S*UPS-------' },

  { id: 'installation', group: 'installation', template: 'S*GPI-------' },
  { id: 'airfield', group: 'installation', template: 'S*GPIBA-----' },
];

/**
 * Echelon codes that milsymbol actually draws. Division and above exist in the
 * standard but render identically to no echelon here, so they are left out
 * rather than offered as a control that does nothing.
 */
export type Echelon = '' | 'A' | 'B' | 'C' | 'D' | 'E' | 'F' | 'G' | 'H';
export const ECHELONS: Echelon[] = ['', 'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export interface MilSymbolSpec {
  kindId: string;
  affiliation: Affiliation;
  echelon?: Echelon;
}

/** A symbol an operator has placed on the map. */
export interface PlacedSymbol extends MilSymbolSpec {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  createdAt: number;
}

export function kindById(kindId: string): SymbolKind | undefined {
  return SYMBOL_KINDS.find(k => k.id === kindId);
}

/**
 * Builds the 15-character SIDC: affiliation into position 2, echelon into
 * position 11. Falls back to plain infantry for an unknown kind so a corrupt
 * saved annotation still draws something rather than throwing.
 */
export function buildSidc(spec: MilSymbolSpec): string {
  const kind = kindById(spec.kindId) ?? SYMBOL_KINDS[0];
  const withAffiliation = kind.template.replace('*', AFFILIATION_CODE[spec.affiliation] ?? 'U');
  const padded = withAffiliation.padEnd(15, '-');
  const echelon = spec.echelon || '-';
  return padded.slice(0, 10) + echelon + padded.slice(11);
}

/** Stable key for caching a rendered icon. */
export function symbolImageId(spec: MilSymbolSpec): string {
  return `milsym-${buildSidc(spec)}`;
}

/**
 * Draws the symbol. Browser-only (milsymbol needs a canvas), so callers in
 * effects/handlers; returns null for anything that will not render rather than
 * throwing into a map layer update.
 */
export function symbolCanvas(spec: MilSymbolSpec, size = 34): HTMLCanvasElement | null {
  try {
    const symbol = new ms.Symbol(buildSidc(spec), { size });
    return symbol.isValid() ? symbol.asCanvas() : null;
  } catch {
    return null;
  }
}

/** Data URL for an `<img>` in the picker UI. */
export function symbolDataUrl(spec: MilSymbolSpec, size = 34): string | null {
  const canvas = symbolCanvas(spec, size);
  return canvas ? canvas.toDataURL() : null;
}

export const SYMBOL_STORAGE_KEY = 'minerva.milsymbols.v1';

export function serializeSymbols(symbols: PlacedSymbol[]): string {
  return JSON.stringify(symbols);
}

/** Tolerant of anything that is not a well-formed saved list. */
export function deserializeSymbols(raw: string | null): PlacedSymbol[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((s): s is PlacedSymbol =>
        !!s && typeof s.id === 'string' && typeof s.lat === 'number' && typeof s.lng === 'number' && typeof s.kindId === 'string',
      )
      .map(s => ({
        id: s.id,
        kindId: s.kindId,
        affiliation: AFFILIATIONS.includes(s.affiliation) ? s.affiliation : 'unknown',
        echelon: (ECHELONS as string[]).includes(s.echelon ?? '') ? s.echelon : '',
        lat: s.lat,
        lng: s.lng,
        label: typeof s.label === 'string' ? s.label : undefined,
        createdAt: typeof s.createdAt === 'number' ? s.createdAt : Date.now(),
      }));
  } catch {
    return [];
  }
}

/** GeoJSON export; the SIDC travels with each point so other tools can redraw it. */
export function symbolsToGeoJSON(symbols: PlacedSymbol[]): GeoJSON.FeatureCollection {
  return {
    type: 'FeatureCollection',
    features: symbols.map(s => ({
      type: 'Feature' as const,
      geometry: { type: 'Point' as const, coordinates: [s.lng, s.lat] },
      properties: {
        sidc: buildSidc(s),
        kind: s.kindId,
        affiliation: s.affiliation,
        echelon: s.echelon || null,
        label: s.label || null,
        created_at: new Date(s.createdAt).toISOString(),
      },
    })),
  };
}
