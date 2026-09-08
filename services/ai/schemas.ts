import type { PlaceCategory } from '../places/types.ts';
import type { ExtractedPlace, PlaceExtraction } from './types.ts';

export const placeExtractionSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['places', 'detectedLocation'],
  properties: {
    places: {
      type: 'array',
      maxItems: 5,
      items: {
        type: 'object',
        additionalProperties: false,
        required: [
          'name',
          'searchName',
          'country',
          'city',
          'area',
          'category',
          'confidence',
          'evidence',
          'source',
        ],
        properties: {
          name: { type: 'string' },
          searchName: { type: ['string', 'null'] },
          country: { type: ['string', 'null'] },
          city: { type: ['string', 'null'] },
          area: { type: ['string', 'null'] },
          category: {
            type: 'string',
            enum: [
              'Restaurant',
              'Cafe',
              'Bar',
              'Hotel',
              'Attraction',
              'Shopping',
              'Activity',
              'Nature',
              'Other',
            ],
          },
          confidence: { type: 'number', minimum: 0, maximum: 1 },
          evidence: { type: 'string' },
          source: {
            type: 'string',
            enum: ['caption', 'video_text', 'image_text', 'both'],
          },
        },
      },
    },
    detectedLocation: {
      anyOf: [
        { type: 'null' },
        {
          type: 'object',
          additionalProperties: false,
          required: ['country', 'city', 'area'],
          properties: {
            country: { type: ['string', 'null'] },
            city: { type: ['string', 'null'] },
            area: { type: ['string', 'null'] },
          },
        },
      ],
    },
  },
} as const;

const categories = new Set<PlaceCategory>([
  'Restaurant',
  'Cafe',
  'Bar',
  'Hotel',
  'Attraction',
  'Shopping',
  'Activity',
  'Nature',
  'Other',
]);

export function parsePlaceExtraction(value: unknown): PlaceExtraction {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid AI response.');
  const input = value as Record<string, unknown>;
  if (!Array.isArray(input.places) || input.places.length > 5)
    throw new Error('Invalid AI response.');
  const places = input.places.map((item) => {
    if (!item || typeof item !== 'object')
      throw new Error('Invalid AI response.');
    const place = item as Record<string, unknown>;
    if (
      typeof place.name !== 'string' ||
      !place.name.trim() ||
      !categories.has(place.category as PlaceCategory) ||
      typeof place.confidence !== 'number' ||
      place.confidence < 0 ||
      place.confidence > 1 ||
      typeof place.evidence !== 'string' ||
      !['caption', 'video_text', 'image_text', 'both'].includes(
        place.source as string,
      )
    )
      throw new Error('Invalid AI response.');
    const nullable = (field: unknown) =>
      typeof field === 'string' ? field : field === null ? null : undefined;
    const country = nullable(place.country);
    const searchName = nullable(place.searchName);
    const city = nullable(place.city);
    const area = nullable(place.area);
    if (
      searchName === undefined ||
      country === undefined ||
      city === undefined ||
      area === undefined
    )
      throw new Error('Invalid AI response.');
    return {
      name: place.name.trim(),
      searchName,
      country,
      city,
      area,
      category: place.category as PlaceCategory,
      confidence: place.confidence,
      evidence: place.evidence,
      source: place.source as ExtractedPlace['source'],
    };
  });
  const location = input.detectedLocation;
  if (location !== null && (typeof location !== 'object' || !location))
    throw new Error('Invalid AI response.');
  const detectedLocation = location
    ? {
        country:
          typeof (location as Record<string, unknown>).country === 'string'
            ? (location as Record<string, string>).country
            : null,
        city:
          typeof (location as Record<string, unknown>).city === 'string'
            ? (location as Record<string, string>).city
            : null,
        area:
          typeof (location as Record<string, unknown>).area === 'string'
            ? (location as Record<string, string>).area
            : null,
      }
    : null;
  return { places, detectedLocation };
}
