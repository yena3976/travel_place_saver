import assert from 'node:assert/strict';
import test from 'node:test';
import {
  mapBusinessStatus,
  mapPlaceCategory,
  normalizeGooglePlace,
  parseAddressComponents,
} from '../services/places/normalizePlace.ts';
import { normalizeSearchQuery } from '../services/places/normalizeQuery.ts';
import { normalizeDestination } from '../services/places/normalizeDestination.ts';
import { groupDestinations } from '../services/places/groupDestinations.ts';
import {
  buildPlacesSearchCacheKey,
  buildVerificationSearchPlan,
  countryRegionCode,
  detectQueryLanguage,
  runPlaceSearchPlan,
} from '../services/places/searchContext.ts';
import {
  hasConsistentLocation,
  hasCrossScriptNames,
  matchStatusFor,
  nameSimilarity,
  scoreCandidate,
} from '../services/places/scoreVerification.ts';

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

void test('builds a Korean Places search with location context', () => {
  const [attempt] = buildVerificationSearchPlan({
    name: '오버트 커피바',
    area: '서촌',
    destination: '서울',
    country: '대한민국',
  });
  assert.equal(attempt.query, '오버트 커피바 서촌 서울 대한민국');
  assert.equal(attempt.options.languageCode, 'ko');
  assert.equal(attempt.options.regionCode, 'kr');
});

void test('detects Japanese and English Places search languages', () => {
  const [japanese] = buildVerificationSearchPlan({
    name: '喫茶サクラ',
    destination: 'Tokyo',
    country: 'Japan',
  });
  const [english] = buildVerificationSearchPlan({
    name: 'WYAH Art & Creative Space',
    area: 'Ubud',
    destination: 'Bali',
    country: 'Indonesia',
  });
  assert.equal(detectQueryLanguage('喫茶サクラ Tokyo'), 'ja');
  assert.equal(japanese.options.languageCode, 'ja');
  assert.equal(japanese.options.regionCode, 'jp');
  assert.equal(english.query, 'WYAH Art & Creative Space Ubud Bali Indonesia');
  assert.equal(english.options.languageCode, 'en');
  assert.equal(english.options.regionCode, 'id');
  assert.equal(countryRegionCode('Thailand'), 'th');
});

void test('uses an existing coordinate as location bias and isolates cache keys', () => {
  const [attempt] = buildVerificationSearchPlan({
    name: 'Sample Cafe',
    countryCode: 'KR',
    latitude: 37.5796,
    longitude: 126.971,
  });
  assert.deepEqual(attempt.options.locationBias, {
    latitude: 37.5796,
    longitude: 126.971,
    radiusMeters: 50_000,
  });
  const englishKey = buildPlacesSearchCacheKey(attempt.query, attempt.options);
  const koreanKey = buildPlacesSearchCacheKey(attempt.query, {
    ...attempt.options,
    languageCode: 'ko',
  });
  const noBiasKey = buildPlacesSearchCacheKey(attempt.query, {
    ...attempt.options,
    locationBias: null,
  });
  assert.notEqual(englishKey, koreanKey);
  assert.notEqual(englishKey, noBiasKey);
});

void test('runs only one alternate-name fallback and stops after a match', async () => {
  const attempts = buildVerificationSearchPlan({
    name: '오버트 커피바',
    alternateNames: ['Ouvert Coffee Bar', 'Unused Third Name'],
    area: '서촌',
    destination: '서울',
    country: '대한민국',
  });
  const queries: string[] = [];
  const outcome = await runPlaceSearchPlan(
    attempts,
    async (attempt) => {
      queries.push(attempt.query);
      return attempt.name === 'Ouvert Coffee Bar' ? ['matched'] : [];
    },
    (_attempt, results) => (results.length ? 1 : 0),
    0.5,
  );
  assert.equal(outcome.calls, 2);
  assert.deepEqual(queries, [
    '오버트 커피바 서촌 서울 대한민국',
    'Ouvert Coffee Bar 서촌 서울 대한민국',
  ]);
  assert.equal(outcome.attempt?.name, 'Ouvert Coffee Bar');
});
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
    destination: 'Bali',
    area: 'Ubud',
    googleLocality: null,
    googleAdminAreaLevel1: 'Bali',
    googleAdminAreaLevel2: null,
  }));

void test('normalizes Tokyo wards into one travel destination', () => {
  assert.deepEqual(
    normalizeDestination({
      country: 'Japan',
      countryCode: 'JP',
      locality: 'Minato City',
      adminArea1: 'Tokyo',
    }),
    { destination: 'Tokyo', area: 'Minato' },
  );
  assert.deepEqual(
    normalizeDestination({
      country: 'Japan',
      countryCode: 'JP',
      locality: 'Shibuya City',
      adminArea1: 'Tokyo',
    }),
    { destination: 'Tokyo', area: 'Shibuya' },
  );
});

void test('normalizes Bali visitor areas under Bali', () => {
  for (const area of ['Ubud', 'Seminyak']) {
    assert.deepEqual(
      normalizeDestination({
        country: 'Indonesia',
        countryCode: 'ID',
        locality: area,
        adminArea1: 'Bali',
      }),
      { destination: 'Bali', area },
    );
  }
});

void test('normalizes Seoul districts and prefers a finer neighborhood', () => {
  assert.deepEqual(
    normalizeDestination({
      country: 'South Korea',
      countryCode: 'KR',
      locality: 'Seoul',
      adminArea1: 'Seoul',
      sublocality1: 'Jongno-gu',
      neighborhood: 'Seochon',
    }),
    { destination: 'Seoul', area: 'Seochon' },
  );
  assert.deepEqual(
    normalizeDestination({
      country: 'South Korea',
      countryCode: 'KR',
      locality: 'Seoul',
      fallbackArea: 'Gangnam',
    }),
    { destination: 'Seoul', area: 'Gangnam' },
  );
});

void test('groups Tokyo and a normalized Minato row into one Home card', () => {
  assert.deepEqual(
    groupDestinations([
      { destination: 'Tokyo', country: 'Japan', thumbnailUrl: 'a.jpg' },
      { destination: 'Tokyo', country: 'Japan', thumbnailUrl: 'b.jpg' },
    ]),
    [
      {
        destination: 'Tokyo',
        country: 'Japan',
        count: 2,
        thumbnailUrl: 'a.jpg',
      },
    ],
  );
});
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

void test('recognizes a cross-script venue result by its location', () => {
  assert.equal(hasCrossScriptNames('브리끄', 'Brique'), true);
  assert.equal(
    hasCrossScriptNames('Ouvert Coffee Bar', 'Intelligentsia Coffee'),
    false,
  );
  assert.equal(
    hasConsistentLocation(
      { name: '브리끄', city: 'Namyangju', country: 'South Korea' },
      { city: 'Namyangju-si', area: 'Hwado-eup', country: 'South Korea' },
    ),
    true,
  );
  assert.equal(
    hasConsistentLocation(
      { name: '브리끄', city: 'Namyangju', country: 'South Korea' },
      { city: 'Seoul', country: 'South Korea' },
    ),
    false,
  );
});

void test('keeps low-name-similarity Google matches below verified quality', () => {
  const exact = nameSimilarity('Ofr Seoul', 'Ofr Seoul');
  const ouvert = nameSimilarity(
    'Ouvert Coffee Bar Seochon',
    'Intelligentsia Coffee Seochon Coffeebar',
  );
  const autoPhoto = nameSimilarity('Auto Photo Co', 'Photosignature');
  assert.equal(matchStatusFor(1, exact), 'verified');
  assert.equal(matchStatusFor(0.68, ouvert), 'needs_confirmation');
  assert.equal(matchStatusFor(0.52, autoPhoto), 'needs_confirmation');
  assert.equal(matchStatusFor(0.49, 1), 'not_found');
});
