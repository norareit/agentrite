import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

// npm packs the README whatever `files` says, and no other document, so the reference of the sandbox reaches a
// project only while the list names it.
test('the package ships the reference of the sandbox', () => {
  assert.ok(packageJson.files.includes('SANDBOX.md'), `files holds ${packageJson.files.join(', ')}`);
  assert.ok(existsSync(new URL('../SANDBOX.md', import.meta.url)), 'SANDBOX.md is a file at the root');
});

// Working on the kit is for whoever has the repository, and a project that installed the kit does not.
test('the package does not ship CONTRIBUTING.md', () => {
  assert.ok(!packageJson.files.includes('CONTRIBUTING.md'), `files holds ${packageJson.files.join(', ')}`);
});
