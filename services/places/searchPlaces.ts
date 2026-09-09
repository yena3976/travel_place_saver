import 'server-only';
import { googleTextSearch } from './googleClient';
import { mapPlaceCategory, parseAddressComponents } from './normalizePlace';
import { normalizeSearchQuery } from './normalizeQuery';
import {
  buildPlacesSearchCacheKey,
  detectQueryLanguage,
} from './searchContext';
import type { PlaceSearchOptions, PlaceSearchResult } from './types';

const cache = new Map<string, { expires: number; data: PlaceSearchResult[] }>();
export async function searchPlaces(
  query: string,
  options: PlaceSearchOptions = {},
): Promise<{ results: PlaceSearchResult[]; cacheHit: boolean }> {
  const normalized = normalizeSearchQuery(query);
  if (normalized.length < 3) return { results: [], cacheHit: false };
  const resolvedOptions = {
    ...options,
    languageCode: options.languageCode ?? detectQueryLanguage(query),
  };
  const cacheKey = buildPlacesSearchCacheKey(normalized, resolvedOptions);
  const cached = cache.get(cacheKey);
  if (cached && cached.expires > Date.now()) {
    console.info('places_usage', {
      provider: 'google_places',
      operation: 'search',
      success: true,
      durationMs: 0,
      cache: 'hit',
      createdAt: new Date().toISOString(),
    });
    return { results: cached.data, cacheHit: true };
  }
  const places = await googleTextSearch(normalized, resolvedOptions);
  const results = places.flatMap((place) => {
    if (!place.id || !place.displayName?.text) return [];
    const address = parseAddressComponents(
      place.addressComponents,
      place.formattedAddress,
    );
    return [
      {
        googlePlaceId: place.id,
        name: place.displayName.text,
        address: place.formattedAddress ?? null,
        category: mapPlaceCategory([
          place.primaryType ?? '',
          ...(place.types ?? []),
        ]),
        ...address,
      },
    ];
  });
  cache.set(cacheKey, { expires: Date.now() + 5 * 60_000, data: results });
  return { results, cacheHit: false };
}
