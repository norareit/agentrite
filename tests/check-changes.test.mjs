import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { findFrozenViolations, findIncompletePlans, findSplitEntries } from '../scripts/check-changes.mjs';
import { installKit, kitSettingsText } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

test('findFrozenViolations reports a changed frozen spec', () => {
  assert.deepEqual(
    findFrozenViolations(
      { frozen: { status: 'implemented', spec: 'original spec', plan: 'original plan' } },
      { frozen: { status: 'implemented', spec: 'changed spec', plan: 'original plan' } },
    ),
    ['frozen: spec.md'],
  );
});

test('findFrozenViolations ignores a frozen unit whose documents are unchanged', () => {
  assert.deepEqual(
    findFrozenViolations(
      { frozen: { status: 'implemented', spec: 'original spec' } },
      { frozen: { status: 'implemented', spec: 'original spec' } },
    ),
    [],
  );
});

test('findFrozenViolations allows a unit that reaches implemented on the branch', () => {
  assert.deepEqual(
    findFrozenViolations(
      { pending: { status: 'approved', spec: 'original spec' } },
      { pending: { status: 'implemented', spec: 'changed spec' } },
    ),
    [],
  );
});

test('findFrozenViolations ignores a unit absent from the base', () => {
  assert.deepEqual(
    findFrozenViolations(
      {},
      { new: { status: 'implemented', spec: 'new spec' } },
    ),
    [],
  );
});

test('findFrozenViolations reports a plan added to a frozen unit', () => {
  assert.deepEqual(
    findFrozenViolations(
      { frozen: { status: 'implemented', spec: 'original spec' } },
      { frozen: { status: 'implemented', spec: 'original spec', plan: 'added plan' } },
    ),
    ['frozen: plan.md'],
  );
});

test('findFrozenViolations reports a deleted frozen unit that has only a record', () => {
  assert.deepEqual(
    findFrozenViolations(
      { frozen: { status: 'implemented' } },
      {},
    ),
    ['frozen: unit deleted'],
  );
});

test('findFrozenViolations reports a deleted frozen unit once, not per document', () => {
  assert.deepEqual(
    findFrozenViolations(
      { frozen: { status: 'implemented', spec: 'original spec', plan: 'original plan' } },
      {},
    ),
    ['frozen: unit deleted'],
  );
});

test('findIncompletePlans reports an implemented unit with an unticked task', () => {
  assert.deepEqual(
    findIncompletePlans({ done: { status: 'implemented', plan: '- [x] first\n- [ ] second\n' } }),
    ['done: plan.md has 1 unticked task'],
  );
});

test('findIncompletePlans ignores an implemented unit whose tasks are all ticked', () => {
  assert.deepEqual(
    findIncompletePlans({ done: { status: 'implemented', plan: '- [x] first\n- [x] second\n' } }),
    [],
  );
});

test('findIncompletePlans ignores an implemented unit with no plan', () => {
  assert.deepEqual(findIncompletePlans({ done: { status: 'implemented', spec: 'a spec' } }), []);
});

test('findIncompletePlans ignores a plan that uses no checkboxes', () => {
  assert.deepEqual(
    findIncompletePlans({ done: { status: 'implemented', plan: '## Steps\n\n1. Do the thing\n' } }),
    [],
  );
});

test('findIncompletePlans ignores a unit that is not implemented', () => {
  assert.deepEqual(
    findIncompletePlans({ ongoing: { status: 'in-progress', plan: '- [ ] not done yet\n' } }),
    [],
  );
});

test('findIncompletePlans counts every unticked task and finds indented ones', () => {
  assert.deepEqual(
    findIncompletePlans({ done: { status: 'implemented', plan: '- [ ] one\n  - [ ] nested\n- [x] done\n' } }),
    ['done: plan.md has 2 unticked tasks'],
  );
});

/** A record whose `## Log` holds the given lines, followed by an empty `## Amendments`. */
function recordWithLog(...lines) {
  return ['---', 'status: in-progress', '---', '', '# Unit', '', '## Log', '', ...lines, '', '## Amendments', '']
    .join('\n');
}

const firstEntry = '- 2026-01-01T00:00:00Z [human] approved the spec. The status is `approved`';
const secondEntry = '- 2026-01-02T00:00:00Z [human] wrote the second entry';

test('findSplitEntries reports a new entry of the log after a blank line, naming the unit and the entry', () => {
  assert.deepEqual(
    findSplitEntries(
      { unit: { status: 'approved', record: recordWithLog(firstEntry) } },
      { unit: { status: 'in-progress', record: recordWithLog(firstEntry, '', secondEntry) } },
    ),
    [`unit: entry after a blank line: ${secondEntry}`],
  );
});

test('findSplitEntries reports a new entry of the amendments after a blank line', () => {
  const record = `${recordWithLog(firstEntry)}\n${firstEntry}\n\n${secondEntry}\n`;

  assert.deepEqual(
    findSplitEntries({}, { unit: { status: 'implemented', record } }),
    [`unit: entry after a blank line: ${secondEntry}`],
  );
});

test('findSplitEntries ignores an entry after a blank line that the record at the base holds', () => {
  const record = recordWithLog(firstEntry, '', secondEntry);

  assert.deepEqual(
    findSplitEntries(
      { unit: { status: 'implemented', record } },
      { unit: { status: 'implemented', record: `${record}- 2026-01-03T00:00:00Z [human] amended it\n` } },
    ),
    [],
  );
});

test('findSplitEntries ignores a split at the base whose entry the branch rewraps or gives CRLF line endings', () => {
  const base = recordWithLog(firstEntry, '', secondEntry);
  const rewrapped = recordWithLog(firstEntry, '', '- 2026-01-02T00:00:00Z [human] wrote the second', '  entry');

  for (const record of [rewrapped, base.replaceAll('\n', '\r\n')]) {
    assert.deepEqual(
      findSplitEntries({ unit: { status: 'implemented', record: base } }, { unit: { status: 'implemented', record } }),
      [],
    );
  }
});

test('findSplitEntries names a new entry of a record with CRLF line endings without its carriage return', () => {
  const record = recordWithLog(firstEntry, '', secondEntry).replaceAll('\n', '\r\n');

  assert.deepEqual(
    findSplitEntries({}, { unit: { status: 'draft', record } }),
    [`unit: entry after a blank line: ${secondEntry}`],
  );
});

test('findSplitEntries reports a new split entry that shares the timestamp and author of one at the base', () => {
  const sameAuthorAndTime = '- 2026-01-02T00:00:00Z [human] wrote the third entry';
  const base = recordWithLog(firstEntry, '', secondEntry);

  assert.deepEqual(
    findSplitEntries(
      { unit: { status: 'in-progress', record: base } },
      { unit: { status: 'in-progress', record: recordWithLog(firstEntry, '', secondEntry, '', sameAuthorAndTime) } },
    ),
    [`unit: entry after a blank line: ${sameAuthorAndTime}`],
  );
});

test('findSplitEntries judges the whole of a record absent from the base', () => {
  const thirdEntry = '- 2026-01-03T00:00:00Z [human] wrote the third entry';

  const record = recordWithLog(firstEntry, '', secondEntry, '', thirdEntry);

  assert.deepEqual(
    findSplitEntries({}, { unit: { status: 'draft', record } }),
    [`unit: entry after a blank line: ${secondEntry}`, `unit: entry after a blank line: ${thirdEntry}`],
  );
});

test('findSplitEntries ignores the blank lines around a heading and one before an indented continuation', () => {
  const record = recordWithLog(firstEntry, '  continued', '', '  after a blank line', secondEntry);

  assert.deepEqual(findSplitEntries({}, { unit: { status: 'draft', record: `${record}\n${firstEntry}\n` } }), []);
});

const checker = join(import.meta.dirname, '..', 'scripts', 'check-changes.mjs');

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function specPath(repository) {
  return join(repository, 'changes', '0001-example', 'spec.md');
}

function settingsFor(defaultBranch) {
  return kitSettingsText({ defaultBranch, harnesses: ['claude'], sandbox: true });
}

/**
 * A repository on `defaultBranch` holding one implemented unit and an agentrite.json that names the branch, ready
 * to be branched from. It is removed when the test ends.
 */
function repositoryWithFrozenUnit(t, defaultBranch = 'main') {
  const repository = temporaryDirectory(t, 'check-changes-');

  git(repository, 'init', '-b', defaultBranch);
  git(repository, 'config', 'user.email', 'test@example.com');
  git(repository, 'config', 'user.name', 'Test User');
  mkdirSync(join(repository, 'changes', '0001-example'), { recursive: true });
  writeFileSync(join(repository, 'changes', '0001-example', 'record.md'), '---\nstatus: implemented\n---\n');
  writeFileSync(specPath(repository), 'original spec\n');
  writeFileSync(join(repository, 'agentrite.json'), settingsFor(defaultBranch));
  writeFileSync(join(repository, '.gitignore'), 'node_modules\n');
  installKit(repository);
  git(repository, 'add', '.');
  git(repository, 'commit', '-m', 'base');

  return repository;
}

/** Commits a change of the frozen spec on a new branch `change`. */
function changeFrozenSpec(repository) {
  git(repository, 'checkout', '-b', 'change');
  writeFileSync(specPath(repository), 'changed spec\n');
  git(repository, 'commit', '-am', 'change spec');
}

function runChecker(repository) {
  return spawnSync(process.execPath, [checker, repository], { encoding: 'utf8' });
}

test('check-changes rejects a changed frozen spec in another repository', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  changeFrozenSpec(repository);

  const result = runChecker(repository);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^- 0001-example: spec\.md$/m);
});

test('check-changes passes on a branch that changed no frozen document', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  git(repository, 'checkout', '-b', 'change');
  writeFileSync(join(repository, 'notes.md'), 'a note\n');
  git(repository, 'add', '.');
  git(repository, 'commit', '-m', 'add a note');

  const result = runChecker(repository);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
});

test('check-changes rejects an implemented unit with an unticked task', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  git(repository, 'checkout', '-b', 'change');
  mkdirSync(join(repository, 'changes', '0002-open'), { recursive: true });
  writeFileSync(join(repository, 'changes', '0002-open', 'record.md'), '---\nstatus: implemented\n---\n');
  writeFileSync(join(repository, 'changes', '0002-open', 'plan.md'), '- [x] done\n- [ ] still open\n');
  git(repository, 'add', '.');
  git(repository, 'commit', '-m', 'add an incomplete plan');

  const result = runChecker(repository);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^- 0002-open: plan\.md has 1 unticked task$/m);
});

/** Commits, on a new branch `change`, a record of 0001-example whose log holds the given lines. */
function commitRecordWithLog(repository, ...lines) {
  writeFileSync(join(repository, 'changes', '0001-example', 'record.md'), recordWithLog(...lines));
  git(repository, 'commit', '-am', 'change the record');
}

test('check-changes rejects an entry that the branch adds after a blank line, naming the unit and the entry', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  commitRecordWithLog(repository, firstEntry);
  git(repository, 'checkout', '-b', 'change');
  commitRecordWithLog(repository, firstEntry, '', secondEntry);

  const result = runChecker(repository);

  assert.notEqual(result.status, 0);
  assert.equal(
    result.stderr,
    `Change documents need attention:\n- 0001-example: entry after a blank line: ${secondEntry}\n`,
  );
});

test('check-changes passes an entry after a blank line that the base already holds', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  commitRecordWithLog(repository, firstEntry, '', secondEntry);
  git(repository, 'checkout', '-b', 'change');
  commitRecordWithLog(repository, firstEntry, '', secondEntry, '- 2026-01-03T00:00:00Z [human] wrote the third entry');

  const result = runChecker(repository);

  assert.equal(result.status, 0, result.stderr);
});

test('check-changes passes an entry after a blank line at the base that the branch rewraps', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  commitRecordWithLog(repository, firstEntry, '', secondEntry);
  git(repository, 'checkout', '-b', 'change');
  commitRecordWithLog(repository, firstEntry, '', '- 2026-01-02T00:00:00Z [human] wrote the second', '  entry');

  const result = runChecker(repository);

  assert.equal(result.status, 0, result.stderr);
});

test('check-changes rejects a new split entry that shares the timestamp and author of one at the base', (t) => {
  const sameAuthorAndTime = '- 2026-01-02T00:00:00Z [human] wrote the third entry';
  const repository = repositoryWithFrozenUnit(t);
  commitRecordWithLog(repository, firstEntry, '', secondEntry);
  git(repository, 'checkout', '-b', 'change');
  commitRecordWithLog(repository, firstEntry, '', secondEntry, '', sameAuthorAndTime);

  const result = runChecker(repository);

  assert.notEqual(result.status, 0);
  assert.equal(
    result.stderr,
    `Change documents need attention:\n- 0001-example: entry after a blank line: ${sameAuthorAndTime}\n`,
  );
});

// R25: the branch the file names is the base, and a branch master beside it is not read.
test('check-changes compares with the default branch of agentrite.json, not with a branch master', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  changeFrozenSpec(repository);
  // A master at the head of the change holds the changed spec, so a check against it would find nothing.
  git(repository, 'branch', 'master');

  const result = runChecker(repository);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^- 0001-example: spec\.md$/m);
});

test('check-changes reads the branch master when the file names it', (t) => {
  const repository = repositoryWithFrozenUnit(t, 'master');
  changeFrozenSpec(repository);

  const result = runChecker(repository);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^- 0001-example: spec\.md$/m);
});

test('check-changes falls back to origin/<default branch> when no local default branch exists', (t) => {
  const origin = repositoryWithFrozenUnit(t);
  const clone = temporaryDirectory(t, 'check-changes-clone-');
  execFileSync('git', ['clone', origin, clone], { stdio: 'ignore' });
  installKit(clone);
  git(clone, 'config', 'user.email', 'test@example.com');
  git(clone, 'config', 'user.name', 'Test User');
  git(clone, 'checkout', '-b', 'change');
  git(clone, 'branch', '-D', 'main');
  writeFileSync(specPath(clone), 'changed spec\n');
  git(clone, 'commit', '-am', 'change spec');

  const result = runChecker(clone);

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /^- 0001-example: spec\.md$/m);
});

// R6, R5
test('check-changes refuses a repository with no agentrite.json, and names the command that writes one', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  rmSync(join(repository, 'agentrite.json'));

  const result = runChecker(repository);

  assert.equal(result.status, 1);
  assert.equal(result.stderr, 'the project has no agentrite.json. Run: npx agentrite config, which writes one\n');
});

test('check-changes refuses an agentrite.json that is not valid, also in a key it does not use', (t) => {
  for (const [settings, message] of [
    ['not json', /^agentrite\.json is not JSON: /],
    ['{ "defaultBranch": "main", "harnesses": [], "sandbox": true }', /^agentrite\.json: harnesses is \[\]\. /],
  ]) {
    const repository = repositoryWithFrozenUnit(t);
    writeFileSync(join(repository, 'agentrite.json'), settings);

    const result = runChecker(repository);

    assert.equal(result.status, 1);
    assert.match(result.stderr, message);
  }
});

// Unit 0054, R4: the change check reads the file as every command does, and refuses a path that names no file.
test('check-changes refuses an agentrite.json whose standards names no file, with the message of the reader', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  changeFrozenSpec(repository);
  rmSync(join(repository, 'node_modules'), { recursive: true });

  const result = runChecker(repository);

  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    'agentrite.json: standards is "node_modules/agentrite/standards.md", and there is no file at it. ' +
      "It must name a file in the project's working tree\n",
  );
});

// R26
test('check-changes names both it tried, and where the name is from, for a default branch that is none', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  writeFileSync(join(repository, 'agentrite.json'), settingsFor('nowhere'));

  const result = runChecker(repository);

  assert.equal(result.status, 1);
  assert.equal(
    result.stderr,
    'No common ancestor with nowhere or origin/nowhere to compare against. ' +
      'The name is the defaultBranch of agentrite.json\n',
  );
});

test('check-changes reads a default branch as a branch, and not as a tag or an option of git', (t) => {
  const repository = repositoryWithFrozenUnit(t);
  git(repository, 'tag', 'released');
  for (const name of ['released', '--all']) {
    writeFileSync(join(repository, 'agentrite.json'), settingsFor(name));

    const result = runChecker(repository);

    assert.equal(result.status, 1, name);
    assert.ok(result.stderr.startsWith(`No common ancestor with ${name} or origin/${name} `), result.stderr);
  }
});

test('check-changes given two arguments says it takes one, prints its usage, checks nothing and exits 2', (t) => {
  // No git repository, so a check that ran would fail with 1.
  const directory = temporaryDirectory(t, 'check-changes-');

  const result = spawnSync(process.execPath, [checker, directory, directory], { encoding: 'utf8' });

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /takes one argument, the repository root/);
  assert.match(result.stderr, /^usage: node check-changes\.mjs \[<repository root>\]$/m);
});
