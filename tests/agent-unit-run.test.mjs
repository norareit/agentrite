import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakeHost } from './wrapper-fixture.mjs';

const kitContainer = new URL('../container/', import.meta.url).pathname;
const kitPath = 'node_modules/@ritenoar/agentrite/container';

const branch = 'task-0026-doc';
const containerName = `project-agent-${branch}`;
const sandboxRef = `refs/remotes/sandbox/${branch}`;

// A project that is a git repository, with the kit's wrapper and its unit-clone.sh installed under its ignored
// `node_modules`, and the host of `fakeHost`, whose Compose project is `project-agent`. The repository is on
// `master` and has three more branches, of which `task-0026-doc` is one commit ahead of `master`. It ignores
// `node_modules`, `.reviews` and `.env`, and holds a file that is not committed, `draft.txt`. The home has a git
// identity and nothing else, so the state directory is `.local/state` in it unless a run sets XDG_STATE_HOME. `run`
// runs the wrapper with the project root and `args`, and `git` runs the real git in the repository.
function setUp(t, { imageExists = true } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'agent-unit-run-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'project');
  const container = join(root, kitPath);
  mkdirSync(container, { recursive: true });
  for (const file of ['agent.sh', 'unit-clone.sh']) copyFileSync(join(kitContainer, file), join(container, file));
  chmodSync(join(container, 'agent.sh'), 0o755);
  mkdirSync(join(root, 'agent'));
  writeFileSync(join(root, 'agent', 'compose.project.yml'), '');
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
  const clone = join(state, 'agentrite', 'project-agent', branch);
  const run = (args, env = {}) =>
    spawnSync(join(container, 'agent.sh'), [root, ...args], {
      encoding: 'utf-8',
      env: { ...env, HOME: home, PATH: host.bin },
    });
  // What every recorded Compose call opens with.
  const compose =
    `AGENTRITE_CONTAINER=${kitPath} docker compose --project-directory ${root} ` +
    `-f ${container}/compose.yml -f ${root}/agent/compose.project.yml`;
  // The calls of a unit run that mounts `mounted` at /work, with `mounts` after the two of the unit run.
  const unitRun = (mounted, mounts = '') => [
    `AGENTRITE_CONTAINER=${kitPath} docker rm ${containerName}`,
    `${compose} run --rm --name ${containerName} --volume ${mounted}:/work ` +
      `--volume ${root}/.reviews:/work/.reviews ${mounts}agent echo hi`,
  ];
  // The script the stand-in `docker` runs as the agent, in the directory mounted at /work.
  const agent = (script) => writeFileSync(host.agentScript, `set -e\n${script}\n`);
  return { base, root, container, home, state, clone, run, git, compose, unitRun, agent, ...host };
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
      result.stderr.includes("A unit's branch is cut from master when the unit is given by its number.\n"),
      result.stderr,
    );
    assert.doesNotMatch(result.stderr, /made on the host/);
    assert.match(result.stderr, /agent\.sh --in-place /);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(state), false);
    assert.equal(git('for-each-ref'), refs);
  });
}

// The cutting of a unit's branch: `master` holds the unit's directory and no branch holds its number.

const cutDirectory = '0031-cut-me';

// Commits `files` as the unit's directory on `master`, which is checked out, and returns the commit, abbreviated.
// The files are the record alone, with `frontmatter` between its two lines of dashes, unless others are given.
function commitUnit({ root, git }, frontmatter, files = { 'record.md': `---\n${frontmatter}\n---\n\n# Cut me\n` }) {
  mkdirSync(join(root, 'changes', cutDirectory), { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    writeFileSync(join(root, 'changes', cutDirectory, name), content);
  }
  git('add', 'changes');
  git('commit', '--quiet', '--message', 'the spec of a unit');
  return git('rev-parse', '--short', 'master');
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
      result.stderr.includes(`agent.sh: cut ${cut} from master at ${commit}, for changes/${cutDirectory}.\n`),
      result.stderr,
    );
    assert.equal(git('rev-parse', `refs/heads/${cut}`), git('rev-parse', 'refs/heads/master'));
    const calls = unitRun(join(state, 'agentrite', 'project-agent', cut));
    assert.deepEqual(
      dockerCalls(),
      calls.map((call) => call.replaceAll(containerName, `project-agent-${cut}`)),
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
  assert.match(result.stderr, /^agent\.sh: cut feature-0031-cut-me from master at /m);
  assert.equal(git('rev-parse', 'refs/heads/feature-0031-cut-me'), git('rev-parse', 'refs/heads/master'));
  assert.equal(dockerCalls().filter((call) => / run /.test(call)).length, 0);
  assert.ok(result.stderr.indexOf('agent.sh: cut ') < result.stderr.indexOf('failed to solve'), result.stderr);
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
  assert.match(result.stderr, /^agent\.sh: cut feature-0031-cut-me from master at /m);
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
    says: [/no local branch master/],
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
    assert.doesNotMatch(result.stderr, /made on the host|agent\.sh: cut /);
    assert.equal(git('for-each-ref'), refs);
    assert.deepEqual(dockerCalls(), []);
    assert.deepEqual(npmCalls(), []);
    assert.equal(existsSync(state), false);
  });
}

test('the wrapper refuses a second run for a branch whose container is running, before it builds', (t) => {
  const { state, run, git, runningContainer, dockerCalls, npmCalls } = setUpWithBuildDue(t);
  writeFileSync(runningContainer, '0123456789ab\n');
  const refs = git('for-each-ref');
  const result = run([branch, 'echo', 'hi']);
  assert.equal(result.status, 2);
  assert.ok(result.stderr.includes(containerName), result.stderr);
  assert.match(result.stderr, /is running/);
  assert.deepEqual(dockerCalls(), []);
  assert.deepEqual(npmCalls(), []);
  assert.equal(existsSync(state), false);
  assert.equal(git('for-each-ref'), refs);
});

test('the wrapper puts the clone under XDG_STATE_HOME when that is set', (t) => {
  const { base, home, run, dockerCalls, unitRun } = setUp(t);
  const state = join(base, 'state');
  const result = run([branch, 'echo', 'hi'], { XDG_STATE_HOME: state });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), unitRun(join(state, 'agentrite', 'project-agent', branch)));
  assert.equal(existsSync(join(home, '.local')), false);
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
  assert.match(result.stderr, /agent\.sh: fetching .* failed/);
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
      'git config uploadpack.packObjectsHook "$PWD/.git/pack-objects.sh"\n' +
      'git config core.fsmonitor "$PWD/.git/fsmonitor.sh"',
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
  assert.match(result.stderr, /agent\.sh: could not ask Docker whether/);
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
  assert.match(result.stderr, /agent\.sh: could not ask Docker whether/);
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
    assert.match(result.stderr, /agent\.sh: removing the clone failed/);
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
