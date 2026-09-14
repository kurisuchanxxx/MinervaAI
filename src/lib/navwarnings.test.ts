import { describe, expect, it } from 'vitest';
import { categorize, parseNavWarnings, parsePositions } from './navwarnings';

describe('NAVAREA warnings', () => {
  it('parses degree-minute positions with hemispheres', () => {
    const pos = parsePositions('AREA BOUND BY 19-23.0N 092-03.1W AND 27-10.4N 090-22.1W');
    expect(pos).toHaveLength(2);
    expect(pos[0][0]).toBeCloseTo(19.3833, 3);
    expect(pos[0][1]).toBeCloseTo(-92.0517, 3);
  });

  it('categorises operationally relevant warnings', () => {
    expect(categorize('GPS INTERFERENCE MAY OCCUR')).toBe('gnss');
    expect(categorize('GNSS UNRELIABLE IN AREA')).toBe('gnss');
    expect(categorize('MISSILE LAUNCHING OPERATIONS')).toBe('missile');
    expect(categorize('NAVAL GUNNERY FIRING EXERCISE')).toBe('firing');
    expect(categorize('MILITARY EXERCISE IN PROGRESS')).toBe('military');
    expect(categorize('DERELICT VESSEL ADRIFT')).toBe('general');
  });

  it('builds placeable warnings and drops ones with no position', () => {
    const raw = {
      'broadcast-warn': [
        { navArea: '4', msgYear: 2024, msgNumber: 1, text: 'FIRING EXERCISES 19-23.0N 092-03.1W' },
        { navArea: '4', msgYear: 2024, msgNumber: 2, text: 'CHART CORRECTION, NO POSITION' },
      ],
    };
    const w = parseNavWarnings(raw);
    expect(w).toHaveLength(1);
    expect(w[0].category).toBe('firing');
    expect(w[0].id).toBe('4-2024-1');
    expect(Math.abs(w[0].lat)).toBeLessThanOrEqual(90);
  });
});
