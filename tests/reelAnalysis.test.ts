import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReelUrl } from '../lib/reels/normalizeReelUrl.ts';
import { estimateCost } from '../services/ai/config.ts';
import { mergePlaceExtraction } from '../services/ai/mergeExtraction.ts';
import { parsePlaceExtraction } from '../services/ai/schemas.ts';
import { classifyVerifiedPlaces } from '../services/reels/classifyAnalysis.ts';
import { parseReelHtml } from '../services/reels/reelMetadata.ts';
import {
  MAX_VIDEO_FRAMES,
  parseReelVideoSource,
  videoSampling,
} from '../services/reels/getReelVideo.ts';
import {
  MAX_POST_IMAGES,
  parsePostImageUrls,
} from '../services/reels/getPostImages.ts';
import type { ExtractedPlace } from '../services/ai/types.ts';
import type { VerificationResult } from '../services/places/types.ts';

const extracted: ExtractedPlace = {
  name: 'WYAH Art & Creative Space',
  searchName: 'WYAH Art & Creative Space',
  country: 'Indonesia',
  city: 'Bali',
  area: 'Ubud',
  category: 'Cafe',
  confidence: 0.94,
  evidence: 'The caption names WYAH in Ubud.',
  source: 'caption',
};
const verified: VerificationResult = {
  verified: true,
  matchStatus: 'verified',
  confidence: 0.9,
  nameSimilarity: 1,
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
      [
        {
          ...verified,
          verified: false,
          matchStatus: 'not_found',
          place: null,
          confidence: 0.2,
          nameSimilarity: 0,
        },
      ],
    ).status,
    'candidates',
  );
  assert.equal(classifyVerifiedPlaces(reel, [], []).status, 'not_found');
});

void test('records estimated model cost from actual token usage', () => {
  assert.equal(
    estimateCost('gemini-3.5-flash-lite', 1_000_000, 1_000_000),
    2.8,
  );
  assert.equal(estimateCost('unpriced-model', 100, 100), 0);
});

void test('parses public metadata and rejects inaccessible Reel HTML', () => {
  const html =
    '<meta property="og:title" content="Bali cafe"><meta property="og:description" content="WYAH in Ubud &amp; Bali"><meta property="og:image" content="https://example.com/thumb.jpg">';
  const content = parseReelHtml(reel.url, html);
  assert.equal(content?.caption, 'WYAH in Ubud & Bali');
  assert.equal(content?.video, null);
  assert.equal(parseReelHtml(reel.url, '<title>Instagram</title>'), null);
});

void test('decodes numeric HTML entities in Korean Reel captions', () => {
  const html =
    '<meta property="og:description" content="&#xb0a8;&#xc591;&#xc8fc; &#xbe0c;&#xb9ac;&#xb044;">';
  assert.equal(parseReelHtml(reel.url, html)?.caption, '남양주 브리끄');
});

void test('extracts the highest quality Reel video source and caps sampled frames', () => {
  const html = String.raw`mediaPresentationDuration=\"PT71.005S\" \u003CRepresentation mimeType=\"video/mp4\" width=\"360\" height=\"640\"\u003E\u003CBaseURL\u003Ehttps:\/\/cdn.example.com\/low.mp4?a=1&amp;b=2\u003C\/BaseURL\u003E\u003C\/Representation\u003E \u003CRepresentation mimeType=\"video/mp4\" width=\"720\" height=\"1280\"\u003E\u003CBaseURL\u003Ehttps:\/\/cdn.example.com\/high.mp4\u003C\/BaseURL\u003E\u003C\/Representation\u003E`;
  const source = parseReelVideoSource(html);
  assert.equal(source?.videoUrl, 'https://cdn.example.com/high.mp4');
  assert.equal(source?.durationMs, 71_005);
  assert.equal(
    videoSampling(source?.durationMs ?? null).frameCount,
    MAX_VIDEO_FRAMES,
  );
});

void test('merges caption and video duplicates and applies context location', () => {
  const result = mergePlaceExtraction({
    detectedLocation: {
      country: 'South Korea',
      city: 'Seoul',
      area: 'Seochon',
    },
    places: [
      {
        ...extracted,
        name: 'ofr Seoul',
        searchName: 'ofr Seoul',
        country: null,
        city: null,
        area: null,
      },
      {
        ...extracted,
        name: 'OFR SEOUL',
        searchName: 'OFR SEOUL',
        source: 'video_text',
        confidence: 0.9,
      },
    ],
  });
  assert.equal(result.places.length, 1);
  assert.equal(result.places[0].source, 'both');
  assert.equal(result.places[0].city, 'Seoul');
});

void test('extracts ordered carousel images from a regular Instagram post', () => {
  const postUrl = 'https://www.instagram.com/p/POST123/';
  const media = {
    code: 'POST123',
    carousel_media: [
      {
        image_versions2: {
          candidates: [
            {
              url: 'https://cdn.example.com/one-small.jpg',
              width: 320,
              height: 320,
            },
            {
              url: 'https://cdn.example.com/one.jpg',
              width: 1080,
              height: 1080,
            },
          ],
        },
      },
      {
        image_versions2: {
          candidates: [
            {
              url: 'https://cdn.example.com/two.jpg',
              width: 1080,
              height: 1350,
            },
          ],
        },
      },
    ],
  };
  const html = `<script type="application/json">${JSON.stringify({ payload: { media } })}</script>`;
  assert.deepEqual(parsePostImageUrls(postUrl, html), [
    'https://cdn.example.com/one.jpg',
    'https://cdn.example.com/two.jpg',
  ]);
  assert.equal(MAX_POST_IMAGES, 6);
});

void test('uses the Open Graph image when carousel metadata is unavailable', () => {
  assert.deepEqual(
    parsePostImageUrls(
      'https://www.instagram.com/p/POST123/',
      '<html></html>',
      'https://cdn.example.com/fallback.jpg',
    ),
    ['https://cdn.example.com/fallback.jpg'],
  );
});

void test('accepts an image-only post without caption text', () => {
  const content = parseReelHtml(
    'https://www.instagram.com/p/POST123/',
    '<meta property="og:image" content="https://cdn.example.com/post.jpg">',
  );
  assert.equal(content?.caption, '');
  assert.deepEqual(content?.imageUrls, ['https://cdn.example.com/post.jpg']);
});
