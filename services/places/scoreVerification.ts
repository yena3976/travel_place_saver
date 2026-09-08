import { normalizeSearchQuery } from './normalizeQuery.ts';
import type { VerificationInput } from './types.ts';

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
export function scoreCandidate(
  input: VerificationInput,
  candidate: {
    name: string;
    country?: string | null;
    city?: string | null;
    area?: string | null;
  },
) {
  const name = overlap(input.name, candidate.name);
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
