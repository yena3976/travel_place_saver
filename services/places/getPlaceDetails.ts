import 'server-only';
import { googlePlaceDetails } from './googleClient';
import { normalizeGooglePlace } from './normalizePlace';
import { findPlaceByGoogleId } from './repository';
import type { VerifiedPlace } from './types';

export async function getPlaceDetails(
  googlePlaceId: string,
): Promise<{ place: VerifiedPlace; cacheHit: boolean }> {
  const existing = await findPlaceByGoogleId(googlePlaceId);
  if (existing?.googlePlaceId) {
    console.info('places_usage', {
      provider: 'google_places',
      operation: 'details',
      success: true,
      durationMs: 0,
      cache: 'database',
      createdAt: new Date().toISOString(),
    });
    return { place: existing, cacheHit: true };
  }
  return {
    place: normalizeGooglePlace(await googlePlaceDetails(googlePlaceId)),
    cacheHit: false,
  };
}
