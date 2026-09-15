/**
 * Regions served from a catalogue bundled with the build.
 *
 * These fetchers do no I/O at all — they return an array that is already in
 * memory. That matters because the whole-world response runs every region
 * through a four-slot pool with a twelve-second budget, meant to stop one dead
 * upstream from starving the rest. A catalogue that needs no network was
 * queueing behind slow HTTP sources anyway and losing the race, which is how
 * Latin America, Africa, Europe-wide and most of Asia disappeared from the
 * global map while answering perfectly when asked for on their own.
 *
 * Listed explicitly rather than detected, and the list is asserted against the
 * source files in the tests: if one of these modules ever starts making a
 * request, it must stop being treated as instant.
 */
export const STATIC_REGION_SOURCES: Record<string, string> = {
  'asia-live': 'asia-live.ts',
  'latam-live': 'world-live.ts',
  'africa-live': 'world-live.ts',
  'europe-live': 'world-live.ts',
  italy: 'italy.ts',
  germany: 'germany.ts',
  france: 'france.ts',
  japan: 'japan.ts',
  switzerland: 'switzerland.ts',
  greece: 'greece.ts',
  serbia: 'serbia.ts',
  macedonia: 'macedonia.ts',
  romania: 'romania.ts',
  czechia: 'czechia.ts',
  slovakia: 'slovakia.ts',
  bulgaria: 'bulgaria.ts',
  turkey: 'turkey.ts',
  poland: 'poland.ts',
  thailand: 'thailand.ts',
};

export const STATIC_REGIONS = new Set(Object.keys(STATIC_REGION_SOURCES));

export function isStaticRegion(region: string): boolean {
  return STATIC_REGIONS.has(region);
}
