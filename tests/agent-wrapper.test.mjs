import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakeHost, hostVersions, writeCommand } from './wrapper-fixture.mjs';

const wrapper = new URL('../container/agent.sh', import.meta.url).pathname;
const dockerfile = new URL('../container/Dockerfile', import.meta.url).pathname;
const kitPath = 'project/node_modules/@ritenoar/agentrite/container';

// The kit's pins, read from the working copy's Dockerfile, so that a release that bumps them changes no test.
function pinOf(argument) {
  return readFileSync(dockerfile, 'utf-8').match(new RegExp(`^ARG ${argument}=(.*)$`, 'm'))[1];
}
const pins = { claude: pinOf('CLAUDE_CODE_VERSION'), opencode: pinOf('OPENCODE_VERSION') };
// What an image built earlier holds, where a test needs it to differ from what is wanted. Below any pin, so that
// they equal neither a pin nor the fake host's versions, whatever a release moves the pins to.
const builtBefore = { claude: '0.1.0', opencode: '0.2.0' };

// The calls the fake `docker` recorded for a wrapper that handed Compose `versions`: each of `commands` after
// what every call opens with.
function composeCalls(root, container, versions, ...commands) {
  const opening =
    'AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container ' +
    `AGENT_CLAUDE_CODE_VERSION=${versions.claude} AGENT_OPENCODE_VERSION=${versions.opencode} docker compose ` +
    `--project-directory ${root} -f ${container}/compose.yml -f ${root}/agent/compose.project.yml`;
  return commands.map((command) => `${opening} ${command}`);
}

// A project with the kit's wrapper installed at `kitPath` under `root`, with the working copy's Dockerfile beside
// it, and the host of `fakeHost`, whose `docker` records each call with the AGENTRITE_CONTAINER and the two
// version variables it saw. The
// project's Compose file gives the build arguments `buildArgs`, where `null` stands for a configuration Compose
// refuses, and the image exists unless `imageExists` is false. The wrapper runs with a home of its own, `home`,
// which is empty until a test fills it, so that no test depends on what the home of whoever runs the suite holds.
function setUp(
  t,
  kitPath = 'node_modules/@ritenoar/agentrite/container',
  buildArgs = { PLAYWRIGHT_VERSION: '1.59.1' },
  imageExists = true,
) {
  const base = mkdtempSync(join(tmpdir(), 'agent-wrapper-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'project');
  mkdirSync(join(root, 'agent'), { recursive: true });
  writeFileSync(join(root, 'agent', 'compose.project.yml'), '');
  const container = join(base, kitPath);
  mkdirSync(container, { recursive: true });
  copyFileSync(wrapper, join(container, 'agent.sh'));
  chmodSync(join(container, 'agent.sh'), 0o755);
  copyFileSync(dockerfile, join(container, 'Dockerfile'));
  const home = join(base, 'home');
  mkdirSync(home);
  const host = fakeHost(base, ['AGENTRITE_CONTAINER', 'AGENT_CLAUDE_CODE_VERSION', 'AGENT_OPENCODE_VERSION']);
  writeFileSync(host.projectBuildArgs, buildArgs === null ? '' : JSON.stringify(buildArgs));
  if (!imageExists) rmSync(host.imageLabels);
  const run = (...args) =>
    spawnSync(join(container, 'agent.sh'), args, { encoding: 'utf-8', env: { HOME: home, PATH: host.bin } });
  return { base, root, container, home, run, ...host };
}

test('the wrapper refuses to run without a project root, naming the shim', (t) => {
  const { run, dockerCalls } = setUp(t, kitPath);
  const result = run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.match(result.stderr, /agent\.sh shim/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a project root that is not a directory', (t) => {
  const { base, run, dockerCalls } = setUp(t, kitPath);
  const result = run(join(base, 'no-such-directory'), '--rebuild');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a kit outside the project root, which the build cannot reach', (t) => {
  const { root, run, dockerCalls } = setUp(t, 'elsewhere/container');
  const result = run(root);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /is not inside the project root/);
  assert.match(result.stderr, /image build cannot reach it/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper runs Compose from the project root with the kit located relative to it', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    dockerCalls(),
    composeCalls(root, container, hostVersions, 'build', `run --rm --volume ${root}:/work agent echo hi`),
  );
});

for (const [what, buildArgs] of [
  ['no build arguments of the project', {}],
  ['an empty PLAYWRIGHT_VERSION', { PLAYWRIGHT_VERSION: '' }],
]) {
  test(`the wrapper goes on to build and run with ${what}`, (t) => {
    const { root, container, run, dockerCalls } = setUp(t, kitPath, buildArgs);
    const result = run(root, '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, 'build', `run --rm --volume ${root}:/work agent echo hi`),
    );
  });

  test(`the wrapper builds the missing image without --rebuild with ${what}`, (t) => {
    const { root, container, run, dockerCalls } = setUp(t, kitPath, buildArgs, false);
    const result = run(root, 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, 'build', `run --rm --volume ${root}:/work agent echo hi`),
    );
  });
}

test("the wrapper stops with Compose's own error when Compose refuses the configuration", (t) => {
  const { root, run, dockerCalls } = setUp(t, kitPath, null);
  const result = run(root, '--rebuild');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /validating compose\.project\.yml: invalid/);
  assert.doesNotMatch(result.stderr, /SyntaxError|JSON/);
  assert.deepEqual(dockerCalls(), []);
});

// The harness versions. Each is the first of: what the project's Compose file gives, what the host's command
// reports, the kit's pin. The wrapper hands Compose the second or the third in a variable of its own, and learns
// of the first from the merged configuration.
const runOnly = (root, container, versions) =>
  composeCalls(root, container, versions, `run --rm --volume ${root}:/work agent echo hi`);
const buildAndRun = (root, container, versions) =>
  composeCalls(root, container, versions, 'build', `run --rm --volume ${root}:/work agent echo hi`);
const noVersionLine = (command, harness, pin) =>
  `agent.sh: '${command} --version' printed no version, so the sandbox gets the kit's ${harness} ${pin}.\n`;
const holdsLine = (harness, held, wanted, source) =>
  `agent.sh: the image holds ${harness} ${held} and ${wanted} is wanted, from ${source}. Rebuilding.\n`;
const recordsNoneLine = (harness, wanted, source) =>
  `agent.sh: the image records no ${harness} version and ${wanted} is wanted, from ${source}. Rebuilding.\n`;

test("the wrapper hands Compose the host's versions, in every call", (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test("the wrapper hands Compose the kit's pins with neither harness on the PATH, and says nothing", (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, `${pins.claude}|${pins.opencode}\n`);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, pins));
});

for (const [present, absent, versions] of [
  ['claude', 'opencode', { claude: hostVersions.claude, opencode: pins.opencode }],
  ['opencode', 'claude', { claude: pins.claude, opencode: hostVersions.opencode }],
]) {
  test(`the wrapper takes the host's version of ${present} and the kit's pin of ${absent}, which is absent`, (t) => {
    const { root, container, bin, run, dockerCalls } = setUp(t, kitPath);
    rmSync(join(bin, absent));
    const result = run(root, '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
  });
}

test('the wrapper passes a pre-release version of the host on', (t) => {
  const { root, container, bin, run, dockerCalls } = setUp(t, kitPath);
  writeCommand(bin, 'opencode', 'echo 0.0.0-dev-202610030456');
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const versions = { claude: hostVersions.claude, opencode: '0.0.0-dev-202610030456' };
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
});

for (const [what, script] of [
  ['exits 1 after printing a version', 'echo 9.9.9; exit 1'],
  ['prints nothing', ':'],
  ['prints an error', "echo 'error: not a version'"],
  ['prints two numbers', 'echo 1.2'],
  ['prints a version with a command after it', "echo '1.2.3; rm -rf x'"],
  ['prints a version on its second line only', "printf 'warning\\n9.9.9\\n'"],
  ['prints a version on standard error only', 'echo 9.9.9 >&2'],
]) {
  test(`the wrapper uses the kit's pin, and says so, for a harness on the host that ${what}`, (t) => {
    const { root, container, bin, run, dockerCalls } = setUp(t, kitPath);
    writeCommand(bin, 'claude', script);
    const result = run(root, '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, noVersionLine('claude', 'Claude Code', pins.claude));
    const versions = { claude: pins.claude, opencode: hostVersions.opencode };
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
  });
}

test("the wrapper names OpenCode's command when that is the one that prints no version", (t) => {
  const { root, container, bin, run, dockerCalls } = setUp(t, kitPath);
  writeCommand(bin, 'opencode', 'exit 3');
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, noVersionLine('opencode', 'OpenCode', pins.opencode));
  assert.deepEqual(
    dockerCalls(),
    buildAndRun(root, container, { claude: hostVersions.claude, opencode: pins.opencode }),
  );
});

test("the wrapper gives the host's command no input", (t) => {
  const { root, container, home, bin, dockerCalls } = setUp(t, kitPath);
  writeCommand(bin, 'claude', `cat; echo ${hostVersions.claude}`);
  const result = spawnSync(join(container, 'agent.sh'), [root, 'echo', 'hi'], {
    encoding: 'utf-8',
    env: { HOME: home, PATH: bin },
    input: '7.7.7\n',
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

test("the wrapper does not use a version the caller's environment holds", (t) => {
  const { root, container, home, bin, dockerCalls } = setUp(t, kitPath);
  const result = spawnSync(join(container, 'agent.sh'), [root, 'echo', 'hi'], {
    encoding: 'utf-8',
    env: { HOME: home, PATH: bin, AGENT_CLAUDE_CODE_VERSION: '0.0.1', AGENT_OPENCODE_VERSION: '0.0.2' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

test('the wrapper builds nothing when the image holds the wanted versions', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

test('the wrapper says which harness differs from the image, and builds before it runs', (t) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, `${builtBefore.claude}|${hostVersions.opencode}\n`);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, holdsLine('Claude Code', builtBefore.claude, hostVersions.claude, 'the host'));
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test('the wrapper says so for each harness when both differ from the image', (t) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('Claude Code', builtBefore.claude, hostVersions.claude, 'the host') +
      holdsLine('OpenCode', builtBefore.opencode, hostVersions.opencode, 'the host'),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test('the wrapper rebuilds an image that records no versions, which one built before the labels is', (t) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, '|\n');
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    recordsNoneLine('Claude Code', hostVersions.claude, 'the host') +
      recordsNoneLine('OpenCode', hostVersions.opencode, 'the host'),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test("the wrapper builds nothing when the image holds the project's version and the host's of the other", (t) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath, { OPENCODE_VERSION: '1.18.20' });
  writeFileSync(imageLabels, `${hostVersions.claude}|1.18.20\n`);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

test("the wrapper rebuilds for the project's version, whatever the host has, and names the project's file", (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath, { OPENCODE_VERSION: '1.18.20' });
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('OpenCode', hostVersions.opencode, '1.18.20', "the project's compose file"),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

// A project may hold the very version the host has, or the one the kit pins. The value is the same and the source
// is not: the project's file stands first.
for (const [harness, argument, held, labels] of [
  ['Claude Code', 'CLAUDE_CODE_VERSION', hostVersions.claude, `${builtBefore.claude}|${hostVersions.opencode}\n`],
  ['OpenCode', 'OPENCODE_VERSION', hostVersions.opencode, `${hostVersions.claude}|${builtBefore.opencode}\n`],
]) {
  test(`the wrapper names the project's file for a version of ${harness} it gives that equals the host's`, (t) => {
    const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath, { [argument]: held });
    writeFileSync(imageLabels, labels);
    const result = run(root, 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const inImage = harness === 'Claude Code' ? builtBefore.claude : builtBefore.opencode;
    assert.equal(result.stderr, holdsLine(harness, inImage, held, "the project's compose file"));
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  });
}

test("the wrapper names the project's file for a version it gives that equals the kit's pin", (t) => {
  const buildArgs = { CLAUDE_CODE_VERSION: pins.claude };
  const { root, container, bin, imageLabels, run, dockerCalls } = setUp(t, kitPath, buildArgs);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, '0.0.1|0.0.2\n');
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('Claude Code', '0.0.1', pins.claude, "the project's compose file") +
      holdsLine('OpenCode', '0.0.2', pins.opencode, 'the kit'),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, pins));
});

test("the wrapper rebuilds for the kit's pins when the host has neither harness, and names the kit", (t) => {
  const { root, container, bin, run, dockerCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('Claude Code', hostVersions.claude, pins.claude, 'the kit') +
      holdsLine('OpenCode', hostVersions.opencode, pins.opencode, 'the kit'),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, pins));
});

test('the wrapper builds on --rebuild although the image holds the wanted versions, and says nothing', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test("the wrapper stops with the build's own error when the build fails, and runs nothing", (t) => {
  const { root, container, imageLabels, buildFails, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, `${builtBefore.claude}|${hostVersions.opencode}\n`);
  writeFileSync(buildFails, '');
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 17);
  assert.match(result.stderr, /failed to solve: no network/);
  assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, 'build'));
});

test('the wrapper refuses to run when the Dockerfile beside it holds no pin, naming the file', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(join(container, 'Dockerfile'), `ARG CLAUDE_CODE_VERSION=${pins.claude}\n`);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes(`OPENCODE_VERSION in ${join(container, 'Dockerfile')}`), result.stderr);
  assert.deepEqual(dockerCalls(), []);
});

// The developer's Claude Code status line. The wrapper mounts the host's script and the kit's managed settings
// file that runs it, both or neither: Docker would create a root-owned directory at a script that is not there,
// and the settings without a script would blank a status line set inside the sandbox.
const statusLinePath = (home) => join(home, '.claude', 'statusline-command.sh');

function expectedRun(root, container, mounts = '') {
  return composeCalls(root, container, hostVersions, `run --rm --volume ${root}:/work ${mounts}agent echo hi`);
}

test("the wrapper mounts the host's status line script and the settings that run it, read-only", (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  mkdirSync(join(home, '.claude'));
  writeFileSync(statusLinePath(home), 'echo line\n');
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const mounts =
    `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
    `--volume ${container}/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
  assert.deepEqual(dockerCalls(), expectedRun(root, container, mounts));
});

test('the wrapper mounts neither without a status line script on the host, and creates nothing there', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), expectedRun(root, container));
  assert.deepEqual(readdirSync(home), []);
});

test('the wrapper mounts neither when a directory is where the status line script would be', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  mkdirSync(statusLinePath(home), { recursive: true });
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), expectedRun(root, container));
  assert.deepEqual(readdirSync(statusLinePath(home)), []);
});
