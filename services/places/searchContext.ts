import { normalizeSearchQuery } from './normalizeQuery.ts';
import type {
  PlaceLocationBias,
  PlaceSearchLanguage,
  PlaceSearchOptions,
  VerificationInput,
} from './types.ts';

const COUNTRY_REGION_CODES = new Map<string, string>([
  ['south korea', 'kr'],
  ['republic of korea', 'kr'],
  ['korea', 'kr'],
  ['대한민국', 'kr'],
  ['한국', 'kr'],
  ['japan', 'jp'],
  ['일본', 'jp'],
  ['日本', 'jp'],
  ['indonesia', 'id'],
  ['인도네시아', 'id'],
  ['thailand', 'th'],
  ['태국', 'th'],
]);

export type VerificationSearchAttempt = {
  name: string;
  query: string;
  options: Required<Pick<PlaceSearchOptions, 'languageCode'>> &
    Omit<PlaceSearchOptions, 'languageCode'>;
};

/** Detects the script needed by Google Places without adding a language library. */
export function detectQueryLanguage(query: string): PlaceSearchLanguage {
  if (/[ᄀ-ᇿ㄰-㆏가-힯]/u.test(query)) return 'ko';
  if (/[぀-ヿㇰ-ㇿ]/u.test(query)) return 'ja';
  if (/[㐀-䶿一-鿿豈-﫿]/u.test(query)) return 'zh';
  return 'en';
}

export function countryRegionCode(
  country?: string | null,
  countryCode?: string | null,
) {
  const explicit = countryCode?.trim().toLowerCase();
  if (explicit && /^[a-z]{2}$/u.test(explicit)) return explicit;
  return COUNTRY_REGION_CODES.get(normalizeSearchQuery(country ?? '')) ?? null;
}

function includesPhrase(value: string, phrase: string) {
  return ` ${normalizeSearchQuery(value)} `.includes(
    ` ${normalizeSearchQuery(phrase)} `,
  );
}

/** Builds one cost-efficient text query, keeping venue name first. */
export function buildPlaceSearchQuery(
  name: string,
  location: {
    area?: string | null;
    destination?: string | null;
    country?: string | null;
  },
) {
  const parts: string[] = [];
  for (const value of [
    name,
    location.area,
    location.destination,
    location.country,
  ]) {
    const cleaned = value?.trim().replace(/\s+/gu, ' ');
    if (!cleaned || parts.some((part) => includesPhrase(part, cleaned)))
      continue;
    parts.push(cleaned);
  }
  return parts.join(' ');
}

function locationBiasFor(input: VerificationInput): PlaceLocationBias | null {
  if (
    typeof input.latitude !== 'number' ||
    !Number.isFinite(input.latitude) ||
    Math.abs(input.latitude) > 90 ||
    typeof input.longitude !== 'number' ||
    !Number.isFinite(input.longitude) ||
    Math.abs(input.longitude) > 180
  )
    return null;
  return {
    latitude: input.latitude,
    longitude: input.longitude,
    radiusMeters: 50_000,
  };
}

export function buildVerificationSearchPlan(
  input: VerificationInput,
): VerificationSearchAttempt[] {
  const location = {
    area: input.area,
    destination: input.destination ?? input.city,
    country: input.country,
  };
  const regionCode = countryRegionCode(input.country, input.countryCode);
  const locationBias = locationBiasFor(input);
  const names = [input.name, ...(input.alternateNames ?? [])]
    .map((name) => name.trim())
    .filter(
      (name, index, all) =>
        name &&
        all.findIndex(
          (candidate) =>
            normalizeSearchQuery(candidate) === normalizeSearchQuery(name),
        ) === index,
    )
    .slice(0, 2);

  return names.map((name) => {
    const query = buildPlaceSearchQuery(name, location);
    return {
      name,
      query,
      options: {
        languageCode: detectQueryLanguage(query),
        regionCode,
        locationBias,
      },
    };
  });
}

export function buildPlacesSearchCacheKey(
  query: string,
  options: Required<Pick<PlaceSearchOptions, 'languageCode'>> &
    Omit<PlaceSearchOptions, 'languageCode'>,
) {
  const bias = options.locationBias
    ? [
        options.locationBias.latitude.toFixed(5),
        options.locationBias.longitude.toFixed(5),
        options.locationBias.radiusMeters,
      ].join(',')
    : '';
  return [
    normalizeSearchQuery(query),
    options.languageCode,
    options.regionCode?.toLowerCase() ?? '',
    bias,
  ].join('|');
}

export async function runPlaceSearchPlan<T>(
  attempts: VerificationSearchAttempt[],
  search: (attempt: VerificationSearchAttempt) => Promise<T[]>,
  quality: (attempt: VerificationSearchAttempt, results: T[]) => number,
  minimumQuality: number,
) {
  let best:
    | { attempt: VerificationSearchAttempt; results: T[]; quality: number }
    | undefined;
  let calls = 0;
  for (const attempt of attempts.slice(0, 2)) {
    const results = await search(attempt);
    calls += 1;
    const current = { attempt, results, quality: quality(attempt, results) };
    if (!best || current.quality > best.quality) best = current;
    if (current.quality >= minimumQuality) break;
  }
  return { ...best, calls };
}
