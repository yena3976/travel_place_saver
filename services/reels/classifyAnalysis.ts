import type { ExtractedPlace, ReelAnalysisResult } from '../ai/types.ts';
import type { VerificationResult } from '../places/types.ts';

export function combineConfidence(ai: number, google: number) {
  return Math.round((ai * 0.4 + google * 0.6) * 100) / 100;
}

export function classifyVerifiedPlaces(
  reel: ReelAnalysisResult['reel'],
  extracted: ExtractedPlace[],
  verified: VerificationResult[],
): ReelAnalysisResult {
  const places = verified.flatMap((result, index) => {
    if (!result.place || result.confidence < 0.5) return [];
    const source = extracted[index];
    return [
      {
        ...result.place,
        id: result.place.googlePlaceId,
        confidence: combineConfidence(source.confidence, result.confidence),
        evidence: source.evidence,
      },
    ];
  });
  if (!places.length)
    return { status: 'not_found', reel, places: [], cached: false };
  if (places.length > 1)
    return { status: 'multiple', reel, places, cached: false };
  const status =
    verified[0]?.verified && places[0].confidence >= 0.85
      ? 'single'
      : 'candidates';
  return { status, reel, places, cached: false };
}
