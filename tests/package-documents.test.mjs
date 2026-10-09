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

// What the registry shows of the package, and what `npm publish` needs to accept it.
test('package.json names the package agentrite, with no private field', () => {
  assert.equal(packageJson.name, 'agentrite');
  assert.ok(!Object.hasOwn(packageJson, 'private'), 'package.json holds no key private');
});

test('package.json says what the package is, where it lives and under which license', () => {
  assert.equal(packageJson.license, 'MIT');
  assert.deepEqual(packageJson.repository, { type: 'git', url: 'git+https://github.com/ritenoar/agentrite.git' });
  assert.equal(packageJson.description, 'A kit for running coding agents by a fixed process');
  assert.deepEqual(packageJson.keywords, [
    'agents',
    'coding-agents',
    'claude-code',
    'opencode',
    'sandbox',
    'process',
  ]);
  assert.equal(packageJson.homepage, 'https://github.com/ritenoar/agentrite#readme');
  assert.deepEqual(packageJson.bugs, { url: 'https://github.com/ritenoar/agentrite/issues' });
});

test('package.json keeps the one command and the files the package holds', () => {
  assert.deepEqual(packageJson.bin, { agentrite: 'scripts/agentrite.mjs' });
  assert.deepEqual(packageJson.files, [
    'process.md',
    'CHANGELOG.md',
    'SANDBOX.md',
    'roles',
    'templates',
    'scripts/check-changes.mjs',
    'scripts/agentrite-roles.mjs',
    'scripts/agentrite-run.mjs',
    'scripts/agentrite.mjs',
    'container',
  ]);
});

test('LICENSE is the MIT License at the root, with the copyright holder', () => {
  const license = new URL('../LICENSE', import.meta.url);
  assert.ok(existsSync(license), 'LICENSE is a file at the root');
  const lines = readFileSync(license, 'utf-8').split('\n');
  assert.equal(lines[0], 'MIT License');
  assert.ok(lines.includes('Copyright (c) 2026 Stef Klaassen'), 'LICENSE holds the copyright line');
});
