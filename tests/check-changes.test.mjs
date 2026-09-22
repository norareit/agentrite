import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { findFrozenViolations, findIncompletePlans } from '../scripts/check-changes.mjs';

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

const checker = join(import.meta.dirname, '..', 'scripts', 'check-changes.mjs');

function git(cwd, ...args) {
  execFileSync('git', args, { cwd, stdio: 'ignore' });
}

function specPath(repository) {
  return join(repository, 'changes', '0001-example', 'spec.md');
}

/** A repository on master holding one implemented unit, ready to be branched from. */
function repositoryWithFrozenUnit() {
  const repository = mkdtempSync(join(tmpdir(), 'check-changes-'));

  git(repository, 'init', '-b', 'master');
  git(repository, 'config', 'user.email', 'test@example.com');
  git(repository, 'config', 'user.name', 'Test User');
  mkdirSync(join(repository, 'changes', '0001-example'), { recursive: true });
  writeFileSync(join(repository, 'changes', '0001-example', 'record.md'), '---\nstatus: implemented\n---\n');
  writeFileSync(specPath(repository), 'original spec\n');
  git(repository, 'add', '.');
  git(repository, 'commit', '-m', 'base');

  return repository;
}

function runChecker(repository) {
  return spawnSync(process.execPath, [checker, repository], { encoding: 'utf8' });
}

test('check-changes rejects a changed frozen spec in another repository', () => {
  const repository = repositoryWithFrozenUnit();

  try {
    git(repository, 'checkout', '-b', 'change');
    writeFileSync(specPath(repository), 'changed spec\n');
    git(repository, 'commit', '-am', 'change spec');

    const result = runChecker(repository);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /^- 0001-example: spec\.md$/m);
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});

test('check-changes rejects an implemented unit with an unticked task', () => {
  const repository = repositoryWithFrozenUnit();

  try {
    git(repository, 'checkout', '-b', 'change');
    mkdirSync(join(repository, 'changes', '0002-open'), { recursive: true });
    writeFileSync(join(repository, 'changes', '0002-open', 'record.md'), '---\nstatus: implemented\n---\n');
    writeFileSync(join(repository, 'changes', '0002-open', 'plan.md'), '- [x] done\n- [ ] still open\n');
    git(repository, 'add', '.');
    git(repository, 'commit', '-m', 'add an incomplete plan');

    const result = runChecker(repository);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /^- 0002-open: plan\.md has 1 unticked task$/m);
  } finally {
    rmSync(repository, { recursive: true, force: true });
  }
});

test('check-changes falls back to origin/master when no local master exists', () => {
  const origin = repositoryWithFrozenUnit();
  const clone = mkdtempSync(join(tmpdir(), 'check-changes-clone-'));

  try {
    execFileSync('git', ['clone', origin, clone], { stdio: 'ignore' });
    git(clone, 'config', 'user.email', 'test@example.com');
    git(clone, 'config', 'user.name', 'Test User');
    git(clone, 'checkout', '-b', 'change');
    git(clone, 'branch', '-D', 'master');
    writeFileSync(specPath(clone), 'changed spec\n');
    git(clone, 'commit', '-am', 'change spec');

    const result = runChecker(clone);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /^- 0001-example: spec\.md$/m);
  } finally {
    rmSync(origin, { recursive: true, force: true });
    rmSync(clone, { recursive: true, force: true });
  }
});
