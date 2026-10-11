import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// The package published to the npm registry under the name of a command the kit had once and has not any more. It
// holds the name, and tells someone who ran `npx agentrite-roles` what to run instead and where the kit is.
const ROLES_POINTER = join(import.meta.dirname, '..', 'pointers', 'agentrite-roles');

const manifest = JSON.parse(readFileSync(join(ROLES_POINTER, 'package.json'), 'utf-8'));
const readme = readFileSync(join(ROLES_POINTER, 'README.md'), 'utf-8');

// `refresh` takes no harness and no option, `--no-sandbox` is an option of `init` alone, and the kit is installed
// as a development dependency.
function assertCommandsAsTheKitHasThem(text) {
  const oneLine = text.replace(/\s+/g, ' ');
  assert.doesNotMatch(oneLine, /refresh (claude|opencode|--no-sandbox)/);
  assert.doesNotMatch(oneLine, /npm install agentrite/);
  assert.match(oneLine, /`--no-sandbox`/);
  assert.doesNotMatch(oneLine, /--no-sandbox` to either/);
  const sentence = oneLine.split(/\. /).find((part) => part.includes('--no-sandbox'));
  assert.match(sentence, /agentrite init/);
  assert.doesNotMatch(sentence, /refresh/);
}

function runPointer() {
  return spawnSync(process.execPath, [join(ROLES_POINTER, 'pointer.mjs')], { encoding: 'utf-8' });
}

test('the agentrite-roles pointer is a publishable package that ships one command of its own name', () => {
  assert.equal(manifest.name, 'agentrite-roles');
  assert.deepEqual(manifest.bin, { 'agentrite-roles': 'pointer.mjs' });
  assert.deepEqual(manifest.files, ['pointer.mjs']);
  for (const key of ['dependencies', 'scripts', 'private']) {
    assert.equal(key in manifest, false, `${key} is present`);
  }
});

// The registry takes a version once, and holds 1.0.0 and 2.0.1.
test('the agentrite-roles pointer is version 2.0.2', () => {
  assert.equal(manifest.version, '2.0.2');
});

test('the agentrite-roles pointer says there is no such command any more and what to run instead', () => {
  const result = runPointer();

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /AgentRite has no command named agentrite-roles any more/);
  assert.match(result.stderr, /`npx agentrite init claude opencode`/);
  assert.match(result.stderr, /`npx agentrite refresh`/);
  assertCommandsAsTheKitHasThem(result.stderr);
  // A `|` in a command to run starts another command in a shell.
  assert.doesNotMatch(result.stderr, /\|/);
});

test('the agentrite-roles pointer says which package the kit is, how to install it and where its README is', () => {
  const { stderr } = runPointer();

  assert.match(stderr, /AgentRite is the package agentrite/);
  assert.match(stderr, /`npm install --save-dev agentrite`/);
  assert.match(stderr, /https:\/\/github\.com\/norareit\/agentrite$/m);
});

test('the agentrite-roles pointer README says what the message says', () => {
  assert.match(readme, /no command named `?agentrite-roles`? any more/);
  assert.match(readme, /`npx agentrite init claude opencode`/);
  assert.match(readme, /`npx agentrite refresh`/);
  assertCommandsAsTheKitHasThem(readme);
  assert.doesNotMatch(readme, /\|/);
  assert.match(readme, /AgentRite is the package `agentrite`/);
  assert.match(readme, /`npm install --save-dev agentrite`/);
  assert.match(readme, /https:\/\/github\.com\/norareit\/agentrite$/m);
});

test('the agentrite-roles pointer names the package in its description', () => {
  assert.match(manifest.description, /the package agentrite$/);
});

test('the agentrite-roles pointer does not say that the kit is installed from a URL, or name its scope', () => {
  const { stderr } = runPointer();

  for (const [what, text] of [
    ['the description', manifest.description],
    ['the message', stderr],
    ['the README', readme],
  ]) {
    assert.doesNotMatch(text, /release URL/, what);
    assert.doesNotMatch(text, /not (on|from) the npm registry/, what);
    assert.doesNotMatch(text, /@ritenoar/, what);
  }
});
