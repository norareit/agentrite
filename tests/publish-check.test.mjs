import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { missingReleaseNotes, uncommittedChanges } from '../publish-check.mjs';

const script = join(import.meta.dirname, '..', 'publish-check.mjs');

const RELEASE_NOTES_MESSAGE =
  '✗ CHANGELOG.md has no section headed "## 5.0.0". Write the release notes as RELEASING.md\n' +
  '  describes, commit them, and run npm publish again.';

// R6

test('missingReleaseNotes finds the section of the version at the top and in the middle of the changelog', () => {
  assert.equal(missingReleaseNotes('## 5.0.0\n\nNotes.\n', '5.0.0'), undefined);
  assert.equal(missingReleaseNotes('# Changelog\n\n## 6.0.0\n\nNotes.\n\n## 5.0.0\n\nNotes.\n', '5.0.0'), undefined);
});

test('missingReleaseNotes says why and what to do when no line is exactly the heading of the version', () => {
  for (const changelog of [
    '# Changelog\n\n## 4.2.0\n\nNotes.\n',
    '### 5.0.0\n',
    '## 5.0.01\n',
    '## 15.0.0\n',
    '## 5.0.0 and more\n',
    undefined,
  ]) {
    const message = missingReleaseNotes(changelog, '5.0.0');
    assert.equal(message, RELEASE_NOTES_MESSAGE, String(changelog));
    for (const part of ['CHANGELOG.md', '"## 5.0.0"', 'RELEASING.md', 'commit them', 'run npm publish again']) {
      assert.ok(message.includes(part), part);
    }
  }
});

// R22

test('uncommittedChanges finds nothing in an empty status', () => {
  assert.equal(uncommittedChanges(''), undefined);
});

test('uncommittedChanges names each changed file on a line of its own, and says what to do', () => {
  const message = uncommittedChanges(' M README.md\nA  new file.txt\n');
  const lines = message.split('\n');
  assert.ok(lines.includes('  README.md'), message);
  assert.ok(lines.includes('  new file.txt'), message);
  for (const part of ['is not committed', 'Commit the changes or put them aside', 'run npm publish again']) {
    assert.ok(message.includes(part), part);
  }
});

function git(cwd, ...args) {
  return execFileSync('git', args, { cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'] });
}

// A repository that holds a committed package.json at 5.0.0 and a committed CHANGELOG.md, or none when it is null.
function repository(t, changelog = '# Changelog\n\n## 5.0.0\n\nNotes.\n') {
  const root = mkdtempSync(join(tmpdir(), 'publish-check-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));

  git(root, 'init', '-b', 'master');
  git(root, 'config', 'user.email', 'test@example.com');
  git(root, 'config', 'user.name', 'Test User');
  writeFileSync(join(root, 'package.json'), '{ "name": "agentrite", "version": "5.0.0" }\n');
  writeFileSync(join(root, 'README.md'), 'A kit.\n');
  if (changelog !== null) writeFileSync(join(root, 'CHANGELOG.md'), changelog);
  git(root, 'add', '.');
  git(root, 'commit', '-m', 'base');

  return root;
}

function runCheck(root) {
  return spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf-8' });
}

test('the check passes a version with its section in a clean working tree', (t) => {
  const result = runCheck(repository(t));
  assert.equal(result.stderr, '');
  assert.equal(result.status, 0);
});

test('the check refuses a version with no section in CHANGELOG.md', (t) => {
  const result = runCheck(repository(t, '# Changelog\n\n## 4.2.0\n\nNotes.\n'));
  assert.equal(result.status, 1);
  assert.equal(result.stderr, `${RELEASE_NOTES_MESSAGE}\n`);
  assert.equal(result.stdout, '');
});

test('the check refuses a version when there is no CHANGELOG.md', (t) => {
  const result = runCheck(repository(t, null));
  assert.equal(result.status, 1);
  assert.equal(result.stderr, `${RELEASE_NOTES_MESSAGE}\n`);
  assert.equal(result.stdout, '');
});

const WORKING_TREE_MESSAGE =
  '✗ These tracked files hold a change that is not committed:\n' +
  '  README.md\n' +
  '  Commit the changes or put them aside, and run npm publish again.\n';

test('the check refuses a tracked file with a change that is not staged', (t) => {
  const root = repository(t);
  writeFileSync(join(root, 'README.md'), 'Another kit.\n');
  const result = runCheck(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, WORKING_TREE_MESSAGE);
  assert.equal(result.stdout, '');
});

test('the check refuses a tracked file with a staged change', (t) => {
  const root = repository(t);
  writeFileSync(join(root, 'README.md'), 'Another kit.\n');
  git(root, 'add', 'README.md');
  const result = runCheck(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, WORKING_TREE_MESSAGE);
});

test('the check refuses a change that is staged and then undone in the working tree', (t) => {
  const root = repository(t);
  writeFileSync(join(root, 'README.md'), 'Another kit.\n');
  git(root, 'add', 'README.md');
  writeFileSync(join(root, 'README.md'), 'A kit.\n');
  const result = runCheck(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, WORKING_TREE_MESSAGE);
});

test('the check passes a working tree with an untracked file', (t) => {
  const root = repository(t);
  writeFileSync(join(root, 'notes.txt'), 'Not tracked.\n');
  const result = runCheck(root);
  assert.equal(result.stderr, '');
  assert.equal(result.status, 0);
});

test('the check does not look at the branch', (t) => {
  const root = repository(t);
  git(root, 'checkout', '-b', 'feature-0001-another');
  const result = runCheck(root);
  assert.equal(result.stderr, '');
  assert.equal(result.status, 0);
});

test('the check reports the missing release notes before a changed file', (t) => {
  const root = repository(t, '# Changelog\n');
  writeFileSync(join(root, 'README.md'), 'Another kit.\n');
  const result = runCheck(root);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, `${RELEASE_NOTES_MESSAGE}\n`);
});
