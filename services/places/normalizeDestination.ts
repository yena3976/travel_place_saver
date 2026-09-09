import { countryRegionCode } from './searchContext.ts';

export type DestinationInput = {
  country?: string | null;
  countryCode?: string | null;
  locality?: string | null;
  adminArea1?: string | null;
  adminArea2?: string | null;
  neighborhood?: string | null;
  sublocality1?: string | null;
  sublocality2?: string | null;
  adminArea3?: string | null;
  fallbackArea?: string | null;
};

export type NormalizedDestination = {
  destination: string | null;
  area: string | null;
};

const TOKYO_WARDS = new Set([
  'adachi',
  'arakawa',
  'bunkyo',
  'chiyoda',
  'chuo',
  'edogawa',
  'itabashi',
  'katsushika',
  'kita',
  'koto',
  'meguro',
  'minato',
  'nakano',
  'nerima',
  'ota',
  'setagaya',
  'shibuya',
  'shinagawa',
  'shinjuku',
  'suginami',
  'sumida',
  'taito',
  'toshima',
]);

const BALI_AREAS = [
  'Ubud',
  'Seminyak',
  'Canggu',
  'Kuta',
  'Legian',
  'Sanur',
  'Nusa Dua',
  'Uluwatu',
  'Jimbaran',
];

const clean = (value?: string | null) => value?.trim() || null;
const key = (value?: string | null) =>
  clean(value)
    ?.normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase() ?? '';

function firstDistinct(
  candidates: Array<string | null | undefined>,
  excluded: string,
) {
  return (
    candidates.map(clean).find((value) => value && key(value) !== excluded) ??
    null
  );
}

function tokyoWard(value?: string | null) {
  const normalized = key(value)
    .replace(/\s+(city|ward)$/u, '')
    .replace(/-(ku)$/u, '')
    .trim();
  if (!TOKYO_WARDS.has(normalized)) return null;
  return normalized.replace(/(^|\s)\S/g, (letter) => letter.toUpperCase());
}

function seoulDistrict(value?: string | null) {
  const original = clean(value);
  if (!original) return null;
  const normalized = original
    .replace(/\s+(district|city)$/iu, '')
    .replace(/-(gu|si)$/iu, '')
    .trim();
  return /(?:-gu|\s+district)$/iu.test(original) ? normalized : original;
}

function baliArea(values: Array<string | null | undefined>) {
  for (const value of values) {
    const match = BALI_AREAS.find((area) => key(value).includes(key(area)));
    if (match) return match;
  }
  return null;
}

/** Converts Google administrative geography into user-facing travel geography. */
export function normalizeDestination(
  input: DestinationInput,
): NormalizedDestination {
  const regionCode = countryRegionCode(input.country, input.countryCode);
  const localityKey = key(input.locality);
  const admin1Key = key(input.adminArea1);
  const admin2Key = key(input.adminArea2);
  const isJapan = regionCode === 'jp';
  const ward = [input.locality, input.adminArea2, input.sublocality1]
    .map(tokyoWard)
    .find(Boolean);

  if (
    isJapan &&
    (admin1Key.includes('tokyo') ||
      localityKey === 'tokyo' ||
      admin2Key === 'tokyo' ||
      ward)
  ) {
    return {
      destination: 'Tokyo',
      area:
        ward ??
        firstDistinct(
          [
            input.neighborhood,
            input.sublocality2,
            input.sublocality1,
            input.adminArea3,
            input.fallbackArea,
          ],
          'tokyo',
        ),
    };
  }

  const isKorea = regionCode === 'kr';
  const isSeoul = [localityKey, admin1Key, admin2Key].some((value) =>
    value.includes('seoul'),
  );
  if (isKorea && isSeoul) {
    const detailed = firstDistinct(
      [
        input.neighborhood,
        input.sublocality2,
        input.adminArea3,
        input.fallbackArea,
      ],
      'seoul',
    );
    const district = [input.sublocality1, input.adminArea2, input.locality]
      .map(seoulDistrict)
      .find((value) => value && key(value) !== 'seoul');
    return { destination: 'Seoul', area: detailed ?? district ?? null };
  }

  const baliCandidates = [
    input.neighborhood,
    input.sublocality2,
    input.sublocality1,
    input.locality,
    input.adminArea3,
    input.adminArea2,
    input.fallbackArea,
  ];
  const isIndonesia = regionCode === 'id';
  const knownBaliArea = baliArea(baliCandidates);
  if (isIndonesia && (admin1Key.includes('bali') || knownBaliArea)) {
    return {
      destination: 'Bali',
      area: knownBaliArea ?? firstDistinct(baliCandidates, 'bali'),
    };
  }

  const destination =
    clean(input.locality) ?? clean(input.adminArea1) ?? clean(input.adminArea2);
  return {
    destination,
    area: firstDistinct(
      [
        input.neighborhood,
        input.sublocality2,
        input.sublocality1,
        input.adminArea3,
        input.fallbackArea,
        input.adminArea2,
      ],
      key(destination),
    ),
  };
}
