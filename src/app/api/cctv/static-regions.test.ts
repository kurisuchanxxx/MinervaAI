import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { isStaticRegion, STATIC_REGION_SOURCES } from './static-regions';

const dir = fileURLToPath(new URL('./', import.meta.url));

/* A region is only safe to resolve outside the pool if it really does no I/O.
   Treating a network source as instant would put an unbounded fetch on the
   critical path of every visitor's first request — exactly the fetch storm the
   pool exists to prevent. */
describe('static camera regions', () => {
  it('every region declared static is backed by a catalogue that makes no requests', () => {
    for (const [region, file] of Object.entries(STATIC_REGION_SOURCES)) {
      const source = readFileSync(`${dir}${file}`, 'utf8');
      // Strip comments so prose about fetching does not trip the check.
      const code = source.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
      expect(/\bfetch\s*\(|stealthFetch\s*\(/.test(code), `${region} (${file}) makes a request`).toBe(false);
    }
  });

  it('knows which regions are static', () => {
    expect(isStaticRegion('latam-live')).toBe(true);
    expect(isStaticRegion('italy')).toBe(true);
    // Live upstreams must keep their pool slot and their budget.
    expect(isStaticRegion('uk')).toBe(false);
    expect(isStaticRegion('taiwan')).toBe(false);
    expect(isStaticRegion('spain')).toBe(false);
  });
});
