import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakeHost, logDirectory, logMounts } from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const shim = new URL('../sandbox-dev.sh', import.meta.url).pathname;
const wrapper = new URL('../container/sandbox.sh', import.meta.url).pathname;
const unitClone = new URL('../container/unit-clone.sh', import.meta.url).pathname;
const dockerfile = new URL('../container/Dockerfile', import.meta.url).pathname;
const projectCompose = readFileSync(new URL('../sandbox/compose.project.yml', import.meta.url), 'utf-8');

const devName = 'ritenoar-agentrite-sandbox-dev';
const nameFromVariable = '${SANDBOX_PROJECT_NAME:-ritenoar-agentrite-sandbox}';

// A checkout holding copies of the shim and of the working copy's wrapper and Dockerfile, and the host of
// `fakeHost`, whose `docker` says the image exists and records each call with the SANDBOX_PROJECT_NAME and the
// AGENTRITE_CONTAINER it saw. The shim runs with an empty home of its own, so that no test depends on what the
// home of whoever runs the suite holds.
function setUp(t) {
  const base = temporaryDirectory(t, 'sandbox-dev-');
  const root = join(base, 'checkout');
  mkdirSync(join(root, 'sandbox'), { recursive: true });
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), '');
  mkdirSync(join(root, 'container'));
  for (const [from, to] of [
    [shim, join(root, 'sandbox-dev.sh')],
    [wrapper, join(root, 'container', 'sandbox.sh')],
  ]) {
    copyFileSync(from, to);
    chmodSync(to, 0o755);
  }
  copyFileSync(dockerfile, join(root, 'container', 'Dockerfile'));
  const home = join(base, 'home');
  mkdirSync(home);
  const { bin, dockerCalls } = fakeHost(base, ['SANDBOX_PROJECT_NAME', 'AGENTRITE_CONTAINER']);
  const run = (args, env = {}) =>
    spawnSync(join(root, 'sandbox-dev.sh'), args, { encoding: 'utf-8', env: { ...env, HOME: home, PATH: bin } });
  // What every recorded call opens with: the dev name, and Compose run by the checkout's own wrapper.
  const prefix =
    `SANDBOX_PROJECT_NAME=${devName} AGENTRITE_CONTAINER=container docker compose ` +
    `--project-directory ${root} -f ${root}/container/compose.yml -f ${root}/sandbox/compose.project.yml`;
  // The flags of the checkout's log directory, which is named after the checkout and not after the dev name.
  const logs = logMounts(logDirectory(join(home, '.local', 'share'), root));
  return { base, root, run, dockerCalls, prefix, logs };
}

// The wrapper builds only a missing image or on --rebuild, and a run on an image built before the change under
// test exits 0 all the same, so the shim asks for the build itself.
test("the shim runs the checkout's own wrapper, and builds before it runs although the image exists", (t) => {
  const { root, run, dockerCalls, prefix, logs } = setUp(t);
  const result = run(['--in-place']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${prefix} build`, `${prefix} run --rm --volume ${root}:/work ${logs}sandbox`]);
});

// The release sandbox's image and home volume are safe only while the name is the shim's to set.
test('the shim sets the dev name over one the caller had set', (t) => {
  const { root, run, dockerCalls, prefix, logs } = setUp(t);
  const result = run(['--in-place'], { SANDBOX_PROJECT_NAME: 'ritenoar-agentrite-sandbox' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${prefix} build`, `${prefix} run --rm --volume ${root}:/work ${logs}sandbox`]);
});

test("the shim passes the wrapper's options and the command on", (t) => {
  const { base, run, dockerCalls, prefix, logs } = setUp(t);
  const workdir = join(base, 'elsewhere');
  const mounted = join(base, 'mounted');
  mkdirSync(workdir);
  mkdirSync(mounted);
  const result = run(['--workdir', workdir, '--mount', `${mounted}:ro`, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    `${prefix} build`,
    `${prefix} run --rm --volume ${workdir}:/work --volume ${mounted}:/mnt/mounted:ro ${logs}sandbox echo hi`,
  ]);
});

// Connecting. The wrapper refuses --rebuild together with --connect, so the shim asks for no build then, and reads
// the wrapper's options as the wrapper does to tell.

const unitBranch = 'task-0026-doc';

// Makes the checkout of `setUp` a repository with the branch of a unit, gives it the wrapper's git functions, and
// has the stand-in's `ps` say that a container is running.
function withUnitRun({ base, root }) {
  copyFileSync(unitClone, join(root, 'container', 'unit-clone.sh'));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=Tester', '-c', 'user.email=tester@example.com', ...args], { cwd: root });
  git('init', '--quiet', '--initial-branch', 'master');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the checkout');
  git('branch', unitBranch);
  writeFileSync(join(base, 'running-container'), '0123456789ab\n');
}

test('the shim connects to a unit run under the dev name, and asks for no build', (t) => {
  const host = setUp(t);
  withUnitRun(host);
  const result = host.run(['--connect', unitBranch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(host.dockerCalls(), [
    `SANDBOX_PROJECT_NAME=${devName} AGENTRITE_CONTAINER=container docker exec --interactive --user agent ` +
      '--workdir /work --env HOME=/home/agent --env USER=agent --env LOGNAME=agent ' +
      '--env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin --env TERM= --env COLORTERM= ' +
      `project-sandbox-${unitBranch} /usr/local/bin/known-terminal.sh echo hi`,
  ]);
});

// The directory of --mount is passed over, so the --connect after it is seen, and the wrapper's refusal names the
// option the caller gave and not one the shim added.
test('the shim adds no --rebuild to a --connect that follows another option and its directory', (t) => {
  const host = setUp(t);
  withUnitRun(host);
  const result = host.run(['--mount', host.base, '--connect', unitBranch]);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /--connect cannot be given together with --mount\./);
  assert.doesNotMatch(result.stderr, /--rebuild/);
  assert.deepEqual(host.dockerCalls(), []);
});

for (const [what, args, command] of [
  ['after --in-place', ['--in-place', 'echo', '--connect'], 'echo --connect'],
  ['after a --', ['--in-place', '--', '--connect'], '--connect'],
]) {
  test(`the shim builds for a run whose command holds --connect ${what}`, (t) => {
    const { root, run, dockerCalls, prefix, logs } = setUp(t);
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), [
      `${prefix} build`,
      `${prefix} run --rm --volume ${root}:/work ${logs}sandbox ${command}`,
    ]);
  });
}

test('the shim builds for a unit run whose command holds --connect', (t) => {
  const host = setUp(t);
  withUnitRun(host);
  rmSync(join(host.base, 'running-container'));
  const result = host.run([unitBranch, 'echo', '--connect']);
  assert.equal(result.status, 0, result.stderr);
  const calls = host.dockerCalls();
  assert.equal(calls[0], `${host.prefix} build`);
  assert.match(calls.at(-1), / run --rm --name project-sandbox-task-0026-doc .* sandbox echo --connect$/);
});

// With the variable unset both resolve to the names ./sandbox.sh has always used, and with the shim's value to a
// project, an image and so a home volume of their own.
test("this repository's project Compose file names its project and its image after the variable", () => {
  const lines = projectCompose.split('\n');
  assert.deepEqual(
    lines.filter((line) => line.startsWith('name:')),
    [`name: ${nameFromVariable}`],
  );
  assert.deepEqual(
    lines.map((line) => line.trim()).filter((line) => line.startsWith('image:')),
    [`image: ${nameFromVariable}`],
  );
});
