import { describe, expect, it } from 'vitest';
import { normaliseCountry } from './country-names';

describe('country names', () => {
  it('expands ISO codes to the name the other feeds already use', () => {
    expect(normaliseCountry('JP')).toBe('Japan');
    expect(normaliseCountry('TW')).toBe('Taiwan');
    expect(normaliseCountry('ID')).toBe('Indonesia');
    expect(normaliseCountry('BR')).toBe('Brazil');
    // Intl calls these "Hong Kong SAR China" and "Macao SAR China"; a second
    // Hong Kong entry beside the traffic feed's is the bug being fixed.
    expect(normaliseCountry('HK')).toBe('Hong Kong');
    expect(normaliseCountry('MO')).toBe('Macau');
    expect(normaliseCountry('KR')).toBe('South Korea');
    expect(normaliseCountry('GB')).toBe('UK');
    expect(normaliseCountry('US')).toBe('US');
  });

  it('accepts a lowercase code', () => {
    expect(normaliseCountry('jp')).toBe('Japan');
  });

  it('leaves a name that is already a name alone', () => {
    expect(normaliseCountry('Philippines')).toBe('Philippines');
    expect(normaliseCountry('New Zealand')).toBe('New Zealand');
    // Two-letter names would be ambiguous, but no country has one.
    expect(normaliseCountry('Middle East')).toBe('Middle East');
  });

  it('handles missing and unknown values without inventing a country', () => {
    expect(normaliseCountry('')).toBe('');
    expect(normaliseCountry(null)).toBe('');
    expect(normaliseCountry(undefined)).toBe('');
    expect(normaliseCountry('  ')).toBe('');
    expect(normaliseCountry('XX')).toBe('XX');
    expect(normaliseCountry('ZZ')).toBe('ZZ');
  });
});
