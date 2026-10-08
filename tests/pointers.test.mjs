import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// The package published to the npm registry under the kit's unscoped command name. It holds the name, and tells
// someone who ran `npx agentrite` without the kit installed where the kit is.
const pointers = join(import.meta.dirname, '..', 'pointers');

for (const name of ['agentrite', 'agentrite-roles']) {
  const directory = join(pointers, name);

  test(`the ${name} pointer is a publishable package that ships one command of its own name`, () => {
    const manifest = JSON.parse(readFileSync(join(directory, 'package.json'), 'utf-8'));

    assert.equal(manifest.name, name);
    assert.deepEqual(manifest.bin, { [name]: 'pointer.mjs' });
    assert.deepEqual(manifest.files, ['pointer.mjs']);
    for (const key of ['dependencies', 'scripts', 'private']) {
      assert.equal(key in manifest, false, `${key} is present`);
    }
  });

  test(`the ${name} pointer says where the kit is and exits 1`, () => {
    const result = spawnSync(process.execPath, [join(directory, 'pointer.mjs')], { encoding: 'utf-8' });

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /@ritenoar\/agentrite/);
    assert.match(result.stderr, /not from the npm registry/);
    assert.match(result.stderr, /https:\/\/bitbucket\.org\/ritenoar\/agentrite$/m);
  });
}

test('the agentrite pointer says that agentrite is not installed in this project', () => {
  const result = spawnSync(process.execPath, [join(pointers, 'agentrite', 'pointer.mjs')], { encoding: 'utf-8' });

  assert.match(result.stderr, /^agentrite is not installed in this project\.$/m);
});

// What the two names say apart: `agentrite` is a command of the kit that the pointer stands in for, and
// `agentrite-roles` is a name the kit no longer has a command for.
const ROLES_POINTER = join(pointers, 'agentrite-roles');

test('the agentrite-roles pointer has a version above the published 1.0.0', () => {
  const { version } = JSON.parse(readFileSync(join(ROLES_POINTER, 'package.json'), 'utf-8'));
  const [major, minor, patch] = version.split('.').map(Number);

  assert.ok(major > 1 || (major === 1 && (minor > 0 || patch > 0)), version);
});

test('the agentrite-roles pointer says there is no such command any more and what to run instead', () => {
  const result = spawnSync(process.execPath, [join(ROLES_POINTER, 'pointer.mjs')], { encoding: 'utf-8' });

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /AgentRite has no command named agentrite-roles any more/);
  assert.match(result.stderr, /`npx agentrite init claude opencode`/);
  assert.match(result.stderr, /`npx agentrite refresh claude opencode`/);
  assert.match(result.stderr, /--no-sandbox/);
  // A `|` in a command to run starts another command in a shell.
  assert.doesNotMatch(result.stderr, /\|/);
  assert.match(result.stderr, /https:\/\/bitbucket\.org\/ritenoar\/agentrite$/m);
  assert.doesNotMatch(result.stderr, /is not installed in this project/);
});

test('the agentrite-roles pointer README says what the message says', () => {
  const readme = readFileSync(join(ROLES_POINTER, 'README.md'), 'utf-8');

  assert.match(readme, /no command named `?agentrite-roles`? any more/);
  assert.match(readme, /`npx agentrite init claude opencode`/);
  assert.match(readme, /`npx agentrite refresh claude opencode`/);
  assert.match(readme, /--no-sandbox/);
  assert.doesNotMatch(readme, /\|/);
});

// The pointer of `agentrite` is unchanged by unit 0038 (R4): the version published, and the message it prints.
test('the agentrite pointer is still version 1.0.0 and prints its message as published', () => {
  const { version } = JSON.parse(readFileSync(join(pointers, 'agentrite', 'package.json'), 'utf-8'));
  const result = spawnSync(process.execPath, [join(pointers, 'agentrite', 'pointer.mjs')], { encoding: 'utf-8' });

  assert.equal(version, '1.0.0');
  assert.equal(
    result.stderr,
    'agentrite is not installed in this project.\n' +
      'AgentRite is the package @ritenoar/agentrite. It is installed from a release URL, not from the npm registry.\n' +
      'The command to install it is in the README at https://bitbucket.org/ritenoar/agentrite\n',
  );
});
