import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { moduleFiles, testsDirectory } from './suite-files.mjs';
import { temporaryDirectory, temporaryDirectoryNames } from './temporary-directory.mjs';

test('a directory is made under the real path of the temporary directory, whatever links lead to it', (
  testContext,
) => {
  const first = temporaryDirectory(testContext, 'temporary-directory-test-');
  mkdirSync(join(first, 'real'));
  symlinkSync(join(first, 'real'), join(first, 'link'));
  const original = process.env.TMPDIR;
  testContext.after(() => {
    if (original === undefined) delete process.env.TMPDIR;
    else process.env.TMPDIR = original;
  });
  process.env.TMPDIR = join(first, 'link');

  const second = temporaryDirectory(testContext, 'opens-with-');

  assert.equal(dirname(second), join(first, 'real'));
  assert.ok(second.slice(dirname(second).length + 1).startsWith('opens-with-'));
});

// R4
test('the name of a directory the helper makes holds a space', (testContext) => {
  const directory = temporaryDirectory(testContext, 'temporary-directory-space-');

  assert.ok(basename(directory).includes(' '), `${directory} has no space in its name`);
});

test('the directory is removed when the test that made it ends', async (testContext) => {
  let made;
  await testContext.test('makes it', (subtest) => {
    made = temporaryDirectory(subtest, 'temporary-directory-removed-');
    writeFileSync(join(made, 'file'), 'content');
    assert.ok(existsSync(join(made, 'file')));
  });
  assert.equal(existsSync(made), false);
});

const helperFile = fileURLToPath(new URL('./temporary-directory.mjs', import.meta.url));

test('no file of the suite but the helper makes a temporary directory itself', () => {
  const offenders = moduleFiles(testsDirectory)
    .filter((file) => file !== helperFile && statSync(file).isFile())
    .filter((file) => temporaryDirectoryNames.test(readFileSync(file, 'utf-8')))
    .map((file) => relative(dirname(testsDirectory), file));
  assert.deepEqual(
    offenders,
    [],
    `${offenders.join(', ')} make a temporary directory themselves. Use temporaryDirectory of ` +
      'tests/temporary-directory.mjs, which gives the path as the system names it, so that the test passes on a ' +
      'host whose temporary directory is reached through a symbolic link, as on macOS',
  );
});
