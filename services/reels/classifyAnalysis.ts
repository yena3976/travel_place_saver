import type { ExtractedPlace, ReelAnalysisResult } from '../ai/types.ts';
import type { VerificationResult } from '../places/types.ts';

export const REEL_ANALYSIS_VERSION = 9;

export function combineConfidence(ai: number, google: number) {
  return Math.round((ai * 0.4 + google * 0.6) * 100) / 100;
}

export function classifyVerifiedPlaces(
  reel: ReelAnalysisResult['reel'],
  extracted: ExtractedPlace[],
  verified: VerificationResult[],
): ReelAnalysisResult {
  const places = verified.map((result, index) => {
    const source = extracted[index];
    if (!result.place)
      return {
        name: source.name,
        detectedPlaceName: source.name,
        googlePlaceName: null,
        matchStatus: 'not_found' as const,
        verificationScore: result.confidence,
        category: source.category,
        country: source.country,
        city: source.city,
        area: source.area,
        googlePlaceId: null,
        id: `detected:${index}:${source.name}`,
        confidence: combineConfidence(source.confidence, result.confidence),
        evidence: source.evidence,
        source: source.source,
      };
    return {
      ...result.place,
      id: result.place.googlePlaceId,
      detectedPlaceName: source.name,
      googlePlaceName: result.place.name,
      matchStatus: result.matchStatus,
      verificationScore: result.confidence,
      confidence: combineConfidence(source.confidence, result.confidence),
      evidence: source.evidence,
      source: source.source,
    };
  });
  if (!places.length)
    return {
      analysisVersion: REEL_ANALYSIS_VERSION,
      status: 'not_found',
      reel,
      places: [],
      cached: false,
    };
  if (places.length > 1)
    return {
      analysisVersion: REEL_ANALYSIS_VERSION,
      status: 'multiple',
      reel,
      places,
      cached: false,
    };
  const status =
    places[0].matchStatus === 'verified' && places[0].confidence >= 0.85
      ? 'single'
      : 'candidates';
  return {
    analysisVersion: REEL_ANALYSIS_VERSION,
    status,
    reel,
    places,
    cached: false,
  };
}
