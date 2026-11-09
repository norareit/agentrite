import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { temporaryDirectory } from './temporary-directory.mjs';

const setupScript = fileURLToPath(new URL('../setup-security-audit.sh', import.meta.url));
const finishScript = fileURLToPath(new URL('../finish-security-audit.sh', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const ownSettings = JSON.parse(readFileSync(new URL('../agentrite.json', import.meta.url), 'utf-8'));

const setupUsage = 'usage: ./setup-security-audit.sh <clone>\n';
const finishUsage = 'usage: ./finish-security-audit.sh <clone>\n';

const git = (directory, ...args) =>
  execFileSync('git', ['-c', 'user.name=Tester', '-c', 'user.email=tester@example.com', ...args], {
    cwd: directory,
    encoding: 'utf-8',
  }).trim();

// A repository holding copies of both scripts and of this repository's scripts/, whose settings reader the setup
// script reads the default branch with, and the repository's own agentrite.json with `trunk` as the default branch.
// It has a commit on `trunk` and another on `other`, which is checked out, so that a clone of the branch checked out
// is told apart from one of the default branch. The scripts run with the test's PATH and a home of the test's own,
// from `work` unless a test names another directory.
function setUp(testContext) {
  const base = temporaryDirectory(testContext, 'security-audit-');
  const repository = join(base, 'repository');
  mkdirSync(repository);
  for (const [from, name] of [
    [setupScript, 'setup-security-audit.sh'],
    [finishScript, 'finish-security-audit.sh'],
  ]) {
    copyFileSync(from, join(repository, name));
    chmodSync(join(repository, name), 0o755);
  }
  cpSync(kitScripts, join(repository, 'scripts'), { recursive: true });
  writeFileSync(join(repository, 'agentrite.json'), `${JSON.stringify({ ...ownSettings, defaultBranch: 'trunk' })}\n`);
  // The reader refuses settings that name a file the tree does not hold, so each is there, empty.
  for (const path of [ownSettings.standards, ownSettings.orchestrator, ...Object.values(ownSettings.roles)]) {
    mkdirSync(dirname(join(repository, path)), { recursive: true });
    writeFileSync(join(repository, path), '');
  }
  git(repository, 'init', '--quiet', '--initial-branch', 'trunk');
  git(repository, 'add', '.');
  git(repository, 'commit', '--quiet', '--message', 'on trunk');
  git(repository, 'checkout', '--quiet', '-b', 'other');
  writeFileSync(join(repository, 'other.txt'), 'only on other\n');
  git(repository, 'add', 'other.txt');
  git(repository, 'commit', '--quiet', '--message', 'on other');
  const home = join(base, 'home');
  const work = join(base, 'work');
  mkdirSync(home);
  mkdirSync(work);
  const run = (script, args, cwd) =>
    spawnSync(join(repository, script), args, {
      cwd: cwd ?? work,
      encoding: 'utf-8',
      env: { PATH: process.env.PATH, HOME: home },
    });
  const audits = join(repository, '.reviews', 'security-audits');
  return {
    base,
    repository,
    work,
    audits,
    clones: join(audits, 'clones'),
    setup: (args, cwd) => run('setup-security-audit.sh', args, cwd),
    finish: (args, cwd) => run('finish-security-audit.sh', args, cwd),
  };
}

// Makes a clone with the setup script, named `name` in `work`, and gives its absolute path.
function madeClone(host, name = 'clone') {
  const result = host.setup([name]);
  assert.equal(result.status, 0, result.stderr);
  return join(host.work, name);
}

// Writes the findings files `names` into the clone's `.reviews/security-audits/`, each holding its own name.
function writeFindings(clone, ...names) {
  const directory = join(clone, '.reviews', 'security-audits');
  mkdirSync(directory, { recursive: true });
  for (const name of names) writeFileSync(join(directory, name), `${name}\n`);
}

const linesOf = (path) => readFileSync(path, 'utf-8').split('\n').filter((line) => line !== '');

// What lies at a path, a link apart from what it points to, so that a test can tell that a path is left as it was.
function kindOf(path) {
  try {
    const status = lstatSync(path);
    if (status.isSymbolicLink()) return `link to ${readlinkSync(path)}`;
    return status.isDirectory() ? 'directory' : 'file';
  } catch {
    return 'missing';
  }
}

// The setup script

// Unit 0101, R26 and R40
for (const [what, args] of [
  ['no argument', []],
  ['two arguments', ['one', 'two']],
  ['an empty argument', ['']],
]) {
  test(`the setup script exits 2 with its usage for ${what}`, (testContext) => {
    const host = setUp(testContext);
    const result = host.setup(args);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, setupUsage);
    assert.equal(existsSync(host.clones), false);
  });
}

// Unit 0101, R27
for (const [what, make] of [
  ['an empty directory', (path) => mkdirSync(path)],
  [
    'a directory that holds a file',
    (path) => {
      mkdirSync(path);
      writeFileSync(join(path, 'kept.txt'), 'kept\n');
    },
  ],
  ['a file', (path) => writeFileSync(path, 'kept\n')],
  [
    'a link to a directory',
    (path, base) => {
      mkdirSync(join(base, 'target'));
      symlinkSync(join(base, 'target'), path);
    },
  ],
  ['a dangling link', (path, base) => symlinkSync(join(base, 'nowhere'), path)],
]) {
  test(`the setup script refuses a <clone> that is ${what}, and makes nothing`, (testContext) => {
    const host = setUp(testContext);
    const clone = join(host.work, 'clone');
    make(clone, host.base);
    const before = kindOf(clone);
    const result = host.setup(['clone']);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /^setup-security-audit: clone exists\./);
    assert.equal(kindOf(clone), before);
    assert.equal(existsSync(join(clone, '.git')), false);
    assert.equal(existsSync(host.clones), false);
  });
}

// Unit 0101, R26, R28 and R30
test('the setup script clones the default branch into a <clone> taken from where it is run', (testContext) => {
  const host = setUp(testContext);
  const result = host.setup(['clone']);
  assert.equal(result.status, 0, result.stderr);
  const clone = join(host.work, 'clone');
  assert.equal(git(clone, 'branch', '--show-current'), 'trunk');
  assert.equal(git(clone, 'rev-parse', 'HEAD'), git(host.repository, 'rev-parse', 'trunk'));
  assert.equal(existsSync(join(clone, 'other.txt')), false);
  assert.equal(existsSync(join(host.repository, '.git', 'index')), true);
  assert.deepEqual(linesOf(host.clones), [realpathSync(clone)]);
});

// Unit 0101, R28: the reader's refusal ends the run before anything is made.
test("the setup script exits 1 with the reader's message when agentrite.json is at fault", (testContext) => {
  const host = setUp(testContext);
  writeFileSync(join(host.repository, 'agentrite.json'), '{}\n');
  const result = host.setup(['clone']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /^agentrite: agentrite\.json: /);
  assert.equal(existsSync(join(host.work, 'clone')), false);
  assert.equal(existsSync(host.clones), false);
});

// Unit 0101, R29
test('the setup script copies the list of accepted risks into the clone and says so', (testContext) => {
  const host = setUp(testContext);
  mkdirSync(join(host.repository, '.reviews'));
  writeFileSync(join(host.repository, '.reviews', 'security-accepted.md'), '## A risk\n');
  const result = host.setup(['clone']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(host.work, 'clone', '.reviews', 'security-accepted.md'), 'utf-8'), '## A risk\n');
  assert.match(result.stdout, /^setup-security-audit: copied the list of accepted risks, /m);
});

// Unit 0101, R29
test('the setup script says that the audit runs with no list when there is none', (testContext) => {
  const host = setUp(testContext);
  const result = host.setup(['clone']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(kindOf(join(host.work, 'clone', '.reviews')), 'directory');
  assert.equal(existsSync(join(host.work, 'clone', '.reviews', 'security-accepted.md')), false);
  assert.match(result.stdout, /^setup-security-audit: there is no list of accepted risks, so the audit runs with/m);
});

// Unit 0101, R31 and R40
test('the setup script prints the steps that follow, with the <clone> it was given', (testContext) => {
  const host = setUp(testContext);
  const result = host.setup(['clone']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr.includes('setup-security-audit:'), false, result.stderr);
  assert.match(result.stdout, /\.\/sandbox\.sh --workdir clone <harness>/);
  assert.match(result.stdout, /dispatch the security reviewer in the session with no unit/);
  assert.match(result.stdout, /\.\/finish-security-audit\.sh clone/);
});

// Unit 0101, R30
test('a second setup adds a line to clones and keeps the first', (testContext) => {
  const host = setUp(testContext);
  const first = madeClone(host, 'first');
  const second = madeClone(host, 'second');
  assert.deepEqual(linesOf(host.clones), [realpathSync(first), realpathSync(second)]);
});

// The finish script

// Unit 0101, R32 and R40
for (const [what, args] of [
  ['no argument', []],
  ['two arguments', ['one', 'two']],
  ['an empty argument', ['']],
]) {
  test(`the finish script exits 2 with its usage for ${what}`, (testContext) => {
    const host = setUp(testContext);
    const clone = madeClone(host);
    const result = host.finish(args);
    assert.equal(result.status, 2, result.stderr);
    assert.equal(result.stderr, finishUsage);
    assert.equal(kindOf(clone), 'directory');
  });
}

// Unit 0101, R33
test('the finish script refuses a directory when there is no list of clones', (testContext) => {
  const host = setUp(testContext);
  writeFindings(host.repository, 'security-audit-a.md');
  const result = host.finish([host.repository]);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /^finish-security-audit: .* is not a clone that setup-security-audit\.sh made/);
  assert.equal(readFileSync(join(host.audits, 'security-audit-a.md'), 'utf-8'), 'security-audit-a.md\n');
});

// Unit 0101, R33: the project has the layout of a clone, and a directory that is not listed is left whole.
for (const what of ['the repository', 'a directory that is not listed']) {
  test(`the finish script refuses ${what}, and moves and removes nothing`, (testContext) => {
    const host = setUp(testContext);
    const clone = madeClone(host);
    const target = what === 'the repository' ? host.repository : join(host.base, 'unlisted');
    writeFindings(target, 'security-audit-b.md');
    const result = host.finish([target]);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /is not a clone that setup-security-audit\.sh made/);
    const findings = join(target, '.reviews', 'security-audits', 'security-audit-b.md');
    assert.equal(readFileSync(findings, 'utf-8'), 'security-audit-b.md\n');
    assert.equal(kindOf(join(target, '.git')), what === 'the repository' ? 'directory' : 'missing');
    assert.equal(kindOf(clone), 'directory');
    assert.deepEqual(linesOf(host.clones), [realpathSync(clone)]);
  });
}

// Unit 0101, R35
for (const [what, make] of [
  [
    '.reviews that is a link to a directory',
    (clone, base) => {
      writeFindings(join(base, 'elsewhere'), 'security-audit-c.md');
      execFileSync('rm', ['-rf', join(clone, '.reviews')]);
      symlinkSync(join(base, 'elsewhere', '.reviews'), join(clone, '.reviews'));
    },
  ],
  [
    '.reviews/security-audits that is a link to a directory',
    (clone, base) => {
      writeFindings(join(base, 'elsewhere'), 'security-audit-c.md');
      symlinkSync(join(base, 'elsewhere', '.reviews', 'security-audits'), join(clone, '.reviews', 'security-audits'));
    },
  ],
  [
    '.reviews that is a file',
    (clone) => {
      execFileSync('rm', ['-rf', join(clone, '.reviews')]);
      writeFileSync(join(clone, '.reviews'), 'a file\n');
    },
  ],
  ['.reviews/security-audits that is a file', (clone) => writeFileSync(join(clone, '.reviews', 'security-audits'), '')],
]) {
  test(`the finish script refuses a clone with ${what}, and moves and removes nothing`, (testContext) => {
    const host = setUp(testContext);
    const clone = madeClone(host);
    make(clone, host.base);
    const result = host.finish(['clone']);
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /^finish-security-audit: .* is a link or is not a directory/);
    assert.equal(kindOf(clone), 'directory');
    assert.equal(kindOf(join(clone, '.git')), 'directory');
    assert.equal(existsSync(join(host.audits, 'security-audit-c.md')), false);
    assert.deepEqual(linesOf(host.clones), [realpathSync(clone)]);
  });
}

// Unit 0101, R12, R36 and R39
test('the finish script moves the findings files, removes the clone and its line, and keeps another', (testContext) => {
  const host = setUp(testContext);
  const other = madeClone(host, 'other');
  const clone = madeClone(host);
  writeFindings(clone, 'security-audit-one.md', 'security-audit-two.md', 'notes.md');
  const result = host.finish(['clone']);
  assert.equal(result.status, 0, result.stderr);
  for (const name of ['security-audit-one.md', 'security-audit-two.md']) {
    assert.equal(readFileSync(join(host.audits, name), 'utf-8'), `${name}\n`);
    assert.match(result.stdout, new RegExp(`moved ${name.replaceAll('.', '\\.')}`));
  }
  assert.equal(existsSync(join(host.audits, 'notes.md')), false);
  assert.equal(kindOf(clone), 'missing');
  assert.deepEqual(linesOf(host.clones), [realpathSync(other)]);
  assert.equal(kindOf(other), 'directory');
});

// Unit 0101, R36
test('the finish script names and leaves a findings name of a link or a directory, and the list', (testContext) => {
  const host = setUp(testContext);
  const clone = madeClone(host);
  writeFindings(clone, 'security-audit-real.md');
  const audits = join(clone, '.reviews', 'security-audits');
  writeFileSync(join(host.base, 'outside.md'), 'outside\n');
  symlinkSync(join(host.base, 'outside.md'), join(audits, 'security-audit-link.md'));
  mkdirSync(join(audits, 'security-audit-directory.md'));
  writeFileSync(join(clone, '.reviews', 'security-accepted.md'), '## A risk\n');
  const result = host.finish(['clone']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /security-audit-link\.md is a link or not a regular file, and is left in place/);
  assert.match(result.stdout, /security-audit-directory\.md is a link or not a regular file, and is left in place/);
  assert.equal(readFileSync(join(host.audits, 'security-audit-real.md'), 'utf-8'), 'security-audit-real.md\n');
  assert.equal(kindOf(join(host.audits, 'security-audit-link.md')), 'missing');
  assert.equal(kindOf(join(host.audits, 'security-audit-directory.md')), 'missing');
  assert.equal(kindOf(join(host.repository, '.reviews', 'security-accepted.md')), 'missing');
  assert.equal(readFileSync(join(host.base, 'outside.md'), 'utf-8'), 'outside\n');
});

// Unit 0101, R37
test('the finish script refuses a findings file whose name the project holds, and moves nothing', (testContext) => {
  const host = setUp(testContext);
  const clone = madeClone(host);
  writeFindings(clone, 'security-audit-new.md', 'security-audit-taken.md');
  writeFileSync(join(host.audits, 'security-audit-taken.md'), 'the earlier one\n');
  const result = host.finish(['clone']);
  assert.equal(result.status, 1, result.stderr);
  assert.match(result.stderr, /^finish-security-audit: .*security-audit-taken\.md/m);
  assert.equal(readFileSync(join(host.audits, 'security-audit-taken.md'), 'utf-8'), 'the earlier one\n');
  assert.equal(existsSync(join(host.audits, 'security-audit-new.md')), false);
  assert.equal(existsSync(join(clone, '.reviews', 'security-audits', 'security-audit-new.md')), true);
  assert.equal(kindOf(clone), 'directory');
  assert.deepEqual(linesOf(host.clones), [realpathSync(clone)]);
});

// Unit 0101, R38, R39 and R40. A run stopped before it saved its file leaves no directory of audits, and R35
// refuses only a link or what is there and no directory, so a missing directory holds no findings file.
for (const [what, make] of [
  ['no findings file', (clone) => writeFindings(clone)],
  ['no directory of audits', () => {}],
  ['no .reviews', (clone) => execFileSync('rm', ['-rf', join(clone, '.reviews')])],
]) {
  test(`the finish script removes a clone with ${what}, says so and exits 0`, (testContext) => {
    const host = setUp(testContext);
    const clone = madeClone(host);
    make(clone);
    const result = host.finish(['clone']);
    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, /holds no findings file/);
    assert.equal(kindOf(clone), 'missing');
    assert.deepEqual(linesOf(host.clones), []);
  });
}

// Unit 0101, R39
test('the finish script follows no link in the clone when it removes it', (testContext) => {
  const host = setUp(testContext);
  const clone = madeClone(host);
  const outside = join(host.base, 'outside');
  mkdirSync(outside);
  writeFileSync(join(outside, 'kept.txt'), 'kept\n');
  symlinkSync(outside, join(clone, 'link'));
  const result = host.finish(['clone']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(kindOf(clone), 'missing');
  assert.equal(readFileSync(join(outside, 'kept.txt'), 'utf-8'), 'kept\n');
});

// Unit 0101, R32 and R39
test('the finish script takes a relative <clone> from the directory it is run from', (testContext) => {
  const host = setUp(testContext);
  const clone = madeClone(host);
  writeFindings(clone, 'security-audit-one.md');
  const result = host.finish(['work/clone'], host.base);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(kindOf(clone), 'missing');
  assert.equal(existsSync(join(host.audits, 'security-audit-one.md')), true);
});

// Unit 0101, R39: the path is resolved first, so a link to the clone removes the clone and not the link alone.
test('the finish script finishes the clone that a link it is given points to', (testContext) => {
  const host = setUp(testContext);
  const clone = madeClone(host);
  symlinkSync(clone, join(host.base, 'link'));
  const result = host.finish([join(host.base, 'link')]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(kindOf(clone), 'missing');
  assert.deepEqual(linesOf(host.clones), []);
});

// Unit 0101, R34: what the agent of an audit may write for git to run is not run.
test('the finish script runs no hook and no configuration of the clone', (testContext) => {
  const host = setUp(testContext);
  const clone = madeClone(host);
  writeFindings(clone, 'security-audit-one.md');
  const marker = join(host.base, 'marker');
  const write = `#!/bin/sh\necho ran >>'${marker}'\n`;
  for (const hook of ['post-checkout', 'pre-commit', 'post-merge', 'reference-transaction']) {
    writeFileSync(join(clone, '.git', 'hooks', hook), write);
    chmodSync(join(clone, '.git', 'hooks', hook), 0o755);
  }
  writeFileSync(join(host.base, 'monitor.sh'), write);
  chmodSync(join(host.base, 'monitor.sh'), 0o755);
  git(clone, 'config', 'alias.status', `!echo ran >>'${marker}'`);
  git(clone, 'config', 'core.fsmonitor', join(host.base, 'monitor.sh'));
  const result = host.finish(['clone']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(kindOf(clone), 'missing');
  assert.equal(existsSync(marker), false);
});
