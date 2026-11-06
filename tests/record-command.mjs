import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

// What the tests of the commands that commit a record share.

export function write(project, path, text) {
  mkdirSync(dirname(join(project, path)), { recursive: true });
  writeFileSync(join(project, path), text);
}

export function environment(base) {
  return { HOME: join(base, 'home'), GIT_CONFIG_NOSYSTEM: '1', PATH: process.env.PATH };
}

export function git(base, project, ...args) {
  const result = spawnSync('git', args, { cwd: project, encoding: 'utf-8', env: environment(base) });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

export function installHook({ project }, script) {
  const hook = join(project, '.git', 'hooks', 'commit-msg');
  writeFileSync(hook, `#!/bin/sh\n${script}\n`);
  chmodSync(hook, 0o755);
}

export function commitRecord(given, directory, change) {
  const path = join(given.project, 'changes', directory, 'record.md');
  writeFileSync(path, change(readFileSync(path, 'utf-8')));
  git(given.base, given.project, 'commit', '--quiet', '-am', 'Change the record');
}
