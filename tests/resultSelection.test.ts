import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canSelectResult,
  defaultSelectedResultIds,
} from '../lib/result-selection.ts';

const places = [
  { id: 'verified', name: 'Ofr Seoul', matchStatus: 'verified' as const },
  {
    id: 'confirm',
    name: 'Intelligentsia Coffee',
    matchStatus: 'needs_confirmation' as const,
  },
  { id: 'missing', name: 'Auto-Photo-Co', matchStatus: 'not_found' as const },
];

void test('selects only verified results by default', () => {
  assert.deepEqual(defaultSelectedResultIds(places), ['verified']);
});

void test('allows confirmation candidates but not unmatched candidates', () => {
  assert.equal(canSelectResult(places[1]), true);
  assert.equal(canSelectResult(places[2]), false);
});
