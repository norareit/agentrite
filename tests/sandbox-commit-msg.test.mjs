// The commit-msg hook in the sandbox: git's configuration in the compose file, the image's copies of the hook and the
// checker, and a commit in a container.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { environmentEntry } from './compose-entries.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';
import { executablePaths } from './dockerfile-executables.mjs';

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

// The directories the wrapper exports as SANDBOX_GIT_HOOKS_PATH, in the order it names them.
function wrapperHooksDirectories() {
  return [...wrapper.matchAll(/^\s*(?:export )?SANDBOX_GIT_HOOKS_PATH=(\S+)$/gm)].map((match) => match[1]);
}

// The directory the last stage of the Dockerfile makes for a sandbox-only project's hooks.
const noHooksDirectory = '/usr/local/lib/agentrite/no-hooks';

// R13; unit 0095, R21, R24
test('the compose file gives git the hooks directory the wrapper names, after safe.directory', () => {
  assert.equal(environmentEntry('GIT_CONFIG_COUNT'), '2');
  assert.equal(environmentEntry('GIT_CONFIG_KEY_0'), 'safe.directory');
  assert.equal(environmentEntry('GIT_CONFIG_VALUE_0'), '*');
  assert.equal(environmentEntry('GIT_CONFIG_KEY_1'), 'core.hooksPath');
  assert.equal(
    environmentEntry('GIT_CONFIG_VALUE_1'),
    "${SANDBOX_GIT_HOOKS_PATH:?run the sandbox through the project's sandbox.sh}",
  );
});

// R13; unit 0095, R24
test('the wrapper names, for a project with the process, the directory the Dockerfile copies the hook to', () => {
  const [withProcess] = wrapperHooksDirectories();
  assert.ok(withProcess, 'the wrapper exports SANDBOX_GIT_HOOKS_PATH');
  assert.equal(posix.join(withProcess, '/'), posix.join(hooksDirectory, '/'));
});

// Unit 0095, R21
test('the last stage of the Dockerfile makes the directory without a hook, and copies nothing into it', () => {
  const stage = lastStage();
  assert.match(stage, new RegExp(`mkdir (?:-p )?${noHooksDirectory.replaceAll('/', '\\/')}(?:\\s|$)`, 'm'));
  const copiedInto = [...stage.matchAll(/^COPY .* (\S+)$/gm)].map((match) => match[1]);
  for (const target of copiedInto) assert.ok(!target.startsWith(noHooksDirectory), `COPY into ${target}`);
});

// R13: every run mode starts the one service, and --connect uses docker exec, so nothing but the compose file sets
// git's environment configuration.
test('the wrapper sets no GIT_CONFIG_ variable and passes none to a container', () => {
  assert.doesNotMatch(wrapper, /GIT_CONFIG_/);
});

// R13, R14, R15: the image's files are copied from the kit's container directory alone, and not from the project
// or the clone, so that a unit run's clone needs no npm ci for the check.
test('the image holds the hook, executable, and the checker the hook runs', () => {
  const chmod = executablePaths(lastStage());
  assert.ok(chmod.includes(posix.join(hooksDirectory, 'commit-msg')), `the last stage makes ${chmod} executable`);
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
  // The hooks directory is the wrapper's for a project with the process, which the compose file gives git.
  const environment = [
    ...['COUNT', 'KEY_0', 'VALUE_0', 'KEY_1'].map(
      (name) => `GIT_CONFIG_${name}=${environmentEntry(`GIT_CONFIG_${name}`)}`,
    ),
    `GIT_CONFIG_VALUE_1=${wrapperHooksDirectories()[0]}`,
  ].flatMap((entry) => ['--env', entry]);
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

// What a container of the base image runs for a sandbox-only project: a new repository with a commit-msg hook of its
// own that fails, and a commit with a trailer the standards forbid.
const sandboxOnlyCommitScript = `
set -u
cd "$(mktemp -d)"
git init --quiet
printf '#!/bin/sh\\necho "the repository hook ran" >&2\\nexit 1\\n' > .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg
echo one > one
git add one
git -c user.name=Agent -c user.email=agent@example.com commit --quiet -m 'Add one

Co-Authored-By: Claude <noreply@anthropic.com>' && echo "made: yes"
echo "commits: $(git rev-list --count --all)"
`;

// Unit 0095, R21
test(
  "in a container with a sandbox-only project's hooks directory, a commit with a trailer is made, and no hook runs",
  { skip },
  (testContext) => {
    const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
    assert.ok(image, 'the Dockerfile has a base stage');
    // The image of the base stage lacks the directory the last stage makes, so an empty one stands for it.
    const emptyHooks = temporaryDirectory(testContext, 'sandbox-no-hooks-');
    const environment = [
      ['COUNT', environmentEntry('GIT_CONFIG_COUNT')],
      ['KEY_0', environmentEntry('GIT_CONFIG_KEY_0')],
      ['VALUE_0', environmentEntry('GIT_CONFIG_VALUE_0')],
      ['KEY_1', environmentEntry('GIT_CONFIG_KEY_1')],
      ['VALUE_1', noHooksDirectory],
    ].flatMap(([name, value]) => ['--env', `GIT_CONFIG_${name}=${value}`]);
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
        `${emptyHooks}:${noHooksDirectory}:ro`,
        image,
        'sh',
        '-c',
        sandboxOnlyCommitScript,
      ],
      { encoding: 'utf-8' },
    );

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'made: yes\ncommits: 1\n');
    assert.doesNotMatch(result.stderr, /the repository hook ran|forbid/);
  },
);
