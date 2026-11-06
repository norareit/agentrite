import assert from 'node:assert/strict';
import { test } from 'node:test';
import { cleanupPeriodOf, parseCleanupPeriod } from '../scripts/agentrite-cleanup-period.mjs';

const PATH = '/home/developer/.claude/settings.json';
const CORRECT = 'Correct the file, or remove the key cleanupPeriodDays from it';

test('a whole number of 1 or more is given', () => {
  assert.equal(parseCleanupPeriod('{"cleanupPeriodDays": 365}', PATH), 365);
  assert.equal(parseCleanupPeriod('{"cleanupPeriodDays": 1}', PATH), 1);
});

test('a file without the key gives nothing, and nothing else of the file', () => {
  assert.equal(parseCleanupPeriod('{}', PATH), undefined);
  assert.equal(parseCleanupPeriod('{"model": "x", "env": {"TOKEN": "secret"}}', PATH), undefined);
});

for (const value of [0, 1.5, -1, '365', null, true, [], {}]) {
  test(`a cleanupPeriodDays of ${JSON.stringify(value)} is refused`, () => {
    const text = JSON.stringify({ cleanupPeriodDays: value });
    assert.throws(
      () => parseCleanupPeriod(text, PATH),
      (error) => {
        assert.ok(error.message.startsWith(`${PATH}: `), error.message);
        assert.match(error.message, /cleanupPeriodDays/);
        assert.ok(error.message.includes(` ${JSON.stringify(value)}.`), error.message);
        assert.match(error.message, /must be a whole number of 1 or more/);
        assert.ok(error.message.endsWith(CORRECT), error.message);
        return true;
      },
    );
  });
}

for (const text of ['not json', '[]', '"x"', 'null']) {
  test(`a file holding ${text} is refused as no JSON object`, () => {
    assert.throws(
      () => parseCleanupPeriod(text, PATH),
      (error) => {
        assert.ok(error.message.includes(PATH), error.message);
        assert.match(error.message, /is not a JSON object/);
        assert.ok(error.message.endsWith(CORRECT), error.message);
        return true;
      },
    );
  });
}

test('settings that are missing give nothing', () => {
  assert.equal(cleanupPeriodOf({ found: false }, PATH), undefined);
});

test('the number of the settings that were read is given', () => {
  assert.equal(cleanupPeriodOf({ found: true, text: '{"cleanupPeriodDays": 365}\n' }, PATH), 365);
  assert.equal(cleanupPeriodOf({ found: true, text: '{}' }, PATH), undefined);
});

test('settings at fault are refused as parseCleanupPeriod refuses them, naming the path', () => {
  assert.throws(() => cleanupPeriodOf({ found: true, text: '{"cleanupPeriodDays": 0}' }, PATH), {
    message: `${PATH}: cleanupPeriodDays is 0. It must be a whole number of 1 or more. ${CORRECT}`,
  });
});

test('settings that could not be read are refused, naming the path and the error', () => {
  const error = 'EISDIR: illegal operation on a directory, read';
  assert.throws(() => cleanupPeriodOf({ found: true, error }, PATH), {
    message: `cannot read ${PATH}: ${error}. ${CORRECT}`,
  });
});
