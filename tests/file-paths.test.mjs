import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { dirname, relative } from 'node:path';
import { test } from 'node:test';
import { moduleFiles, testsDirectory } from './suite-files.mjs';

// The pathname read off a call or a parenthesised expression, which is the form it takes of a URL made in place with
// `new URL`. A URL held in a variable and read from it is not caught.
const pathnameOfExpression = /\)\s*\.pathname\b/;

// R2, R3
test("no file of the suite takes a path from a URL's pathname", () => {
  const offenders = moduleFiles(testsDirectory)
    .filter((file) => statSync(file).isFile())
    .filter((file) => pathnameOfExpression.test(readFileSync(file, 'utf-8')))
    .map((file) => relative(dirname(testsDirectory), file));
  assert.deepEqual(
    offenders,
    [],
    `${offenders.join(', ')} take a path from the pathname of a URL. Take it with fileURLToPath of node:url, since ` +
      'the pathname is percent-encoded and names no file in a checkout whose path holds a space',
  );
});
