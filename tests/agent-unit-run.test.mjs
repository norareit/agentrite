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
// `node_modules` and `.reviews`, and holds a file that is not committed, `draft.txt`. The home has a git identity
// and nothing else, so the state directory is `.local/state` in it unless a run sets XDG_STATE_HOME. `run` runs
// the wrapper with the project root and `args`, and `git` runs the real git in the repository.
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
  writeFileSync(join(root, '.gitignore'), 'node_modules\n.reviews\n');
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

for (const unit of ['026', '0099', 'claude']) {
  test(`the wrapper says that ${unit} names no branch and that one is made on the host, and starts nothing`, (t) => {
    const { state, run, dockerCalls, npmCalls } = setUpWithBuildDue(t);
    const result = run([unit, 'echo', 'hi']);
    assert.equal(result.status, 2);
    assert.ok(result.stderr.includes(`'${unit}'`), result.stderr);
    assert.match(result.stderr, /made on the host/);
    assert.match(result.stderr, /agent\.sh --in-place /);
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
