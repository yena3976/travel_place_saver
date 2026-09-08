import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReelUrl } from '../lib/reels/normalizeReelUrl.ts';
import { estimateCost } from '../services/ai/config.ts';
import { parsePlaceExtraction } from '../services/ai/schemas.ts';
import { classifyVerifiedPlaces } from '../services/reels/classifyAnalysis.ts';
import { parseReelHtml } from '../services/reels/reelMetadata.ts';
import type { ExtractedPlace } from '../services/ai/types.ts';
import type { VerificationResult } from '../services/places/types.ts';

const extracted: ExtractedPlace = {
  name: 'WYAH Art & Creative Space',
  country: 'Indonesia',
  city: 'Bali',
  area: 'Ubud',
  category: 'Cafe',
  confidence: 0.94,
  evidence: 'The caption names WYAH in Ubud.',
};
const verified: VerificationResult = {
  verified: true,
  confidence: 0.9,
  candidates: [],
  place: {
    name: 'WYAH UBUD Art & Creative Space',
    category: 'Cafe',
    country: 'Indonesia',
    city: 'Kabupaten Gianyar',
    area: 'Kecamatan Ubud',
    googlePlaceId: 'google-wyah',
  },
};
const reel = {
  url: 'https://www.instagram.com/reel/ABC123/',
  thumbnailUrl: null,
};

void test('normalizes equivalent Reel URLs for cache reuse', () => {
  assert.equal(
    normalizeReelUrl('https://instagram.com/reel/ABC123/?igsh=tracking'),
    reel.url,
  );
});

void test('parses the structured AI response', () => {
  const result = parsePlaceExtraction({
    places: [extracted],
    detectedLocation: null,
  });
  assert.equal(result.places[0].category, 'Cafe');
  assert.throws(() => parsePlaceExtraction({ places: [{ name: 'made up' }] }));
});

void test('classifies single, multiple, and not found results', () => {
  assert.equal(
    classifyVerifiedPlaces(reel, [extracted], [verified]).status,
    'single',
  );
  assert.equal(
    classifyVerifiedPlaces(reel, [extracted, extracted], [verified, verified])
      .status,
    'multiple',
  );
  assert.equal(
    classifyVerifiedPlaces(
      reel,
      [extracted],
      [{ ...verified, place: null, confidence: 0.2 }],
    ).status,
    'not_found',
  );
});

void test('records estimated model cost from actual token usage', () => {
  assert.equal(estimateCost('gpt-4.1-mini', 1_000_000, 1_000_000), 2);
  assert.equal(estimateCost('unpriced-model', 100, 100), 0);
});

void test('parses public metadata and rejects inaccessible Reel HTML', () => {
  const html =
    '<meta property="og:title" content="Bali cafe"><meta property="og:description" content="WYAH in Ubud &amp; Bali"><meta property="og:image" content="https://example.com/thumb.jpg">';
  assert.equal(parseReelHtml(reel.url, html)?.caption, 'WYAH in Ubud & Bali');
  assert.equal(parseReelHtml(reel.url, '<title>Instagram</title>'), null);
});
