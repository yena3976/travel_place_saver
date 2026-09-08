import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapBusinessStatus,
  mapPlaceCategory,
  normalizeGooglePlace,
  parseAddressComponents,
} from '../services/places/normalizePlace.ts';
import { normalizeSearchQuery } from '../services/places/normalizeQuery.ts';
import { scoreCandidate } from '../services/places/scoreVerification.ts';

const components = [
  { longText: 'Indonesia', shortText: 'ID', types: ['country'] },
  {
    longText: 'Bali',
    shortText: 'Bali',
    types: ['administrative_area_level_1'],
  },
  { longText: 'Ubud', shortText: 'Ubud', types: ['sublocality_level_1'] },
];

void test('normalizes search queries', () =>
  assert.equal(normalizeSearchQuery('  WYAH   Ubud '), 'wyah ubud'));
void test('maps Google types to MVP categories', () => {
  assert.equal(mapPlaceCategory(['coffee_shop', 'food']), 'Cafe');
  assert.equal(mapPlaceCategory(['park']), 'Nature');
  assert.equal(mapPlaceCategory(['unknown_type']), 'Other');
});
void test('parses flexible address components', () =>
  assert.deepEqual(parseAddressComponents(components), {
    country: 'Indonesia',
    countryCode: 'ID',
    city: 'Bali',
    area: 'Ubud',
  }));
void test('normalizes Google place details', () => {
  const place = normalizeGooglePlace({
    id: 'google-1',
    displayName: { text: 'WYAH' },
    formattedAddress: 'Ubud, Bali',
    addressComponents: components,
    location: { latitude: -8.4, longitude: 115.2 },
    types: ['cafe'],
    businessStatus: 'CLOSED_TEMPORARILY',
  });
  assert.equal(place.googlePlaceId, 'google-1');
  assert.equal(place.category, 'Cafe');
  assert.equal(place.status, 'temporarily_closed');
  assert.match(place.googleMapsUrl ?? '', /query_place_id=google-1/);
});
void test('maps business status and scores verification', () => {
  assert.equal(mapBusinessStatus('CLOSED_PERMANENTLY'), 'permanently_closed');
  assert.equal(
    scoreCandidate(
      {
        name: 'WYAH Art Space',
        country: 'Indonesia',
        city: 'Bali',
        area: 'Ubud',
      },
      {
        name: 'WYAH Art Space',
        country: 'Indonesia',
        city: 'Bali',
        area: 'Ubud',
      },
    ),
    1,
  );
  assert.ok(
    scoreCandidate(
      { name: 'WYAH', city: 'Bali' },
      { name: 'Other Cafe', city: 'Tokyo' },
    ) < 0.5,
  );
});
