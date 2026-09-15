/**
 * One name per country in the camera catalogue.
 *
 * Sources disagree: the traffic-authority feeds say "Japan" and "Hong Kong",
 * the OpenCCTV directory says "JP" and "HK". Left alone, the map lists the same
 * country twice and splits its cameras between the two entries.
 *
 * ISO 3166-1 alpha-2 codes are expanded with Intl.DisplayNames, which ships
 * with the runtime, so there is no country table to maintain. A handful of
 * overrides keep the result matching the names the other feeds already use —
 * Intl says "Hong Kong SAR China", and a second Hong Kong entry is exactly the
 * problem this is fixing.
 */

const OVERRIDES: Record<string, string> = {
  HK: 'Hong Kong',
  MO: 'Macau',
  KR: 'South Korea',
  KP: 'North Korea',
  TW: 'Taiwan',
  US: 'US',
  GB: 'UK',
  RU: 'Russia',
  VN: 'Vietnam',
  CZ: 'Czechia',
  MK: 'North Macedonia',
  MD: 'Moldova',
  PS: 'Palestine',
  SY: 'Syria',
  LA: 'Laos',
  BN: 'Brunei',
  TZ: 'Tanzania',
  VE: 'Venezuela',
  BO: 'Bolivia',
  IR: 'Iran',
};

const ISO_CODE = /^[A-Za-z]{2}$/;

let display: Intl.DisplayNames | null | undefined;

function regionNames(): Intl.DisplayNames | null {
  if (display === undefined) {
    try {
      display = new Intl.DisplayNames(['en'], { type: 'region' });
    } catch {
      display = null;
    }
  }
  return display;
}

/**
 * Expands a two-letter country code to its English name. Anything that is not
 * a code — a name already, or an empty value — is returned untouched, so a
 * feed that already says "Philippines" keeps saying it.
 */
export function normaliseCountry(value: string | null | undefined): string {
  const raw = (value ?? '').trim();
  if (!ISO_CODE.test(raw)) return raw;

  const code = raw.toUpperCase();
  if (OVERRIDES[code]) return OVERRIDES[code];

  const names = regionNames();
  if (!names) return code;
  try {
    const name = names.of(code);
    // Intl echoes the input back for codes it does not know, and answers
    // "Unknown Region" for the ZZ placeholder; neither is a country.
    if (!name || name === code || name === 'Unknown Region') return code;
    return name;
  } catch {
    return code;
  }
}
