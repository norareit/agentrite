import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { fakeHost, installKitPackage, logDirectory, logMounts } from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const shim = fileURLToPath(new URL('../sandbox-dev.sh', import.meta.url));
const wrapper = fileURLToPath(new URL('../container/sandbox.sh', import.meta.url));
const unitClone = fileURLToPath(new URL('../container/unit-clone.sh', import.meta.url));
const dockerfile = fileURLToPath(new URL('../container/Dockerfile', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const projectCompose = readFileSync(new URL('../sandbox/compose.project.yml', import.meta.url), 'utf-8');

const devName = 'ritenoar-agentrite-sandbox-dev';
const nameFromVariable = '${SANDBOX_PROJECT_NAME:-ritenoar-agentrite-sandbox}';

// A checkout holding copies of the shim, of the working copy's wrapper and Dockerfile and of its reader of
// agentrite.json, an agentrite.json that holds `"bell": false` alone, and the host of
// `fakeHost`, whose `docker` says the image exists and records each call with the SANDBOX_PROJECT_NAME and the
// AGENTRITE_CONTAINER it saw. The shim runs with an empty home of its own, so that no test depends on what the
// home of whoever runs the suite holds.
function setUp(testContext) {
  const base = temporaryDirectory(testContext, 'sandbox-dev-');
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
  // The checkout's own package.json, from which the wrapper reads the kit's version.
  installKitPackage(root);
  // The wrapper reads bell with the kit's reader of agentrite.json, in the checkout's scripts/.
  mkdirSync(join(root, 'scripts'));
  for (const file of ['agentrite-settings.mjs', 'agentrite-roles.mjs']) {
    copyFileSync(join(kitScripts, file), join(root, 'scripts', file));
  }
  writeFileSync(join(root, 'agentrite.json'), '{"bell": false}\n');
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
test("the shim runs the checkout's own wrapper, and builds before it runs although the image exists", (testContext) => {
  const { root, run, dockerCalls, prefix, logs } = setUp(testContext);
  const result = run(['--in-place']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${prefix} build`, `${prefix} run --rm --volume ${root}:/work ${logs}sandbox`]);
});

// The release sandbox's image and home volume are safe only while the name is the shim's to set.
test('the shim sets the dev name over one the caller had set', (testContext) => {
  const { root, run, dockerCalls, prefix, logs } = setUp(testContext);
  const result = run(['--in-place'], { SANDBOX_PROJECT_NAME: 'ritenoar-agentrite-sandbox' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${prefix} build`, `${prefix} run --rm --volume ${root}:/work ${logs}sandbox`]);
});

test("the shim passes the wrapper's options and the command on", (testContext) => {
  const { base, run, dockerCalls, prefix, logs } = setUp(testContext);
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

// Unit 0058, R3: the bell rings in ./sandbox-dev.sh as in ./sandbox.sh, read from the checkout's agentrite.json.
test("the shim with \"bell\": true has the checkout's wrapper mount the bell and name the plugin", (testContext) => {
  const { root, run, dockerCalls, prefix, logs } = setUp(testContext);
  writeFileSync(join(root, 'agentrite.json'), '{"bell": true}\n');
  const result = run(['--in-place']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    `${prefix} build`,
    `${prefix} run --rm ` +
      '--env OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]} ' +
      `--volume ${root}:/work --volume ${root}/container/bell:/etc/agentrite/bell:ro ` +
      `--volume ${root}/container/bell/claude-managed-settings.json:` +
      `/etc/claude-code/managed-settings.d/agentrite-bell.json:ro ${logs}sandbox`,
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

test('the shim connects to a unit run under the dev name, and asks for no build', (testContext) => {
  const host = setUp(testContext);
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
test('the shim adds no --rebuild to a --connect that follows another option and its directory', (testContext) => {
  const host = setUp(testContext);
  withUnitRun(host);
  const result = host.run(['--mount', host.base, '--connect', unitBranch]);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /--connect cannot be given together with --mount\./);
  assert.doesNotMatch(result.stderr, /--rebuild/);
  assert.deepEqual(host.dockerCalls(), []);
});

// Unit 0066, R6: the shim exits as the checkout's wrapper does, with 1 for a refusal that is not of its arguments.
test("the shim exits 1 for a checkout whose agentrite.json is at fault, with the reader's message", (testContext) => {
  const { root, run, dockerCalls } = setUp(testContext);
  writeFileSync(join(root, 'agentrite.json'), '{}\n');
  const result = run(['--in-place', 'echo', 'hi']);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stderr, 'agentrite: agentrite.json: bell is missing. It must hold true or false\n');
  assert.deepEqual(dockerCalls(), []);
});

for (const [what, args, command] of [
  ['after --in-place', ['--in-place', 'echo', '--connect'], 'echo --connect'],
  ['after a --', ['--in-place', '--', '--connect'], '--connect'],
]) {
  test(`the shim builds for a run whose command holds --connect ${what}`, (testContext) => {
    const { root, run, dockerCalls, prefix, logs } = setUp(testContext);
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), [
      `${prefix} build`,
      `${prefix} run --rm --volume ${root}:/work ${logs}sandbox ${command}`,
    ]);
  });
}

test('the shim builds for a unit run whose command holds --connect', (testContext) => {
  const host = setUp(testContext);
  withUnitRun(host);
  rmSync(join(host.base, 'running-container'));
  const result = host.run([unitBranch, 'echo', '--connect']);
  assert.equal(result.status, 0, result.stderr);
  const calls = host.dockerCalls();
  assert.equal(calls[0], `${host.prefix} build`);
  assert.match(calls.at(-1), / run --rm --name project-sandbox-task-0026-doc .* sandbox echo --connect$/);
});

// The name of --variant is passed over as the directory of --mount is, so the --connect after it is seen. Without
// the pass, the name would be taken for the unit and the shim would add the --rebuild the wrapper refuses.
for (const variantOption of [['--variant', 'opus'], ['--variant=opus']]) {
  test(`the shim adds no --rebuild to a --connect that follows ${variantOption.join(' ')}`, (testContext) => {
    const host = setUp(testContext);
    withUnitRun(host);
    execFileSync('git', ['branch', `${unitBranch}--opus`], { cwd: host.root });
    const result = host.run([...variantOption, '--connect', '0026']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(host.dockerCalls().length, 1);
    assert.match(host.dockerCalls()[0], new RegExp(` docker exec .* project-sandbox-${unitBranch}--opus `));
    assert.doesNotMatch(host.dockerCalls()[0], /--rebuild/);
  });
}

test('the shim builds for a unit run of a variant that follows --variant and its name', (testContext) => {
  const host = setUp(testContext);
  withUnitRun(host);
  rmSync(join(host.base, 'running-container'));
  const result = host.run(['--variant', 'opus', '0026', 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  const calls = host.dockerCalls();
  assert.equal(calls[0], `${host.prefix} build`);
  assert.match(calls.at(-1), / run --rm --name project-sandbox-task-0026-doc--opus .* sandbox echo hi$/);
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
