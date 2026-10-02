import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

// The packages published to the npm registry under the kit's unscoped command names. They hold those names, and tell
// someone who ran `npx <name>` without the kit installed where the kit is.
const NAMES = ['agentrite', 'agentrite-roles'];
const pointers = join(import.meta.dirname, '..', 'pointers');

for (const name of NAMES) {
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
    assert.match(result.stderr, new RegExp(`^${name} is not installed in this project\\.$`, 'm'));
    assert.match(result.stderr, /@ritenoar\/agentrite/);
    assert.match(result.stderr, /not from the npm registry/);
    assert.match(result.stderr, /https:\/\/bitbucket\.org\/ritenoar\/agentrite$/m);
  });
}

test('the two pointers run the same script', () => {
  const [first, second] = NAMES.map((name) => readFileSync(join(pointers, name, 'pointer.mjs'), 'utf-8'));

  assert.equal(first, second);
});
