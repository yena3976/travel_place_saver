import 'server-only';
import { getPlaceDetails } from './getPlaceDetails';
import { searchPlaces } from './searchPlaces';
import { scoreCandidate } from './scoreVerification';
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
  const best = ranked[0];
  if (!best || best.score < 0.5)
    return {
      verified: false,
      confidence: best?.score ?? 0,
      place: null,
      candidates: results,
    };
  const { place } = await getPlaceDetails(best.candidate.googlePlaceId);
  return {
    verified: best.score >= 0.85,
    confidence: best.score,
    place,
    candidates: results,
  };
}
