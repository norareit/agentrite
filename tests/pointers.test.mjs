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
  assert.match(result.stderr, /agentrite init/);
  assert.match(result.stderr, /agentrite refresh/);
  assert.match(result.stderr, /--no-sandbox/);
  assert.match(result.stderr, /https:\/\/bitbucket\.org\/ritenoar\/agentrite$/m);
  assert.doesNotMatch(result.stderr, /is not installed in this project/);
});

test('the agentrite-roles pointer README says what the message says', () => {
  const readme = readFileSync(join(ROLES_POINTER, 'README.md'), 'utf-8');

  assert.match(readme, /no command named `?agentrite-roles`? any more/);
  assert.match(readme, /agentrite init/);
  assert.match(readme, /agentrite refresh/);
  assert.match(readme, /--no-sandbox/);
});

test('the agentrite pointer is the one on master', () => {
  for (const file of ['pointer.mjs', 'package.json']) {
    const onMaster = spawnSync('git', ['show', `master:pointers/agentrite/${file}`], {
      cwd: join(import.meta.dirname, '..'),
      encoding: 'utf-8',
    });
    assert.equal(onMaster.status, 0, onMaster.stderr);

    assert.equal(readFileSync(join(pointers, 'agentrite', file), 'utf-8'), onMaster.stdout, file);
  }
});
