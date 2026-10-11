import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { posix } from 'node:path';
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
  assert.deepEqual(packageJson.repository, { type: 'git', url: 'git+https://github.com/norareit/agentrite.git' });
  assert.equal(packageJson.description, 'A kit for running coding agents by a fixed process');
  assert.deepEqual(packageJson.keywords, [
    'agents',
    'coding-agents',
    'claude-code',
    'opencode',
    'sandbox',
    'process',
  ]);
  assert.equal(packageJson.homepage, 'https://github.com/norareit/agentrite#readme');
  assert.deepEqual(packageJson.bugs, { url: 'https://github.com/norareit/agentrite/issues' });
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
    'scripts/agentrite-settings.mjs',
    'scripts/agentrite.mjs',
    'container',
  ]);
});

// A script of the package that imports a file the package does not hold fails in a project and passes here.
test('every file that a listed script imports by a relative path is itself listed', () => {
  const scripts = packageJson.files.filter((path) => path.startsWith('scripts/'));
  /** @type {string[]} */ const found = [];
  for (const script of scripts) {
    const source = readFileSync(new URL(`../${script}`, import.meta.url), 'utf-8');
    const imported = [...source.matchAll(/\bfrom '(\.[^']+)'/g)].map((match) => match[1]);
    for (const specifier of imported) {
      const path = posix.join(posix.dirname(script), specifier);
      assert.ok(packageJson.files.includes(path), `${script} imports ${path}, which files does not list`);
      found.push(path);
    }
  }
  // The imports are found at all, so that the loop above does not pass on nothing.
  assert.ok(found.includes('scripts/agentrite-roles.mjs'), `found ${found.join(', ')}`);
});

test('the package ships the default agentrite.json, as a template', () => {
  assert.ok(packageJson.files.includes('templates'), `files holds ${packageJson.files.join(', ')}`);
  assert.ok(existsSync(new URL('../templates/project/agentrite.json', import.meta.url)));
});

// The file is this repository's own and is right for it only while it is the default file.
test('the root has an agentrite.json that is the default file byte for byte, and the package does not ship it', () => {
  const template = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
  assert.equal(readFileSync(new URL('../agentrite.json', import.meta.url), 'utf-8'), template);
  assert.ok(!packageJson.files.includes('agentrite.json'), `files holds ${packageJson.files.join(', ')}`);
});

test('LICENSE is the MIT License at the root, with the copyright holder', () => {
  const license = new URL('../LICENSE', import.meta.url);
  assert.ok(existsSync(license), 'LICENSE is a file at the root');
  const lines = readFileSync(license, 'utf-8').split('\n');
  assert.equal(lines[0], 'MIT License');
  assert.ok(lines.includes('Copyright (c) 2026 Stef Klaassen'), 'LICENSE holds the copyright line');
});

// npm runs `prepublishOnly` on `npm publish` alone. Every other lifecycle script named here runs on an install or
// a pack as well, in this repository or in a project that installs the kit.
test('package.json checks a release in prepublishOnly, and holds no script that an install or a pack runs', () => {
  assert.equal(packageJson.scripts.prepublishOnly, 'node publish-check.mjs && npm test');
  for (const name of [
    'preinstall',
    'install',
    'postinstall',
    'prepublish',
    'preprepare',
    'prepare',
    'postprepare',
    'prepack',
    'postpack',
  ]) {
    assert.ok(!Object.hasOwn(packageJson.scripts, name), `scripts holds no ${name}`);
  }
});

test('the package does not ship the check of npm publish', () => {
  assert.ok(!packageJson.files.includes('publish-check.mjs'), `files holds ${packageJson.files.join(', ')}`);
});
