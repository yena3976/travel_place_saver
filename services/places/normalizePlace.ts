import type { GoogleAddressComponent, GooglePlace } from './googleTypes.ts';
import type { PlaceCategory, PlaceStatus, VerifiedPlace } from './types.ts';
import { normalizeRegion } from './normalizeRegion.ts';

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
  formattedAddress?: string | null,
) {
  const country = component(components, ['country']);
  const locality = component(components, ['locality', 'postal_town']);
  const adminArea1 = component(components, ['administrative_area_level_1']);
  const adminArea2 = component(components, ['administrative_area_level_2']);
  const neighborhood = component(components, ['neighborhood']);
  const sublocality2 = component(components, ['sublocality_level_2']);
  const sublocality1 = component(components, [
    'sublocality_level_1',
    'sublocality',
  ]);
  const adminArea3 = component(components, ['administrative_area_level_3']);
  const route = component(components, ['route']);
  const normalized = normalizeRegion({
    country: country?.longText,
    countryCode: country?.shortText,
    locality: locality?.longText,
    adminArea1: adminArea1?.longText,
    adminArea2: adminArea2?.longText,
    neighborhood: neighborhood?.longText,
    sublocality1: sublocality1?.longText,
    sublocality2: sublocality2?.longText,
    adminArea3: adminArea3?.longText,
    route: route?.longText,
    formattedAddress,
  });
  return {
    country: normalized.country,
    countryCode: country?.shortText?.toUpperCase() ?? null,
    city:
      locality?.longText ??
      adminArea2?.longText ??
      adminArea1?.longText ??
      null,
    destination: normalized.destination,
    area: normalized.area,
    googleLocality: locality?.longText ?? null,
    googleSublocality: sublocality2?.longText ?? sublocality1?.longText ?? null,
    googleNeighborhood: neighborhood?.longText ?? null,
    googleAdminAreaLevel1: adminArea1?.longText ?? null,
    googleAdminAreaLevel2: adminArea2?.longText ?? null,
    googleRoute: route?.longText ?? null,
    googleFormattedAddress: formattedAddress ?? null,
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
  const location = parseAddressComponents(
    place.addressComponents,
    place.formattedAddress,
  );
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
