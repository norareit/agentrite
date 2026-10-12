import assert from 'node:assert/strict';
import { test } from 'node:test';
import { skipReason } from './skip-reason.mjs';

test('a skip reason says what the host lacks and where the whole suite runs', () => {
  assert.equal(
    skipReason('needs GNU stat'),
    'needs GNU stat. The whole suite runs in the sandbox: ./sandbox.sh --in-place npm test',
  );
});
