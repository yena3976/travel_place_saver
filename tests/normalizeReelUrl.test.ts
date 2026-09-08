import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReelUrl } from '../lib/reels/normalizeReelUrl.ts';
import {
  instagramContentKind,
  normalizeInstagramUrl,
} from '../lib/instagram/normalizeInstagramUrl.ts';

void test('normalizes tracking parameters and reels path', () => {
  assert.equal(
    normalizeReelUrl('https://www.instagram.com/reel/ABC123/?igsh=xxxx'),
    'https://www.instagram.com/reel/ABC123/',
  );
  assert.equal(
    normalizeReelUrl('https://instagram.com/reels/ABC123'),
    'https://www.instagram.com/reel/ABC123/',
  );
});

void test('normalizes regular Instagram post URLs', () => {
  assert.equal(
    normalizeInstagramUrl('https://instagram.com/p/POST_123/?utm_source=test'),
    'https://www.instagram.com/p/POST_123/',
  );
  assert.equal(
    instagramContentKind('https://instagram.com/p/POST_123/'),
    'post',
  );
  assert.equal(
    instagramContentKind('https://instagram.com/reel/ABC123/'),
    'reel',
  );
});

void test('rejects unsupported and non-Instagram URLs', () => {
  assert.throws(() =>
    normalizeReelUrl('https://instagram.com/stories/ABC123/'),
  );
  assert.throws(() => normalizeReelUrl('https://example.com/reel/ABC123/'));
});
