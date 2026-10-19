import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  fakeHost,
  hostVersions,
  latestVersions,
  logDirectories,
  logDirectory,
  logMounts,
  writeCommand,
} from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const wrapper = new URL('../container/sandbox.sh', import.meta.url).pathname;
const kitScripts = new URL('../scripts/', import.meta.url).pathname;
const kitPath = 'project/node_modules/agentrite/container';

// What an image built earlier holds, where a test needs it to differ from what the fake host has and from what
// the fake `npm` gives as the latest.
const builtBefore = { claude: '0.1.0', opencode: '0.2.0' };

// The calls the fake `docker` recorded for a wrapper that handed Compose `versions`: each of `commands` after
// what every call opens with.
function composeCalls(root, container, versions, ...commands) {
  const opening =
    'AGENTRITE_CONTAINER=node_modules/agentrite/container ' +
    `SANDBOX_CLAUDE_CODE_VERSION=${versions.claude} SANDBOX_OPENCODE_VERSION=${versions.opencode} docker compose ` +
    `--project-directory ${root} -f ${container}/compose.yml -f ${root}/sandbox/compose.project.yml`;
  return commands.map((command) => `${opening} ${command}`);
}

// The flags of the log directory of the project at `root`, where `setUp` puts it: in the data directory of the home
// that lies beside the project.
const homeLogs = (root) => logDirectory(join(dirname(root), 'home', '.local', 'share'), root);

// The `run` of a wrapper given `echo hi` for the project at `root`: the flags of the host's terminal in `terminal`,
// then `mounted` at /work, then `mounts`, and last the two directories of `logs`.
const runCommand = (root, mounted = root, mounts = '', logs = homeLogs(root), terminal = '') =>
  `run --rm ${terminal}--volume ${mounted}:/work ${mounts}${logMounts(logs)}sandbox echo hi`;

// A project with the kit's wrapper installed at `kitPath` under `root`, the kit's reader of agentrite.json beside it
// and nothing else of the kit, an agentrite.json that holds `"bell": false` alone, and the host of `fakeHost`, whose
// `docker` records each call with the AGENTRITE_CONTAINER and the two version variables it saw. The project's
// Compose file gives the build arguments `buildArgs`, where `null` stands for a configuration Compose refuses, and
// the image exists unless `imageExists` is false. The wrapper runs with a home of its own, `home`, which is empty
// until a test fills it, so that no test depends on what the home of whoever runs the suite holds. `run` runs the
// wrapper with that home alone, and `runWith` with the variables of `env` besides and in the working directory
// `cwd`.
function setUp(
  t,
  kitPath = 'node_modules/agentrite/container',
  buildArgs = { PLAYWRIGHT_VERSION: '1.59.1' },
  imageExists = true,
) {
  const base = temporaryDirectory(t, 'sandbox-wrapper-');
  const root = join(base, 'project');
  mkdirSync(join(root, 'sandbox'), { recursive: true });
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), '');
  const container = join(base, kitPath);
  mkdirSync(container, { recursive: true });
  copyFileSync(wrapper, join(container, 'sandbox.sh'));
  chmodSync(join(container, 'sandbox.sh'), 0o755);
  // The wrapper reads bell with the kit's reader of agentrite.json, in the kit's scripts/ beside its container/.
  mkdirSync(join(container, '..', 'scripts'));
  for (const file of ['agentrite-settings.mjs', 'agentrite-roles.mjs']) {
    copyFileSync(join(kitScripts, file), join(container, '..', 'scripts', file));
  }
  writeFileSync(join(root, 'agentrite.json'), '{"bell": false}\n');
  const home = join(base, 'home');
  mkdirSync(home);
  const host = fakeHost(base, ['AGENTRITE_CONTAINER', 'SANDBOX_CLAUDE_CODE_VERSION', 'SANDBOX_OPENCODE_VERSION']);
  writeFileSync(host.projectBuildArgs, buildArgs === null ? '' : JSON.stringify(buildArgs));
  if (!imageExists) rmSync(host.imageLabels);
  const runWith = ({ env = {}, cwd }, ...args) =>
    spawnSync(join(container, 'sandbox.sh'), args, {
      encoding: 'utf-8',
      cwd,
      env: { ...env, HOME: home, PATH: host.bin },
    });
  const run = (...args) => runWith({}, ...args);
  return { base, root, container, home, run, runWith, ...host };
}

test('the wrapper refuses to run without a project root, naming the shim', (t) => {
  const { run, dockerCalls } = setUp(t, kitPath);
  const result = run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.match(result.stderr, /sandbox\.sh shim/);
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
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    dockerCalls(),
    composeCalls(root, container, hostVersions, 'build', runCommand(root)),
  );
});

for (const [what, buildArgs] of [
  ['no build arguments of the project', {}],
  ['an empty PLAYWRIGHT_VERSION', { PLAYWRIGHT_VERSION: '' }],
]) {
  test(`the wrapper goes on to build and run with ${what}`, (t) => {
    const { root, container, run, dockerCalls } = setUp(t, kitPath, buildArgs);
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, 'build', runCommand(root)),
    );
  });

  test(`the wrapper builds the missing image without --rebuild with ${what}`, (t) => {
    const { root, container, run, dockerCalls } = setUp(t, kitPath, buildArgs, false);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, 'build', runCommand(root)),
    );
  });
}

test("the wrapper stops with Compose's own error when Compose refuses the configuration", (t) => {
  const { root, run, dockerCalls } = setUp(t, kitPath, null);
  const result = run(root, '--in-place', '--rebuild');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /validating compose\.project\.yml: invalid/);
  assert.doesNotMatch(result.stderr, /SyntaxError|JSON/);
  assert.deepEqual(dockerCalls(), []);
});

// A project whose compose file still configures the service `agent`, as every project set up before the sandbox was
// named so does. Compose merges it beside the kit's service `sandbox` without an error, and `sandbox` then has none of
// what the project configured, so the wrapper refuses before it builds or starts anything.
const oldServiceFile = 'services:\n  agent:\n    mem_limit: 8g\n';

for (const options of [['--in-place'], ['--rebuild', '--in-place']]) {
  test(`the wrapper refuses a project whose service is still agent, given ${options.join(' ')}`, (t) => {
    const { root, run, dockerCalls, npmCalls } = setUp(t, kitPath, {}, false);
    writeFileSync(join(root, 'sandbox', 'compose.project.yml'), oldServiceFile);
    const result = run(root, ...options, 'true');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^sandbox\.sh: /);
    assert.ok(result.stderr.includes(`${root}/sandbox/compose.project.yml`), result.stderr);
    assert.match(result.stderr, /service is named sandbox/);
    assert.match(result.stderr, /rename agent: under services: to sandbox:/);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(homeLogs(root)), false);
  });
}

// The harness versions. Each is the first of: what the project's Compose file gives, and what the host's command
// reports. A harness with neither keeps the version the image's label records, and gets the latest published one,
// which the wrapper asks `npm` for, when the image is built. The wrapper hands Compose the version the image is
// built with in a variable of its own, and learns of the project's from the merged configuration.
const runOnly = (root, container, versions) =>
  composeCalls(root, container, versions, runCommand(root));
const buildAndRun = (root, container, versions) =>
  composeCalls(root, container, versions, 'build', runCommand(root));
const noVersionLine = (command, harness) =>
  `sandbox.sh: '${command} --version' printed no version, so ${harness} counts as not installed on the host.\n`;
const holdsLine = (harness, held, wanted, source) =>
  `sandbox.sh: the image holds ${harness} ${held} and ${wanted} is wanted, from ${source}. Rebuilding.\n`;
const recordsNoneLine = (harness, wanted, source) =>
  `sandbox.sh: the image records no ${harness} version and ${wanted} is wanted, from ${source}. Rebuilding.\n`;
const latestLine = (harness, version) =>
  `sandbox.sh: neither the project nor the host gives a version of ${harness}, so the image is built with the ` +
  `latest published, ${version}.\n`;
const notFoundLines = (harness, npmPackage, argument) =>
  `sandbox.sh: could not find the latest published version of ${harness}: 'npm view ${npmPackage} version' gave ` +
  'none.\n' +
  `Give a version in sandbox/compose.project.yml, under services.sandbox.build.args as ${argument}, or install ` +
  `${harness} on the host.\n`;
const askedOf = (npmPackage) => `npm view ${npmPackage} version --fetch-retries=0`;
const askedOfBoth = [askedOf('@anthropic-ai/claude-code'), askedOf('opencode-ai')];

test("the wrapper hands Compose the host's versions, in every call, and asks npm nothing", (t) => {
  const { root, container, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper keeps the versions the image records with neither harness on the PATH, and says nothing', (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, builtBefore));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper keeps a pre-release version the image records of a harness that is not on the PATH', (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, `${hostVersions.claude}|0.0.0-dev-202610030456\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const versions = { claude: hostVersions.claude, opencode: '0.0.0-dev-202610030456' };
  assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
  assert.deepEqual(npmCalls(), []);
});

for (const [present, absent, versions] of [
  ['claude', 'opencode', { claude: hostVersions.claude, opencode: builtBefore.opencode }],
  ['opencode', 'claude', { claude: builtBefore.claude, opencode: hostVersions.opencode }],
]) {
  test(`the wrapper takes the host's version of ${present} and the image's of ${absent}, which is absent`, (t) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
    rmSync(join(bin, absent));
    writeFileSync(imageLabels, `${versions.claude}|${versions.opencode}\n`);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
    assert.deepEqual(npmCalls(), []);
  });
}

test('the wrapper passes a pre-release version of the host on', (t) => {
  const { root, container, bin, run, dockerCalls } = setUp(t, kitPath);
  writeCommand(bin, 'opencode', 'echo 0.0.0-dev-202610030456');
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
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
  test(`the wrapper counts a harness on the host that ${what} as not installed, and says so`, (t) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
    writeCommand(bin, 'claude', script);
    writeFileSync(imageLabels, `${builtBefore.claude}|${hostVersions.opencode}\n`);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, noVersionLine('claude', 'Claude Code'));
    const versions = { claude: builtBefore.claude, opencode: hostVersions.opencode };
    assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
    assert.deepEqual(npmCalls(), []);
  });
}

test("the wrapper names OpenCode's command when that is the one that prints no version", (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  writeCommand(bin, 'opencode', 'exit 3');
  writeFileSync(imageLabels, `${hostVersions.claude}|${builtBefore.opencode}\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, noVersionLine('opencode', 'OpenCode'));
  const versions = { claude: hostVersions.claude, opencode: builtBefore.opencode };
  assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper builds with the latest published version of a harness on the host that prints no version', (t) => {
  const { root, container, bin, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  writeCommand(bin, 'claude', 'exit 1');
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    noVersionLine('claude', 'Claude Code') + latestLine('Claude Code', latestVersions.claude),
  );
  const versions = { claude: latestVersions.claude, opencode: hostVersions.opencode };
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
  assert.deepEqual(npmCalls(), [askedOf('@anthropic-ai/claude-code')]);
});

test("the wrapper gives the host's command no input", (t) => {
  const { root, container, home, bin, dockerCalls } = setUp(t, kitPath);
  writeCommand(bin, 'claude', `cat; echo ${hostVersions.claude}`);
  const result = spawnSync(join(container, 'sandbox.sh'), [root, '--in-place', 'echo', 'hi'], {
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
  const result = spawnSync(join(container, 'sandbox.sh'), [root, '--in-place', 'echo', 'hi'], {
    encoding: 'utf-8',
    env: { HOME: home, PATH: bin, SANDBOX_CLAUDE_CODE_VERSION: '0.0.1', SANDBOX_OPENCODE_VERSION: '0.0.2' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

test("the wrapper does not use a version the caller's environment holds for a harness with no other source", (t) => {
  const { root, container, home, bin, imageLabels, dockerCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = spawnSync(join(container, 'sandbox.sh'), [root, '--in-place', 'echo', 'hi'], {
    encoding: 'utf-8',
    env: { HOME: home, PATH: bin, SANDBOX_CLAUDE_CODE_VERSION: '0.0.1', SANDBOX_OPENCODE_VERSION: '0.0.2' },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, builtBefore));
});

test('the wrapper builds nothing when the image holds the wanted versions', (t) => {
  const { root, container, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper says which harness differs from the image, and builds before it runs', (t) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, `${builtBefore.claude}|${hostVersions.opencode}\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, holdsLine('Claude Code', builtBefore.claude, hostVersions.claude, 'the host'));
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test('the wrapper says so for each harness when both differ from the image', (t) => {
  const { root, container, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('Claude Code', builtBefore.claude, hostVersions.claude, 'the host') +
      holdsLine('OpenCode', builtBefore.opencode, hostVersions.opencode, 'the host'),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper rebuilds an image that records no versions, which one built before the labels is', (t) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, '|\n');
  const result = run(root, '--in-place', 'echo', 'hi');
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
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, { claude: hostVersions.claude, opencode: '1.18.20' }));
});

test("the wrapper rebuilds for the project's version, whatever the host has, and names the project's file", (t) => {
  const { root, container, run, dockerCalls, npmCalls } = setUp(t, kitPath, { OPENCODE_VERSION: '1.18.20' });
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('OpenCode', hostVersions.opencode, '1.18.20', "the project's compose file"),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, { claude: hostVersions.claude, opencode: '1.18.20' }));
  assert.deepEqual(npmCalls(), []);
});

// A project may hold the very version the host has. The value is the same and the source is not: the project's
// file stands first.
for (const [harness, argument, held, labels] of [
  ['Claude Code', 'CLAUDE_CODE_VERSION', hostVersions.claude, `${builtBefore.claude}|${hostVersions.opencode}\n`],
  ['OpenCode', 'OPENCODE_VERSION', hostVersions.opencode, `${hostVersions.claude}|${builtBefore.opencode}\n`],
]) {
  test(`the wrapper names the project's file for a version of ${harness} it gives that equals the host's`, (t) => {
    const { root, container, imageLabels, run, dockerCalls } = setUp(t, kitPath, { [argument]: held });
    writeFileSync(imageLabels, labels);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const inImage = harness === 'Claude Code' ? builtBefore.claude : builtBefore.opencode;
    assert.equal(result.stderr, holdsLine(harness, inImage, held, "the project's compose file"));
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  });
}

test("the wrapper asks npm nothing on --rebuild when the project gives both versions and the host has neither", (t) => {
  const buildArgs = { CLAUDE_CODE_VERSION: '2.1.200', OPENCODE_VERSION: '1.18.20' };
  const { root, container, bin, run, dockerCalls, npmCalls } = setUp(t, kitPath, buildArgs);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, { claude: '2.1.200', opencode: '1.18.20' }));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper builds a missing image with the latest published versions when the host has neither harness', (t) => {
  const { root, container, bin, run, dockerCalls, npmCalls } = setUp(t, kitPath, undefined, false);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    latestLine('Claude Code', latestVersions.claude) + latestLine('OpenCode', latestVersions.opencode),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, latestVersions));
  assert.deepEqual(npmCalls(), askedOfBoth);
});

test('the wrapper builds with the latest on --rebuild with neither harness, whatever the image records', (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    latestLine('Claude Code', latestVersions.claude) + latestLine('OpenCode', latestVersions.opencode),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, latestVersions));
  assert.deepEqual(npmCalls(), askedOfBoth);
});

test('the wrapper takes the latest of an absent harness when the other differs from the image', (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'opencode'));
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    holdsLine('Claude Code', builtBefore.claude, hostVersions.claude, 'the host') +
      latestLine('OpenCode', latestVersions.opencode),
  );
  const versions = { claude: hostVersions.claude, opencode: latestVersions.opencode };
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
  assert.deepEqual(npmCalls(), [askedOf('opencode-ai')]);
});

for (const [what, label] of [
  ['no version', ''],
  ['a tag', 'latest'],
  ['two numbers', '1.2'],
]) {
  test(`the wrapper builds when the image records ${what} of a harness that has no other source`, (t) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(t, kitPath);
    rmSync(join(bin, 'claude'));
    writeFileSync(imageLabels, `${label}|${hostVersions.opencode}\n`);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, latestLine('Claude Code', latestVersions.claude));
    const versions = { claude: latestVersions.claude, opencode: hostVersions.opencode };
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
    assert.deepEqual(npmCalls(), [askedOf('@anthropic-ai/claude-code')]);
  });
}

// The latest that cannot be found. The wrapper stops before the build, also when an image exists that it could
// have run.
const claudeNotFound = notFoundLines('Claude Code', '@anthropic-ai/claude-code', 'CLAUDE_CODE_VERSION');
for (const [what, arrange] of [
  ['npm fails', ({ npmFails }) => writeFileSync(npmFails, '')],
  ['npm prints nothing', ({ npmPrints }) => writeFileSync(npmPrints, '')],
  ['npm prints a tag', ({ npmPrints }) => writeFileSync(npmPrints, 'latest\n')],
  ['npm prints a version with a command after it', ({ npmPrints }) => writeFileSync(npmPrints, '1.2.3;id\n')],
  ['npm is not on the PATH', ({ bin }) => rmSync(join(bin, 'npm'))],
]) {
  test(`the wrapper stops, and builds and runs nothing, when the latest is needed and ${what}`, (t) => {
    const host = setUp(t, kitPath);
    rmSync(join(host.bin, 'claude'));
    rmSync(join(host.bin, 'opencode'));
    arrange(host);
    const result = host.run(host.root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 2);
    assert.equal(result.stderr, claudeNotFound);
    assert.deepEqual(host.dockerCalls(), []);
  });
}

test('the wrapper says nothing of the latest of one harness when that of the other cannot be found', (t) => {
  const { root, bin, run, dockerCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  writeCommand(
    bin,
    'npm',
    `if [ "$2" = opencode-ai ]; then exit 1; fi
echo '${latestVersions.claude}'`,
  );
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 2);
  assert.equal(result.stderr, notFoundLines('OpenCode', 'opencode-ai', 'OPENCODE_VERSION'));
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper asks npm nothing, and so needs none, when no build is due', (t) => {
  const { root, container, bin, imageLabels, run, dockerCalls } = setUp(t, kitPath);
  rmSync(join(bin, 'claude'));
  rmSync(join(bin, 'opencode'));
  rmSync(join(bin, 'npm'));
  writeFileSync(imageLabels, `${builtBefore.claude}|${builtBefore.opencode}\n`);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, builtBefore));
});

test('the wrapper builds on --rebuild although the image holds the wanted versions, and says nothing', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test("the wrapper stops with the build's own error when the build fails, and runs and makes nothing", (t) => {
  const { root, container, imageLabels, buildFails, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(imageLabels, `${builtBefore.claude}|${hostVersions.opencode}\n`);
  writeFileSync(buildFails, '');
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 17);
  assert.match(result.stderr, /failed to solve: no network/);
  assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, 'build'));
  assert.equal(existsSync(homeLogs(root)), false);
});

test('the wrapper runs with no Dockerfile beside it to read a version from', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  assert.deepEqual(readdirSync(container), ['sandbox.sh']);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

// The developer's Claude Code status line. The wrapper mounts the host's script and the kit's managed settings
// file that runs it, both or neither: Docker would create a root-owned directory at a script that is not there,
// and the settings without a script would blank a status line set inside the sandbox.
const statusLinePath = (home) => join(home, '.claude', 'statusline-command.sh');

function expectedRun(root, container, mounts = '') {
  return composeCalls(root, container, hostVersions, runCommand(root, root, mounts));
}

test("the wrapper mounts the host's status line script and the settings that run it, read-only", (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  mkdirSync(join(home, '.claude'));
  writeFileSync(statusLinePath(home), 'echo line\n');
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const mounts =
    `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
    `--volume ${container}/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
  assert.deepEqual(dockerCalls(), expectedRun(root, container, mounts));
});

test('the wrapper mounts neither without a status line script on the host, and creates nothing there', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), expectedRun(root, container));
  assert.equal(existsSync(join(home, '.claude')), false);
});

test('the wrapper mounts neither when a directory is where the status line script would be', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  mkdirSync(statusLinePath(home), { recursive: true });
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), expectedRun(root, container));
  assert.deepEqual(readdirSync(statusLinePath(home)), []);
});

// What is mounted at /work. The wrapper has no default: a run names a unit, whose branch it clones, or says
// --in-place or --workdir. The unit run is in tests/sandbox-unit-run.test.mjs.
for (const [what, args] of [
  ['the project root alone', () => []],
  ['--rebuild alone', () => ['--rebuild']],
  ['--mount alone', (base) => ['--mount', base]],
]) {
  test(`the wrapper refuses ${what}, names the forms, and asks Docker and npm nothing`, (t) => {
    const { base, root, bin, run, dockerCalls, npmCalls } = setUp(t, kitPath, {}, false);
    rmSync(join(bin, 'claude'));
    const result = run(root, ...args(base));
    assert.equal(result.status, 2);
    assert.match(result.stderr, /sandbox\.sh UNIT /);
    assert.match(result.stderr, /sandbox\.sh --in-place /);
    assert.match(result.stderr, /sandbox\.sh --workdir DIR /);
    assert.match(result.stderr, /sandbox\.sh --connect UNIT /);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

for (const option of ['--workdir', '--mount']) {
  test(`the wrapper starts nothing for a run whose ${option} names a directory that is not there`, (t) => {
    const { base, root, bin, run, dockerCalls, npmCalls } = setUp(t, kitPath, {}, false);
    rmSync(join(bin, 'claude'));
    const result = run(root, '--in-place', option, join(base, 'not-there'), 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not-there: No such file or directory/);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

test('the wrapper mounts the project root with --in-place, and makes no clone', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, kitPath);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
  assert.equal(existsSync(join(home, '.local', 'state')), false);
});

test('the wrapper mounts the directory of --workdir, and makes no clone', (t) => {
  const { base, root, container, home, run, dockerCalls } = setUp(t, kitPath);
  const workdir = join(base, 'elsewhere');
  mkdirSync(workdir);
  const result = run(root, '--workdir', workdir, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    dockerCalls(),
    composeCalls(root, container, hostVersions, runCommand(root, workdir)),
  );
  assert.equal(existsSync(join(home, '.local', 'state')), false);
});

// The harnesses' logs. The wrapper mounts two directories of the host over the two in the agent's home that hold
// them, from one log directory for each project root, and makes them itself, because Docker would make them as
// root. The stand-in mounts nothing, so that what a harness writes there is the developer's is left to the check on
// a host with Docker.
const everythingIn = (directory) => readdirSync(directory, { recursive: true }).sort();
const logDirectoryHolds = ['.claude', '.claude/projects', '.local', '.local/share', '.local/share/opencode'];

for (const [form, formArgs] of [
  ['--in-place', () => ['--in-place']],
  ['--workdir', (workdir) => ['--workdir', workdir]],
]) {
  test(`the wrapper mounts the log directories of the home with ${form}, and makes them before Docker runs`, (t) => {
    const { base, root, container, agentScript, run, dockerCalls } = setUp(t, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    const logs = homeLogs(root);
    assert.equal(logs, join(base, 'home', '.local', 'share', 'agentrite', 'project'));
    const seen = join(base, 'seen');
    const both = logDirectories.map((directory) => `[ -d "${logs}/${directory}" ]`).join(' && ');
    writeFileSync(agentScript, `${both} && echo both > "${seen}"\n`);

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    const mounted = form === '--workdir' ? workdir : root;
    assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, runCommand(root, mounted)));
    assert.equal(readFileSync(seen, 'utf-8'), 'both\n');
    assert.deepEqual(everythingIn(logs), logDirectoryHolds);
    for (const directory of logDirectories) assert.equal(statSync(join(logs, directory)).uid, process.getuid());
  });

  test(`the wrapper mounts the log directories under XDG_DATA_HOME with ${form}, when that is set`, (t) => {
    const { base, root, container, home, runWith, dockerCalls } = setUp(t, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    const data = join(base, 'data');
    const logs = join(data, 'agentrite', 'project');

    const result = runWith({ env: { XDG_DATA_HOME: data } }, root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    const mounted = form === '--workdir' ? workdir : root;
    assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, runCommand(root, mounted, '', logs)));
    assert.deepEqual(everythingIn(logs), logDirectoryHolds);
    assert.equal(existsSync(join(home, '.local')), false);
  });
}

test('the wrapper names the log directory after the project root, not after the directory of --workdir', (t) => {
  const { base, root, home, run, dockerCalls } = setUp(t, kitPath);
  const workdir = join(base, 'another-name');
  mkdirSync(workdir);
  const result = run(root, '--workdir', workdir, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const [call] = dockerCalls();
  assert.ok(call.includes(logMounts(join(home, '.local', 'share', 'agentrite', 'project'))), call);
  assert.deepEqual(readdirSync(join(home, '.local', 'share', 'agentrite')), ['project']);
});

// Docker reads a source that is not an absolute path as the name of a volume.
test('the wrapper mounts a relative XDG_DATA_HOME as the absolute path it names from its working directory', (t) => {
  const { base, root, container, runWith, dockerCalls } = setUp(t, kitPath);
  const result = runWith({ env: { XDG_DATA_HOME: 'data' }, cwd: base }, root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const logs = join(base, 'data', 'agentrite', 'project');
  assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, runCommand(root, root, '', logs)));
  assert.deepEqual(everythingIn(logs), logDirectoryHolds);
});

// The host's terminal. The wrapper passes its TERM and its COLORTERM to the command, each when it is set and not
// empty, so that a program in the sandbox is told what the developer's terminal can show. Without them the command
// keeps what Docker gives it, which every test above shows.
for (const [form, formArgs] of [
  ['--in-place', () => ['--in-place']],
  ['--workdir', (workdir) => ['--workdir', workdir]],
]) {
  test(`the wrapper passes the host's TERM and COLORTERM to the command with ${form}`, (t) => {
    const { base, root, container, runWith, dockerCalls } = setUp(t, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    const env = { TERM: 'xterm-256color', COLORTERM: 'truecolor' };
    const result = runWith({ env }, root, ...formArgs(workdir), 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const mounted = form === '--workdir' ? workdir : root;
    const terminal = '--env TERM=xterm-256color --env COLORTERM=truecolor ';
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, runCommand(root, mounted, '', homeLogs(root), terminal)),
    );
  });
}

for (const [host, env, terminal] of [
  ['with no COLORTERM', { TERM: 'xterm-256color' }, '--env TERM=xterm-256color '],
  ['with an empty COLORTERM', { TERM: 'xterm-256color', COLORTERM: '' }, '--env TERM=xterm-256color '],
  ['with no TERM', { COLORTERM: 'truecolor' }, '--env COLORTERM=truecolor '],
  ['with an empty TERM', { TERM: '', COLORTERM: 'truecolor' }, '--env COLORTERM=truecolor '],
]) {
  test(`the wrapper passes only what the host has of the two, on a host ${host}`, (t) => {
    const { root, container, runWith, dockerCalls } = setUp(t, kitPath);
    const result = runWith({ env }, root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, runCommand(root, root, '', homeLogs(root), terminal)),
    );
  });
}

// Unit 0058: the bell. A start reads bell from the project's agentrite.json, judging no other key, and with true
// mounts the kit's container/bell/ and its hooks of Claude Code, and names its plugin to OpenCode.
const bellMounts = (container) =>
  `--volume ${container}/bell:/etc/agentrite/bell:ro ` +
  `--volume ${container}/bell/claude-managed-settings.json:/etc/claude-code/managed-settings.d/agentrite-bell.json:ro `;
const bellEnvironment =
  '--env OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]} ';

const startForms = [
  ['--in-place', () => ['--in-place']],
  ['--workdir', (workdir) => ['--workdir', workdir]],
];

// The `run` of a start of `form` in the project at `root`, with `mounts` and `environment`.
function startRun(root, container, form, workdir, mounts, environment) {
  const mounted = form === '--in-place' ? root : workdir;
  return composeCalls(root, container, hostVersions, runCommand(root, mounted, mounts, homeLogs(root), environment));
}

for (const [form, formArgs] of startForms) {
  test(`a start with ${form} and "bell": true mounts the bell and names the plugin, with none of the host's`, (t) => {
    const { base, root, container, home, run, dockerCalls } = setUp(t, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeFileSync(join(root, 'agentrite.json'), '{"bell": true}\n');

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(
      dockerCalls(),
      startRun(root, container, form, workdir, bellMounts(container), bellEnvironment),
    );
    assert.equal(existsSync(join(home, '.claude')), false);
  });

  test(`a start with ${form} and "bell": true mounts the bell after the status line`, (t) => {
    const { base, root, container, home, run, dockerCalls } = setUp(t, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeFileSync(join(root, 'agentrite.json'), '{"bell": true}\n');
    mkdirSync(join(home, '.claude'));
    writeFileSync(statusLinePath(home), 'echo line\n');

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    const statusLine =
      `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
      `--volume ${container}/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
    assert.deepEqual(
      dockerCalls(),
      startRun(root, container, form, workdir, statusLine + bellMounts(container), bellEnvironment),
    );
  });

  test(`a start with ${form} and "bell": false is the run of a project that rings nothing`, (t) => {
    const { base, root, container, run, dockerCalls } = setUp(t, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeFileSync(join(root, 'agentrite.json'), '{"bell": false}\n');

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), startRun(root, container, form, workdir, '', ''));
  });

  test(`a start with ${form} and a bell at fault is refused with the reader's message, asking nothing`, (t) => {
    const BELL_MUST = 'It must hold true or false';
    for (const [text, message] of [
      ['{}', `agentrite.json: bell is missing. ${BELL_MUST}`],
      ['{"bell": null}', `agentrite.json: bell is null. ${BELL_MUST}`],
      ['{"bell": 0}', `agentrite.json: bell is 0. ${BELL_MUST}`],
      ['{"bell": "true"}', `agentrite.json: bell is "true". ${BELL_MUST}`],
      ['{"bell": []}', `agentrite.json: bell is []. ${BELL_MUST}`],
      ['{"bell": {}}', `agentrite.json: bell is {}. ${BELL_MUST}`],
      ['[]', `agentrite.json holds [], which is no JSON object, so bell is missing. ${BELL_MUST}`],
      ['not json', /^agentrite\.json is not JSON: .*, so bell cannot be read\. It must hold true or false$/],
      [
        null,
        'the project has no agentrite.json, so bell is missing. It must hold true or false. ' +
          'Run: npx agentrite config, which writes one',
      ],
    ]) {
      const { base, root, run, dockerCalls, npmCalls } = setUp(t, kitPath);
      const workdir = join(base, 'elsewhere');
      mkdirSync(workdir);
      if (text === null) rmSync(join(root, 'agentrite.json'));
      else writeFileSync(join(root, 'agentrite.json'), text);

      const result = run(root, ...formArgs(workdir), 'echo', 'hi');

      assert.equal(result.status, 2, String(text));
      assert.equal(result.stdout, '', String(text));
      const printed = result.stderr.replace(/^agentrite: /, '').trimEnd();
      assert.ok(result.stderr.startsWith('agentrite: '), result.stderr);
      if (typeof message === 'string') assert.equal(printed, message, String(text));
      else assert.match(printed, message, String(text));
      assert.deepEqual(dockerCalls(), [], String(text));
      assert.deepEqual(npmCalls(), [], String(text));
    }
  });
}

test('a start reads bell again at each start, with no build in between', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, kitPath);
  writeFileSync(join(root, 'agentrite.json'), '{"bell": false}\n');
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  writeFileSync(join(root, 'agentrite.json'), '{"bell": true}\n');

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    ...startRun(root, container, '--in-place', root, '', ''),
    ...startRun(root, container, '--in-place', root, bellMounts(container), bellEnvironment),
  ]);
});
