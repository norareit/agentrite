import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
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
import { delimiter, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { copyKitInstructions, kitSettingsText } from './installed-kit.mjs';
import { skipReason } from './skip-reason.mjs';
import { fakeHost, logDirectories, logDirectory, logMounts, writeCommand } from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const kitContainer = fileURLToPath(new URL('../container/', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const kitPath = 'node_modules/agentrite/container';

// An agentrite.json that names `defaultBranch`, and in which the bell does not ring.
function settingsFor(defaultBranch) {
  return kitSettingsText({ defaultBranch, harnesses: ['claude'], sandbox: true, bell: false });
}

const branch = 'task-0026-doc';
const containerName = `project-sandbox-${branch}`;
const sandboxRef = `refs/remotes/sandbox/${branch}`;

// A project that is a git repository, with the kit's wrapper, its unit-clone.sh and its scripts installed under its
// ignored `node_modules`, and the host of `fakeHost`, whose Compose project is `project-sandbox`. The repository is
// on `master`, which its committed `agentrite.json` names as the default branch, and has three more branches, of
// which `task-0026-doc` is one commit ahead of `master`. It ignores
// `node_modules`, `.reviews` and `.env`, and holds a file that is not committed, `draft.txt`. The home has a git
// identity and nothing else, so the state directory is `.local/state` in it unless a run sets XDG_STATE_HOME. `run`
// runs the wrapper with the project root and `args`, and `git` runs the real git in the repository.
function setUp(t, { imageExists = true } = {}) {
  const base = temporaryDirectory(t, 'sandbox-unit-run-');
  const root = join(base, 'project');
  const container = join(root, kitPath);
  mkdirSync(container, { recursive: true });
  for (const file of ['sandbox.sh', 'unit-clone.sh']) copyFileSync(join(kitContainer, file), join(container, file));
  chmodSync(join(container, 'sandbox.sh'), 0o755);
  // The wrapper runs the reader of agentrite.json from the kit's scripts/, beside its container/.
  cpSync(kitScripts, join(container, '..', 'scripts'), { recursive: true });
  // The files agentrite.json names, which the reader checks.
  copyKitInstructions(join(container, '..'));
  writeFileSync(join(root, 'agentrite.json'), settingsFor('master'));
  mkdirSync(join(root, 'sandbox'));
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), '');
  writeFileSync(join(root, '.gitignore'), 'node_modules\n.reviews\n.env\n');
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const host = fakeHost(base, ['AGENTRITE_CONTAINER']);
  if (!imageExists) rmSync(host.imageLabels);

  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: { HOME: home, PATH: process.env.PATH } }).trim();
  git('init', '--quiet', '--initial-branch', 'master');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the project');
  git('branch', 'feature-0010-init');
  git('branch', 'feature-0010-init2');
  git('checkout', '--quiet', '-b', branch);
  writeFileSync(join(root, 'unit.md'), 'the unit\n');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the unit');
  git('checkout', '--quiet', 'master');
  writeFileSync(join(root, 'draft.txt'), 'not committed\n');

  const state = join(home, '.local', 'state');
  const clone = join(state, 'agentrite', 'project-sandbox', branch);
  const run = (args, env = {}) =>
    spawnSync(join(container, 'sandbox.sh'), [root, ...args], {
      encoding: 'utf-8',
      env: { ...env, HOME: home, PATH: host.bin },
    });
  // What every recorded Compose call opens with.
  const compose =
    `AGENTRITE_CONTAINER=${kitPath} docker compose --project-directory ${root} ` +
    `-f ${container}/compose.yml -f ${root}/sandbox/compose.project.yml`;
  // The project's log directory, which is named after the root and lies in the home's data directory unless a run
  // sets XDG_DATA_HOME.
  const logs = logDirectory(join(home, '.local', 'share'), root);
  // The calls of a unit run that mounts `mounted` at /work, with the flags of the host's terminal in `terminal`
  // before the mounts, `mounts` after the two of the unit run and the two directories of `logDirectory` last.
  const unitRun = (mounted, mounts = '', logDirectory = logs, terminal = '') => [
    `AGENTRITE_CONTAINER=${kitPath} docker rm ${containerName}`,
    `${compose} run --rm --name ${containerName} ${terminal}--volume ${mounted}:/work ` +
      `--volume ${root}/.reviews:/work/.reviews ${mounts}${logMounts(logDirectory)}sandbox echo hi`,
  ];
  // The script the stand-in `docker` runs as the agent, in the directory mounted at /work.
  const agent = (script) => writeFileSync(host.agentScript, `set -e\n${script}\n`);
  return { base, root, container, home, state, clone, logs, run, git, compose, unitRun, agent, ...host };
}

// A host on which a build would be due and would need the registry, so that a refusal that comes too late shows
// in the calls: no image, and no Claude Code on the host.
function setUpWithBuildDue(t) {
  const host = setUp(t, { imageExists: false });
  rmSync(join(host.bin, 'claude'));
  return host;
}

for (const unit of [branch, '0026']) {
  test(`the wrapper runs the branch ${branch} for the unit ${unit}`, (t) => {
    const { clone, run, dockerCalls, unitRun } = setUp(t);
    const result = run([unit, 'echo', 'hi']);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(dockerCalls(), unitRun(clone));
  });
}

test('the wrapper lists the branches an ID names when there are several, and starts nothing', (t) => {
  const { state, run, dockerCalls, npmCalls } = setUpWithBuildDue(t);
  const result = run(['0010', 'echo', 'hi']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /^ {2}feature-0010-init$/m);
  assert.match(result.stderr, /^ {2}feature-0010-init2$/m);
  assert.deepEqual(dockerCalls(), []);
  assert.deepEqual(npmCalls(), []);
  assert.equal(existsSync(state), false);
});

for (const unit of ['claude', 'feature-0031-cut-me']) {
  test(`the wrapper says that ${unit} names no branch and that a number gets one cut, and starts nothing`, (t) => {
    const { root, state, run, git, dockerCalls, npmCalls } = setUpWithBuildDue(t);
    commitUnit({ root, git }, 'kind: feature');
    const refs = git('for-each-ref');
    const result = run([unit, 'echo', 'hi']);
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes(`'${unit}'`), result.stderr);
    assert.ok(
      result.stderr.includes(
        "A unit's branch is cut from the default branch when the unit is given by its number.\n",
      ),
      result.stderr,
    );
    assert.doesNotMatch(result.stderr, /master/);
    assert.ok(result.stderr.includes('An ID with no branch gets one, cut from the default branch\n'), result.stderr);
    assert.doesNotMatch(result.stderr, /made on the host/);
    assert.match(result.stderr, /sandbox\.sh --in-place /);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(state), false);
    assert.equal(git('for-each-ref'), refs);
  });
}

// The cutting of a unit's branch: the default branch holds the unit's directory and no branch holds its number.

const cutDirectory = '0031-cut-me';

// Commits `files` as the unit's directory on the branch that is checked out, with whatever else the index holds,
// and returns the commit, abbreviated.
// The files are the record alone, with `frontmatter` between its two lines of dashes, unless others are given.
function commitUnit({ root, git }, frontmatter, files = { 'record.md': `---\n${frontmatter}\n---\n\n# Cut me\n` }) {
  mkdirSync(join(root, 'changes', cutDirectory), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, 'changes', cutDirectory, name), content);
  }
  git('add', 'changes');
  git('commit', '--quiet', '--message', 'the spec of a unit');
  return git('rev-parse', '--short', 'HEAD');
}

for (const [kind, prefix] of [
  ['feature', 'feature'],
  ['bug', 'bugfix'],
  ['task', 'task'],
]) {
  test(`the wrapper cuts ${prefix}-${cutDirectory} from master for a ${kind} that has no branch, and runs it`, (t) => {
    const host = setUp(t);
    const { root, state, run, git, dockerCalls, unitRun } = host;
    const commit = commitUnit(host, `kind: ${kind}\nstatus: approved\ntimestamp: 2026-10-05T13:45:27Z`);
    const cut = `${prefix}-${cutDirectory}`;

    const result = run(['0031', 'echo', 'hi']);

    assert.equal(result.status, 0, result.stderr);
    assert.ok(
      result.stderr.includes(`sandbox.sh: cut ${cut} from master at ${commit}, for changes/${cutDirectory}.\n`),
      result.stderr,
    );
    assert.equal(git('rev-parse', `refs/heads/${cut}`), git('rev-parse', 'refs/heads/master'));
    const calls = unitRun(join(state, 'agentrite', 'project-sandbox', cut));
    assert.deepEqual(
      dockerCalls(),
      calls.map((call) => call.replaceAll(containerName, `project-sandbox-${cut}`)),
    );
    assert.equal(existsSync(join(root, '.git', 'refs', 'remotes', 'sandbox')), false);
  });
}

test('the wrapper cuts the branch before it builds: a build that fails leaves the branch cut', (t) => {
  const host = setUp(t, { imageExists: false });
  const { run, git, buildFails, dockerCalls } = host;
  commitUnit(host, 'kind: feature');
  writeFileSync(buildFails, '');

  const result = run(['0031', 'echo', 'hi']);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^sandbox\.sh: cut feature-0031-cut-me from master at /m);
  assert.equal(git('rev-parse', 'refs/heads/feature-0031-cut-me'), git('rev-parse', 'refs/heads/master'));
  assert.equal(dockerCalls().filter((call) => / run /.test(call)).length, 0);
  assert.ok(result.stderr.indexOf('sandbox.sh: cut ') < result.stderr.indexOf('failed to solve'), result.stderr);
});

test('cutting a branch leaves the checked out branch, the tree, the index and every other branch as they were', (t) => {
  const host = setUp(t);
  const { root, run, git } = host;
  commitUnit(host, 'kind: feature');
  git('checkout', '--quiet', 'feature-0010-init');
  writeFileSync(join(root, '.gitignore'), 'node_modules\n.reviews\n.env\nchanged, not staged\n');
  writeFileSync(join(root, 'staged.txt'), 'staged\n');
  git('add', 'staged.txt');
  const before = {
    head: git('symbolic-ref', 'HEAD'),
    status: git('status', '--porcelain', '--untracked-files=all'),
    unstaged: git('diff'),
    staged: git('diff', '--cached'),
    refs: git('for-each-ref'),
  };

  const result = run(['0031', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /^sandbox\.sh: cut feature-0031-cut-me from master at /m);
  const cutRef = `${git('rev-parse', 'master')} commit\trefs/heads/feature-0031-cut-me`;
  assert.deepEqual(
    {
      head: git('symbolic-ref', 'HEAD'),
      status: git('status', '--porcelain', '--untracked-files=all'),
      unstaged: git('diff'),
      staged: git('diff', '--cached'),
      refs: git('for-each-ref')
        .split('\n')
        .filter((ref) => ref !== cutRef)
        .join('\n'),
    },
    before,
  );
  assert.ok(git('for-each-ref').split('\n').includes(cutRef));
});

test('a second run of a unit whose branch was cut runs that branch, and cuts nothing', (t) => {
  const host = setUp(t);
  const { run, git } = host;
  commitUnit(host, 'kind: feature');
  assert.equal(run(['0031', 'echo', 'hi']).status, 0);
  const refs = git('for-each-ref');

  const result = run(['0031', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /cut /);
  assert.equal(git('for-each-ref'), refs);
});

// What makes the wrapper cut nothing, each with what its message must name.
const noCut = [
  {
    name: 'digits master holds no unit of',
    unit: '0099',
    arrange: (host) => commitUnit(host, 'kind: feature'),
    says: [/'0099' names no local branch/, /master holds no unit of that number in changes\//],
  },
  {
    name: 'digits that only open a longer number',
    unit: '003',
    arrange: (host) => commitUnit(host, 'kind: feature'),
    says: [/'003' names no local branch/, /master holds no unit of that number in changes\//],
  },
  {
    name: 'digits that open two directories on master',
    unit: '0031',
    arrange: (host) => {
      mkdirSync(join(host.root, 'changes', `${cutDirectory}-too`), { recursive: true });
      writeFileSync(join(host.root, 'changes', `${cutDirectory}-too`, 'record.md'), '---\nkind: bug\n---\n');
      commitUnit(host, 'kind: feature');
    },
    says: [
      /'0031' names no local branch, and master holds more than one unit of that number:/,
      /^ {2}changes\/0031-cut-me$/m,
      /^ {2}changes\/0031-cut-me-too$/m,
    ],
  },
  {
    name: 'a unit that is in the working tree and not on master',
    unit: '0031',
    arrange: ({ root }) => {
      mkdirSync(join(root, 'changes', cutDirectory), { recursive: true });
      writeFileSync(join(root, 'changes', cutDirectory, 'record.md'), '---\nkind: feature\n---\n');
    },
    says: [/master holds no unit of that number in changes\//],
  },
  {
    name: 'a unit with no record',
    unit: '0031',
    arrange: (host) => commitUnit(host, '', { 'spec.md': '# Cut me\n' }),
    says: [/changes\/0031-cut-me\/record\.md/, /cannot be read/],
  },
  {
    name: 'a record with no kind',
    unit: '0031',
    arrange: (host) => commitUnit(host, 'status: approved'),
    says: [/changes\/0031-cut-me\/record\.md/, /names no kind/],
  },
  {
    name: 'a record with a kind the kit does not have',
    unit: '0031',
    arrange: (host) => commitUnit(host, 'kind: chore'),
    says: [/changes\/0031-cut-me\/record\.md/, /names no kind/],
  },
  {
    name: 'a repository with no branch master',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      host.git('branch', '--move', 'master', 'main');
    },
    says: [
      /'0031' names no local branch, and there is no local branch master to cut one from\./,
      /^agentrite\.json names master as the default branch\.$/m,
    ],
  },
  {
    name: 'a default branch that is a tag and no branch',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      host.git('tag', 'released');
      writeFileSync(join(host.root, 'agentrite.json'), settingsFor('released'));
    },
    says: [/no local branch released to cut one from/, /^agentrite\.json names released as the default branch\.$/m],
  },
  {
    name: 'a project with no agentrite.json',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      // The file stays committed on master: it is the one of the working tree that is read.
      rmSync(join(host.root, 'agentrite.json'));
    },
    // Unit 0058, R7: the start reads bell before a branch is cut, and is refused for it.
    says: [
      new RegExp(
        '^agentrite: the project has no agentrite\\.json, so bell is missing\\. It must hold true or false\\. ' +
          'Run: npx agentrite config, which writes one$',
        'm',
      ),
    ],
  },
  {
    name: 'an agentrite.json that is not JSON',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      writeFileSync(join(host.root, 'agentrite.json'), 'not json');
    },
    says: [/^agentrite: agentrite\.json is not JSON: .*, so bell cannot be read\. It must hold true or false$/m],
  },
  // Unit 0058, R7
  {
    name: 'an agentrite.json that lacks bell',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      writeFileSync(join(host.root, 'agentrite.json'), settingsFor('master').replace('  "bell": false,\n', ''));
    },
    says: [/^agentrite: agentrite\.json: bell is missing\. It must hold true or false$/m],
  },
  {
    name: 'an agentrite.json that is not valid in a key the wrapper does not use',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      writeFileSync(join(host.root, 'agentrite.json'), settingsFor('master').replace('true', '"yes"'));
    },
    says: [
      /^agentrite: agentrite\.json: sandbox is "yes"\. It must hold true or false$/m,
      /^sandbox\.sh: so no branch is cut for '0031'\.$/m,
    ],
  },
  // Unit 0054, R4
  {
    name: 'an agentrite.json whose standards names no file',
    unit: '0031',
    arrange: (host) => {
      commitUnit(host, 'kind: feature');
      rmSync(join(host.root, 'node_modules', 'agentrite', 'standards.md'));
    },
    says: [
      new RegExp(
        '^agentrite: agentrite\\.json: standards is "node_modules/agentrite/standards\\.md", and there is no file ' +
          "at it\\. It must name a file in the project's working tree$",
        'm',
      ),
      /^sandbox\.sh: so no branch is cut for '0031'\.$/m,
    ],
  },
];

for (const { name, unit, arrange, says } of noCut) {
  test(`the wrapper cuts no branch for ${name}, says why, and starts nothing`, (t) => {
    const host = setUpWithBuildDue(t);
    const { state, run, git, dockerCalls, npmCalls } = host;
    arrange(host);
    const refs = git('for-each-ref');

    const result = run([unit, 'echo', 'hi']);

    assert.equal(result.status, 2, result.stderr);
    for (const said of says) assert.match(result.stderr, said);
    assert.doesNotMatch(result.stderr, /made on the host|sandbox\.sh: cut /);
    assert.equal(git('for-each-ref'), refs);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(state), false);
  });
}

// A default branch that is not `master`, in a repository that also has a branch `master`.

// Moves the repository of `setUp` to the default branch `main`, with an agentrite.json that names it and is in the
// index for the next commit.
function moveToMain({ root, git }) {
  git('branch', '--move', 'master', 'main');
  writeFileSync(join(root, 'agentrite.json'), settingsFor('main'));
  git('add', 'agentrite.json');
}

test('the wrapper cuts from the default branch agentrite.json names, and not from a branch master', (t) => {
  const host = setUp(t);
  const { state, run, git, dockerCalls, unitRun } = host;
  moveToMain(host);
  // A master that does not hold the unit: a cut from it would be refused.
  git('branch', 'master');
  const commit = commitUnit(host, 'kind: feature');

  const result = run(['0031', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.stderr.includes(`sandbox.sh: cut feature-0031-cut-me from main at ${commit}, for changes/0031-cut-me.\n`),
    result.stderr,
  );
  assert.doesNotMatch(result.stderr, /master/);
  assert.equal(git('rev-parse', 'refs/heads/feature-0031-cut-me'), git('rev-parse', 'refs/heads/main'));
  assert.notEqual(git('rev-parse', 'refs/heads/main'), git('rev-parse', 'refs/heads/master'));
  const calls = unitRun(join(state, 'agentrite', 'project-sandbox', 'feature-0031-cut-me'));
  assert.deepEqual(
    dockerCalls(),
    calls.map((call) => call.replaceAll(containerName, 'project-sandbox-feature-0031-cut-me')),
  );
});

test('the wrapper names the default branch in what it says of a unit the branch does not hold', (t) => {
  const host = setUpWithBuildDue(t);
  moveToMain(host);
  host.git('commit', '--quiet', '--message', 'the default branch is main');
  host.git('branch', 'master');

  const result = host.run(['0099', 'echo', 'hi']);

  assert.equal(result.status, 2);
  assert.match(result.stderr, /^main holds no unit of that number in changes\/, so there is no branch to cut\.$/m);
  assert.doesNotMatch(result.stderr, /master/);
  assert.deepEqual(host.dockerCalls(), []);
});

test('the wrapper reads the agentrite.json of the working tree, whatever is committed and checked out', (t) => {
  const host = setUp(t);
  const { root, run, git } = host;
  // Committed, the file names master. The unit is on main alone, and the checkout is on a third branch.
  git('checkout', '--quiet', '-b', 'main');
  const commit = commitUnit(host, 'kind: feature');
  git('checkout', '--quiet', 'feature-0010-init');
  writeFileSync(join(root, 'agentrite.json'), settingsFor('main'));

  const result = run(['0031', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stderr.includes(`sandbox.sh: cut feature-0031-cut-me from main at ${commit}, `), result.stderr);
  assert.equal(git('rev-parse', 'refs/heads/feature-0031-cut-me'), git('rev-parse', 'refs/heads/main'));
  assert.equal(git('show', 'main:agentrite.json'), settingsFor('master').trim());
  assert.equal(git('symbolic-ref', '--short', 'HEAD'), 'feature-0010-init');
});

// R7: the runs that cut no branch read nothing of the file but bell, which unit 0058 has every start read, and
// --connect, which starts nothing, reads nothing of it.
for (const [what, settings, forms] of [
  ['an agentrite.json of bell alone', '{"bell": false}\n', ['unit', 'in place', 'connect']],
  ['no agentrite.json', null, ['connect']],
  ['an agentrite.json that is not valid', 'not json', ['connect']],
]) {
  test(`a run that cuts no branch makes the calls it makes with a valid file, with ${what}`, (t) => {
    const withFile = setUp(t);
    const without = setUp(t);
    if (settings === null) rmSync(join(without.root, 'agentrite.json'));
    else writeFileSync(join(without.root, 'agentrite.json'), settings);

    for (const [form, args] of [
      ['unit', [branch, 'echo', 'hi']],
      ['unit', ['0026', 'echo', 'hi']],
      ['in place', ['--in-place', 'echo', 'hi']],
      ['in place', ['--workdir', (host) => host.base, 'echo', 'hi']],
      ['connect', ['--connect', branch, 'echo', 'hi']],
    ]) {
      if (!forms.includes(form)) continue;
      const results = [withFile, without].map((host) => {
        const connects = args[0] === '--connect';
        if (connects) markRunning(host);
        const before = host.dockerCalls().length;
        const result = host.run(args.map((arg) => (typeof arg === 'function' ? arg(host) : arg)));
        if (connects) rmSync(host.runningContainer);
        // The calls of this run, with what differs between the two hosts taken out.
        const calls = host.dockerCalls().slice(before);
        return { result, calls: calls.map((call) => call.replaceAll(host.base, '<base>')) };
      });

      assert.equal(results[1].result.status, 0, results[1].result.stderr);
      assert.equal(results[0].result.status, 0, results[0].result.stderr);
      assert.ok(results[0].calls.length > 0, args.join(' '));
      assert.deepEqual(results[1].calls, results[0].calls);
      assert.equal(
        results[1].result.stderr.replaceAll(without.base, '<base>'),
        results[0].result.stderr.replaceAll(withFile.base, '<base>'),
      );
    }
  });
}

// Unit 0058, R1, R7: a unit run reads bell at its start, and rings as it says.
test('a unit run with "bell": true mounts the bell and names the plugin to OpenCode', (t) => {
  const { root, container, clone, run, dockerCalls, unitRun } = setUp(t);
  writeFileSync(join(root, 'agentrite.json'), settingsFor('master').replace('"bell": false', '"bell": true'));

  const result = run([branch, 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  const bell =
    `--volume ${container}/bell:/etc/agentrite/bell:ro ` +
    `--volume ${container}/bell/claude-managed-settings.json:` +
    '/etc/claude-code/managed-settings.d/agentrite-bell.json:ro ';
  const plugin = '--env OPENCODE_CONFIG_CONTENT={"plugin":["file:///etc/agentrite/bell/opencode-plugin.js"]} ';
  assert.deepEqual(dockerCalls(), unitRun(clone, bell, undefined, plugin));
});

// Unit 0058, R7: --connect starts nothing, so it reads no bell and connects whatever the file holds of it.
test('--connect with an agentrite.json that lacks bell connects, reading nothing', (t) => {
  const host = setUp(t);
  writeFileSync(join(host.root, 'agentrite.json'), settingsFor('master').replace('  "bell": false,\n', ''));
  markRunning(host);

  const result = host.run(['--connect', branch, 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(host.dockerCalls(), [connectCall('echo hi')]);
});

test('the forms the wrapper lists say the default branch, and are printed without reading the file', (t) => {
  const { root, run } = setUpWithBuildDue(t);
  rmSync(join(root, 'agentrite.json'));

  const result = run([]);

  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes('An ID with no branch gets one, cut from the default branch\n'), result.stderr);
  assert.doesNotMatch(result.stderr, /master|agentrite\.json/);
});

// R30: inside the clone the change check reads the clone's own file and finds its base as origin/<default branch>.
test('the change check inside the clone of a unit run compares with origin/<default branch>', (t) => {
  const host = setUp(t);
  const { base, root, run, git, agent } = host;
  moveToMain(host);
  git('commit', '--quiet', '--message', 'the default branch is main');
  // A master that does not hold the frozen unit: a check against it would find nothing changed.
  git('branch', 'master');
  mkdirSync(join(root, 'changes', '0001-frozen'), { recursive: true });
  writeFileSync(join(root, 'changes', '0001-frozen', 'record.md'), '---\nkind: feature\nstatus: implemented\n---\n');
  writeFileSync(join(root, 'changes', '0001-frozen', 'spec.md'), 'the spec\n');
  commitUnit(host, 'kind: feature\nstatus: approved');
  const report = join(base, 'check-report');
  agent(
    [
      // The clone has the default branch as origin/main alone, and its own committed agentrite.json.
      `git for-each-ref --format='%(refname)' > "${report}"`,
      `cat agentrite.json >> "${report}"`,
      'echo changed > changes/0001-frozen/spec.md',
      'git commit --quiet --all --message "change a frozen spec"',
      // What npm ci gives the clone: the files agentrite.json names, under node_modules.
      `node -e 'require("fs").mkdirSync("node_modules"); require("fs").symlinkSync(process.argv[1], ` +
        `"node_modules/agentrite")' "${join(kitScripts, '..')}"`,
      'status=0',
      `node "${kitScripts}check-changes.mjs" . >> "${report}" 2>&1 || status=$?`,
      `echo "status $status" >> "${report}"`,
    ].join('\n'),
  );

  const result = run(['0031', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  const reported = readFileSync(report, 'utf-8');
  assert.match(reported, /^refs\/remotes\/origin\/main$/m);
  assert.doesNotMatch(reported, /^refs\/heads\/(main|master)$/m);
  assert.ok(reported.includes(settingsFor('main')), reported);
  assert.match(reported, /^- 0001-frozen: spec\.md$/m);
  assert.match(reported, /^status 1$/m);
});

for (const unit of [branch, '0026']) {
  test(`the wrapper refuses a second run of ${unit} while its container is running, and names --connect`, (t) => {
    const { state, run, git, runningContainer, dockerCalls, npmCalls } = setUpWithBuildDue(t);
    writeFileSync(runningContainer, '0123456789ab\n');
    const refs = git('for-each-ref');
    const result = run([unit, 'echo', 'hi']);
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes(containerName), result.stderr);
    assert.match(result.stderr, /is running/);
    assert.ok(result.stderr.includes(`'docker stop ${containerName}'`), result.stderr);
    assert.ok(result.stderr.includes(`'sandbox.sh --connect ${unit} [COMMAND...]'`), result.stderr);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(state), false);
    assert.equal(git('for-each-ref'), refs);
  });
}

test('the wrapper puts the clone under XDG_STATE_HOME when that is set', (t) => {
  const { base, home, run, dockerCalls, unitRun } = setUp(t);
  const state = join(base, 'state');
  const result = run([branch, 'echo', 'hi'], { XDG_STATE_HOME: state });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), unitRun(join(state, 'agentrite', 'project-sandbox', branch)));
  assert.equal(existsSync(join(home, '.local', 'state')), false);
});

// The logs of a unit run are those of the project, whatever branch is cloned and whatever Docker calls the project.
test("a unit run mounts the log directories of the project root, which the wrapper made before Docker ran", (t) => {
  const { base, home, clone, logs, run, agent, dockerCalls, unitRun } = setUp(t);
  assert.equal(logs, join(home, '.local', 'share', 'agentrite', 'project'));
  const seen = join(base, 'seen');
  const both = logDirectories.map((directory) => `[ -d "${logs}/${directory}" ]`).join(' && ');
  agent(`${both} && echo both > "${seen}"`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), unitRun(clone));
  assert.equal(readFileSync(seen, 'utf-8'), 'both\n');
  assert.deepEqual(readdirSync(join(home, '.local', 'share', 'agentrite')), ['project']);
  for (const directory of logDirectories) assert.equal(statSync(join(logs, directory)).uid, process.getuid());
});

test('a unit run mounts the log directories under XDG_DATA_HOME when that is set, and the clone stays put', (t) => {
  const { base, home, clone, run, dockerCalls, unitRun } = setUp(t);
  const data = join(base, 'data');
  const result = run([branch, 'echo', 'hi'], { XDG_DATA_HOME: data });
  assert.equal(result.status, 0, result.stderr);
  const logs = join(data, 'agentrite', 'project');
  assert.deepEqual(dockerCalls(), unitRun(clone, '', logs));
  for (const directory of logDirectories) assert.equal(statSync(join(logs, directory)).isDirectory(), true);
  assert.equal(existsSync(join(home, '.local', 'share')), false);
});

test('the wrapper leaves no clone behind when the build fails', (t) => {
  const { clone, run, buildFails, dockerCalls, compose } = setUp(t, { imageExists: false });
  writeFileSync(buildFails, '');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 17);
  assert.match(result.stderr, /failed to solve: no network/);
  assert.deepEqual(dockerCalls(), [`${compose} build`]);
  assert.equal(existsSync(clone), false);
});

// The agent leaves a file that is not committed, so that the clone is kept and can be looked at after the run.
test("the wrapper mounts a new clone of the branch, at the host's commit, that shares no file with the host", (t) => {
  const { root, clone, run, git, agent, dockerCalls, unitRun } = setUp(t);
  agent('echo kept > kept.txt');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), unitRun(clone));
  const inClone = (...args) => git('-C', clone, ...args);
  assert.equal(inClone('symbolic-ref', '--short', 'HEAD'), branch);
  assert.equal(inClone('rev-parse', 'HEAD'), git('rev-parse', branch));
  assert.equal(inClone('rev-parse', 'origin/master'), git('rev-parse', 'master'));
  assert.equal(readFileSync(join(clone, 'unit.md'), 'utf-8'), 'the unit\n');
  assert.equal(existsSync(join(clone, 'draft.txt')), false);
  assert.equal(existsSync(join(clone, 'node_modules')), false);
  const commit = git('rev-parse', branch);
  const object = join('.git', 'objects', commit.slice(0, 2), commit.slice(2));
  assert.notEqual(statSync(join(clone, object)).ino, statSync(join(root, object)).ino);
});

test('the wrapper mounts a clone that is still there as it is, and says that it resumes it', (t) => {
  const { clone, run, agent, dockerCalls, unitRun } = setUp(t);
  agent('echo kept > kept.txt');
  assert.equal(run([branch, 'echo', 'hi']).status, 0);
  agent('cat kept.txt > seen.txt');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /resum/i);
  assert.ok(result.stderr.includes(clone), result.stderr);
  assert.deepEqual(dockerCalls(), [...unitRun(clone), ...unitRun(clone)]);
  assert.equal(readFileSync(join(clone, 'seen.txt'), 'utf-8'), 'kept\n');
});

test('the wrapper refuses a new clone while sandbox/<branch> holds commits the branch lacks, before it builds', (t) => {
  const { state, run, git, dockerCalls, npmCalls } = setUpWithBuildDue(t);
  const ahead = git('commit-tree', `${branch}^{tree}`, '-p', branch, '-m', 'an earlier run');
  git('update-ref', sandboxRef, ahead);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes(`sandbox/${branch}`), result.stderr);
  assert.match(result.stderr, /merge/);
  assert.deepEqual(dockerCalls(), []);
  assert.deepEqual(npmCalls(), []);
  assert.equal(existsSync(state), false);
  assert.equal(git('rev-parse', sandboxRef), ahead);
});

test('the wrapper takes --rebuild and --mount before the unit as its options', (t) => {
  const { base, clone, run, dockerCalls, compose, unitRun } = setUp(t);
  const mounted = join(base, 'mounted');
  mkdirSync(mounted);
  const result = run(['--rebuild', '--mount', `${mounted}:ro`, '0026', 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${compose} build`, ...unitRun(clone, `--volume ${mounted}:/mnt/mounted:ro `)]);
});

// The stand-in mounts nothing, so that a file written at /work/.reviews reaches the host is left to the check on
// a host with Docker.
test("the wrapper mounts the host's .reviews in the clone, and makes both directories itself", (t) => {
  const { base, root, clone, run, agent } = setUp(t);
  const seen = join(base, 'seen');
  agent(`[ -d .reviews ] && [ -d "${root}/.reviews" ] && echo both > "${seen}"\necho kept > kept.txt`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(seen, 'utf-8'), 'both\n');
  for (const directory of [join(root, '.reviews'), join(clone, '.reviews')]) {
    assert.equal(statSync(directory).uid, process.getuid());
    assert.deepEqual(readdirSync(directory), []);
  }
});

// After the container. The script the stand-in runs is the agent, and what it leaves in the clone is what the
// wrapper has to bring back or keep.
const commitWork = 'echo work > work.txt\ngit add work.txt\ngit commit --quiet --message work';
const subjectOf = (git, ref) => git('log', '--max-count=1', '--format=%s', ref);
const hasRef = (git, ref) => git('for-each-ref', ref) !== '';

for (const [what, checkedOut] of [
  ['which is not checked out', false],
  ['which is checked out', true],
]) {
  test(`the wrapper fast-forwards the host's branch, ${what}, to the agent's commit and removes the clone`, (t) => {
    const { root, clone, run, git, agent } = setUp(t);
    if (checkedOut) git('checkout', '--quiet', branch);
    agent(commitWork);
    const result = run([branch, 'echo', 'hi']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(subjectOf(git, branch), 'work');
    assert.equal(hasRef(git, sandboxRef), false);
    assert.equal(existsSync(clone), false);
    assert.equal(existsSync(join(root, 'work.txt')), checkedOut);
    assert.equal(git('symbolic-ref', '--short', 'HEAD'), checkedOut ? branch : 'master');
  });
}

test('the wrapper removes the clone of a run that left nothing, and says nothing of it', (t) => {
  const { clone, run, git } = setUp(t);
  const before = git('rev-parse', branch);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(git('rev-parse', branch), before);
  assert.equal(hasRef(git, sandboxRef), false);
  assert.equal(existsSync(clone), false);
});

// The host's branch gains a commit of its own while the agent works.
test("the wrapper leaves a host's branch that moved, keeps sandbox/<branch>, and names the merge", (t) => {
  const { root, clone, run, git, agent } = setUp(t);
  agent(
    `${commitWork}\n` +
      `moved="$(git -C "${root}" commit-tree "${branch}^{tree}" -p ${branch} -m moved)"\n` +
      `git -C "${root}" update-ref refs/heads/${branch} "$moved"`,
  );
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(subjectOf(git, branch), 'moved');
  assert.equal(subjectOf(git, sandboxRef), 'work');
  assert.ok(result.stderr.includes(`git merge sandbox/${branch}`), result.stderr);
  assert.equal(existsSync(clone), false);
});

for (const [what, script, named] of [
  ['a changed file', 'echo changed >> unit.md', 'unit.md'],
  ['a file that is not tracked', 'echo new > new.txt', 'new.txt'],
  [
    'a commit on a second branch',
    `git checkout --quiet -b other\n${commitWork}\ngit checkout --quiet ${branch}`,
    'refs/heads/other',
  ],
  ['a stash', 'echo changed >> unit.md\ngit stash --quiet', 'refs/stash'],
]) {
  test(`the wrapper keeps a clone that holds ${what}, and says where it is and what it holds`, (t) => {
    const { clone, run, git, agent } = setUp(t);
    agent(script);
    const result = run([branch, 'echo', 'hi']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(existsSync(clone), true);
    assert.ok(result.stderr.includes(clone), result.stderr);
    assert.ok(result.stderr.includes(named), result.stderr);
    assert.equal(hasRef(git, 'refs/heads/other'), false);
    assert.equal(hasRef(git, 'refs/stash'), false);
  });
}

test('the wrapper removes a clone that holds only files the project ignores', (t) => {
  const { clone, run, agent } = setUp(t);
  agent('mkdir node_modules\necho installed > node_modules/package.txt');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(existsSync(clone), false);
});

test("the wrapper lands the commit and exits with the command's status when that is not 0", (t) => {
  const { clone, run, git, agent } = setUp(t);
  agent(`${commitWork}\nexit 7`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 7);
  assert.equal(subjectOf(git, branch), 'work');
  assert.equal(existsSync(clone), false);
});

test('the wrapper fetches and removes nothing while the container is still running', (t) => {
  const { clone, run, git, agent, runningContainer } = setUp(t);
  const before = git('rev-parse', branch);
  agent(`${commitWork}\necho 0123456789ab > "${runningContainer}"`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stderr, /still running/);
  assert.ok(result.stderr.includes(clone), result.stderr);
  assert.equal(git('rev-parse', branch), before);
  assert.equal(hasRef(git, sandboxRef), false);
  assert.equal(existsSync(join(clone, 'work.txt')), true);
});

test('the wrapper says that the fetch failed, keeps the clone and exits non-zero', (t) => {
  const { clone, run, git, agent } = setUp(t);
  const before = git('rev-parse', branch);
  agent('rm -rf .git\necho orphan > orphan.txt');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sandbox\.sh: fetching .* failed/);
  assert.ok(result.stderr.includes(clone), result.stderr);
  assert.equal(git('rev-parse', branch), before);
  assert.equal(existsSync(join(clone, 'orphan.txt')), true);
});

// The signals a terminal sends reach the wrapper as they reach the container. The agent sends them itself: the
// stand-in is the wrapper's child, as `docker compose run` is.
test('the wrapper sees the container out and lands its work when it is interrupted meanwhile', (t) => {
  const { clone, run, git, agent } = setUp(t);
  agent(`${commitWork}\nkill -INT $PPID\nkill -TERM $PPID\nkill -HUP $PPID`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(subjectOf(git, branch), 'work');
  assert.equal(existsSync(clone), false);
});

// A clone whose configuration and hooks each leave a marker when git runs them. The agent arms them after its own
// last git command that would run one, and leaves a file so that the wrapper also compares the clone's tree.
test("the wrapper runs nothing of the clone's configuration and hooks on the host", (t) => {
  const { base, clone, run, git, agent } = setUp(t);
  const markers = join(base, 'markers');
  mkdirSync(markers);
  agent(
    `${commitWork}\necho left > left.txt\n` +
      `arm() { printf '#!/bin/sh\\necho ran > "${markers}/%s"\\n' "$1" > "$2"; chmod +x "$2"; }\n` +
      'for hook in post-checkout pre-commit post-merge; do arm "$hook" ".git/hooks/$hook"; done\n' +
      'arm fsmonitor .git/fsmonitor.sh\narm pack-objects .git/pack-objects.sh\n' +
      // git runs both values through a shell, so the path is quoted inside them to stay one word with a space in it.
      'git config uploadpack.packObjectsHook "\'$PWD/.git/pack-objects.sh\'"\n' +
      'git config core.fsmonitor "\'$PWD/.git/fsmonitor.sh\'"',
  );
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(subjectOf(git, branch), 'work');
  assert.ok(result.stderr.includes('left.txt'), result.stderr);
  assert.deepEqual(readdirSync(markers), []);
  // The trap was armed: git run in the clone, as the wrapper must not, leaves the marker.
  git('-C', clone, 'status');
  assert.deepEqual(readdirSync(markers), ['fsmonitor']);
});

test("the wrapper leaves the host's configuration, hooks and other branches as they were", (t) => {
  const { root, run, git, agent } = setUp(t);
  const others = () => git('for-each-ref', 'refs').replaceAll(/^.*refs\/heads\/task-0026-doc\n?/gm, '');
  const read = () => [
    readFileSync(join(root, '.git', 'config'), 'utf-8'),
    readdirSync(join(root, '.git', 'hooks')).map((hook) => [
      hook,
      readFileSync(join(root, '.git', 'hooks', hook), 'utf-8'),
    ]),
    others(),
    git('status', '--porcelain'),
  ];
  const before = read();
  agent(`${commitWork}\ngit tag made-inside\ngit branch other-inside`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(subjectOf(git, branch), 'work');
  assert.deepEqual(read(), before);
});

// What the review of 4da86cd found.

// Git overwrites an ignored file with a tracked one of a merge unless told not to.
test("the wrapper leaves a checked-out branch whose fast-forward would overwrite the host's ignored file", (t) => {
  const { root, run, git, agent } = setUp(t);
  git('checkout', '--quiet', branch);
  const before = git('rev-parse', branch);
  writeFileSync(join(root, '.env'), 'local-secret\n');
  agent('echo sandbox-copy > .env\ngit add --force .env\ngit commit --quiet --message work');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, '.env'), 'utf-8'), 'local-secret\n');
  assert.equal(git('rev-parse', branch), before);
  assert.equal(subjectOf(git, sandboxRef), 'work');
  assert.ok(result.stderr.includes(`git merge sandbox/${branch}`), result.stderr);
});

test('the wrapper starts nothing when Docker cannot say whether the container is running', (t) => {
  const { state, run, psFails, dockerCalls, npmCalls } = setUpWithBuildDue(t);
  writeFileSync(psFails, '');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /sandbox\.sh: could not ask Docker whether/);
  assert.ok(result.stderr.includes(containerName), result.stderr);
  assert.deepEqual(dockerCalls(), []);
  assert.deepEqual(npmCalls(), []);
  assert.equal(existsSync(state), false);
});

test('the wrapper fetches and removes nothing when Docker cannot say whether the container has stopped', (t) => {
  const { clone, run, git, agent, psFails } = setUp(t);
  const before = git('rev-parse', branch);
  agent(`${commitWork}\necho > "${psFails}"`);
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /sandbox\.sh: could not ask Docker whether/);
  assert.ok(result.stderr.includes(clone), result.stderr);
  assert.equal(git('rev-parse', branch), before);
  assert.equal(hasRef(git, sandboxRef), false);
  assert.equal(existsSync(join(clone, 'work.txt')), true);
});

// The agent leaves an ignored directory that cannot be emptied. What is left of a clone whose removal fails is
// not a clone any more, so it must not be where the next run looks for one.
test('the wrapper says that removing the clone failed, exits non-zero, and does not resume what is left', (t) => {
  const { clone, run, agent } = setUp(t);
  const left = join(clone, '..', `.discarded-${branch}`);
  const locked = join(left, 'node_modules', 'locked');
  agent('mkdir -p node_modules/locked\necho kept > node_modules/locked/file.txt\nchmod 555 node_modules/locked');
  try {
    const result = run([branch, 'echo', 'hi']);
    assert.equal(result.status, 1);
    assert.match(result.stderr, /sandbox\.sh: removing the clone failed/);
    assert.ok(result.stderr.includes(join(left)), result.stderr);
    assert.equal(existsSync(clone), false);
    assert.equal(existsSync(locked), true);

    agent('echo kept > kept.txt');
    const next = run([branch, 'echo', 'hi']);
    assert.doesNotMatch(next.stderr, /resuming the clone/);
    assert.equal(readFileSync(join(clone, 'unit.md'), 'utf-8'), 'the unit\n');
  } finally {
    // So that the test's own directory can be removed.
    if (existsSync(locked)) chmodSync(locked, 0o755);
  }
});

// Connecting: `--connect` runs a command in the container of the unit run that is under way, and starts nothing.

// What the entrypoint, the compose file and the image give the first command of a container, read from the three
// files, the script the entrypoint runs the command through among them. The wrapper holds them a second time, for
// the command it connects.
function firstCommandGets() {
  const read = (file) => readFileSync(join(kitContainer, file), 'utf-8');
  const entrypoint = read('entrypoint.sh');
  const [, home, user, logname] = entrypoint.match(/^export HOME=(\S+) USER=(\S+) LOGNAME=(\S+)$/m);
  return {
    path: entrypoint.match(/^export PATH=(\S+)$/m)[1],
    home,
    user,
    logname,
    becomes: entrypoint.match(/^exec setpriv --reuid=(\S+) /m)[1],
    through: entrypoint.match(/^exec setpriv .* -- (\S+) "\$@"$/m)[1],
    workingDirectory: read('compose.yml').match(/^ +working_dir: (\S+)$/m)[1],
    defaultCommand: read('Dockerfile').match(/^CMD \["([^"]+)"\]$/m)[1],
  };
}

// The one call of Docker a connect makes, as the stand-in records it: `command` in the unit run's container, run
// through the script that makes the TERM one the image describes, with a terminal when `tty` says so. It gives the
// command `term` and `colorterm` in every call, empty where the shell of the connect lacks one, since a command
// that is given none inherits the run's. A TERM the shell lacks is xterm on a terminal, as Docker gives it.
const connectCall = (command, { tty = false, term = tty ? 'xterm' : '', colorterm = '' } = {}) =>
  `AGENTRITE_CONTAINER=${kitPath} docker exec --interactive ${tty ? '--tty ' : ''}--user agent --workdir /work ` +
  '--env HOME=/home/agent --env USER=agent --env LOGNAME=agent ' +
  '--env PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin ' +
  `--env TERM=${term} --env COLORTERM=${colorterm} ${containerName} /usr/local/bin/known-terminal.sh ${command}`;

// What the stand-in's `ps` prints for a container that is running.
const markRunning = ({ runningContainer }) => writeFileSync(runningContainer, '0123456789ab\n');

for (const unit of [branch, '0026']) {
  test(`--connect ${unit} runs the command in the container of the run of ${branch}, and nothing else`, (t) => {
    const host = setUp(t);
    markRunning(host);
    const result = host.run(['--connect', unit, 'echo', 'hi']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(host.dockerCalls(), [connectCall('echo hi')]);
  });

  test(`--connect ${unit} with no command opens the shell a unit run opens`, (t) => {
    const host = setUp(t);
    markRunning(host);
    const result = host.run(['--connect', unit]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(host.dockerCalls(), [connectCall('bash')]);
  });
}

test('--connect exits with the status the connected command exited with', (t) => {
  const host = setUp(t);
  markRunning(host);
  writeFileSync(host.execStatus, '7\n');
  const result = host.run(['--connect', branch, 'echo', 'hi']);
  assert.equal(result.status, 7, result.stderr);
  assert.deepEqual(host.dockerCalls(), [connectCall('echo hi')]);
});

// The host's terminal: a unit run and a connected command are each given the TERM and the COLORTERM of the shell
// the wrapper was started from. A run is given each when it is set and not empty there. A connected command is
// given both in every call, empty for one the shell lacks, which the image's script removes.
test("a unit run passes the host's TERM and COLORTERM to the command", (t) => {
  const { clone, run, dockerCalls, unitRun, logs } = setUp(t);
  const result = run([branch, 'echo', 'hi'], { TERM: 'xterm-256color', COLORTERM: 'truecolor' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    dockerCalls(),
    unitRun(clone, '', logs, '--env TERM=xterm-256color --env COLORTERM=truecolor '),
  );
});

for (const [shell, env, given] of [
  [
    'with TERM and COLORTERM',
    { TERM: 'xterm-256color', COLORTERM: 'truecolor' },
    { term: 'xterm-256color', colorterm: 'truecolor' },
  ],
  ['with a TERM of tmux and no COLORTERM', { TERM: 'tmux-256color' }, { term: 'tmux-256color' }],
  ['with TERM and an empty COLORTERM', { TERM: 'xterm-256color', COLORTERM: '' }, { term: 'xterm-256color' }],
  ['with neither', {}, {}],
]) {
  test(`--connect gives the command what its own shell has of the two, the rest empty, from a shell ${shell}`, (t) => {
    const host = setUp(t);
    markRunning(host);
    const result = host.run(['--connect', branch, 'echo', 'hi'], env);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(host.dockerCalls(), [connectCall('echo hi', given)]);
  });
}

// `script` of util-linux runs a command on a terminal of its own. It is the suite's, not the wrapper's, so it is
// taken from the suite's PATH and is not in the stand-in's `bin`. A host without it skips the test, and the reason
// says where the whole suite runs.
function utilLinuxScript() {
  const found = (process.env.PATH ?? '')
    .split(delimiter)
    .filter((directory) => directory !== '')
    .map((directory) => join(directory, 'script'))
    .find((candidate) => existsSync(candidate));
  if (found === undefined) return undefined;
  const version = spawnSync(found, ['--version'], { encoding: 'utf-8' });
  return version.status === 0 && version.stdout.includes('util-linux') ? found : undefined;
}

test('--connect gives the command a terminal when the wrapper is run from one', (t) => {
  const script = utilLinuxScript();
  if (script === undefined) {
    t.skip(skipReason('script of util-linux, which runs the wrapper on a terminal, is not on the PATH of the suite'));
    return;
  }
  const host = setUp(t);
  markRunning(host);
  const wrapper = `'${join(host.container, 'sandbox.sh')}' '${host.root}' --connect ${branch} echo hi`;
  const result = spawnSync(script, ['--quiet', '--return', '--command', wrapper, '/dev/null'], {
    encoding: 'utf-8',
    env: { HOME: host.home, PATH: host.bin },
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  assert.deepEqual(host.dockerCalls(), [connectCall('echo hi', { tty: true })]);
});

test('--connect gives the command what the entrypoint, the compose file and the image give the first', (t) => {
  const gets = firstCommandGets();
  const host = setUp(t);
  markRunning(host);
  const result = host.run(['--connect', branch]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(gets.user, gets.becomes);
  assert.deepEqual(host.dockerCalls(), [
    `AGENTRITE_CONTAINER=${kitPath} docker exec --interactive --user ${gets.becomes} ` +
      `--workdir ${gets.workingDirectory} --env HOME=${gets.home} --env USER=${gets.user} ` +
      `--env LOGNAME=${gets.logname} --env PATH=${gets.path} --env TERM= --env COLORTERM= ${containerName} ` +
      `${gets.through} ${gets.defaultCommand}`,
  ]);
});

test('--connect builds, asks, clones, cuts and fetches nothing, and makes no directory on the host', (t) => {
  const host = setUpWithBuildDue(t);
  const { home, state, logs, run, git, dockerCalls, npmCalls } = host;
  markRunning(host);
  const before = { refs: git('for-each-ref'), status: git('status', '--porcelain') };

  const result = run(['--connect', '0026', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [connectCall('echo hi')]);
  assert.deepEqual(npmCalls(), []);
  assert.equal(existsSync(state), false);
  assert.equal(existsSync(logs), false);
  assert.equal(existsSync(join(home, '.local')), false);
  assert.deepEqual({ refs: git('for-each-ref'), status: git('status', '--porcelain') }, before);
});

// The agent of the unit run connects twice to its own run, as a developer does from two other terminals while
// the first command is at work. The container is running while it does, and has stopped when the script ends.
test('a unit run to which commands were connected lands its work and removes the clone as it does without', (t) => {
  const host = setUp(t);
  const { root, container, clone, run, git, agent, runningContainer, dockerCalls, unitRun } = host;
  const connect = (word) => `"${join(container, 'sandbox.sh')}" "${root}" --connect ${branch} echo ${word}`;
  agent(
    `echo 0123456789ab > "${runningContainer}"\n${connect('one')}\n${connect('two')}\n` +
      `rm "${runningContainer}"\n${commitWork}`,
  );

  const result = run([branch, 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [...unitRun(clone), connectCall('echo one'), connectCall('echo two')]);
  assert.equal(subjectOf(git, branch), 'work');
  assert.equal(hasRef(git, sandboxRef), false);
  assert.equal(existsSync(clone), false);
});

// What `--connect` refuses. Each on a host where a build would be due, so that a refusal that came too late
// would show in the calls of Docker and of npm.
function assertNothingRan(host, result) {
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(host.dockerCalls(), []);
  assert.deepEqual(host.npmCalls(), []);
  assert.equal(existsSync(host.state), false);
}

test('--connect with no unit is refused, and names --connect and its form', (t) => {
  const host = setUpWithBuildDue(t);
  markRunning(host);
  const result = host.run(['--connect']);
  assertNothingRan(host, result);
  assert.ok(result.stderr.includes('sandbox.sh: --connect needs a unit.\n'), result.stderr);
  assert.ok(result.stderr.includes('sandbox.sh --connect UNIT [COMMAND...]\n'), result.stderr);
});

for (const unit of ['claude', '0031']) {
  test(`--connect ${unit} is refused for a unit that names no branch, and cuts none`, (t) => {
    const host = setUpWithBuildDue(t);
    markRunning(host);
    commitUnit(host, 'kind: feature');
    const refs = host.git('for-each-ref');
    const result = host.run(['--connect', unit, 'echo', 'hi']);
    assertNothingRan(host, result);
    assert.ok(result.stderr.includes(`sandbox.sh: '${unit}' names no local branch`), result.stderr);
    assert.ok(result.stderr.includes('So there is no run to connect to.\n'), result.stderr);
    assert.doesNotMatch(result.stderr, /cut/);
    assert.doesNotMatch(result.stderr, /sandbox\.sh --in-place /);
    assert.equal(host.git('for-each-ref'), refs);
  });
}

test('--connect 0010 is refused, and lists the branches the number names', (t) => {
  const host = setUpWithBuildDue(t);
  markRunning(host);
  const result = host.run(['--connect', '0010', 'echo', 'hi']);
  assertNothingRan(host, result);
  assert.match(result.stderr, /^ {2}feature-0010-init$/m);
  assert.match(result.stderr, /^ {2}feature-0010-init2$/m);
});

for (const unit of [branch, '0026']) {
  test(`--connect ${unit} is refused while no container of the run is running, and names the command`, (t) => {
    const host = setUpWithBuildDue(t);
    const result = host.run(['--connect', unit, 'echo', 'hi']);
    assertNothingRan(host, result);
    assert.ok(
      result.stderr.includes(
        `sandbox.sh: no run is under way for '${unit}': the container ${containerName} is not running.\n`,
      ),
      result.stderr,
    );
    assert.ok(result.stderr.includes(`Start one with 'sandbox.sh ${unit}'.\n`), result.stderr);
  });
}

test('--connect is refused when Docker cannot say whether the container is running', (t) => {
  const host = setUpWithBuildDue(t);
  markRunning(host);
  writeFileSync(host.psFails, '');
  const result = host.run(['--connect', branch, 'echo', 'hi']);
  assertNothingRan(host, result);
  assert.match(result.stderr, /sandbox\.sh: could not ask Docker whether/);
  assert.ok(result.stderr.includes('Nothing was run.\n'), result.stderr);
});

for (const [option, value] of [
  ['--in-place', () => []],
  ['--workdir', (base) => [base]],
  ['--mount', (base) => [base]],
  ['--rebuild', () => []],
]) {
  for (const [where, order] of [
    ['before', (given) => [...given, '--connect']],
    ['after', (given) => ['--connect', ...given]],
  ]) {
    test(`--connect is refused with ${option} ${where} it, and names the option`, (t) => {
      const host = setUpWithBuildDue(t);
      markRunning(host);
      const result = host.run([...order([option, ...value(host.base)]), branch, 'echo', 'hi']);
      assertNothingRan(host, result);
      assert.ok(
        result.stderr.includes(`sandbox.sh: --connect cannot be given together with ${option}.\n`),
        result.stderr,
      );
      assert.ok(result.stderr.includes('That is an option of a run, and --connect starts none.\n'), result.stderr);
    });
  }
}

// What the review of 7db50d7 found: the refusal must not wait for the option's directory to be read.
for (const option of ['--workdir', '--mount']) {
  for (const [where, order] of [
    ['before', (given) => [...given, '--connect']],
    ['after', (given) => ['--connect', ...given]],
  ]) {
    test(`--connect is refused with ${option} ${where} it and a directory that is not there`, (t) => {
      const host = setUpWithBuildDue(t);
      markRunning(host);
      const missing = join(host.base, 'not-there');
      const result = host.run([...order([option, missing]), branch, 'echo', 'hi']);
      assertNothingRan(host, result);
      assert.ok(
        result.stderr.includes(`sandbox.sh: --connect cannot be given together with ${option}.\n`),
        result.stderr,
      );
      assert.doesNotMatch(result.stderr, /No such file or directory/);
    });
  }
}

test('--connect is refused as root, like a run', (t) => {
  const host = setUp(t);
  markRunning(host);
  // The stand-in's `id` is a link to the host's own, which writing through would reach.
  rmSync(join(host.bin, 'id'));
  writeCommand(host.bin, 'id', 'echo 0');
  const result = host.run(['--connect', branch, 'echo', 'hi']);
  assert.equal(result.status, 2, result.stderr);
  assert.match(result.stderr, /sandbox\.sh: refusing to run as root/);
  assert.deepEqual(host.dockerCalls(), []);
});

// A project whose compose file still configures the service `agent` is refused for a unit run and for --connect
// alike, before a clone, a container or a call of Docker besides the reading of the configuration.
for (const [what, args] of [
  ['a unit run', [branch, 'echo', 'hi']],
  ['--connect', ['--connect', branch, 'echo', 'hi']],
]) {
  test(`the wrapper refuses a project whose service is still agent, given ${what}`, (t) => {
    const { root, state, run, dockerCalls } = setUp(t);
    writeFileSync(join(root, 'sandbox', 'compose.project.yml'), 'services:\n  agent:\n    mem_limit: 8g\n');
    const result = run(args);
    assert.equal(result.status, 2);
    assert.match(result.stderr, /^sandbox\.sh: /);
    assert.ok(result.stderr.includes(`${root}/sandbox/compose.project.yml`), result.stderr);
    assert.match(result.stderr, /service is named sandbox/);
    assert.match(result.stderr, /rename agent: under services: to sandbox:/);
    assert.deepEqual(dockerCalls(), []);
    assert.equal(existsSync(join(state, 'agentrite')), false);
  });
}

// Variants. A variant is a unit run of the branch `<unit's branch>--<name>`, in a container and on a clone of its
// own.
const variantBranch = `${branch}--opus`;
const variantContainer = `project-sandbox-${variantBranch}`;
const nameForm = 'one or more words of the lowercase letters a to z and the digits 0 to 9,';

// The calls of a unit run of `variant`, as `unitRun` gives those of the unit's branch.
const variantRun = (host, variant, clone) =>
  host.unitRun(clone).map((call) => call.replaceAll(containerName, `project-sandbox-${variant}`));

// A refusal of the option: status 2, nothing called, nothing made, and no branch cut.
function assertVariantRefused(host, result, refs) {
  assert.equal(result.status, 2, result.stderr);
  assert.deepEqual(host.dockerCalls(), []);
  assert.deepEqual(host.npmCalls(), []);
  assert.equal(existsSync(host.state), false);
  assert.equal(host.git('for-each-ref'), refs);
}

for (const name of ['Opus', 'opus--x', '-opus', 'opus-', 'op_us', 'opus.1', '']) {
  for (const [form, args] of [
    ['--variant NAME before the unit', ['--variant', name, '0026', 'echo', 'hi']],
    ['--variant=NAME after the unit', ['0026', `--variant=${name}`, 'echo', 'hi']],
  ]) {
    test(`a variant named '${name}' is refused with ${form}, naming the name and the form`, (t) => {
      const host = setUpWithBuildDue(t);
      const refs = host.git('for-each-ref');
      const result = host.run(args);
      assertVariantRefused(host, result, refs);
      assert.ok(result.stderr.includes(`sandbox.sh: '${name}' is not a name a variant can have.\n`), result.stderr);
      assert.ok(result.stderr.includes(nameForm), result.stderr);
    });
  }
}

for (const option of ['--in-place', '--workdir']) {
  test(`--variant is refused together with ${option}, which has no unit`, (t) => {
    const host = setUpWithBuildDue(t);
    const refs = host.git('for-each-ref');
    const args = option === '--workdir' ? [option, host.base] : [option];
    const result = host.run(['--variant', 'opus', ...args, 'echo', 'hi']);
    assertVariantRefused(host, result, refs);
    assert.ok(result.stderr.includes(`--variant cannot be given together with ${option}.`), result.stderr);
    assert.ok(result.stderr.includes(`${option} has no unit.`), result.stderr);
  });
}

for (const [what, args] of [
  ['before and after the unit', ['--variant', 'opus', '0026', '--variant', 'gpt', 'echo', 'hi']],
  ['before the unit twice', ['--variant', 'opus', '--variant=gpt', '0026', 'echo', 'hi']],
  ['after the unit twice', ['0026', '--variant', 'opus', '--variant', 'gpt', 'echo', 'hi']],
  ['after the unit in the other form twice', ['0026', '--variant=opus', '--variant=gpt', 'echo', 'hi']],
]) {
  test(`--variant given ${what} is refused`, (t) => {
    const host = setUpWithBuildDue(t);
    const refs = host.git('for-each-ref');
    const result = host.run(args);
    assertVariantRefused(host, result, refs);
    assert.ok(result.stderr.includes('sandbox.sh: --variant is given more than once.\n'), result.stderr);
  });
}

for (const args of [['--variant'], ['0026', '--variant']]) {
  test(`--variant with no name is refused, given as ${args.join(' ')}`, (t) => {
    const host = setUpWithBuildDue(t);
    const refs = host.git('for-each-ref');
    const result = host.run(args);
    assertVariantRefused(host, result, refs);
    assert.ok(result.stderr.includes('sandbox.sh: --variant needs a name\n'), result.stderr);
  });
}

for (const args of [
  [branch, '--variant', 'opus', 'echo', 'hi'],
  ['0026', '--variant=opus', 'echo', 'hi'],
  ['--variant', 'opus', '0026', 'echo', 'hi'],
]) {
  test(`${args.slice(0, -2).join(' ')} cuts ${variantBranch} and runs it, in a container of its own`, (t) => {
    const host = setUp(t);
    const { state, run, git, dockerCalls } = host;
    const refs = git('for-each-ref');
    const checkedOut = git('symbolic-ref', 'HEAD');
    const commit = git('rev-parse', branch);
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    const short = git('rev-parse', '--short', branch);
    assert.ok(result.stderr.includes(`sandbox.sh: cut ${variantBranch} from ${branch} at ${short}.\n`), result.stderr);
    assert.equal(git('rev-parse', `refs/heads/${variantBranch}`), commit);
    assert.equal(git('symbolic-ref', 'HEAD'), checkedOut);
    const cutRef = `${commit} commit\trefs/heads/${variantBranch}`;
    assert.deepEqual(
      git('for-each-ref')
        .split('\n')
        .filter((ref) => ref !== cutRef),
      refs.split('\n'),
    );
    const clone = join(state, 'agentrite', 'project-sandbox', variantBranch);
    assert.deepEqual(dockerCalls(), variantRun(host, variantBranch, clone));
  });
}

test('a run without --variant makes the calls it made before, and cuts no variant', (t) => {
  const { clone, run, git, dockerCalls, unitRun } = setUp(t);
  const result = run([branch, 'echo', '--variant', 'opus']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), unitRun(clone).map((call) => call.replace(/echo hi$/, 'echo --variant opus')));
  assert.equal(git('for-each-ref', `refs/heads/${variantBranch}`), '');
});

test('a variant whose branch exists is run as it is, apart from the unit that moved on, and cuts nothing', (t) => {
  const host = setUp(t);
  const { state, run, git } = host;
  git('branch', variantBranch, 'master');
  const variantCommit = git('rev-parse', variantBranch);
  git('checkout', '--quiet', branch);
  writeFileSync(join(host.root, 'later.md'), 'later\n');
  git('add', 'later.md');
  git('commit', '--quiet', '--message', 'the unit moves on');
  git('checkout', '--quiet', 'master');
  host.agent('git rev-parse HEAD > ../commit-seen');
  const refs = git('for-each-ref');

  const result = run([branch, '--variant', 'opus', 'echo', 'hi']);

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /cut /);
  assert.equal(git('for-each-ref'), refs);
  assert.equal(
    readFileSync(join(state, 'agentrite', 'project-sandbox', 'commit-seen'), 'utf-8').trim(),
    variantCommit,
  );
});

test('--variant for a unit with no branch cuts the unit and then the variant, and runs the variant', (t) => {
  const host = setUp(t);
  const { state, run, git } = host;
  commitUnit(host, 'kind: feature');
  const cut = 'feature-0031-cut-me';
  const result = run(['0031', '--variant', 'opus', 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  const unitCut = result.stderr.indexOf(`sandbox.sh: cut ${cut} from master at `);
  const variantCut = result.stderr.indexOf(`sandbox.sh: cut ${cut}--opus from ${cut} at `);
  assert.ok(unitCut >= 0 && variantCut > unitCut, result.stderr);
  assert.equal(git('rev-parse', `refs/heads/${cut}--opus`), git('rev-parse', 'master'));
  assert.deepEqual(
    host.dockerCalls(),
    variantRun(host, `${cut}--opus`, join(state, 'agentrite', 'project-sandbox', `${cut}--opus`)),
  );
});

test('a build that fails after a variant was cut leaves both branches cut', (t) => {
  const host = setUp(t, { imageExists: false });
  commitUnit(host, 'kind: feature');
  writeFileSync(host.buildFails, '');
  const result = host.run(['0031', '--variant', 'opus', 'echo', 'hi']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^sandbox\.sh: cut feature-0031-cut-me--opus from feature-0031-cut-me at /m);
  assert.equal(host.git('rev-parse', 'refs/heads/feature-0031-cut-me'), host.git('rev-parse', 'master'));
  assert.equal(host.git('rev-parse', 'refs/heads/feature-0031-cut-me--opus'), host.git('rev-parse', 'master'));
  assert.equal(host.dockerCalls().filter((call) => / run /.test(call)).length, 0);
});

test('a number names the unit, whatever variants the unit has', (t) => {
  const host = setUp(t);
  host.git('branch', variantBranch, branch);
  host.git('branch', `${branch}--gpt-6-1`, branch);
  const result = host.run(['0026', 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(host.dockerCalls(), host.unitRun(host.clone));
});

test('a number that only a variant branch holds names no branch', (t) => {
  const host = setUpWithBuildDue(t);
  host.git('branch', 'task-0099-x--opus', 'master');
  const refs = host.git('for-each-ref');
  const result = host.run(['0099', 'echo', 'hi']);
  assert.equal(result.status, 2, result.stderr);
  assert.ok(result.stderr.includes("sandbox.sh: '0099' names no local branch"), result.stderr);
  assert.equal(host.git('for-each-ref'), refs);
  assert.deepEqual(host.dockerCalls(), []);
});

test('a variant branch given by its full name is run as it is, and cuts nothing', (t) => {
  const host = setUp(t);
  host.git('branch', variantBranch, branch);
  const refs = host.git('for-each-ref');
  const result = host.run([variantBranch, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stderr, /cut /);
  assert.equal(host.git('for-each-ref'), refs);
  assert.deepEqual(
    host.dockerCalls(),
    variantRun(host, variantBranch, join(host.state, 'agentrite', 'project-sandbox', variantBranch)),
  );
});

test("--variant with a unit given by a variant's branch is refused, naming the branch", (t) => {
  const host = setUpWithBuildDue(t);
  host.git('branch', variantBranch, branch);
  const refs = host.git('for-each-ref');
  const result = host.run([variantBranch, '--variant', 'gpt', 'echo', 'hi']);
  assertVariantRefused(host, result, refs);
  assert.ok(result.stderr.includes(`${variantBranch} is the branch of a variant`), result.stderr);
});

const variantConnectCall = (command) => connectCall(command).replace(containerName, variantContainer);

for (const args of [
  ['--connect', '0026', '--variant', 'opus'],
  ['--connect', branch, '--variant=opus'],
  ['--connect', '--variant', 'opus', '0026'],
  ['--connect', variantBranch],
]) {
  test(`${args.join(' ')} runs the command in the container of the variant's run`, (t) => {
    const host = setUp(t);
    host.git('branch', variantBranch, branch);
    markRunning(host);
    const result = host.run([...args, 'echo', 'hi']);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.deepEqual(host.dockerCalls(), [variantConnectCall('echo hi')]);
  });
}

test("--connect with a number connects to the unit's run alone, whatever variants there are", (t) => {
  const host = setUp(t);
  host.git('branch', variantBranch, branch);
  markRunning(host);
  const result = host.run(['--connect', '0026', 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(host.dockerCalls(), [connectCall('echo hi')]);
});

test('--connect for a variant that has no branch is refused, cuts none, and names the command that starts one', (t) => {
  const host = setUpWithBuildDue(t);
  markRunning(host);
  const refs = host.git('for-each-ref');
  const result = host.run(['--connect', '0026', '--variant', 'nobranch', 'echo', 'hi']);
  assertNothingRan(host, result);
  assert.ok(result.stderr.includes("'0026' has no variant 'nobranch'"), result.stderr);
  assert.ok(result.stderr.includes("Start one with 'sandbox.sh 0026 --variant nobranch'.\n"), result.stderr);
  assert.equal(host.git('for-each-ref'), refs);
});

test('--connect for a variant is refused while its container is not running, and names the command', (t) => {
  const host = setUpWithBuildDue(t);
  host.git('branch', variantBranch, branch);
  const result = host.run(['--connect', '0026', '--variant', 'opus']);
  assertNothingRan(host, result);
  assert.ok(
    result.stderr.includes(
      `sandbox.sh: no run is under way for '0026 --variant opus': the container ${variantContainer} is not running.\n`,
    ),
    result.stderr,
  );
  assert.ok(result.stderr.includes("Start one with 'sandbox.sh 0026 --variant opus'.\n"), result.stderr);
});

test('--connect with --variant and --in-place is refused', (t) => {
  const host = setUpWithBuildDue(t);
  const result = host.run(['--connect', '--in-place', '--variant', 'opus', '0026']);
  assertNothingRan(host, result);
  assert.ok(result.stderr.includes('--connect cannot be given together with --in-place.'), result.stderr);
});

test('a second run of a variant whose container is running is refused, and names the variant', (t) => {
  const { state, run, git, runningContainer, dockerCalls, npmCalls } = setUpWithBuildDue(t);
  writeFileSync(runningContainer, '0123456789ab\n');
  const refs = git('for-each-ref');
  git('branch', variantBranch, branch);
  const withVariant = git('for-each-ref');
  const result = run(['0026', '--variant', 'opus', 'echo', 'hi']);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes(variantContainer), result.stderr);
  assert.ok(result.stderr.includes(`'docker stop ${variantContainer}'`), result.stderr);
  assert.ok(result.stderr.includes("'sandbox.sh --connect 0026 --variant opus [COMMAND...]'"), result.stderr);
  assert.deepEqual(dockerCalls(), []);
  assert.deepEqual(npmCalls(), []);
  assert.equal(existsSync(state), false);
  assert.equal(git('for-each-ref'), withVariant);
  assert.notEqual(refs, withVariant);
});

test('the forms the wrapper lists when nothing to mount is given show --variant NAME', (t) => {
  const host = setUpWithBuildDue(t);
  const result = host.run([]);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes('sandbox.sh UNIT [--variant NAME] [COMMAND...]'), result.stderr);
  assert.ok(result.stderr.includes('sandbox.sh --connect UNIT [--variant NAME] [COMMAND...]'), result.stderr);
});
