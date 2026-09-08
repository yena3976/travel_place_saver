import 'server-only';
import { getPlaceDetails } from './getPlaceDetails';
import { searchPlaces } from './searchPlaces';
import {
  hasConsistentLocation,
  hasCrossScriptNames,
  matchStatusFor,
  nameSimilarity,
  scoreCandidate,
} from './scoreVerification';
import type { VerificationInput, VerificationResult } from './types';

export async function verifyPlace(
  input: VerificationInput,
): Promise<VerificationResult> {
  const query = [input.name, input.area, input.city, input.country]
    .filter(Boolean)
    .join(' ');
  const { results } = await searchPlaces(query);
  const ranked = results
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(input, candidate),
    }))
    .sort((a, b) => b.score - a.score);
  let best = ranked[0];
  // Google can return a venue's Latin-script official name for a Korean query.
  // A unique result with matching city and country is strong enough to retain
  // as a candidate, while still keeping it below the fully verified threshold.
  if (
    best &&
    best.score < 0.5 &&
    results.length === 1 &&
    hasCrossScriptNames(input.name, best.candidate.name) &&
    hasConsistentLocation(input, best.candidate)
  ) {
    best = { ...best, score: 0.75 };
  }
  if (!best || matchStatusFor(best.score, 0) === 'not_found')
    return {
      verified: false,
      matchStatus: 'not_found',
      confidence: best?.score ?? 0,
      nameSimilarity: best
        ? nameSimilarity(input.name, best.candidate.name)
        : 0,
      place: null,
      candidates: results,
    };
  const { place } = await getPlaceDetails(best.candidate.googlePlaceId);
  const matchedNameSimilarity = nameSimilarity(input.name, place.name);
  const matchStatus = matchStatusFor(best.score, matchedNameSimilarity);
  const verified = matchStatus === 'verified';
  return {
    verified,
    matchStatus,
    confidence: best.score,
    nameSimilarity: matchedNameSimilarity,
    place,
    candidates: results,
  };
}
