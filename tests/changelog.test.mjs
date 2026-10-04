import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

// npm packs the README and package.json whatever `files` says, and not a changelog, so the release notes reach a
// project only while the list names them.
test('the package ships the changelog', () => {
  assert.ok(packageJson.files.includes('CHANGELOG.md'), `files holds ${packageJson.files.join(', ')}`);
});
