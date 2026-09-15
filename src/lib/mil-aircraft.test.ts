import { describe, expect, it } from 'vitest';
import { appendSample, detectLoiter, roleForType, type TrackSample } from './mil-aircraft';

describe('role from type designator', () => {
  it('recognises the roles that change what a track means', () => {
    expect(roleForType('KC46')).toBe('tanker');
    expect(roleForType('k35r')).toBe('tanker');
    expect(roleForType('RC135')).toBe('isr');
    expect(roleForType('E3TF')).toBe('awacs');
    expect(roleForType('P8A')).toBe('patrol');
    expect(roleForType('C17')).toBe('transport');
    expect(roleForType('F35')).toBe('fighter');
    expect(roleForType('B52')).toBe('bomber');
    expect(roleForType('CH47')).toBe('helicopter');
    expect(roleForType('MQ9')).toBe('uav');
  });

  it('calls a military airliner frame a transport, never a tanker on a guess', () => {
    // Only consulted for traffic already classified as military, so an
    // airliner frame here is strategic airlift. An A330 MRTT files as a plain
    // A332, so refuelling is only claimed where the designator says KC-.
    expect(roleForType('A332')).toBe('transport');
    expect(roleForType('A310')).toBe('transport');
    expect(roleForType('KC30')).toBe('tanker');
  });

  it('says nothing rather than guessing', () => {
    expect(roleForType('')).toBe('other');
    expect(roleForType(null)).toBe('other');
    expect(roleForType('ZZZZ')).toBe('other');
  });
});

describe('loiter detection', () => {
  const now = Date.UTC(2026, 0, 2, 12, 0);
  const minutesAgo = (m: number) => now - m * 60_000;

  it('calls a racetrack an orbit', () => {
    // Four passes around a ~25 km box over 45 minutes.
    const track: TrackSample[] = [
      { lat: 44.0, lng: 29.0, ts: minutesAgo(45) },
      { lat: 44.2, lng: 29.2, ts: minutesAgo(30) },
      { lat: 44.0, lng: 29.3, ts: minutesAgo(15) },
      { lat: 44.15, lng: 29.05, ts: minutesAgo(2) },
    ];
    const verdict = detectLoiter(track, {}, now);
    expect(verdict.orbiting).toBe(true);
    expect(verdict.samples).toBe(4);
    expect(verdict.spanMinutes).toBe(43);
    expect(verdict.radiusKm).toBeLessThan(60);
    expect(verdict.centre?.lat).toBeCloseTo(44.0875, 3);
  });

  it('does not call a transit an orbit', () => {
    // Crossing Europe west to east: hundreds of km in the same window.
    const track: TrackSample[] = [
      { lat: 48.0, lng: 2.0, ts: minutesAgo(45) },
      { lat: 48.5, lng: 8.0, ts: minutesAgo(30) },
      { lat: 49.0, lng: 14.0, ts: minutesAgo(15) },
    ];
    expect(detectLoiter(track, {}, now).orbiting).toBe(false);
  });

  it('waits for enough track before deciding', () => {
    const track: TrackSample[] = [
      { lat: 44.0, lng: 29.0, ts: minutesAgo(20) },
      { lat: 44.05, lng: 29.05, ts: minutesAgo(10) },
    ];
    expect(detectLoiter(track, {}, now).orbiting).toBe(false);
  });

  it('needs the samples to span real time, not a burst', () => {
    const track: TrackSample[] = [
      { lat: 44.0, lng: 29.0, ts: minutesAgo(4) },
      { lat: 44.01, lng: 29.01, ts: minutesAgo(3) },
      { lat: 44.02, lng: 29.0, ts: minutesAgo(2) },
    ];
    expect(detectLoiter(track, {}, now).orbiting).toBe(false);
  });

  it('forgets an orbit once the aircraft has left', () => {
    const stale: TrackSample[] = [
      { lat: 44.0, lng: 29.0, ts: minutesAgo(200) },
      { lat: 44.1, lng: 29.1, ts: minutesAgo(190) },
      { lat: 44.0, lng: 29.2, ts: minutesAgo(180) },
    ];
    expect(detectLoiter(stale, {}, now).orbiting).toBe(false);
  });
});

describe('track history', () => {
  const now = Date.UTC(2026, 0, 2, 12, 0);

  it('accumulates positions per aircraft', () => {
    const history = new Map<string, TrackSample[]>();
    appendSample(history, 'ae1234', { lat: 1, lng: 2, ts: now - 60_000 });
    appendSample(history, 'ae1234', { lat: 1.1, lng: 2.1, ts: now });
    expect(history.get('ae1234')).toHaveLength(2);
  });

  it('ignores a republished snapshot instead of counting it twice', () => {
    const history = new Map<string, TrackSample[]>();
    appendSample(history, 'ae1234', { lat: 1, lng: 2, ts: now });
    appendSample(history, 'ae1234', { lat: 1, lng: 2, ts: now });
    expect(history.get('ae1234')).toHaveLength(1);
  });

  it('drops samples that fall out of the window and caps the history', () => {
    const history = new Map<string, TrackSample[]>();
    appendSample(history, 'x', { lat: 1, lng: 1, ts: now - 5 * 3600_000 });
    appendSample(history, 'x', { lat: 1, lng: 1, ts: now });
    expect(history.get('x')).toHaveLength(1);

    for (let i = 40; i > 0; i--) appendSample(history, 'y', { lat: 1, lng: 1, ts: now - i * 60_000 });
    expect(history.get('y')!.length).toBeLessThanOrEqual(30);
  });
});
