// The wrapper in a sandbox-only project, which the project's shim starts with --sandbox-only before the project root:
// a run on a clone of a branch, named by the branch alone, with nothing of the change process.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { withoutGitEnvironmentConfiguration } from './git-environment.mjs';
import { copyKitInstructions, kitSettingsText } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';
import {
  fakeHost,
  hostVersions,
  imageLabelsText,
  installKitPackage,
  logDirectory,
  logMounts,
  updateEnvironment,
  updateMounts,
} from './wrapper-fixture.mjs';

const kitContainer = fileURLToPath(new URL('../container/', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const kitPath = 'node_modules/agentrite/container';
const noHooks = '/usr/local/lib/agentrite/no-hooks';

// The harnesses of the project, which its agentrite.json names and its image holds.
const HARNESSES_OF_PROJECT = ['claude'];

// The agentrite.json of a sandbox-only project that names `defaultBranch`, in which the bell does not ring.
function settingsFor(defaultBranch) {
  return kitSettingsText({
    defaultBranch,
    harnesses: HARNESSES_OF_PROJECT,
    process: false,
    sandbox: true,
    bell: false,
    orchestrator: false,
  });
}

const branch = 'docs-work';

// A sandbox-only project that is a git repository, with the kit's wrapper, its unit-clone.sh and its scripts
// installed under its ignored `node_modules`, and the host of `fakeHost`, whose Compose project is `project-sandbox`.
// The repository is on `master`, which its committed `agentrite.json` names as the default branch, has no
// `changes/`, and has the branches `feature-0010-init` at `master` and `docs-work` one commit ahead of it. `run`
// runs the wrapper as the shim of a sandbox-only project starts it, with `--sandbox-only`, the project root and
// `args`, and `git` runs the real git in the repository. Every process gets an environment without git's
// environment configuration.
function setUp(testContext, { imageExists = true } = {}) {
  const base = temporaryDirectory(testContext, 'sandbox-only-');
  const root = join(base, 'project');
  const container = join(root, kitPath);
  mkdirSync(container, { recursive: true });
  for (const file of ['sandbox.sh', 'unit-clone.sh', 'compose.yml']) {
    copyFileSync(join(kitContainer, file), join(container, file));
  }
  chmodSync(join(container, 'sandbox.sh'), 0o755);
  cpSync(kitScripts, join(container, '..', 'scripts'), { recursive: true });
  copyKitInstructions(join(container, '..'));
  installKitPackage(join(container, '..'));
  writeFileSync(join(root, 'agentrite.json'), settingsFor('master'));
  mkdirSync(join(root, 'sandbox'));
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), '');
  writeFileSync(join(root, '.gitignore'), 'node_modules\n');
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const host = fakeHost(base, ['AGENTRITE_CONTAINER', 'SANDBOX_GIT_HOOKS_PATH']);
  writeFileSync(host.imageLabels, imageLabelsText({ claude: hostVersions.claude }));
  if (!imageExists) rmSync(host.imageLabels);

  const gitEnvironment = withoutGitEnvironmentConfiguration({ HOME: home, PATH: process.env.PATH });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: gitEnvironment }).trim();
  git('init', '--quiet', '--initial-branch', 'master');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the project');
  git('branch', 'feature-0010-init');
  git('checkout', '--quiet', '-b', branch);
  writeFileSync(join(root, 'work.md'), 'the work\n');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the work');
  git('checkout', '--quiet', 'master');

  const state = join(home, '.local', 'state');
  const cloneOf = (name) => join(state, 'agentrite', 'project-sandbox', name);
  const run = (args, env = {}) =>
    spawnSync(join(container, 'sandbox.sh'), ['--sandbox-only', root, ...args], {
      encoding: 'utf-8',
      env: withoutGitEnvironmentConfiguration({ ...env, HOME: home, PATH: host.bin }),
    });
  // What every recorded call opens with, and what every recorded Compose call opens with.
  const recorded = `AGENTRITE_CONTAINER=${kitPath} SANDBOX_GIT_HOOKS_PATH=${noHooks}`;
  const compose =
    `${recorded} docker compose --project-directory ${root} ` +
    `-f ${container}/compose.yml -f ${root}/sandbox/compose.project.yml`;
  const logs = logDirectory(join(home, '.local', 'share'), root);
  // The flags of a run of the project's harnesses: the environment, and the mounts of `logs`, that every run gets.
  const harnessFlags = updateEnvironment(HARNESSES_OF_PROJECT);
  const runMounts = updateMounts(container, HARNESSES_OF_PROJECT) + logMounts(logs, HARNESSES_OF_PROJECT);
  // The calls of a run on the clone of the branch `name`, which mounts the clone at /work and nothing of the process.
  const branchRun = (name) => [
    `${recorded} docker rm project-sandbox-${name}`,
    `${compose} run --rm --name project-sandbox-${name} ${harnessFlags}--volume ${cloneOf(name)}:/work ` +
      `${runMounts}sandbox echo hi`,
  ];
  // The script the stand-in `docker` runs as the agent, in the directory mounted at /work.
  const agent = (script) => writeFileSync(host.agentScript, `set -e\n${script}\n`);
  return {
    base,
    root,
    home,
    state,
    cloneOf,
    run,
    git,
    compose,
    recorded,
    logs,
    harnessFlags,
    runMounts,
    branchRun,
    agent,
    ...host,
  };
}

// A host on which a build would be due and would need the registry, so that a refusal that comes too late shows
// in the calls: no image, and no Claude Code on the host.
function setUpWithBuildDue(testContext) {
  const host = setUp(testContext, { imageExists: false });
  rmSync(join(host.bin, 'claude'));
  return host;
}

// The words no message of the wrapper in a sandbox-only project holds: a unit, a unit's number or ID, and a variant.
const PROCESS_WORDS = /\bunits?\b|\bUNIT\b|\bID\b|--variant NAME/i;

// Asserts that the wrapper refused with `status`, without the word of a unit, and started, asked, built, cloned and
// cut nothing.
function assertRefused(host, result, status, refs) {
  assert.equal(result.status, status, result.stderr);
  assert.doesNotMatch(result.stderr, /\bunits?\b/i);
  assert.deepEqual(host.dockerCalls(), []);
  assert.deepEqual(host.npmCalls(), []);
  assert.equal(existsSync(host.state), false);
  assert.equal(host.git('for-each-ref'), refs);
}

// Asserts that `stderr` lists the four sandbox-only forms, which name a branch, and none of the process.
function assertSandboxOnlyForms(stderr) {
  assert.ok(stderr.includes('  sandbox.sh BRANCH [COMMAND...]'), stderr);
  assert.ok(stderr.includes('  sandbox.sh --in-place [COMMAND...]'), stderr);
  assert.ok(stderr.includes('  sandbox.sh --workdir DIR [COMMAND...]'), stderr);
  assert.ok(stderr.includes('  sandbox.sh --connect BRANCH [COMMAND...]'), stderr);
  assert.doesNotMatch(stderr, PROCESS_WORDS);
}

// R13, R16, R17, R21: a local branch of the exact name.

test('a local branch of the exact name is run on a clone, which mounts nothing of the process', (testContext) => {
  const host = setUp(testContext);
  const listing = join(host.base, 'listing');
  // The fake host's PATH has no ls, so the shell lists the clone itself.
  host.agent(`shopt -s dotglob nullglob\nprintf '%s\\n' * > "${listing}"`);

  const result = host.run([branch, 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(host.dockerCalls(), host.branchRun(branch));
  assert.doesNotMatch(readFileSync(listing, 'utf-8'), /^\.(reviews|orchestrator)$/m);
  assert.match(readFileSync(listing, 'utf-8'), /^work\.md$/m);
  assert.equal(existsSync(join(host.root, '.reviews')), false);
  assert.equal(existsSync(join(host.root, '.orchestrator')), false);
});

// R13, R15

test(
  'a new name is cut from the head of the default branch agentrite.json names, and not from master',
  (testContext) => {
    const host = setUp(testContext);
    host.git('checkout', '--quiet', '-b', 'main');
    writeFileSync(join(host.root, 'agentrite.json'), settingsFor('main'));
    host.git('commit', '--quiet', '--all', '--message', 'main names itself');
    host.git('checkout', '--quiet', 'master');
    writeFileSync(join(host.root, 'agentrite.json'), settingsFor('main'));
    const head = host.git('rev-parse', '--short', 'main');

    const result = host.run(['new-work', 'echo', 'hi']);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, `sandbox.sh: cut new-work from main at ${head}.\n`);
    assert.equal(host.git('rev-parse', 'new-work'), host.git('rev-parse', 'main'));
    assert.deepEqual(host.dockerCalls(), host.branchRun('new-work'));
  },
);

// R14

test(
  'a name of digits that a branch name holds is cut as a branch of that name, and matches nothing',
  (testContext) => {
    const host = setUp(testContext);
    const head = host.git('rev-parse', '--short', 'master');

    const result = host.run(['0010', 'echo', 'hi']);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, `sandbox.sh: cut 0010 from master at ${head}.\n`);
    assert.equal(host.git('rev-parse', '0010'), host.git('rev-parse', 'master'));
    assert.deepEqual(host.dockerCalls(), host.branchRun('0010'));
  },
);

test('a name of digits that changes/ on the default branch holds is cut under that name', (testContext) => {
  const host = setUp(testContext);
  mkdirSync(join(host.root, 'changes', '0031-cut-me'), { recursive: true });
  writeFileSync(join(host.root, 'changes', '0031-cut-me', 'record.md'), '---\nkind: feature\n---\n\n# Cut me\n');
  host.git('add', 'changes');
  host.git('commit', '--quiet', '--message', 'a directory of changes/');
  const head = host.git('rev-parse', '--short', 'master');

  const result = host.run(['0031', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, `sandbox.sh: cut 0031 from master at ${head}.\n`);
  assert.equal(host.git('branch', '--list', 'feature-0031-cut-me'), '');
  assert.deepEqual(host.dockerCalls(), host.branchRun('0031'));
});

// R15

test('a missing local default branch is refused with 1, and cuts nothing', (testContext) => {
  const host = setUpWithBuildDue(testContext);
  writeFileSync(join(host.root, 'agentrite.json'), settingsFor('main'));
  const refs = host.git('for-each-ref');

  const result = host.run(['new-work', 'echo', 'hi']);

  assertRefused(host, result, 1, refs);
  assert.equal(
    result.stderr,
    "sandbox.sh: 'new-work' names no local branch, and there is no local branch main to cut one from.\n" +
      'agentrite.json names main as the default branch.\n',
  );
});

for (const [name, args] of [
  ['-x', ['--', '-x', 'echo', 'hi']],
  ['HEAD', ['HEAD', 'echo', 'hi']],
  ['a..b', ['a..b', 'echo', 'hi']],
  ['x.lock', ['x.lock', 'echo', 'hi']],
  ['@{-1}', ['@{-1}', 'echo', 'hi']],
  ['has space', ['has space', 'echo', 'hi']],
]) {
  test(`the name ${name}, which git takes for no branch, is refused with 1, naming it`, (testContext) => {
    const host = setUpWithBuildDue(testContext);
    const refs = host.git('for-each-ref');

    const result = host.run(args);

    assertRefused(host, result, 1, refs);
    assert.equal(result.stderr, `sandbox.sh: '${name}' is not a name git takes for a branch, so no branch is cut.\n`);
  });
}

// R16

test(
  "a run on a branch fetches it back as sandbox/<branch>, fast-forwards the host's branch and removes the clone",
  (testContext) => {
    const host = setUp(testContext);
    host.agent(
      'echo done > done.txt\ngit add done.txt\ngit -c user.name=A -c user.email=a@example.com commit --quiet -m done',
    );

    const result = host.run([branch, 'echo', 'hi']);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(host.git('log', '-1', '--format=%s', branch), 'done');
    assert.equal(host.git('for-each-ref', `refs/remotes/sandbox/${branch}`), '');
    assert.equal(existsSync(host.cloneOf(branch)), false);
  },
);

test(
  'a clone that is still there is resumed, in the container named after the Compose project and the branch',
  (testContext) => {
    const host = setUp(testContext);
    host.agent('echo kept > kept.txt');
    assert.equal(host.run([branch, 'echo', 'hi']).status, 0);
    host.agent('cat kept.txt > seen.txt');

    const result = host.run([branch, 'echo', 'hi']);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stderr, /resuming the clone of docs-work/);
    assert.deepEqual(host.dockerCalls(), [...host.branchRun(branch), ...host.branchRun(branch)]);
    assert.equal(readFileSync(join(host.cloneOf(branch), 'seen.txt'), 'utf-8'), 'kept\n');
  },
);

// R18: --variant, in every form, refused before anything is read. The agentrite.json is not JSON, which a start
// that read it would be refused for with 1.

for (const args of [
  ['--variant', 'opus', branch],
  ['--variant=opus', branch],
  [branch, '--variant', 'opus', 'echo', 'hi'],
  [branch, '--variant=opus'],
  ['--variant', 'opus', '--variant', 'gpt', branch],
  ['--variant', 'Not A Name', branch],
  ['--connect', branch, '--variant', 'opus'],
]) {
  test(`--variant is refused with 2, given as ${args.join(' ')}`, (testContext) => {
    const host = setUpWithBuildDue(testContext);
    writeFileSync(join(host.root, 'agentrite.json'), 'not json');
    const refs = host.git('for-each-ref');

    const result = host.run(args);

    assertRefused(host, result, 2, refs);
    assert.ok(
      result.stderr.startsWith(
        'sandbox.sh: --variant is not taken in a project without the change process.\n' +
          'Variants belong to the change process. Give each run a branch of its own.\n',
      ),
      result.stderr,
    );
    assertSandboxOnlyForms(result.stderr);
  });
}

// R22

test('the forms listed with a refusal of the arguments name a branch, and nothing of the process', (testContext) => {
  const host = setUpWithBuildDue(testContext);
  const refs = host.git('for-each-ref');

  const result = host.run(['--frobnicate']);

  assertRefused(host, result, 2, refs);
  assert.ok(result.stderr.startsWith('sandbox.sh: there is no option --frobnicate.\n'), result.stderr);
  assert.ok(result.stderr.includes('A branch or a command that opens with - goes after --.\n'), result.stderr);
  assertSandboxOnlyForms(result.stderr);
});

test('the forms listed when nothing to mount was given name a branch, and nothing of the process', (testContext) => {
  const host = setUpWithBuildDue(testContext);
  const refs = host.git('for-each-ref');

  const result = host.run([]);

  assertRefused(host, result, 2, refs);
  assert.ok(result.stderr.startsWith('sandbox.sh: nothing to mount at /work was given.\n'), result.stderr);
  assertSandboxOnlyForms(result.stderr);
});

// R19

const markRunning = ({ runningContainer }) => writeFileSync(runningContainer, '0123456789ab\n');

test('--connect BRANCH runs the command in the container of the run of that branch', (testContext) => {
  const host = setUp(testContext);
  markRunning(host);

  const result = host.run(['--connect', branch, 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const [call, ...rest] = host.dockerCalls();
  assert.deepEqual(rest, []);
  assert.ok(call.startsWith(`${host.recorded} docker exec --interactive --user agent --workdir /work `), call);
  assert.ok(call.endsWith(` project-sandbox-${branch} /usr/local/bin/known-terminal.sh echo hi`), call);
});

for (const name of ['claude', '0010', 'feature-0010-init2']) {
  test(`--connect ${name} is refused with 1 for a name that is no local branch, and cuts nothing`, (testContext) => {
    const host = setUpWithBuildDue(testContext);
    markRunning(host);
    const refs = host.git('for-each-ref');

    const result = host.run(['--connect', name, 'echo', 'hi']);

    assertRefused(host, result, 1, refs);
    assert.equal(result.stderr, `sandbox.sh: '${name}' is no local branch, so there is no run to connect to.\n`);
  });
}

test('--connect with no name is refused with 2, by a message that names a branch', (testContext) => {
  const host = setUpWithBuildDue(testContext);
  const refs = host.git('for-each-ref');

  const result = host.run(['--connect']);

  assertRefused(host, result, 2, refs);
  assert.ok(result.stderr.startsWith('sandbox.sh: --connect needs a branch.\n'), result.stderr);
  assertSandboxOnlyForms(result.stderr);
});

// R20, R21

test('--in-place and --workdir run as they do in a project with the process', (testContext) => {
  const host = setUp(testContext);
  const other = join(host.base, 'other');
  mkdirSync(other);

  assert.equal(host.run(['--in-place', 'echo', 'hi']).status, 0);
  assert.equal(host.run(['--workdir', other, 'echo', 'hi']).status, 0);

  assert.deepEqual(host.dockerCalls(), [
    `${host.compose} run --rm ${host.harnessFlags}--volume ${host.root}:/work ${host.runMounts}sandbox echo hi`,
    `${host.compose} run --rm ${host.harnessFlags}--volume ${other}:/work ${host.runMounts}sandbox echo hi`,
  ]);
});

test('every recorded call carries the hooks directory without a hook', (testContext) => {
  const host = setUp(testContext);
  rmSync(host.imageLabels);

  assert.equal(host.run([branch, 'echo', 'hi']).status, 0);

  const calls = host.dockerCalls();
  assert.ok(calls.some((call) => call.includes(' build')), calls.join('\n'));
  for (const call of calls) assert.ok(call.startsWith(`${host.recorded} docker `), call);
});
