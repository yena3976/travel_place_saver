import type { GoogleAddressComponent, GooglePlace } from './googleTypes.ts';
import type { PlaceCategory, PlaceStatus, VerifiedPlace } from './types.ts';

const groups: Array<[PlaceCategory, Set<string>]> = [
  ['Cafe', new Set(['cafe', 'coffee_shop', 'tea_house'])],
  [
    'Restaurant',
    new Set(['restaurant', 'meal_takeaway', 'meal_delivery', 'bakery']),
  ],
  ['Bar', new Set(['bar', 'night_club', 'pub', 'wine_bar'])],
  [
    'Hotel',
    new Set([
      'lodging',
      'hotel',
      'resort_hotel',
      'bed_and_breakfast',
      'hostel',
    ]),
  ],
  [
    'Shopping',
    new Set([
      'shopping_mall',
      'store',
      'market',
      'clothing_store',
      'gift_shop',
    ]),
  ],
  [
    'Nature',
    new Set([
      'park',
      'national_park',
      'natural_feature',
      'beach',
      'mountain_peak',
      'garden',
    ]),
  ],
  [
    'Activity',
    new Set([
      'amusement_park',
      'water_park',
      'spa',
      'gym',
      'sports_complex',
      'tour_agency',
    ]),
  ],
  [
    'Attraction',
    new Set([
      'tourist_attraction',
      'museum',
      'art_gallery',
      'historical_landmark',
      'cultural_landmark',
    ]),
  ],
];

export function mapPlaceCategory(types: string[] = []): PlaceCategory {
  for (const [category, matches] of groups)
    if (types.some((type) => matches.has(type))) return category;
  return 'Other';
}

function component(components: GoogleAddressComponent[] = [], types: string[]) {
  return components.find((item) =>
    types.some((type) => item.types?.includes(type)),
  );
}

export function parseAddressComponents(
  components: GoogleAddressComponent[] = [],
) {
  const country = component(components, ['country']);
  const locality = component(components, [
    'locality',
    'postal_town',
    'administrative_area_level_2',
  ]);
  const region = component(components, ['administrative_area_level_1']);
  const area = component(components, [
    'neighborhood',
    'sublocality_level_2',
    'sublocality_level_1',
    'sublocality',
    'administrative_area_level_3',
  ]);
  return {
    country: country?.longText ?? null,
    countryCode: country?.shortText?.toUpperCase() ?? null,
    city: locality?.longText ?? region?.longText ?? null,
    area: area?.longText ?? locality?.longText ?? null,
  };
}

export function mapBusinessStatus(status?: string): PlaceStatus {
  if (status === 'OPERATIONAL') return 'open';
  if (status === 'CLOSED_TEMPORARILY') return 'temporarily_closed';
  if (status === 'CLOSED_PERMANENTLY') return 'permanently_closed';
  return 'unknown';
}

export function normalizeGooglePlace(place: GooglePlace): VerifiedPlace {
  if (!place.id || !place.displayName?.text)
    throw new Error('Google Places returned an incomplete place.');
  const location = parseAddressComponents(place.addressComponents);
  return {
    name: place.displayName.text,
    category: mapPlaceCategory([
      place.primaryType ?? '',
      ...(place.types ?? []),
    ]),
    ...location,
    address: place.formattedAddress ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    googlePlaceId: place.id,
    googleMapsUrl:
      place.googleMapsUri ??
      `https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,
    status: mapBusinessStatus(place.businessStatus),
  };
}
