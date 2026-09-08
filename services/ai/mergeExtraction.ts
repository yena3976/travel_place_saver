import type { ExtractedPlace, PlaceExtraction } from './types.ts';

function venueKey(place: ExtractedPlace) {
  return (place.searchName || place.name)
    .toLocaleLowerCase('en-US')
    .replace(/[^a-z0-9가-힣]/g, '');
}

export function mergePlaceExtraction(
  extraction: PlaceExtraction,
): PlaceExtraction {
  const location = extraction.detectedLocation;
  const merged = new Map<string, ExtractedPlace>();
  for (const place of extraction.places) {
    const enriched = {
      ...place,
      country: place.country ?? location?.country ?? null,
      city: place.city ?? location?.city ?? null,
      area: place.area ?? location?.area ?? null,
    };
    const key = venueKey(enriched);
    const current = merged.get(key);
    if (!current) {
      merged.set(key, enriched);
      continue;
    }
    merged.set(key, {
      ...current,
      source: current.source === enriched.source ? current.source : 'both',
      confidence: Math.max(current.confidence, enriched.confidence),
      evidence:
        current.evidence === enriched.evidence
          ? current.evidence
          : `${current.evidence}; ${enriched.evidence}`,
    });
  }
  return { ...extraction, places: [...merged.values()] };
}
