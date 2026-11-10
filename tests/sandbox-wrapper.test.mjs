import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  chmodSync,
  copyFileSync,
  cpSync,
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
import { fileURLToPath } from 'node:url';
import {
  assertFormsListed,
  bellEnvironment,
  bellMounts,
  fakeHost,
  harnessPackages,
  harnessRecord,
  hostVersions,
  imageLabelsText,
  installKitPackage,
  kitAllowlist,
  kitVersion,
  latestVersions,
  logDirectories,
  logDirectoriesOf,
  logDirectory,
  logMounts,
  updateEnvironment,
  updateMounts,
  versionPrinted,
  writeCommand,
  writeStartSettings,
} from './wrapper-fixture.mjs';
import { parseCleanupPeriod } from '../scripts/agentrite-cleanup-period.mjs';
import { parseJsonc } from '../scripts/agentrite-json.mjs';
import { HARNESS_NAMES, HARNESSES } from '../scripts/agentrite-harness.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const wrapper = fileURLToPath(new URL('../container/sandbox.sh', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const kitPath = 'project/node_modules/agentrite/container';

// What an image built earlier holds, where a test needs it to differ from what the fake host has and from what
// the fake `npm` gives as the latest: a version of each harness of the list that no release has.
const builtBefore = Object.fromEntries(HARNESSES.map(({ name }, index) => [name, `0.${index + 1}.0`]));

// The harnesses of the list other than `harness`, which a test that varies one harness keeps as they are.
const othersOf = (harness) => HARNESSES.filter((other) => other !== harness);

// `versions` with the version of the harness named `name` replaced by `version`.
const withVersion = (versions, name, version) => ({ ...versions, [name]: version });

// The calls the fake `docker` recorded for a wrapper that handed Compose the harnesses of `versions`, a map of each
// harness of the project to its version, and the installed kit's version: each of `commands` after what every call
// opens with.
function composeCalls(root, container, versions, ...commands) {
  const names = HARNESS_NAMES.filter((name) => versions[name] !== undefined);
  const opening =
    'AGENTRITE_CONTAINER=node_modules/agentrite/container ' +
    `SANDBOX_HARNESS_PACKAGES=${harnessPackages(versions)} SANDBOX_HARNESS_RECORD=${harnessRecord(versions)} ` +
    `SANDBOX_HARNESS_DIRECTORIES=${logDirectoriesOf(names).join(' ')} ` +
    `SANDBOX_AGENTRITE_VERSION=${kitVersion} docker compose ` +
    `--project-directory ${root} -f ${container}/compose.yml -f ${root}/sandbox/compose.project.yml`;
  return commands.map((command) => `${opening} ${command}`);
}

// The flags of the log directory of the project at `root`, where `setUp` puts it: in the data directory of the home
// that lies beside the project.
const homeLogs = (root) => logDirectory(join(dirname(root), 'home', '.local', 'share'), root);

// The kit's container/ of the project at `root`, where `setUp` installs it.
const containerOf = (root) => join(root, 'node_modules', 'agentrite', 'container');

// The `run` of a wrapper given `echo hi` for the project at `root` and its harnesses `names`: the flags of the host's
// terminal in `terminal`, then the environment that turns off the harnesses' updates, then `environment`, then
// `mounted` at /work, then the files that turn off the updates, then `mounts`, and last the directories of `logs`.
const runCommand = (
  root,
  mounted = root,
  mounts = '',
  logs = homeLogs(root),
  terminal = '',
  environment = '',
  names = HARNESS_NAMES,
) =>
  `run --rm ${terminal}${updateEnvironment(names)}${environment}--volume ${mounted}:/work ` +
  `${updateMounts(containerOf(root), names)}${mounts}${logMounts(logs, names)}sandbox echo hi`;

// A project with the kit's wrapper installed at `kitPath` under `root`, the kit's readers of agentrite.json and of the
// harnesses beside it and nothing else of the kit, an agentrite.json that holds `"bell": false`, `"modelServer":
// false` and every harness of the list alone, and the host of `fakeHost`, whose `docker` records each call with the
// AGENTRITE_CONTAINER and the variables of the harnesses and the kit's version it saw. The project's
// Compose file gives the build arguments `buildArgs`, where `null` stands for a configuration Compose refuses, and
// the image exists unless `imageExists` is false. The wrapper runs with a home of its own, `home`, which is empty
// until a test fills it, so that no test depends on what the home of whoever runs the suite holds. `run` runs the
// wrapper with that home alone, and `runWith` with the variables of `env` besides and in the working directory
// `cwd`.
function setUp(
  testContext,
  kitPath = 'node_modules/agentrite/container',
  buildArgs = { PLAYWRIGHT_VERSION: '1.59.1' },
  imageExists = true,
) {
  const base = temporaryDirectory(testContext, 'sandbox-wrapper-');
  const root = join(base, 'project');
  mkdirSync(join(root, 'sandbox'), { recursive: true });
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), '');
  const container = join(base, kitPath);
  mkdirSync(container, { recursive: true });
  copyFileSync(wrapper, join(container, 'sandbox.sh'));
  // The wrapper reads the kit's KIT_ALLOWLIST from the base Compose file beside it.
  copyFileSync(join(dirname(wrapper), 'compose.yml'), join(container, 'compose.yml'));
  chmodSync(join(container, 'sandbox.sh'), 0o755);
  installKitPackage(join(container, '..'));
  // The wrapper reads the start's settings and the harnesses with the kit's helper, in the kit's scripts/ beside its
  // container/, and mounts files of the kit's container/harnesses/ and container/bell/.
  mkdirSync(join(container, '..', 'scripts'));
  for (const file of [
    'agentrite-settings.mjs',
    'agentrite-cleanup-period.mjs',
    'agentrite-opencode-providers.mjs',
    'agentrite-sandbox.mjs',
    'agentrite-roles.mjs',
    'agentrite-harness.mjs',
    'agentrite-headless.mjs',
    'agentrite-instructions.mjs',
    'agentrite-json.mjs',
  ]) {
    copyFileSync(join(kitScripts, file), join(container, '..', 'scripts', file));
  }
  cpSync(join(kitScripts, 'harnesses'), join(container, '..', 'scripts', 'harnesses'), { recursive: true });
  // OpenCode's host member reads the kit's configuration of OpenCode, to give it the host's local providers.
  mkdirSync(join(container, 'harnesses', 'opencode'), { recursive: true });
  copyFileSync(
    join(dirname(wrapper), 'harnesses', 'opencode', 'opencode.json'),
    join(container, 'harnesses', 'opencode', 'opencode.json'),
  );
  writeStartSettings(root);
  const home = join(base, 'home');
  mkdirSync(home);
  const host = fakeHost(base, [
    'AGENTRITE_CONTAINER',
    'SANDBOX_HARNESS_PACKAGES',
    'SANDBOX_HARNESS_RECORD',
    'SANDBOX_HARNESS_DIRECTORIES',
    'SANDBOX_AGENTRITE_VERSION',
  ]);
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

test('the wrapper refuses to run without a project root, naming the shim', (testContext) => {
  const { run, dockerCalls } = setUp(testContext, kitPath);
  const result = run();
  assert.equal(result.status, 1);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.match(result.stderr, /sandbox\.sh shim/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a project root that is not a directory', (testContext) => {
  const { base, run, dockerCalls } = setUp(testContext, kitPath);
  const result = run(join(base, 'no-such-directory'), '--rebuild');
  assert.equal(result.status, 1);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a kit outside the project root, which the build cannot reach', (testContext) => {
  const { root, run, dockerCalls } = setUp(testContext, 'elsewhere/container');
  const result = run(root);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /is not inside the project root/);
  assert.match(result.stderr, /image build cannot reach it/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper runs Compose from the project root with the kit located relative to it', (testContext) => {
  const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
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
  test(`the wrapper goes on to build and run with ${what}`, (testContext) => {
    const { root, container, run, dockerCalls } = setUp(testContext, kitPath, buildArgs);
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, 'build', runCommand(root)),
    );
  });

  test(`the wrapper builds the missing image without --rebuild with ${what}`, (testContext) => {
    const { root, container, run, dockerCalls } = setUp(testContext, kitPath, buildArgs, false);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, 'build', runCommand(root)),
    );
  });
}

test("the wrapper stops with Compose's own error when Compose refuses the configuration", (testContext) => {
  const { root, run, dockerCalls } = setUp(testContext, kitPath, null);
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
  test(`the wrapper refuses a project whose service is still agent, given ${options.join(' ')}`, (testContext) => {
    const { root, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {}, false);
    writeFileSync(join(root, 'sandbox', 'compose.project.yml'), oldServiceFile);
    const result = run(root, ...options, 'true');
    assert.equal(result.status, 1);
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
// which the wrapper asks `npm` for, when the image is built. The wrapper hands Compose the versions the image is
// built with in variables of its own, and learns of the project's from the merged configuration. Every case that
// varies one harness is made for each harness of the list.
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
const notFoundLines = ({ title, sandbox }) =>
  `sandbox.sh: could not find the latest published version of ${title}: 'npm view ${sandbox.package} version' gave ` +
  'none.\n' +
  `Give a version in sandbox/compose.project.yml, under services.sandbox.build.args as ${sandbox.versionArgument}, ` +
  `or install ${title} on the host.\n`;
const askedOf = (npmPackage) => `npm view ${npmPackage} version --fetch-retries=0`;
const askedOfAll = HARNESSES.map(({ sandbox }) => askedOf(sandbox.package));

// Removes the command of every harness of the list from the fake host.
const removeAllHarnesses = (bin) => {
  for (const { start } of HARNESSES) rmSync(join(bin, start.command));
};

test("the wrapper hands Compose the host's versions, in every call, and asks npm nothing", (testContext) => {
  const { root, container, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  assert.deepEqual(npmCalls(), []);
});

test(
  'the wrapper keeps the versions the image records with no harness on the PATH, and says nothing',
  (testContext) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    removeAllHarnesses(bin);
    writeFileSync(imageLabels, imageLabelsText(builtBefore));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, builtBefore));
    assert.deepEqual(npmCalls(), []);
  },
);

for (const harness of HARNESSES) {
  const { name, title, start, sandbox } = harness;

  test(`the wrapper keeps a pre-release version the image records of ${name}, which is not on the PATH`, (context) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(context, kitPath);
    rmSync(join(bin, start.command));
    const versions = withVersion(hostVersions, name, '0.0.0-dev-202610030456');
    writeFileSync(imageLabels, imageLabelsText(versions));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
    assert.deepEqual(npmCalls(), []);
  });

  test(`the wrapper takes the host's version of the others and the image's of ${name}, which is absent`, (context) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(context, kitPath);
    rmSync(join(bin, start.command));
    const versions = withVersion(hostVersions, name, builtBefore[name]);
    writeFileSync(imageLabels, imageLabelsText(versions));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
    assert.deepEqual(npmCalls(), []);
  });

  test(`the wrapper passes a pre-release version of ${name} on the host on`, (testContext) => {
    const { root, container, bin, run, dockerCalls } = setUp(testContext, kitPath);
    writeCommand(bin, start.command, `echo ${versionPrinted(harness, '0.0.0-dev-202610030456')}`);
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const versions = withVersion(hostVersions, name, '0.0.0-dev-202610030456');
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
    test(`the wrapper counts ${name} on the host as not installed when it ${what}, and says so`, (testContext) => {
      const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
      writeCommand(bin, start.command, script);
      const versions = withVersion(hostVersions, name, builtBefore[name]);
      writeFileSync(imageLabels, imageLabelsText(versions));
      const result = run(root, '--in-place', 'echo', 'hi');
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, noVersionLine(start.command, title));
      assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
      assert.deepEqual(npmCalls(), []);
    });
  }

  test(`the wrapper builds with the latest published ${name} when the host's prints no version`, (testContext) => {
    const { root, container, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    writeCommand(bin, start.command, 'exit 1');
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, noVersionLine(start.command, title) + latestLine(title, latestVersions[name]));
    const versions = withVersion(hostVersions, name, latestVersions[name]);
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
    assert.deepEqual(npmCalls(), [askedOf(sandbox.package)]);
  });

  test(`the wrapper gives the host's ${name} no input`, (testContext) => {
    const { root, container, home, bin, dockerCalls } = setUp(testContext, kitPath);
    writeCommand(bin, start.command, `cat; echo ${versionPrinted(harness, hostVersions[name])}`);
    const result = spawnSync(join(container, 'sandbox.sh'), [root, '--in-place', 'echo', 'hi'], {
      encoding: 'utf-8',
      env: { HOME: home, PATH: bin },
      input: '7.7.7\n',
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
  });

  test(`the wrapper says that ${name} differs from the image, and builds before it runs`, (testContext) => {
    const { root, container, imageLabels, run, dockerCalls } = setUp(testContext, kitPath);
    writeFileSync(imageLabels, imageLabelsText(withVersion(hostVersions, name, builtBefore[name])));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, holdsLine(title, builtBefore[name], hostVersions[name], 'the host'));
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  });

  test(`the wrapper builds nothing when the image holds the project's ${name} and the host's others`, (context) => {
    const { root, container, imageLabels, run, dockerCalls } = setUp(context, kitPath, {
      [sandbox.versionArgument]: '1.18.20',
    });
    const versions = withVersion(hostVersions, name, '1.18.20');
    writeFileSync(imageLabels, imageLabelsText(versions));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, versions));
  });

  test(`the wrapper rebuilds for the project's version of ${name}, whatever the host has`, (testContext) => {
    const { root, container, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {
      [sandbox.versionArgument]: '1.18.20',
    });
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, holdsLine(title, hostVersions[name], '1.18.20', "the project's compose file"));
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, withVersion(hostVersions, name, '1.18.20')));
    assert.deepEqual(npmCalls(), []);
  });

  // A project may hold the very version the host has. The value is the same and the source is not: the project's
  // file stands first.
  test(`the wrapper names the project's file for a version of ${name} it gives that equals the host's`, (context) => {
    const { root, container, imageLabels, run, dockerCalls } = setUp(context, kitPath, {
      [sandbox.versionArgument]: hostVersions[name],
    });
    writeFileSync(imageLabels, imageLabelsText(withVersion(hostVersions, name, builtBefore[name])));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, holdsLine(title, builtBefore[name], hostVersions[name], "the project's compose file"));
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  });

  // 0097 R6: a version of the project's file is installed as root, so one of another shape is refused first.
  for (const value of ['latest', '1.2', '1.2.3; id', '', '1.2.3\nid']) {
    test(`the wrapper refuses ${JSON.stringify(value)} as the project's version of ${name}`, (testContext) => {
      const { root, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, { [sandbox.versionArgument]: value });
      const result = run(root, '--in-place', 'echo', 'hi');
      assert.equal(result.status, 1);
      const shown = /\n/.test(value) ? JSON.stringify(value) : value;
      assert.equal(
        result.stderr,
        `sandbox.sh: sandbox/compose.project.yml gives ${sandbox.versionArgument} as '${shown}', which is not a ` +
          'version.\nGive an exact version, as 1.2.3.\n',
      );
      assert.deepEqual(dockerCalls(), []);
      assert.deepEqual(npmCalls(), []);
      assert.equal(existsSync(homeLogs(root)), false);
    });
  }

  test(`the wrapper takes the latest of an absent ${name} when another differs from the image`, (testContext) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    rmSync(join(bin, start.command));
    writeFileSync(imageLabels, imageLabelsText(builtBefore));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const lines = HARNESSES.map((each) =>
      each === harness ? '' : holdsLine(each.title, builtBefore[each.name], hostVersions[each.name], 'the host'),
    ).join('');
    assert.equal(result.stderr, lines + latestLine(title, latestVersions[name]));
    const versions = withVersion(hostVersions, name, latestVersions[name]);
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
    assert.deepEqual(npmCalls(), [askedOf(sandbox.package)]);
  });

  for (const [what, label] of [
    ['no version', ''],
    ['a tag', 'latest'],
    ['two numbers', '1.2'],
  ]) {
    test(`the wrapper builds when the image records ${what} of ${name}, which has no other source`, (context) => {
      const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(context, kitPath);
      rmSync(join(bin, start.command));
      const record = harnessRecord(hostVersions).replace(`${name}@${hostVersions[name]}`, label && `${name}@${label}`);
      writeFileSync(imageLabels, `${record}|${kitVersion}\n`);
      const result = run(root, '--in-place', 'echo', 'hi');
      assert.equal(result.status, 0, result.stderr);
      // A harness the record does not hold is named among the image's harnesses, unless the record holds none.
      const held = HARNESSES.filter((each) => each !== harness).map((each) => each.name);
      const holds =
        held.length > 0
          ? `sandbox.sh: the image holds the harnesses ${held.join(', ').replace(/, ([^,]*)$/, ' and $1')}, ` +
            'and agentrite.json names ' +
            `${HARNESS_NAMES.join(', ').replace(/, ([^,]*)$/, ' and $1')}. Rebuilding.\n`
          : '';
      assert.equal(result.stderr, holds + latestLine(title, latestVersions[name]));
      const versions = withVersion(hostVersions, name, latestVersions[name]);
      assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
      assert.deepEqual(npmCalls(), [askedOf(sandbox.package)]);
    });
  }

  // The latest that cannot be found. The wrapper stops before the build, also when an image exists that it could
  // have run.
  test(`the wrapper says nothing of the latest of the others when that of ${name} cannot be found`, (context) => {
    const { root, bin, run, dockerCalls } = setUp(context, kitPath);
    removeAllHarnesses(bin);
    const others = othersOf(harness)
      .map((other) => `  ${other.sandbox.package}) echo '${latestVersions[other.name]}' ;;`)
      .join('\n');
    writeCommand(bin, 'npm', `case "$2" in\n${others}\n  *) exit 1 ;;\nesac`);
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.equal(result.stderr, notFoundLines(harness));
    assert.deepEqual(dockerCalls(), []);
  });
}

// The caller's environment is no source of the values the wrapper hands Compose for the harnesses.
const callerEnvironment = {
  SANDBOX_HARNESS_PACKAGES: 'evil@1.0.0',
  SANDBOX_HARNESS_RECORD: 'evil@1.0.0',
  SANDBOX_HARNESS_DIRECTORIES: '.evil',
  SANDBOX_HARNESS_ALLOWLIST: 'evil.example',
  SANDBOX_MODEL_SERVER_ADMITTED: 'true',
  ...Object.fromEntries(HARNESSES.map(({ sandbox }) => [`SANDBOX_${sandbox.versionArgument}`, '0.0.1'])),
  ...Object.fromEntries(HARNESSES.map(({ sandbox }) => [sandbox.versionArgument, '0.0.2'])),
};

test("the wrapper does not use what the caller's environment holds for the harnesses", (testContext) => {
  const { root, container, home, bin, dockerCalls, harnessAllowlist, modelServerAdmitted } = setUp(
    testContext,
    kitPath,
  );
  const result = spawnSync(join(container, 'sandbox.sh'), [root, '--in-place', '--rebuild', 'echo', 'hi'], {
    encoding: 'utf-8',
    env: { HOME: home, PATH: bin, ...callerEnvironment },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  assert.doesNotMatch(harnessAllowlist(), /evil/);
  // 0104 R9: whether the local model server is admitted comes from agentrite.json alone.
  assert.deepEqual(modelServerAdmitted(), ['false', 'false']);
});

test(
  "the wrapper does not use what the caller's environment holds for harnesses with no other source",
  (testContext) => {
    const { root, container, home, bin, imageLabels, dockerCalls } = setUp(testContext, kitPath);
    removeAllHarnesses(bin);
    writeFileSync(imageLabels, imageLabelsText(builtBefore));
    const result = spawnSync(join(container, 'sandbox.sh'), [root, '--in-place', 'echo', 'hi'], {
      encoding: 'utf-8',
      env: { HOME: home, PATH: bin, ...callerEnvironment },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), runOnly(root, container, builtBefore));
  },
);

test('the wrapper builds nothing when the image holds the wanted versions', (testContext) => {
  const { root, container, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper says so for each harness when every one differs from the image', (testContext) => {
  const { root, container, imageLabels, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
  writeFileSync(imageLabels, imageLabelsText(builtBefore));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    HARNESSES.map(({ name, title }) => holdsLine(title, builtBefore[name], hostVersions[name], 'the host')).join(''),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  assert.deepEqual(npmCalls(), []);
});

test('the wrapper rebuilds an image that records no harnesses, which one built before the label is', (context) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(context, kitPath);
  writeFileSync(imageLabels, imageLabelsText({}));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stderr,
    HARNESSES.map(({ name, title }) => recordsNoneLine(title, hostVersions[name], 'the host')).join(''),
  );
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

test(
  'the wrapper asks npm nothing on --rebuild when the project gives every version and the host has none',
  (testContext) => {
    const buildArgs = Object.fromEntries(
      HARNESSES.map(({ sandbox }, index) => [sandbox.versionArgument, `2.${index}.0`]),
    );
    const { root, container, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, buildArgs);
    removeAllHarnesses(bin);
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const versions = Object.fromEntries(HARNESSES.map(({ name }, index) => [name, `2.${index}.0`]));
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, versions));
    assert.deepEqual(npmCalls(), []);
  },
);

const allLatestLines = HARNESSES.map(({ name, title }) => latestLine(title, latestVersions[name])).join('');

test(
  'the wrapper builds a missing image with the latest published versions when the host has no harness',
  (testContext) => {
    const { root, container, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, undefined, false);
    removeAllHarnesses(bin);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, allLatestLines);
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, latestVersions));
    assert.deepEqual(npmCalls(), askedOfAll);
  },
);

test(
  'the wrapper builds with the latest on --rebuild with no harness, whatever the image records',
  (testContext) => {
    const { root, container, bin, imageLabels, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    removeAllHarnesses(bin);
    writeFileSync(imageLabels, imageLabelsText(builtBefore));
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, allLatestLines);
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, latestVersions));
    assert.deepEqual(npmCalls(), askedOfAll);
  },
);

for (const [what, arrange] of [
  ['npm fails', ({ npmFails }) => writeFileSync(npmFails, '')],
  ['npm prints nothing', ({ npmPrints }) => writeFileSync(npmPrints, '')],
  ['npm prints a tag', ({ npmPrints }) => writeFileSync(npmPrints, 'latest\n')],
  ['npm prints a version with a command after it', ({ npmPrints }) => writeFileSync(npmPrints, '1.2.3;id\n')],
  ['npm is not on the PATH', ({ bin }) => rmSync(join(bin, 'npm'))],
]) {
  test(`the wrapper stops, and builds and runs nothing, when the latest is needed and ${what}`, (testContext) => {
    const host = setUp(testContext, kitPath);
    removeAllHarnesses(host.bin);
    arrange(host);
    const result = host.run(host.root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.equal(result.stderr, notFoundLines(HARNESSES[0]));
    assert.deepEqual(host.dockerCalls(), []);
  });
}

test('the wrapper asks npm nothing, and so needs none, when no build is due', (testContext) => {
  const { root, container, bin, imageLabels, run, dockerCalls } = setUp(testContext, kitPath);
  removeAllHarnesses(bin);
  rmSync(join(bin, 'npm'));
  writeFileSync(imageLabels, imageLabelsText(builtBefore));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, builtBefore));
});

test(
  'the wrapper builds on --rebuild although the image holds the wanted versions, and says nothing',
  (testContext) => {
    const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
  },
);

test("the wrapper stops with the build's own error when the build fails, and runs and makes nothing", (testContext) => {
  const { root, container, imageLabels, buildFails, run, dockerCalls } = setUp(testContext, kitPath);
  writeFileSync(imageLabels, imageLabelsText(builtBefore));
  writeFileSync(buildFails, '');
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 17);
  assert.match(result.stderr, /failed to solve: no network/);
  assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, 'build'));
  assert.equal(existsSync(homeLogs(root)), false);
});

test('the wrapper runs with no Dockerfile beside it to read a version from', (testContext) => {
  const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
  assert.deepEqual(readdirSync(container).sort(), ['compose.yml', 'harnesses', 'sandbox.sh']);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

// The developer's Claude Code status line, which the module of Claude Code takes from the host. The wrapper mounts
// the host's script and the kit's managed settings file that runs it, both or neither: Docker would create a
// root-owned directory at a script that is not there, and the settings without a script would blank a status line
// set inside the sandbox.
const statusLinePath = (home) => join(home, '.claude', 'statusline-command.sh');

function expectedRun(root, container, mounts = '') {
  return composeCalls(root, container, hostVersions, runCommand(root, root, mounts));
}

test("the wrapper mounts the host's status line script and the settings that run it, read-only", (testContext) => {
  const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
  mkdirSync(join(home, '.claude'));
  writeFileSync(statusLinePath(home), 'echo line\n');
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const mounts =
    `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
    `--volume ${container}/harnesses/claude/managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
  assert.deepEqual(dockerCalls(), expectedRun(root, container, mounts));
});

test(
  'the wrapper mounts neither without a status line script on the host, and creates nothing there',
  (testContext) => {
    const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), expectedRun(root, container));
    assert.equal(existsSync(join(home, '.claude')), false);
  },
);

test('the wrapper mounts neither when a directory is where the status line script would be', (testContext) => {
  const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
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
  test(`the wrapper refuses ${what}, names the forms, and asks Docker and npm nothing`, (testContext) => {
    const { base, root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {}, false);
    rmSync(join(bin, 'claude'));
    const result = run(root, ...args(base));
    assert.equal(result.status, 2);
    assertFormsListed(result.stderr);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

// A word that opens with - where an option stands is one the wrapper does not take. A unit or a command that opens
// with - goes after --.
for (const [where, args] of [
  ['alone', []],
  ['after --rebuild', ['--rebuild']],
  ['after --in-place', ['--in-place']],
  ['after --connect', ['--connect']],
]) {
  test(`the wrapper refuses an option it does not take ${where}, names it and --, and asks nothing`, (testContext) => {
    const { root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {}, false);
    rmSync(join(bin, 'claude'));
    const result = run(root, ...args, '--frobnicate', 'echo', 'hi');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^sandbox\.sh: there is no option --frobnicate\.$/m);
    assert.match(result.stderr, /goes after --\.$/m);
    assertFormsListed(result.stderr);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

// Unit 0095, R12: the mode is the shim's, given before the project root, and is no option a developer gives.
test('--sandbox-only given after the project root is refused as an option the wrapper does not take', (testContext) => {
  const { root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {}, false);
  rmSync(join(bin, 'claude'));
  const result = run(root, '--sandbox-only', 'echo', 'hi');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^sandbox\.sh: there is no option --sandbox-only\.$/m);
  assertFormsListed(result.stderr);
  assert.deepEqual(dockerCalls(), []);
  assert.deepEqual(npmCalls(), []);
});

for (const [option, what] of [
  ['--workdir', 'a directory'],
  ['--mount', 'a path'],
]) {
  test(
    `the wrapper refuses ${option} with no value, lists the forms, and asks Docker and npm nothing`,
    (testContext) => {
      const { root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {}, false);
      rmSync(join(bin, 'claude'));
      const result = run(root, option);
      assert.equal(result.status, 2);
      assert.match(result.stderr, new RegExp(`^sandbox\\.sh: ${option} needs ${what}$`, 'm'));
      assertFormsListed(result.stderr);
      assert.deepEqual(dockerCalls(), []);
      assert.deepEqual(npmCalls(), []);
    },
  );
}

test('the wrapper runs a command that opens with - when it follows --', (testContext) => {
  const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
  const result = run(root, '--in-place', '--', '--frobnicate');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    dockerCalls(),
    composeCalls(root, container, hostVersions, runCommand(root).replace(/echo hi$/, '--frobnicate')),
  );
});

for (const option of ['--workdir', '--mount']) {
  test(`the wrapper starts nothing for a run whose ${option} names a directory that is not there`, (testContext) => {
    const { base, root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, {}, false);
    rmSync(join(bin, 'claude'));
    const result = run(root, '--in-place', option, join(base, 'not-there'), 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /not-there: No such file or directory/);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

test('the wrapper mounts the project root with --in-place, and makes no clone', (testContext) => {
  const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
  assert.equal(existsSync(join(home, '.local', 'state')), false);
});

test('the wrapper mounts the directory of --workdir, and makes no clone', (testContext) => {
  const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
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
const logDirectoryHolds = ['.claude', '.claude/projects', '.codex', '.local', '.local/share', '.local/share/opencode'];

for (const [form, formArgs] of [
  ['--in-place', () => ['--in-place']],
  ['--workdir', (workdir) => ['--workdir', workdir]],
]) {
  test(
    `the wrapper mounts the log directories of the home with ${form}, and makes them before Docker runs`,
    (testContext) => {
      const { base, root, container, agentScript, run, dockerCalls } = setUp(testContext, kitPath);
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
    },
  );

  test(`the wrapper mounts the log directories under XDG_DATA_HOME with ${form}, when that is set`, (testContext) => {
    const { base, root, container, home, runWith, dockerCalls } = setUp(testContext, kitPath);
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

test(
  'the wrapper names the log directory after the project root, not after the directory of --workdir',
  (testContext) => {
    const { base, root, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'another-name');
    mkdirSync(workdir);
    const result = run(root, '--workdir', workdir, 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const [call] = dockerCalls();
    assert.ok(call.includes(logMounts(join(home, '.local', 'share', 'agentrite', 'project'))), call);
    assert.deepEqual(readdirSync(join(home, '.local', 'share', 'agentrite')), ['project']);
  },
);

// Docker reads a source that is not an absolute path as the name of a volume.
test(
  'the wrapper mounts a relative XDG_DATA_HOME as the absolute path it names from its working directory',
  (testContext) => {
    const { base, root, container, runWith, dockerCalls } = setUp(testContext, kitPath);
    const result = runWith({ env: { XDG_DATA_HOME: 'data' }, cwd: base }, root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const logs = join(base, 'data', 'agentrite', 'project');
    assert.deepEqual(dockerCalls(), composeCalls(root, container, hostVersions, runCommand(root, root, '', logs)));
    assert.deepEqual(everythingIn(logs), logDirectoryHolds);
  },
);

// The host's terminal. The wrapper passes its TERM and its COLORTERM to the command, each when it is set and not
// empty, so that a program in the sandbox is told what the developer's terminal can show. Without them the command
// keeps what Docker gives it, which every test above shows.
for (const [form, formArgs] of [
  ['--in-place', () => ['--in-place']],
  ['--workdir', (workdir) => ['--workdir', workdir]],
]) {
  test(`the wrapper passes the host's TERM and COLORTERM to the command with ${form}`, (testContext) => {
    const { base, root, container, runWith, dockerCalls } = setUp(testContext, kitPath);
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
  test(`the wrapper passes only what the host has of the two, on a host ${host}`, (testContext) => {
    const { root, container, runWith, dockerCalls } = setUp(testContext, kitPath);
    const result = runWith({ env }, root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, hostVersions, runCommand(root, root, '', homeLogs(root), terminal)),
    );
  });
}

// Unit 0058: the bell. A start reads bell from the project's agentrite.json, with harnesses and judging no other key,
// and with true mounts the kit's script of the bell and gives each harness what its module names for the bell.

const startForms = [
  ['--in-place', () => ['--in-place']],
  ['--workdir', (workdir) => ['--workdir', workdir]],
];

// The `run` of a start of `form` in the project at `root`, with `mounts` and `environment`.
function startRun(root, container, form, workdir, mounts, environment) {
  const mounted = form === '--in-place' ? root : workdir;
  return composeCalls(
    root,
    container,
    hostVersions,
    runCommand(root, mounted, mounts, homeLogs(root), '', environment),
  );
}

for (const [form, formArgs] of startForms) {
  test(
    `a start with ${form} and "bell": true mounts the bell and names the plugin, with none of the host's`,
    (testContext) => {
      const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
      const workdir = join(base, 'elsewhere');
      mkdirSync(workdir);
      writeStartSettings(root, { bell: true });

      const result = run(root, ...formArgs(workdir), 'echo', 'hi');

      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, '');
      assert.deepEqual(
        dockerCalls(),
        startRun(root, container, form, workdir, bellMounts(container), bellEnvironment()),
      );
      assert.equal(existsSync(join(home, '.claude')), false);
    },
  );

  test(`a start with ${form} and "bell": true mounts the bell after the status line`, (testContext) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root, { bell: true });
    mkdirSync(join(home, '.claude'));
    writeFileSync(statusLinePath(home), 'echo line\n');

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    const statusLine =
      `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
      `--volume ${container}/harnesses/claude/managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
    assert.deepEqual(
      dockerCalls(),
      startRun(root, container, form, workdir, statusLine + bellMounts(container), bellEnvironment()),
    );
  });

  test(`a start with ${form} and "bell": false is the run of a project that rings nothing`, (testContext) => {
    const { base, root, container, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root);

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), startRun(root, container, form, workdir, '', ''));
  });

  test(
    `a start with ${form} and a bell at fault is refused with the reader's message, asking nothing`,
    (testContext) => {
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
        const { base, root, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
        const workdir = join(base, 'elsewhere');
        mkdirSync(workdir);
        if (text === null) rmSync(join(root, 'agentrite.json'));
        else writeFileSync(join(root, 'agentrite.json'), text);

        const result = run(root, ...formArgs(workdir), 'echo', 'hi');

        assert.equal(result.status, 1, String(text));
        assert.equal(result.stdout, '', String(text));
        const printed = result.stderr.replace(/^agentrite: /, '').trimEnd();
        assert.ok(result.stderr.startsWith('agentrite: '), result.stderr);
        if (typeof message === 'string') assert.equal(printed, message, String(text));
        else assert.match(printed, message, String(text));
        assert.deepEqual(dockerCalls(), [], String(text));
        assert.deepEqual(npmCalls(), [], String(text));
      }
    },
  );
}

test('a start reads bell again at each start, with no build in between', (testContext) => {
  const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
  writeStartSettings(root);
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  writeStartSettings(root, { bell: true });

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    ...startRun(root, container, '--in-place', root, '', ''),
    ...startRun(root, container, '--in-place', root, bellMounts(container), bellEnvironment()),
  ]);
});

// 0104 R4, R6, R7: a start hands Compose the modelServer of agentrite.json, in the build and in the run.
for (const modelServer of [true, false]) {
  test(`a start with "modelServer": ${modelServer} hands Compose ${modelServer}, in the build and the run`, (
    testContext,
  ) => {
    const { root, container, run, dockerCalls, modelServerAdmitted } = setUp(testContext, kitPath);
    writeStartSettings(root, { modelServer });

    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
    assert.deepEqual(modelServerAdmitted(), [String(modelServer), String(modelServer)]);
  });
}

test('a start reads modelServer again at each start, with no build in between', (testContext) => {
  const { root, container, run, dockerCalls, modelServerAdmitted } = setUp(testContext, kitPath);
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  writeStartSettings(root, { modelServer: true });

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    ...startRun(root, container, '--in-place', root, '', ''),
    ...startRun(root, container, '--in-place', root, '', ''),
  ]);
  assert.deepEqual(modelServerAdmitted(), ['false', 'true']);
});

for (const [form, formArgs] of startForms) {
  test(`a start with ${form} and modelServer at fault is refused with the reader's message, asking nothing`, (
    testContext,
  ) => {
    const MODEL_SERVER_MUST = 'It must hold true or false';
    for (const [text, message] of [
      ['{"bell": false, "harnesses": ["claude"]}', `agentrite.json: modelServer is missing. ${MODEL_SERVER_MUST}`],
      [
        '{"bell": false, "modelServer": "true", "harnesses": ["claude"]}',
        `agentrite.json: modelServer is "true". ${MODEL_SERVER_MUST}`,
      ],
    ]) {
      const { base, root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
      const workdir = join(base, 'elsewhere');
      mkdirSync(workdir);
      writeFileSync(join(root, 'agentrite.json'), text);
      const asked = join(base, 'harness-asked');
      for (const { start } of HARNESSES) writeCommand(bin, start.command, `echo asked >> "${asked}"`);

      const result = run(root, ...formArgs(workdir), 'echo', 'hi');

      assert.equal(result.status, 1, text);
      assert.equal(result.stdout, '', text);
      assert.equal(result.stderr, `agentrite: ${message}\n`, text);
      assert.deepEqual(dockerCalls(), [], text);
      assert.deepEqual(npmCalls(), [], text);
      assert.equal(existsSync(asked), false, text);
    }
  });
}

// Unit 0106: OpenCode is given the host's local model providers. With "modelServer": true and opencode among the
// harnesses, a start reads the host's ~/.config/opencode/opencode.json or opencode.jsonc, writes the kit's
// configuration of OpenCode with the local providers alone into the project's log directory, under a name after its
// content, and mounts it in the place of the kit's file, at /etc/opencode/opencode.json.

const OPENCODE_TARGET = '/etc/opencode/opencode.json';
const opencodeDirectory = (home) => join(home, '.config', 'opencode');
const opencodeFiles = (root) =>
  readdirSync(homeLogs(root)).filter((name) => name.startsWith('opencode-configuration-'));

// The host's OpenCode configuration as a developer writes it: comments, a trailing comma, a local provider with an
// API key, a provider of the cloud, and keys of other things.
const HOST_OPENCODE = `{
  // the local server
  "model": "ollama/qwen3:8b",
  "plugin": ["host-plugin"],
  "provider": {
    "ollama": {
      "npm": "@ai-sdk/openai-compatible",
      "apiKey": "local-secret",
      /* where it listens */
      "options": { "baseURL": "http://localhost:11434/v1", "apiKey": "{env:OLLAMA_KEY}" },
      "models": { "qwen3:8b": { "name": "Qwen 3", "limit": { "context": 32768, "output": 4096 }, "id": "q" }, },
    },
    "openai": { "options": { "baseURL": "https://api.openai.com/v1", "apiKey": "cloud-secret" } },
  },
}
`;

function writeHostOpencode(home, name, text) {
  mkdirSync(opencodeDirectory(home), { recursive: true });
  writeFileSync(join(opencodeDirectory(home), name), text);
}

// The `run` of a start of `form` that gives OpenCode its configuration `file` of the log directory in the place of
// the kit's, with the bell's `bellMounting` and `bellEnvironmentFlags` when given.
function opencodeRun(root, container, form, workdir, file, bellMounting = '', bellEnvironmentFlags = '') {
  const mounted = form === '--in-place' ? root : workdir;
  const run =
    `run --rm ${updateEnvironment()}${bellEnvironmentFlags}--volume ${mounted}:/work ` +
    `${updateMounts(container, ['claude', 'codex'])}${bellMounting}--volume ${file}:${OPENCODE_TARGET}:ro ` +
    `${logMounts(homeLogs(root))}sandbox echo hi`;
  return composeCalls(root, container, hostVersions, run);
}

// The one configuration of OpenCode the log directory of the project at `root` holds, and its content.
function onlyOpencodeFile(root) {
  const names = opencodeFiles(root);
  assert.equal(names.length, 1, names.join());
  const path = join(homeLogs(root), names[0]);
  return { name: names[0], path, content: readFileSync(path, 'utf-8') };
}

const opencodeProvidersLine = (home, name) =>
  `sandbox.sh: OpenCode is given the local provider "ollama" of ${join(opencodeDirectory(home), name)}\n`;

for (const [form, formArgs] of startForms) {
  test(`a start with ${form} gives OpenCode the host's local providers alone, in the place of the kit's file`, (
    testContext,
  ) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root, { modelServer: true });
    writeHostOpencode(home, 'opencode.jsonc', HOST_OPENCODE);

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, opencodeProvidersLine(home, 'opencode.jsonc'));
    const file = onlyOpencodeFile(root);
    assert.ok(file.content.endsWith('\n'));
    const hash = createHash('sha256').update(file.content.slice(0, -1)).digest('hex').slice(0, 16);
    assert.equal(file.name, `opencode-configuration-${hash}.json`);
    assert.deepEqual(JSON.parse(file.content), {
      $schema: 'https://opencode.ai/config.json',
      autoupdate: false,
      provider: {
        ollama: {
          npm: '@ai-sdk/openai-compatible',
          options: { baseURL: 'http://host.docker.internal:11434/v1' },
          models: { 'qwen3:8b': { name: 'Qwen 3', limit: { context: 32768, output: 4096 } } },
        },
      },
    });
    assert.doesNotMatch(file.content, /secret|OLLAMA_KEY|plugin|openai\.com|"model"/);
    assert.equal(statSync(file.path).mode & 0o777, 0o644);
    assert.deepEqual(dockerCalls(), opencodeRun(root, container, form, workdir, file.path));
    assert.ok(!dockerCalls().some((call) => call.includes(opencodeDirectory(home))), dockerCalls().join('\n'));
  });

  test(`a start with ${form} and "bell": true gives OpenCode the local providers and the bell`, (testContext) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root, { bell: true, modelServer: true });
    writeHostOpencode(home, 'opencode.json', JSON.stringify(parseJsonc(HOST_OPENCODE)));

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, opencodeProvidersLine(home, 'opencode.json'));
    const file = onlyOpencodeFile(root);
    assert.deepEqual(
      dockerCalls(),
      opencodeRun(root, container, form, workdir, file.path, bellMounts(container), bellEnvironment()),
    );
  });

  test(`a start with ${form} and "modelServer": false reads nothing of the host's OpenCode file`, (testContext) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root);
    writeHostOpencode(home, 'opencode.json', 'not json');

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), startRun(root, container, form, workdir, '', ''));
    assert.deepEqual(opencodeFiles(root), []);
  });

  test(`a start with ${form} and no file of OpenCode's on the host mounts the kit's file and says so`, (
    testContext,
  ) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root, { modelServer: true });

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      result.stderr,
      `sandbox.sh: there is no opencode.json or opencode.jsonc in ${opencodeDirectory(home)}/, so OpenCode is ` +
        'given no local provider\n',
    );
    assert.deepEqual(dockerCalls(), startRun(root, container, form, workdir, '', ''));
    assert.deepEqual(opencodeFiles(root), []);
  });

  test(`a start with ${form} refuses each fault of the host's OpenCode file, asking Docker and npm nothing`, (
    testContext,
  ) => {
    const local = (models) =>
      JSON.stringify({ provider: { ollama: { options: { baseURL: 'http://localhost:11434' }, models } } });
    for (const [files, message] of [
      [
        { 'opencode.json': '{}', 'opencode.jsonc': '{}' },
        (directory) =>
          `${directory}/ holds both opencode.json and opencode.jsonc, and the sandbox reads one alone. Keep one, ` +
          'with what the other holds moved into it, and start again',
      ],
      [
        { 'opencode.jsonc': '{"provider": [1,]' },
        (directory) =>
          new RegExp(
            `^${escaped(directory)}/opencode\\.jsonc is not a JSON object once its comments and trailing commas ` +
              'are taken out: .+\\. Correct it as OpenCode reads it, and start again$',
          ),
      ],
      [
        { 'opencode.json': local(null) },
        (directory) =>
          `${directory}/opencode.json: the models of the local provider "ollama" are not a JSON object. Correct ` +
          'them, and start again',
      ],
      [
        { 'opencode.json': local({ m: 'x' }) },
        (directory) =>
          `${directory}/opencode.json: the model "m" of the local provider "ollama" is not a JSON object. ` +
          'Correct it, and start again',
      ],
    ]) {
      const { base, root, home, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
      const workdir = join(base, 'elsewhere');
      mkdirSync(workdir);
      writeStartSettings(root, { modelServer: true });
      for (const [name, text] of Object.entries(files)) writeHostOpencode(home, name, text);

      const result = run(root, ...formArgs(workdir), 'echo', 'hi');

      const expectedMessage = message(opencodeDirectory(home));
      assert.equal(result.status, 1, result.stderr);
      assert.equal(result.stdout, '');
      const printed = result.stderr.replace(/^agentrite: /, '').trimEnd();
      assert.ok(result.stderr.startsWith('agentrite: '), result.stderr);
      if (typeof expectedMessage === 'string') assert.equal(printed, expectedMessage);
      else assert.match(printed, expectedMessage);
      assert.deepEqual(dockerCalls(), []);
      assert.deepEqual(npmCalls(), []);
      assert.equal(existsSync(homeLogs(root)), false);
    }
  });

  test(`a start with ${form} refuses a host OpenCode file that cannot be read`, (testContext) => {
    const { base, root, home, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root, { modelServer: true });
    mkdirSync(join(opencodeDirectory(home), 'opencode.json'), { recursive: true });

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 1);
    assert.match(
      result.stderr,
      new RegExp(
        `^agentrite: cannot read ${escaped(opencodeDirectory(home))}/opencode\\.json: .+\\. Make it readable, or ` +
          'remove it, and start again\n$',
      ),
    );
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

test("a changed host OpenCode file gives a new file at the next start, with no build, and the first is left", (
  testContext,
) => {
  const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
  writeStartSettings(root, { modelServer: true });
  writeHostOpencode(home, 'opencode.jsonc', HOST_OPENCODE);
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  const first = onlyOpencodeFile(root);
  const before = statSync(first.path).ino;
  writeHostOpencode(home, 'opencode.jsonc', HOST_OPENCODE.replace('"Qwen 3"', '"Qwen 3 again"'));

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  const names = opencodeFiles(root);
  assert.equal(names.length, 2, names.join());
  const second = join(homeLogs(root), names.find((name) => name !== first.name));
  assert.match(readFileSync(second, 'utf-8'), /"Qwen 3 again"/);
  assert.equal(statSync(first.path).ino, before);
  assert.equal(readFileSync(first.path, 'utf-8'), first.content);
  assert.deepEqual(dockerCalls(), [
    ...opencodeRun(root, container, '--in-place', root, first.path),
    ...opencodeRun(root, container, '--in-place', root, second),
  ]);
});

// The text of `text` for a RegExp that matches it literally.
function escaped(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// Unit 0092: how long Claude Code's sessions are kept. A start reads cleanupPeriodDays from the host's
// ~/.claude/settings.json, writes the number alone into the project's log directory, and mounts that file in the
// drop-in directory of Claude Code's managed settings. The file is named after the number, and no start changes or
// removes it, so that a start cannot change or remove the file that another start is about to mount.
const cleanupPeriodFile = (root, days = 365) => join(homeLogs(root), `claude-cleanup-period-${days}.json`);
const cleanupPeriodFiles = (root) =>
  readdirSync(homeLogs(root)).filter((name) => name.startsWith('claude-cleanup-period'));
const cleanupPeriodMount = (root, days = 365) =>
  `--volume ${cleanupPeriodFile(root, days)}:` +
  '/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json:ro ';
const hostSettingsPath = (home) => join(home, '.claude', 'settings.json');

function writeHostSettings(home, text) {
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(hostSettingsPath(home), text);
}

const hostSettingsWithNumber = (days) => JSON.stringify({ cleanupPeriodDays: days, env: { TOKEN: 'secret' } });

for (const [form, formArgs] of startForms) {
  test(`a start with ${form} gives the sandbox the host's cleanupPeriodDays alone`, (testContext) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeHostSettings(home, hostSettingsWithNumber(365));

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(dockerCalls(), startRun(root, container, form, workdir, cleanupPeriodMount(root), ''));
    assert.equal(readFileSync(cleanupPeriodFile(root), 'utf-8'), '{"cleanupPeriodDays": 365}\n');
    assert.ok(dockerCalls().every((call) => !call.includes('secret')));
  });

  test(`a start with ${form} mounts the number after the status line and the bell`, (testContext) => {
    const { base, root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    const workdir = join(base, 'elsewhere');
    mkdirSync(workdir);
    writeStartSettings(root, { bell: true });
    writeHostSettings(home, hostSettingsWithNumber(365));
    writeFileSync(statusLinePath(home), 'echo line\n');

    const result = run(root, ...formArgs(workdir), 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    const statusLine =
      `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
      `--volume ${container}/harnesses/claude/managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
    const mounts = statusLine + bellMounts(container) + cleanupPeriodMount(root);
    assert.deepEqual(dockerCalls(), startRun(root, container, form, workdir, mounts, bellEnvironment()));
    assert.equal(readFileSync(cleanupPeriodFile(root), 'utf-8'), '{"cleanupPeriodDays": 365}\n');
    assert.ok(dockerCalls().every((call) => !call.includes('secret')));
  });
}

for (const [what, text] of [
  ['no settings.json', null],
  ['a settings.json without cleanupPeriodDays', '{"model": "x"}'],
]) {
  test(`a start with ${what} on the host gives the sandbox nothing for it`, (testContext) => {
    const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    if (text !== null) writeHostSettings(home, text);

    const result = run(root, '--in-place', 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), expectedRun(root, container));
    assert.deepEqual(cleanupPeriodFiles(root), []);
  });

  test(`a start with ${what} on the host, after a start that gave a number, gives nothing`, (testContext) => {
    const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
    writeHostSettings(home, hostSettingsWithNumber(365));
    assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
    const before = statSync(cleanupPeriodFile(root)).ino;
    if (text === null) rmSync(hostSettingsPath(home));
    else writeHostSettings(home, text);

    const result = run(root, '--in-place', 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), [
      ...startRun(root, container, '--in-place', root, cleanupPeriodMount(root), ''),
      ...expectedRun(root, container),
    ]);
    // The file of the earlier start is left as it was, since a run about to begin may yet mount it.
    assert.deepEqual(cleanupPeriodFiles(root), ['claude-cleanup-period-365.json']);
    assert.equal(statSync(cleanupPeriodFile(root)).ino, before);
    assert.equal(readFileSync(cleanupPeriodFile(root), 'utf-8'), '{"cleanupPeriodDays": 365}\n');
  });
}

for (const [form, formArgs] of startForms) {
  test(`a start with ${form} and a cleanupPeriodDays at fault is refused with the reader's message`, (testContext) => {
    for (const text of [
      'not json',
      '[]',
      '{"cleanupPeriodDays": 0}',
      '{"cleanupPeriodDays": 1.5}',
      '{"cleanupPeriodDays": -1}',
      '{"cleanupPeriodDays": "365"}',
    ]) {
      const { base, root, home, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
      const workdir = join(base, 'elsewhere');
      mkdirSync(workdir);
      writeHostSettings(home, text);
      const message = (() => {
        try {
          parseCleanupPeriod(text, hostSettingsPath(home));
        } catch (error) {
          return error.message;
        }
        throw new Error(`${text} was not refused by the reader`);
      })();

      const result = run(root, ...formArgs(workdir), 'echo', 'hi');

      assert.equal(result.status, 1, text);
      assert.equal(result.stdout, '', text);
      assert.equal(result.stderr, `agentrite: ${message}\n`, text);
      assert.deepEqual(dockerCalls(), [], text);
      assert.deepEqual(npmCalls(), [], text);
      assert.equal(existsSync(homeLogs(root)), false, text);
    }
  });
}

// Review S1: a start between another start's write and its mount neither changes nor removes the file that start
// mounts, whatever number it has, or none.
test('later starts with another number and with none leave the file of an earlier start as it was', (testContext) => {
  const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
  writeHostSettings(home, hostSettingsWithNumber(365));
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  const before = statSync(cleanupPeriodFile(root, 365)).ino;
  writeHostSettings(home, hostSettingsWithNumber(90));
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  rmSync(hostSettingsPath(home));

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    ...startRun(root, container, '--in-place', root, cleanupPeriodMount(root, 365), ''),
    ...startRun(root, container, '--in-place', root, cleanupPeriodMount(root, 90), ''),
    ...expectedRun(root, container),
  ]);
  assert.equal(statSync(cleanupPeriodFile(root, 365)).ino, before);
  assert.equal(readFileSync(cleanupPeriodFile(root, 365), 'utf-8'), '{"cleanupPeriodDays": 365}\n');
  assert.equal(readFileSync(cleanupPeriodFile(root, 90), 'utf-8'), '{"cleanupPeriodDays": 90}\n');
});

test('a start whose number has its file already leaves that file as it is', (testContext) => {
  const { root, container, home, run, dockerCalls } = setUp(testContext, kitPath);
  writeHostSettings(home, hostSettingsWithNumber(365));
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  const before = statSync(cleanupPeriodFile(root)).ino;

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  const once = startRun(root, container, '--in-place', root, cleanupPeriodMount(root), '');
  assert.deepEqual(dockerCalls(), [...once, ...once]);
  assert.equal(statSync(cleanupPeriodFile(root)).ino, before);
  assert.deepEqual(cleanupPeriodFiles(root), ['claude-cleanup-period-365.json']);
});

test('the file of the number can be read by every user, which the agent of the sandbox is', (testContext) => {
  const { root, home, run } = setUp(testContext, kitPath);
  writeHostSettings(home, hostSettingsWithNumber(365));

  const result = run(root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(statSync(cleanupPeriodFile(root)).mode & 0o777, 0o644);
  assert.deepEqual(readdirSync(homeLogs(root)).sort(), [
    '.claude',
    '.codex',
    '.local',
    'claude-cleanup-period-365.json',
  ]);
});

// Unit 0078: the kit's version. The image records the kit it was built from, and is built again for another.
const kitBuiltBefore = '96.0.0';
const kitDiffersLine = (held) =>
  `sandbox.sh: the image was built from the kit ${held} and ${kitVersion} is installed. Rebuilding.\n`;
const kitRecordsNoneLine = `sandbox.sh: the image records no kit version and ${kitVersion} is installed. Rebuilding.\n`;

// R16, R24
test('the wrapper builds an image again that records another version of the kit, and says so first', (testContext) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(testContext, kitPath);
  writeFileSync(imageLabels, imageLabelsText({ ...hostVersions, kit: kitBuiltBefore }));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, kitDiffersLine(kitBuiltBefore));
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

// R16, R24
test('the wrapper builds an image again that records no version of the kit, and says so first', (testContext) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(testContext, kitPath);
  writeFileSync(imageLabels, imageLabelsText({ ...hostVersions, kit: '' }));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, kitRecordsNoneLine);
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

// R16, R24
test('the wrapper builds nothing for the kit when the image records the installed version', (testContext) => {
  const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

// R16, R24
test('the wrapper hands the build the installed kit version, and --rebuild builds without the line', (testContext) => {
  const { root, container, imageLabels, run, dockerCalls } = setUp(testContext, kitPath);
  writeFileSync(imageLabels, imageLabelsText({ ...hostVersions, kit: kitBuiltBefore }));
  const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const [build] = dockerCalls();
  assert.ok(build.includes(` SANDBOX_AGENTRITE_VERSION=${kitVersion} `), build);
  assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
});

// R16, R24
for (const [what, content] of [
  ['is missing', null],
  ['holds no version', '{"name": "agentrite"}\n'],
  ['is not JSON', 'not json\n'],
  ['holds a version of another shape', '{"name": "agentrite", "version": "8.0"}\n'],
]) {
  test(`the wrapper refuses a kit whose package.json ${what}, before anything is built`, (testContext) => {
    const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
    const manifest = join(container, '..', 'package.json');
    if (content === null) rmSync(manifest);
    else writeFileSync(manifest, content);
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.ok(result.stderr.includes(manifest), result.stderr);
    assert.match(result.stderr, /Install the project's dependencies again/);
    assert.deepEqual(dockerCalls(), []);
  });
}

// 0097 R16: for a project of Claude Code and OpenCode, the whole run of an --in-place start, written out, as it was
// before the harnesses' part of the sandbox came from their modules, but for what turns off their updates, which the
// run is now given rather than the image, and the bell's script, which is mounted as a file of its own.
test('the run of a project of claude and opencode, with everything a run can be given, is the one written here', (
  testContext,
) => {
  const { root, container, home, imageLabels, runWith, dockerCalls, harnessAllowlist } = setUp(testContext, kitPath);
  const settings = '{"bell": true, "modelServer": false, "harnesses": ["opencode", "claude"]}\n';
  writeFileSync(join(root, 'agentrite.json'), settings);
  writeFileSync(imageLabels, imageLabelsText({ claude: hostVersions.claude, opencode: hostVersions.opencode }));
  mkdirSync(join(home, '.claude'));
  writeFileSync(join(home, '.claude', 'statusline-command.sh'), 'echo line\n');
  writeFileSync(join(home, '.claude', 'settings.json'), '{"cleanupPeriodDays": 365}');
  const logs = homeLogs(root);

  const result = runWith({ env: { TERM: 'xterm-256color' } }, root, '--in-place', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(dockerCalls(), [
    'AGENTRITE_CONTAINER=node_modules/agentrite/container ' +
      'SANDBOX_HARNESS_PACKAGES=@anthropic-ai/claude-code@99.1.0 opencode-ai@98.2.0 ' +
      'SANDBOX_HARNESS_RECORD=claude@99.1.0 opencode@98.2.0 ' +
      'SANDBOX_HARNESS_DIRECTORIES=.claude/projects .local/share/opencode ' +
      `SANDBOX_AGENTRITE_VERSION=${kitVersion} docker compose ` +
      `--project-directory ${root} -f ${container}/compose.yml -f ${root}/sandbox/compose.project.yml ` +
      'run --rm --env TERM=xterm-256color ' +
      '--env DISABLE_AUTOUPDATER=1 --env DISABLE_UPDATES=1 --env OPENCODE_CONFIG=/etc/opencode/opencode.json ' +
      '--env OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]} ' +
      `--volume ${root}:/work ` +
      `--volume ${container}/harnesses/opencode/opencode.json:/etc/opencode/opencode.json:ro ` +
      `--volume ${home}/.claude/statusline-command.sh:/etc/claude-code/statusline-command.sh:ro ` +
      `--volume ${container}/harnesses/claude/managed-settings.json:/etc/claude-code/managed-settings.json:ro ` +
      `--volume ${container}/bell/ring-bell.sh:/etc/agentrite/bell/ring-bell.sh:ro ` +
      `--volume ${container}/harnesses/claude/bell-settings.json:` +
      '/etc/claude-code/managed-settings.d/agentrite-bell.json:ro ' +
      `--volume ${container}/harnesses/opencode/bell-plugin.js:/etc/agentrite/bell/opencode-plugin.js:ro ` +
      `--volume ${logs}/claude-cleanup-period-365.json:` +
      '/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json:ro ' +
      `--volume ${logs}/.claude/projects:/home/agent/.claude/projects ` +
      `--volume ${logs}/.local/share/opencode:/home/agent/.local/share/opencode ` +
      'sandbox echo hi',
  ]);
  assert.equal(
    harnessAllowlist(),
    [
      '# the Anthropic API that Claude Code uses',
      'api.anthropic.com',
      '# Claude Code contacts it at start-up when it holds no saved login',
      'platform.claude.com',
      '# OpenCode fetches its model catalog from it',
      'models.opencode.ai',
      "# OpenCode's login with a ChatGPT account, and every refresh of its token",
      'auth.openai.com',
      '# OpenCode sends the prompts of a ChatGPT login here',
      'chatgpt.com',
    ].join('\n'),
  );
});

// 0097 R18: the image, the allowlist and a run hold only the harnesses the project's agentrite.json names.
const joinedNames = (names) => names.join(', ').replace(/, ([^,]*)$/, ' and $1');
const harnessesLine = (held, named) =>
  `sandbox.sh: the image holds the harnesses ${joinedNames(held)}, and agentrite.json names ` +
  `${joinedNames(named)}. Rebuilding.\n`;

// The allowlist the wrapper composes for the harnesses `harnesses`: a comment with each host's reason, then the host.
const allowlistOf = (harnesses) =>
  harnesses.flatMap(({ sandbox }) => sandbox.hosts.flatMap(({ host, reason }) => [`# ${reason}`, host])).join('\n');

for (const harness of HARNESSES) {
  const { name, sandbox } = harness;
  const versions = { [name]: hostVersions[name] };

  test(`a project of ${name} alone gets only its package, directories, hosts, environment, mounts and bell`, (
    testContext,
  ) => {
    const { base, root, container, bin, imageLabels, run, dockerCalls, npmCalls, harnessAllowlist } = setUp(
      testContext,
      kitPath,
    );
    writeStartSettings(root, { bell: true, harnesses: [name] });
    writeFileSync(imageLabels, imageLabelsText(versions));
    // Every other harness's command leaves a mark when it is asked anything.
    const asked = join(base, 'others-asked');
    for (const other of othersOf(harness)) writeCommand(bin, other.start.command, `echo asked >> "${asked}"`);

    const result = run(root, '--in-place', 'echo', 'hi');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const command = runCommand(root, root, bellMounts(container, [name]), homeLogs(root), '', bellEnvironment([name]), [
      name,
    ]);
    assert.deepEqual(dockerCalls(), composeCalls(root, container, versions, command));
    assert.equal(harnessAllowlist(), allowlistOf([harness]));
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(asked), false);
    assert.deepEqual(readdirSync(homeLogs(root), { recursive: true }).sort(), [
      ...new Set(sandbox.logDirectories.flatMap((directory) => directory.split('/').map((_, index, parts) =>
        parts.slice(0, index + 1).join('/')))),
    ].sort());
  });

  test(`a project of ${name} alone asks npm only of its package when a build is due`, (testContext) => {
    const { root, container, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, undefined, false);
    writeStartSettings(root, { harnesses: [name] });
    rmSync(join(bin, harness.start.command));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, latestLine(harness.title, latestVersions[name]));
    const latest = { [name]: latestVersions[name] };
    assert.deepEqual(
      dockerCalls(),
      composeCalls(root, container, latest, 'build', runCommand(root, root, '', homeLogs(root), '', '', [name])),
    );
    assert.deepEqual(npmCalls(), [askedOf(sandbox.package)]);
  });

  if (HARNESSES.length > 1) {
    test(`a project of ${name} alone is built when the image holds every harness, and says which`, (context) => {
      const { root, container, run, dockerCalls } = setUp(context, kitPath);
      writeStartSettings(root, { harnesses: [name] });
      const result = run(root, '--in-place', 'echo', 'hi');
      assert.equal(result.status, 0, result.stderr);
      assert.equal(result.stderr, harnessesLine(HARNESS_NAMES, [name]));
      const command = runCommand(root, root, '', homeLogs(root), '', '', [name]);
      assert.deepEqual(dockerCalls(), composeCalls(root, container, versions, 'build', command));
    });

    test(`a project of every harness is built when the image holds ${name} alone, and says which`, (context) => {
      const { root, container, imageLabels, run, dockerCalls } = setUp(context, kitPath);
      writeFileSync(imageLabels, imageLabelsText(versions));
      const result = run(root, '--in-place', 'echo', 'hi');
      assert.equal(result.status, 0, result.stderr);
      const others = othersOf(harness)
        .map((other) => recordsNoneLine(other.title, hostVersions[other.name], 'the host'))
        .join('');
      assert.equal(result.stderr, harnessesLine([name], HARNESS_NAMES) + others);
      assert.deepEqual(dockerCalls(), buildAndRun(root, container, hostVersions));
    });
  }

  test(`the version a project's file gives of ${name}, which the project does not name, is ignored`, (context) => {
    const other = othersOf(harness)[0];
    if (other === undefined) return;
    const { root, container, imageLabels, run, dockerCalls } = setUp(context, kitPath, {
      [sandbox.versionArgument]: 'not a version',
    });
    writeStartSettings(root, { harnesses: [other.name] });
    const otherVersions = { [other.name]: hostVersions[other.name] };
    writeFileSync(imageLabels, imageLabelsText(otherVersions));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const command = runCommand(root, root, '', homeLogs(root), '', '', [other.name]);
    assert.deepEqual(dockerCalls(), composeCalls(root, container, otherVersions, command));
  });
}

test('a start reads harnesses again at each start, and builds when they changed', (testContext) => {
  const { root, container, run, dockerCalls, imageLabels } = setUp(testContext, kitPath);
  assert.equal(run(root, '--in-place', 'echo', 'hi').status, 0);
  writeStartSettings(root, { harnesses: [HARNESS_NAMES[0]] });
  const first = { [HARNESS_NAMES[0]]: hostVersions[HARNESS_NAMES[0]] };
  writeFileSync(imageLabels, imageLabelsText(first));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    ...runOnly(root, container, hostVersions),
    ...composeCalls(root, container, first, runCommand(root, root, '', homeLogs(root), '', '', [HARNESS_NAMES[0]])),
  ]);
});

for (const [form, formArgs] of startForms) {
  test(`a start with ${form} and harnesses at fault is refused with the reader's message, asking nothing`, (
    testContext,
  ) => {
    const HARNESSES_MUST = 'It must hold a list of one or more of "claude", "opencode" and "codex"';
    for (const [text, message] of [
      ['{"bell": false, "modelServer": false}', `agentrite.json: harnesses is missing. ${HARNESSES_MUST}`],
      ['{"bell": false, "modelServer": false, "harnesses": []}', `agentrite.json: harnesses is []. ${HARNESSES_MUST}`],
      [
        '{"bell": false, "modelServer": false, "harnesses": "claude"}',
        `agentrite.json: harnesses is "claude". ${HARNESSES_MUST}`,
      ],
      [
        '{"bell": false, "modelServer": false, "harnesses": ["nothing"]}',
        `agentrite.json: harnesses is ["nothing"]. ${HARNESSES_MUST}`,
      ],
    ]) {
      const { base, root, bin, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
      const workdir = join(base, 'elsewhere');
      mkdirSync(workdir);
      writeFileSync(join(root, 'agentrite.json'), text);
      const asked = join(base, 'harness-asked');
      for (const { start } of HARNESSES) writeCommand(bin, start.command, `echo asked >> "${asked}"`);

      const result = run(root, ...formArgs(workdir), 'echo', 'hi');

      assert.equal(result.status, 1, text);
      assert.equal(result.stdout, '', text);
      assert.equal(result.stderr, `agentrite: ${message}\n`, text);
      assert.deepEqual(dockerCalls(), [], text);
      assert.deepEqual(npmCalls(), [], text);
      assert.equal(existsSync(asked), false, text);
    }
  });
}

test('a start judges nothing of agentrite.json but bell, modelServer and harnesses', (testContext) => {
  const { root, container, run, dockerCalls } = setUp(testContext, kitPath);
  const settings = {
    bell: false,
    modelServer: false,
    harnesses: HARNESS_NAMES,
    defaultBranch: 5,
    roles: [],
    standards: '/x',
  };
  writeFileSync(join(root, 'agentrite.json'), JSON.stringify(settings));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});

// 0097 R13: the harnesses' build arguments and KIT_ALLOWLIST are the kit's to set.
for (const argument of ['HARNESS_PACKAGES', 'HARNESS_RECORD', 'HARNESS_DIRECTORIES']) {
  test(`the wrapper refuses a project's file that sets ${argument}, before anything is built`, (testContext) => {
    const { root, run, dockerCalls, npmCalls } = setUp(testContext, kitPath, { [argument]: 'evil@1.0.0' });
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.equal(
      result.stderr,
      `sandbox.sh: ${root}/sandbox/compose.project.yml sets ${argument}, which is the kit's to set.\n` +
        'Remove it from that file.\n',
    );
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

for (const [what, value] of [
  ['a list of its own', 'evil.example\n'],
  // As Compose gives the kit's variable in a project's value, which the wrapper hands its marker for this question.
  ['the kit list with a host before it', `evil.example\n${kitAllowlist('sandbox.sh/no-version-from-the-project')}`],
]) {
  test(`the wrapper refuses a project's file that sets KIT_ALLOWLIST to ${what}`, (testContext) => {
    const { root, projectEnvironment, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    writeFileSync(projectEnvironment, JSON.stringify({ KIT_ALLOWLIST: value }));
    const result = run(root, '--in-place', 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.equal(
      result.stderr,
      `sandbox.sh: ${root}/sandbox/compose.project.yml sets KIT_ALLOWLIST, which is the kit's to set.\n` +
        'Remove it from that file.\n',
    );
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

// 0104 R9: whether the local model server is admitted is the kit's to set, from modelServer in agentrite.json.
for (const value of ['true', 'false']) {
  test(`the wrapper refuses a project's file that sets MODEL_SERVER_ADMITTED to ${value}`, (testContext) => {
    const { root, projectEnvironment, run, dockerCalls, npmCalls } = setUp(testContext, kitPath);
    writeFileSync(projectEnvironment, JSON.stringify({ MODEL_SERVER_ADMITTED: value }));
    const result = run(root, '--in-place', '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 1);
    assert.equal(
      result.stderr,
      `sandbox.sh: ${root}/sandbox/compose.project.yml sets MODEL_SERVER_ADMITTED, which is the kit's to set.\n` +
        `Remove MODEL_SERVER_ADMITTED from ${root}/sandbox/compose.project.yml.\n` +
        'The local model server is admitted by "modelServer" in agentrite.json instead.\n',
    );
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
  });
}

test("the wrapper takes the project's ALLOWLIST as it is", (testContext) => {
  const { root, container, projectEnvironment, run, dockerCalls } = setUp(testContext, kitPath);
  writeFileSync(projectEnvironment, JSON.stringify({ ALLOWLIST: 'api.openai.com\n' }));
  const result = run(root, '--in-place', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), runOnly(root, container, hostVersions));
});
