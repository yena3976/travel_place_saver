import 'server-only';
import { getPlaceDetails } from './getPlaceDetails';
import { searchPlaces } from './searchPlaces';
import {
  buildVerificationSearchPlan,
  runPlaceSearchPlan,
  type VerificationSearchAttempt,
} from './searchContext';
import {
  CANDIDATE_SCORE_THRESHOLD,
  hasConsistentLocation,
  hasCrossScriptNames,
  matchStatusFor,
  nameSimilarity,
  scoreCandidate,
} from './scoreVerification';
import type {
  PlaceSearchResult,
  VerificationInput,
  VerificationResult,
} from './types';

function rankResults(
  input: VerificationInput,
  attempt: VerificationSearchAttempt,
  results: PlaceSearchResult[],
  retainCrossScriptCandidate = true,
) {
  const scoringInput = {
    ...input,
    name: attempt.name,
    city: input.destination ?? input.city,
  };
  const ranked = results
    .map((candidate) => ({
      candidate,
      score: scoreCandidate(scoringInput, candidate),
    }))
    .sort((a, b) => b.score - a.score);
  let best = ranked[0];
  // Google may return a venue's official Latin-script name for an East Asian
  // query. Keep a unique, location-consistent result for explicit user review.
  if (
    best &&
    retainCrossScriptCandidate &&
    best.score < CANDIDATE_SCORE_THRESHOLD &&
    results.length === 1 &&
    hasCrossScriptNames(attempt.name, best.candidate.name) &&
    hasConsistentLocation(scoringInput, best.candidate)
  )
    best = { ...best, score: 0.75 };
  return best;
}

function bestKnownNameSimilarity(
  input: VerificationInput,
  googleNames: Array<string | null | undefined>,
) {
  const knownNames = [input.name, ...(input.alternateNames ?? [])];
  return Math.max(
    0,
    ...knownNames.flatMap((known) =>
      googleNames.map((google) => nameSimilarity(known, google)),
    ),
  );
}

export async function verifyPlace(
  input: VerificationInput,
): Promise<VerificationResult> {
  const attempts = buildVerificationSearchPlan(input);
  const outcome = await runPlaceSearchPlan(
    attempts,
    async (attempt) =>
      (await searchPlaces(attempt.query, attempt.options)).results,
    // A weak unique cross-script result remains available for confirmation,
    // but must not prevent a stronger known alternate name from being tried.
    (attempt, results) =>
      rankResults(input, attempt, results, false)?.score ?? 0,
    CANDIDATE_SCORE_THRESHOLD,
  );
  const results = outcome.results ?? [];
  const best = outcome.attempt
    ? rankResults(input, outcome.attempt, results)
    : undefined;
  if (!best || matchStatusFor(best.score, 0) === 'not_found')
    return {
      verified: false,
      matchStatus: 'not_found',
      confidence: best?.score ?? 0,
      nameSimilarity: best
        ? bestKnownNameSimilarity(input, [best.candidate.name])
        : 0,
      place: null,
      candidates: results,
    };
  const { place } = await getPlaceDetails(best.candidate.googlePlaceId);
  const matchedNameSimilarity = bestKnownNameSimilarity(input, [
    best.candidate.name,
    place.name,
  ]);
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
