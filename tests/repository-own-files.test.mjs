// This repository is a project of the release it installs, and its own files are judged against that release, not
// against the working tree, which a project gets only once it is released.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  symlinkSync,
  utimesSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { temporaryDirectory } from './temporary-directory.mjs';

const root = join(import.meta.dirname, '..');
const installed = join(root, 'node_modules', 'agentrite');
const packageJson = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

// The installed release, which the two tests need. Without it they fail, naming the command that installs it.
function installedRelease() {
  assert.ok(
    existsSync(join(installed, 'package.json')),
    'node_modules/agentrite is missing. Run: npm ci, which installs the release this repository uses',
  );
  return realpathSync(installed);
}

// Every path under `base`, node_modules apart.
function pathsUnder(base, directory = '') {
  return readdirSync(join(base, directory), { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (path === 'node_modules') return [];
    return entry.isDirectory() ? pathsUnder(base, path) : [path];
  });
}

// Unit 0054, R24
test('the root agentrite.json is the default file of the installed release byte for byte, and is not shipped', () => {
  const release = installedRelease();
  const template = readFileSync(join(release, 'templates', 'project', 'agentrite.json'), 'utf-8');
  assert.equal(readFileSync(join(root, 'agentrite.json'), 'utf-8'), template);
  assert.ok(!packageJson.files.includes('agentrite.json'), `files holds ${packageJson.files.join(', ')}`);
});

// Unit 0054, R25
test('the refresh of the installed release finds every file it writes at the root up to date, changing none', (t) => {
  const release = installedRelease();
  const copy = temporaryDirectory(t, 'repository-own-files-');
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf-8' }).split('\0');
  const files = tracked.filter((path) => path !== '' && existsSync(join(root, path)));
  const longAgo = new Date('2020-01-01T00:00:00Z');
  for (const path of files) {
    mkdirSync(dirname(join(copy, path)), { recursive: true });
    copyFileSync(join(root, path), join(copy, path));
    chmodSync(join(copy, path), statSync(join(root, path)).mode & 0o777);
    utimesSync(join(copy, path), longAgo, longAgo);
  }
  mkdirSync(join(copy, 'node_modules'));
  symlinkSync(release, join(copy, 'node_modules', 'agentrite'), 'dir');

  const result = spawnSync(process.execPath, [join(release, 'scripts', 'agentrite.mjs'), 'refresh'], {
    cwd: copy,
    encoding: 'utf-8',
  });

  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.split('\n\n')[0].trimEnd().split('\n');
  assert.ok(lines.length > 0 && lines.every((line) => line.startsWith('up to date ')), result.stdout);
  for (const path of files) {
    assert.equal(readFileSync(join(copy, path), 'utf-8'), readFileSync(join(root, path), 'utf-8'), path);
    assert.equal(statSync(join(copy, path)).mtimeMs, longAgo.getTime(), path);
  }
  assert.deepEqual(pathsUnder(copy).sort(), [...files].sort());
});
