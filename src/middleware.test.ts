import { describe, expect, it } from 'vitest';
import { readdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './middleware';
import { version as maplibreVersion } from 'maplibre-gl/package.json';

const vendorDir = fileURLToPath(new URL('../public/vendor/maplibre/', import.meta.url));
const workerPath = `/vendor/maplibre/${maplibreVersion}/maplibre-gl-worker.mjs`;

/* PR #330 moved the MapLibre worker out of the bundle and onto a self-hosted
   public/ path. When that file is not retrievable the canvas and the
   main-thread entity layers still draw, but no vector tile can be parsed, so
   the basemap never arrives and startup times out into "The map couldn't
   finish loading" — the production failure that forced the revert to fac8d1b.
   Both halves of that path are asserted here: the file has to ship, and the
   middleware matcher has to leave it alone. */
describe('map runtime assets', () => {
  const matches = (path: string) =>
    config.matcher.some(m => new RegExp(`^${m.replace(/:path\*/, '.*')}$`).test(path));

  it('ships the worker the bundle actually asks for', () => {
    expect(existsSync(`${vendorDir}${maplibreVersion}/maplibre-gl-worker.mjs`)).toBe(true);
    // The worker is a module that imports this sibling by relative path.
    expect(existsSync(`${vendorDir}${maplibreVersion}/maplibre-gl-shared.mjs`)).toBe(true);
  });

  it('keeps exactly one vendored version, so local cannot pass while a clean deploy fails', () => {
    expect(readdirSync(vendorDir, { withFileTypes: true })
      .filter(e => e.isDirectory()).map(e => e.name)).toEqual([maplibreVersion]);
  });

  it('does not put middleware in front of the map worker, its sibling, or the basemap style', () => {
    expect(matches(workerPath)).toBe(false);
    expect(matches(`/vendor/maplibre/${maplibreVersion}/maplibre-gl-shared.mjs`)).toBe(false);
    expect(matches('/dark-matter-style.json')).toBe(false);
  });
});

/* The matcher is the outer half of the RECON gate: a protected route that the
   matcher misses never reaches guardRecon at all, and would be served wide
   open. */
describe('RECON matcher', () => {
  const matches = (path: string) =>
    config.matcher.some(m => new RegExp(`^${m.replace(/:path\*/, '.*')}$`).test(path));

  it('covers every OSINT route and the scanner', () => {
    const osintDir = fileURLToPath(new URL('./app/api/osint/', import.meta.url));
    for (const route of readdirSync(osintDir, { withFileTypes: true }).filter(e => e.isDirectory())) {
      expect(matches(`/api/osint/${route.name}`), route.name).toBe(true);
    }
    expect(matches('/api/scanner')).toBe(true);
  });

  it('leaves the public feeds and pages alone', () => {
    expect(matches('/')).toBe(false);
    expect(matches('/docs')).toBe(false);
    expect(matches('/api/cctv')).toBe(false);
    expect(matches('/api/flights')).toBe(false);
    expect(matches('/api/auth/login')).toBe(false);
  });
});
