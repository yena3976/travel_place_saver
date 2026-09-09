import 'server-only';
import type { GooglePlace } from './googleTypes';
import type { PlaceSearchOptions } from './types';

const baseUrl = 'https://places.googleapis.com/v1';
export class PlacesProviderError extends Error {
  constructor(
    public kind: 'config' | 'quota' | 'invalid' | 'temporary' | 'server',
    message: string,
  ) {
    super(message);
  }
}

function apiKey() {
  const key = process.env.GOOGLE_PLACES_API_KEY;
  if (!key)
    throw new PlacesProviderError('config', 'Google Places is not configured.');
  return key;
}

async function request<T>(
  url: string,
  init: RequestInit,
  fieldMask: string,
  operation: string,
  maxAttempts = 2,
): Promise<T> {
  const started = Date.now();
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    try {
      const headers = new Headers(init.headers);
      headers.set('Content-Type', 'application/json');
      headers.set('X-Goog-Api-Key', apiKey());
      headers.set('X-Goog-FieldMask', fieldMask);
      const response = await fetch(url, {
        ...init,
        headers,
        signal: AbortSignal.timeout(6000),
      });
      if (response.ok) {
        console.info('places_usage', {
          provider: 'google_places',
          operation,
          success: true,
          durationMs: Date.now() - started,
          cache: 'miss',
          createdAt: new Date().toISOString(),
        });
        return (await response.json()) as T;
      }
      const kind =
        response.status === 429
          ? 'quota'
          : response.status >= 500
            ? 'server'
            : 'invalid';
      if (
        (kind === 'quota' || kind === 'server') &&
        attempt < maxAttempts - 1
      ) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }
      throw new PlacesProviderError(
        kind,
        `Google Places request failed (${response.status}).`,
      );
    } catch (error) {
      lastError = error;
      if (error instanceof PlacesProviderError) throw error;
      if (attempt < maxAttempts - 1) {
        await new Promise((resolve) => setTimeout(resolve, 150));
        continue;
      }
    }
  }
  console.error('places_usage', {
    provider: 'google_places',
    operation,
    success: false,
    durationMs: Date.now() - started,
    cache: 'miss',
    createdAt: new Date().toISOString(),
  });
  throw new PlacesProviderError(
    'temporary',
    lastError instanceof Error
      ? lastError.message
      : 'Google Places is temporarily unavailable.',
  );
}

export async function googleTextSearch(
  query: string,
  options: PlaceSearchOptions = {},
): Promise<GooglePlace[]> {
  const locationBias = options.locationBias
    ? {
        circle: {
          center: {
            latitude: options.locationBias.latitude,
            longitude: options.locationBias.longitude,
          },
          radius: options.locationBias.radiusMeters,
        },
      }
    : undefined;
  const result = await request<{ places?: GooglePlace[] }>(
    `${baseUrl}/places:searchText`,
    {
      method: 'POST',
      body: JSON.stringify({
        textQuery: query,
        pageSize: 8,
        languageCode: options.languageCode ?? 'en',
        regionCode: options.regionCode ?? undefined,
        locationBias,
      }),
    },
    'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.primaryType,places.types',
    'search',
    1,
  );
  return result.places ?? [];
}

export function googlePlaceDetails(id: string) {
  return request<GooglePlace>(
    `${baseUrl}/places/${encodeURIComponent(id)}?languageCode=en`,
    { method: 'GET' },
    'id,displayName,formattedAddress,addressComponents,location,googleMapsUri,businessStatus,primaryType,types',
    'details',
  );
}
