import assert from 'node:assert/strict';
import test from 'node:test';
import {
  analysisUrlLabel,
  idleAnalysisRequest,
  isDuplicateAnalysisRequest,
  resolveAnalysisRequest,
  startAnalysisRequest,
} from '../lib/analysis-request-state.ts';
import { normalizeInstagramUrl } from '../lib/instagram/normalizeInstagramUrl.ts';

void test('starting Reel B immediately removes every Reel A result', () => {
  const reelA = resolveAnalysisRequest(
    startAnalysisRequest<string>('request-a', 'https://instagram.com/reel/A/'),
    'request-a',
    {
      phase: 'multiple',
      places: ['A place'],
      result: null,
      message: '',
    },
  );
  const reelB = startAnalysisRequest<string>(
    'request-b',
    'https://instagram.com/reel/B/',
  );
  assert.equal(reelA.places.length, 1);
  assert.deepEqual(reelB, {
    phase: 'analyzing',
    requestId: 'request-b',
    analysisUrl: 'https://instagram.com/reel/B/',
    places: [],
    result: null,
    message: '',
  });
});

void test('a late Reel A response cannot replace the completed Reel B result', () => {
  let state = startAnalysisRequest<string>(
    'request-b',
    'https://instagram.com/reel/B/',
  );
  state = resolveAnalysisRequest(state, 'request-b', {
    phase: 'single',
    places: ['B place'],
    result: 'B place',
    message: '',
  });
  const afterLateA = resolveAnalysisRequest(state, 'request-a', {
    phase: 'single',
    places: ['A place'],
    result: 'A place',
    message: '',
  });
  assert.strictEqual(afterLateA, state);
  assert.equal(afterLateA.result, 'B place');
});

void test('blocks duplicate Analyze while the normalized URL is active', () => {
  const normalized = normalizeInstagramUrl(
    'https://www.instagram.com/reel/DZwvTwCvUnk/?stkn=tracking',
  );
  const state = startAnalysisRequest<string>('request-a', normalized);
  assert.equal(isDuplicateAnalysisRequest(state, normalized), true);
  assert.equal(
    isDuplicateAnalysisRequest(idleAnalysisRequest<string>(), normalized),
    false,
  );
});

void test('keeps the Analyze URL snapshot normalized and identifiable', () => {
  const snapshot = normalizeInstagramUrl(
    'https://instagram.com/reel/DZwvTwCvUnk/?utm_source=copy_link',
  );
  assert.equal(snapshot, 'https://www.instagram.com/reel/DZwvTwCvUnk/');
  assert.equal(analysisUrlLabel(snapshot), 'instagram.com/reel/DZwvTwCvUnk');
  assert.notEqual(
    snapshot,
    normalizeInstagramUrl('https://instagram.com/reel/ANOTHER_REEL/'),
  );
});
