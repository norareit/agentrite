import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import {
  foreignHookNotice,
  HOOK_MARK,
  isKitHook,
  noRepositoryNotice,
  printedHookPath,
} from '../scripts/agentrite-hook.mjs';

const template = readFileSync(new URL('../templates/project/commit-msg', import.meta.url), 'utf-8');

// R10
test('isKitHook accepts a text that holds the mark as a line of its own', () => {
  assert.equal(isKitHook(`#!/bin/sh\n${HOOK_MARK}\nexit 0\n`), true);
  assert.equal(isKitHook(`#!/bin/sh\r\n${HOOK_MARK}\r\nexit 0\r\n`), true);
});

// R10
test('isKitHook refuses a text that holds the mark inside another line, or not at all', () => {
  assert.equal(isKitHook(`#!/bin/sh\necho "${HOOK_MARK}"\n`), false);
  assert.equal(isKitHook(`#!/bin/sh\n ${HOOK_MARK}\n`), false);
  assert.equal(isKitHook('#!/bin/sh\nexit 0\n'), false);
  assert.equal(isKitHook(''), false);
});

// R7
test('the template of the hook holds the mark', () => {
  assert.equal(isKitHook(template), true);
});

// R7
test('printedHookPath gives a path under the root relative to it', () => {
  assert.equal(printedHookPath('/work/my app', '/work/my app/.git/hooks/commit-msg'), '.git/hooks/commit-msg');
  assert.equal(printedHookPath('/work/my app/', '/work/my app/hooks/commit-msg'), 'hooks/commit-msg');
});

// R7
test('printedHookPath gives a path outside the root as it is', () => {
  assert.equal(printedHookPath('/work/my app', '/work/hooks/commit-msg'), '/work/hooks/commit-msg');
  assert.equal(printedHookPath('/work/my app', '/work/my apple/commit-msg'), '/work/my apple/commit-msg');
});

// R10
test('the notice of a hook of the project names its path, what is then not checked, and where to read more', () => {
  const notice = foreignHookNotice('.git/hooks/commit-msg');
  const text = notice.replaceAll('\n', ' ');
  assert.match(text, /^\.git\/hooks\/commit-msg /);
  assert.match(text, /commit messages are not checked for the trailers/i);
  assert.match(text, /"Git hooks" in node_modules\/agentrite\/README\.md/);
  assert.ok(notice.endsWith('\n'));
  for (const line of notice.split('\n')) assert.ok(line.length <= 120, line);
});

// R11
test('the notice outside a git repository says that no hook was written and why', () => {
  const notice = noRepositoryNotice('the project is not inside a git repository');
  assert.match(notice, /^No commit-msg hook was written, because the project is not inside a git repository\./);
  assert.ok(notice.endsWith('\n'));
  for (const line of notice.split('\n')) assert.ok(line.length <= 120, line);
});

// R11
test('the notice when git could not be run gives the error it gave', () => {
  const notice = noRepositoryNotice('git could not be run: spawnSync git ENOENT');
  assert.match(notice.replaceAll('\n', ' '), /because git could not be run: spawnSync git ENOENT\./);
});
