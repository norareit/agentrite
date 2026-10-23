import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { offendingLines } from '../container/check-commit-message.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const checker = fileURLToPath(new URL('../container/check-commit-message.mjs', import.meta.url));
const closingSentence =
  'The standards forbid the trailers Co-Authored-By and Claude-Session, so remove these lines and make the commit ' +
  'again.';
const usage = 'usage: node node_modules/agentrite/container/check-commit-message.mjs <commit message file>';

function check(testContext, message) {
  const directory = temporaryDirectory(testContext, 'check-commit-message');
  const file = join(directory, 'COMMIT_EDITMSG');
  writeFileSync(file, message);
  return spawnSync(process.execPath, [checker, file], { encoding: 'utf-8' });
}

// R2
for (const name of ['Co-Authored-By', 'co-authored-by', 'CO-AUTHORED-BY', 'Claude-Session', 'claude-session',
  'CLAUDE-SESSION']) {
  test(`offendingLines finds ${name} at the start of a line`, () => {
    assert.deepEqual(offendingLines(`Add a thing\n\n${name}: someone\n`), [
      { number: 3, line: `${name}: someone` },
    ]);
  });
}

// R2
test('offendingLines numbers a trailer on a later line by its line in the file', () => {
  const message = 'Add a thing\n\nThe body.\nMore of it.\n\nCo-Authored-By: Claude <noreply@anthropic.com>\n';
  assert.deepEqual(offendingLines(message), [{ number: 6, line: 'Co-Authored-By: Claude <noreply@anthropic.com>' }]);
});

// R3
test('offendingLines does not read a line that starts with #', () => {
  assert.deepEqual(offendingLines('Add a thing\n\n#Co-Authored-By: someone\n# Claude-Session: abc\n'), []);
});

// R3
test('offendingLines does not refuse a name inside a sentence', () => {
  assert.deepEqual(offendingLines('Add a thing\n\nDo not add Co-Authored-By: lines\n'), []);
});

// R2
test('offendingLines does not refuse a name with a space before the colon or before the name', () => {
  assert.deepEqual(offendingLines('Add a thing\n\nCo-Authored-By : someone\n Claude-Session: abc\n'), []);
});

// R2
test('offendingLines gives a line of a CRLF message as written but for its line break', () => {
  assert.deepEqual(offendingLines('Add a thing\r\n\r\nClaude-Session: abc\r\n'), [
    { number: 3, line: 'Claude-Session: abc' },
  ]);
});

// R4
test('offendingLines finds nothing in an empty message', () => {
  assert.deepEqual(offendingLines(''), []);
});

// R4
test('the checker prints nothing and exits 0 for a clean message', (testContext) => {
  const result = check(testContext, 'Add a thing\n\nThe body.\n');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

// R4
test('the checker prints nothing and exits 0 for an empty message', (testContext) => {
  const result = check(testContext, '');
  assert.equal(result.status, 0);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, '');
});

// R5
test('the checker names every offending line in one run, then the closing sentence once', (testContext) => {
  const result = check(testContext, 'Add a thing\n\nCo-Authored-By: Claude\nclaude-session: abc\n');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `line 3: Co-Authored-By: Claude\nline 4: claude-session: abc\n${closingSentence}\n`);
});

// R5
test('the checker names a line of a CRLF message without its carriage return', (testContext) => {
  const result = check(testContext, 'Add a thing\r\n\r\nClaude-Session: abc\r\n');
  assert.equal(result.status, 1);
  assert.equal(result.stderr, `line 3: Claude-Session: abc\n${closingSentence}\n`);
});

// R6
test('the checker refuses a file it cannot read, naming the file, and exits 1', (testContext) => {
  const missing = join(temporaryDirectory(testContext, 'check-commit-message'), 'missing');
  const result = spawnSync(process.execPath, [checker, missing], { encoding: 'utf-8' });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^check-commit-message: cannot read .+: .+\n$/);
  assert.ok(result.stderr.includes(missing), result.stderr);
});

// R6
test('the checker exits 2 with what is wrong and the usage when it is given no path', () => {
  const result = spawnSync(process.execPath, [checker], { encoding: 'utf-8' });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `check-commit-message: no commit message file was given.\n${usage}\n`);
});

// R6
test('the checker exits 2 with what is wrong and the usage when it is given two paths, and reads neither', () => {
  const result = spawnSync(process.execPath, [checker, 'missing one', 'missing two'], { encoding: 'utf-8' });
  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `check-commit-message: it takes one commit message file, and was given 2.\n${usage}\n`);
});
