// The commit-msg hook in the sandbox: git's configuration in the compose file, the image's copies of the hook and the
// checker, and a commit in a container.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { environmentEntry } from './compose-entries.mjs';

const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');
const wrapper = readFileSync(new URL('../container/sandbox.sh', import.meta.url), 'utf-8');
const hookFile = fileURLToPath(new URL('../container/hooks/commit-msg', import.meta.url));
const checkerFile = fileURLToPath(new URL('../container/check-commit-message.mjs', import.meta.url));

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const skip = dockerLacking
  ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
  : false;

// The last stage of the Dockerfile, which is the image the sandbox runs.
function lastStage() {
  return dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
}

// The directory to which the last stage copies `source` from the kit's container directory.
function copiedTo(source) {
  const escaped = source.replaceAll('.', '\\.');
  const match = new RegExp(`^COPY \\$\\{KIT_CONTAINER\\}/${escaped} (\\S+)$`, 'm').exec(lastStage());
  assert.ok(match, `the last stage copies ${source}`);
  return match[1];
}

const checkerDirectory = copiedTo('check-commit-message.mjs');
const hooksDirectory = copiedTo('hooks/commit-msg');

// R13
test('the compose file gives git the hooks directory the Dockerfile copies the hook to, after safe.directory', () => {
  assert.equal(environmentEntry('GIT_CONFIG_COUNT'), '2');
  assert.equal(environmentEntry('GIT_CONFIG_KEY_0'), 'safe.directory');
  assert.equal(environmentEntry('GIT_CONFIG_VALUE_0'), '*');
  assert.equal(environmentEntry('GIT_CONFIG_KEY_1'), 'core.hooksPath');
  assert.equal(posix.join(environmentEntry('GIT_CONFIG_VALUE_1'), '/'), posix.join(hooksDirectory, '/'));
});

// R13: every run mode starts the one service, and --connect uses docker exec, so nothing but the compose file sets
// git's environment configuration.
test('the wrapper sets no GIT_CONFIG_ variable and passes none to a container', () => {
  assert.doesNotMatch(wrapper, /GIT_CONFIG_/);
});

// R13, R14, R15: the image's files are copied from the kit's container directory alone, and not from the project
// or the clone, so that a unit run's clone needs no npm ci for the check.
test('the image holds the hook, executable, and the checker the hook runs', () => {
  const chmod = /^RUN chmod \+x (.+)$/m.exec(lastStage())?.[1].split(' ');
  assert.ok(chmod?.includes(posix.join(hooksDirectory, 'commit-msg')), `the last stage makes ${chmod} executable`);
  assert.match(readFileSync(hookFile, 'utf-8'), /^#!\/bin\/sh$/m);
  assert.notEqual(statSync(hookFile).mode & 0o100, 0);
  const runs = /^exec node (\S+) "\$1"$/m.exec(readFileSync(hookFile, 'utf-8'))?.[1];
  assert.equal(runs, posix.join(checkerDirectory, 'check-commit-message.mjs'));
});

// What a container of the base image runs: a new repository, a commit with a trailer, then the same without it.
const commitScript = `
set -u
cd "$(mktemp -d)"
git init --quiet
echo one > one
git add one
if git -c user.name=Agent -c user.email=agent@example.com commit --quiet -m 'Add one

Co-Authored-By: Claude <noreply@anthropic.com>'; then echo "refused: no"; else echo "refused: yes"; fi
echo "commits: $(git rev-list --count --all)"
git -c user.name=Agent -c user.email=agent@example.com commit --quiet -m 'Add one' && echo "made: yes"
echo "commits: $(git rev-list --count --all)"
`;

// R13, R14, R15, R23
test('in a container, git commit with a trailer is refused and the same commit without it is made', { skip }, () => {
  const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
  assert.ok(image, 'the Dockerfile has a base stage');
  const environment = ['COUNT', 'KEY_0', 'VALUE_0', 'KEY_1', 'VALUE_1'].flatMap((name) => [
    '--env',
    `GIT_CONFIG_${name}=${environmentEntry(`GIT_CONFIG_${name}`)}`,
  ]);
  const uid = `${process.getuid?.() ?? 1000}:${process.getgid?.() ?? 1000}`;

  const result = spawnSync(
    'docker',
    [
      'run',
      '--rm',
      '--user',
      uid,
      '--env',
      'HOME=/tmp',
      ...environment,
      '--volume',
      `${hookFile}:${posix.join(hooksDirectory, 'commit-msg')}:ro`,
      '--volume',
      `${checkerFile}:${posix.join(checkerDirectory, 'check-commit-message.mjs')}:ro`,
      image,
      'sh',
      '-c',
      commitScript,
    ],
    { encoding: 'utf-8' },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'refused: yes\ncommits: 0\nmade: yes\ncommits: 1\n');
  assert.match(result.stderr, /^line 3: Co-Authored-By: Claude <noreply@anthropic\.com>$/m);
  assert.match(result.stderr, /The standards forbid the trailers Co-Authored-By and Claude-Session/);
});
