import { normalizeSearchQuery } from './normalizeQuery.ts';
import type { MatchStatus, VerificationInput } from './types.ts';

export const VERIFIED_SCORE_THRESHOLD = 0.85;
export const VERIFIED_NAME_SIMILARITY_THRESHOLD = 0.6;
export const CANDIDATE_SCORE_THRESHOLD = 0.5;

export function matchStatusFor(
  score: number,
  matchedNameSimilarity: number,
): MatchStatus {
  if (score < CANDIDATE_SCORE_THRESHOLD) return 'not_found';
  return score >= VERIFIED_SCORE_THRESHOLD &&
    matchedNameSimilarity >= VERIFIED_NAME_SIMILARITY_THRESHOLD
    ? 'verified'
    : 'needs_confirmation';
}

function tokens(value?: string | null) {
  return new Set(
    normalizeSearchQuery(value ?? '')
      .split(' ')
      .filter(Boolean),
  );
}
function overlap(a?: string | null, b?: string | null) {
  const left = tokens(a),
    right = tokens(b);
  if (!left.size || !right.size) return 0;
  return (
    [...left].filter((token) => right.has(token)).length /
    Math.max(left.size, right.size)
  );
}

export function nameSimilarity(a?: string | null, b?: string | null) {
  return overlap(a, b);
}

function compact(value?: string | null) {
  return normalizeSearchQuery(value ?? '').replace(/[^a-z0-9가-힣]/g, '');
}

function locationPartMatches(a?: string | null, b?: string | null) {
  const left = compact(a);
  const right = compact(b);
  return Boolean(
    left && right && (left.includes(right) || right.includes(left)),
  );
}

export function hasConsistentLocation(
  input: VerificationInput,
  candidate: {
    country?: string | null;
    city?: string | null;
    area?: string | null;
  },
) {
  if (!input.country || !input.city) return false;
  const countryMatches = locationPartMatches(input.country, candidate.country);
  const cityMatches =
    locationPartMatches(input.city, candidate.city) ||
    locationPartMatches(input.city, candidate.area) ||
    locationPartMatches(input.area, candidate.city) ||
    locationPartMatches(input.area, candidate.area);
  return countryMatches && cityMatches;
}

export function hasCrossScriptNames(a: string, b: string) {
  const hasLatin = (value: string) => /[a-z]/i.test(value);
  const hasEastAsian = (value: string) =>
    /[\u3040-\u30ff\u3400-\u9fff\uac00-\ud7af]/.test(value);
  return (
    (hasEastAsian(a) && hasLatin(b) && !hasEastAsian(b)) ||
    (hasEastAsian(b) && hasLatin(a) && !hasEastAsian(a))
  );
}

export function scoreCandidate(
  input: VerificationInput,
  candidate: {
    name: string;
    country?: string | null;
    city?: string | null;
    area?: string | null;
  },
) {
  const name = nameSimilarity(input.name, candidate.name);
  const country = input.country ? overlap(input.country, candidate.country) : 1;
  const locationParts = [input.city, input.area].filter(Boolean);
  const location = locationParts.length
    ? Math.max(
        overlap(input.city, candidate.city),
        overlap(input.area, candidate.area),
        overlap(input.area, candidate.city),
      )
    : 1;
  return (
    Math.round(
      Math.min(1, name * 0.65 + country * 0.2 + location * 0.15) * 100,
    ) / 100
  );
}
