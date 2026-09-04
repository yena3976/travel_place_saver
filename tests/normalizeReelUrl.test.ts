import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeReelUrl } from '../lib/reels/normalizeReelUrl.ts';

void test('normalizes tracking parameters and reels path', () => {
  assert.equal(normalizeReelUrl('https://www.instagram.com/reel/ABC123/?igsh=xxxx'), 'https://www.instagram.com/reel/ABC123/');
  assert.equal(normalizeReelUrl('https://instagram.com/reels/ABC123'), 'https://www.instagram.com/reel/ABC123/');
});

void test('rejects non-Reel and non-Instagram URLs', () => {
  assert.throws(() => normalizeReelUrl('https://instagram.com/p/ABC123/'));
  assert.throws(() => normalizeReelUrl('https://example.com/reel/ABC123/'));
});
