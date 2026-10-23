import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  APPROVE_FORM,
  approvalEntry,
  approvalMessage,
  approvedLine,
  approvedRecord,
  parseApproveArgs,
  recordFields,
  uncommittedFiles,
  uncommittedRefusal,
} from '../scripts/agentrite-approve.mjs';
import { installKit, kitSettingsText } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const INSTANT = '2026-10-23T11:23:18Z';

test('parseApproveArgs gives the unit as it was given', () => {
  assert.deepEqual(parseApproveArgs(['0082']), { unit: '0082' });
  assert.deepEqual(parseApproveArgs(['changes/0082-x/']), { unit: 'changes/0082-x/' });
});

for (const [args, line] of [
  [[], 'no unit given'],
  [['0082', '0083'], 'unexpected argument: 0083'],
  [['0082', '--json'], 'unknown option: --json'],
  [['--json', '0082'], 'unknown option: --json'],
  [['-x', '0082'], 'unknown option: -x'],
  [['--', '0082'], 'unexpected argument: --'],
  [['0082', '--'], 'unexpected argument: --'],
]) {
  test(`parseApproveArgs refuses ${JSON.stringify(args)} with the line and the form`, () => {
    assert.throws(() => parseApproveArgs(args), { message: `${line}\n${APPROVE_FORM}` });
  });
}

const RECORD = [
  '---',
  'kind: feature',
  'status: draft',
  'supersedes: 0001-x',
  'timestamp: 2026-10-23T10:00:00Z',
  '---',
];
const ENTRY = `- ${INSTANT} [human] approved the spec. The status is \`approved\``;

function record({ log, after = [], lineEnd = '\n' }) {
  return [...RECORD, '', '# 0082 A title', '', '## Log', '', ...log, ...(after.length > 0 ? ['', ...after] : []), '']
    .join(lineEnd);
}

test('recordFields gives the status and the kind', () => {
  assert.deepEqual(recordFields(record({ log: ['- one'] }), 'r.md'), { status: 'draft', kind: 'feature' });
});

for (const [name, text, message] of [
  ['status', record({ log: ['- one'] }).replace('status: draft\n', ''), 'r.md is missing a status field'],
  ['kind', record({ log: ['- one'] }).replace('kind: feature\n', ''), 'r.md is missing a kind field'],
  ['## Log', record({ log: [] }).replace('## Log', '## Journal'), 'r.md is missing a ## Log heading'],
  [
    'a known kind',
    record({ log: ['- one'] }).replace('kind: feature', 'kind: epic'),
    'r.md gives the kind epic, and a unit is a feature, a bug or a task',
  ],
]) {
  test(`recordFields refuses a record without ${name}`, () => {
    assert.throws(() => recordFields(text, 'r.md'), { message });
  });
}

test('approvalEntry and approvalMessage give the document and the prefix of each kind', () => {
  assert.equal(approvalEntry('feature', INSTANT), `- ${INSTANT} [human] approved the spec. The status is \`approved\``);
  assert.equal(approvalEntry('bug', INSTANT), `- ${INSTANT} [human] approved the spec. The status is \`approved\``);
  assert.equal(approvalEntry('task', INSTANT), `- ${INSTANT} [human] approved the record. The status is \`approved\``);
  assert.equal(approvalMessage('feature', '0010-a-feature'), 'feature-0010 Approve the spec');
  assert.equal(approvalMessage('bug', '0012-a-bug'), 'bugfix-0012 Approve the spec');
  assert.equal(approvalMessage('task', '0011-a-task'), 'task-0011 Approve the record');
});

test('approvedRecord changes the status line alone of the front matter', () => {
  const approved = approvedRecord(record({ log: ['- one'] }), 'feature', INSTANT);
  assert.equal(approved.split('\n').slice(0, RECORD.length).join('\n'), RECORD.join('\n').replace('draft', 'approved'));
});

for (const [name, log] of [
  ['one line', ['- one']],
  ['three lines', ['- one', '  two', '  three']],
]) {
  test(`approvedRecord puts the entry after a last entry of ${name}, in a Log that is the last section`, () => {
    const before = record({ log });
    const expected = before.replace('status: draft', 'status: approved').replace(/\n$/, `\n${ENTRY}\n`);
    assert.equal(approvedRecord(before, 'feature', INSTANT), expected);
  });

  test(`approvedRecord puts the entry after a last entry of ${name}, before the section that follows`, () => {
    const before = record({ log, after: ['## Amendments', '', '- a'] });
    const expected = before
      .replace('status: draft', 'status: approved')
      .replace('\n\n## Amendments', `\n${ENTRY}\n\n## Amendments`);
    assert.equal(approvedRecord(before, 'feature', INSTANT), expected);
  });
}

test('approvedRecord puts the entry after one blank line under a Log with no entry', () => {
  const before = [...RECORD, '', '## Log', '', '## Amendments', ''].join('\n');
  const expected = [...RECORD, '', '## Log', '', ENTRY, '', '## Amendments', ''].join('\n');
  assert.equal(approvedRecord(before, 'feature', INSTANT), expected.replace('status: draft', 'status: approved'));
  const bare = [...RECORD, '', '## Log', ''].join('\n');
  assert.ok(approvedRecord(bare, 'task', INSTANT).endsWith(`## Log\n\n${ENTRY.replace('spec', 'record')}\n`));
});

test('approvedRecord ends the entry as the lines of the record end', () => {
  const before = record({ log: ['- one'], lineEnd: '\r\n' });
  const approved = approvedRecord(before, 'feature', INSTANT);
  assert.ok(approved.includes('status: approved\r\n'));
  assert.ok(approved.includes(`- one\r\n${ENTRY}\r\n`));
  assert.equal(approved.replaceAll('\r\n', '').includes('\n'), false);
});

test('uncommittedFiles reads each state, with and without a prefix', () => {
  const output = ['?? c/n.md', ' M c/s.md', 'A  c/a.md', 'MM c/b.md'].join('\0') + '\0';
  const expected = [
    { path: 'c/n.md', state: 'not tracked' },
    { path: 'c/s.md', state: 'changed' },
    { path: 'c/a.md', state: 'staged' },
    { path: 'c/b.md', state: 'staged and changed' },
  ];
  assert.deepEqual(uncommittedFiles(output, ''), expected);
  assert.deepEqual(uncommittedFiles(output.replaceAll('c/', 'sub/c/'), 'sub/'), expected);
  assert.deepEqual(uncommittedFiles('', ''), []);
});

test('uncommittedRefusal names each file and what to do', () => {
  assert.equal(
    uncommittedRefusal('0010-x', [{ path: 'changes/0010-x/spec.md', state: 'changed' }]),
    'changes/0010-x/ holds files that differ from the commit checked out:\n' +
      '- changes/0010-x/spec.md: changed\n' +
      'The human approves what is committed, so commit these files, or discard their changes, and run the command ' +
      'again',
  );
});

test('approvedLine names the directory, the commit and its message', () => {
  assert.equal(
    approvedLine('0010-x', 'abc1234', 'feature-0010 Approve the spec'),
    'changes/0010-x/ is approved, in abc1234 feature-0010 Approve the spec',
  );
});

// The command, in a git repository.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const FEATURE = '0010-a-feature';
const TASK = '0011-a-task';

function recordText(kind, status = 'draft') {
  const front = `---\nkind: ${kind}\nstatus: ${status}\ntimestamp: 2026-10-23T10:00:00Z\n---\n`;
  return `${front}\n# A unit\n\n## Log\n\n- 2026-10-23T10:00:00Z [human] began\n`;
}

function write(project, path, text) {
  mkdirSync(dirname(join(project, path)), { recursive: true });
  writeFileSync(join(project, path), text);
}

function environment(base) {
  return { HOME: join(base, 'home'), GIT_CONFIG_NOSYSTEM: '1', PATH: process.env.PATH };
}

function git(base, project, ...args) {
  const result = spawnSync('git', args, { cwd: project, encoding: 'utf-8', env: environment(base) });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

// A project made by `git init`, with a draft feature and a draft task committed on `master`.
function fixture(testContext) {
  const base = temporaryDirectory(testContext, 'agentrite-approve-');
  const project = join(base, 'project');
  mkdirSync(join(base, 'home'));
  writeFileSync(join(base, 'home', '.gitconfig'), '[user]\n\tname = Ada Lovelace\n\temail = ada@example.com\n');
  mkdirSync(project);
  git(base, project, 'init', '--quiet', '--initial-branch', 'master');
  installKit(project);
  write(project, 'agentrite.json', kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: false }));
  write(project, '.gitignore', 'node_modules\n');
  write(project, `changes/${FEATURE}/spec.md`, '# A feature\n');
  write(project, `changes/${FEATURE}/record.md`, recordText('feature'));
  write(project, `changes/${TASK}/record.md`, recordText('task'));
  write(project, 'tracked.txt', 'one\n');
  git(base, project, 'add', '-A');
  git(base, project, 'commit', '--quiet', '-m', 'Start');
  return { base, project };
}

function approveIn({ base, project }, ...args) {
  return spawnSync(process.execPath, [script, 'approve', ...args], {
    cwd: project,
    encoding: 'utf-8',
    env: environment(base),
  });
}

function stateOf({ base, project }, directory = FEATURE) {
  return {
    head: git(base, project, 'rev-parse', 'HEAD').trim(),
    status: git(base, project, 'status', '--porcelain'),
    staged: git(base, project, 'diff', '--cached'),
    record: readFileSync(join(project, 'changes', directory, 'record.md'), 'utf-8'),
  };
}

function installHook({ project }, script) {
  const hook = join(project, '.git', 'hooks', 'commit-msg');
  writeFileSync(hook, `#!/bin/sh\n${script}\n`);
  chmodSync(hook, 0o755);
}

const INSTANT_FORM = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/;

for (const [unit, directory, kind, message] of [
  ['0010', FEATURE, 'feature', 'feature-0010 Approve the spec'],
  ['changes/0011-a-task/', TASK, 'task', 'task-0011 Approve the record'],
]) {
  test(`approve commits the approval of the ${kind} ${unit} and prints one line`, (context) => {
    const given = fixture(context);
    const { base, project } = given;
    const before = stateOf(given, directory);
    const hookMessage = join(base, 'hook-message.txt');
    installHook(given, `cat "$1" > "${hookMessage}"`);

    const result = approveIn(given, unit);

    const after = stateOf(given, directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const hash = git(base, project, 'rev-parse', '--short', 'HEAD').trim();
    assert.equal(result.stdout, `changes/${directory}/ is approved, in ${hash} ${message}\n`);
    assert.equal(git(base, project, 'rev-parse', 'HEAD~1').trim(), before.head);
    assert.equal(git(base, project, 'log', '-1', '--format=%B').trim(), message);
    assert.equal(git(base, project, 'log', '-1', '--format=%an').trim(), 'Ada Lovelace');
    assert.equal(git(base, project, 'show', '--name-only', '--format=').trim(), `changes/${directory}/record.md`);
    assert.equal(readFileSync(hookMessage, 'utf-8').trim(), message);
    assert.equal(after.status, '');
    const document = kind === 'task' ? 'record' : 'spec';
    const entry = new RegExp(
      `\\n- ${INSTANT_FORM.source} \\[human\\] approved the ${document}\\. The status is \`approved\`\\n$`,
    );
    assert.match(after.record, entry);
    assert.equal(
      after.record.replace(entry, '\n').replace('status: approved', 'status: draft'),
      before.record,
    );
  });
}

test('approve leaves files staged and changed outside the unit out of the commit and as they were', (context) => {
  const given = fixture(context);
  const { base, project } = given;
  write(project, 'other.txt', 'staged\n');
  git(base, project, 'add', 'other.txt');
  write(project, 'tracked.txt', 'two\n');
  const before = stateOf(given);

  const result = approveIn(given, '0010');

  const after = stateOf(given);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(base, project, 'show', '--name-only', '--format=').trim(), `changes/${FEATURE}/record.md`);
  assert.equal(after.status, before.status);
  assert.equal(after.staged, before.staged);
  assert.equal(readFileSync(join(project, 'tracked.txt'), 'utf-8'), 'two\n');
});

test('approve puts the record back when a hook refuses the commit, and leaves the index as it was', (context) => {
  const given = fixture(context);
  const { base, project } = given;
  installHook(given, 'echo "refused by the hook" >&2\nexit 1');
  write(project, 'other.txt', 'staged\n');
  git(base, project, 'add', 'other.txt');
  const before = stateOf(given);

  const result = approveIn(given, '0010');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /^refused by the hook$/m);
  assert.match(result.stderr, /the commit failed, and changes\/0010-a-feature\/record\.md is as it was/);
  assert.deepEqual(stateOf(given), before);
});

// Every refusal of the command writes nothing and commits nothing.
function commitWithout(given, path) {
  rmSync(join(given.project, path));
  git(given.base, given.project, 'commit', '--quiet', '-am', `Remove ${path}`);
}

function editSpec(given) {
  write(given.project, `changes/${FEATURE}/spec.md`, 'edited\n');
}

function listed(path, state) {
  return new RegExp(`- ${path.replaceAll('.', '\\.')}: ${state}\\n.*commit these files`, 's');
}

const ON_MASTER = 'and an approval is committed on the default branch master';
const REFUSALS = [
  ['no agentrite.json', (given) => rmSync(join(given.project, 'agentrite.json')), ['0010'], /agentrite\.json/],
  ['an agentrite.json that is not JSON', (given) => write(given.project, 'agentrite.json', '{'), ['0010'], /agentrite/],
  [
    'another branch',
    (given) => git(given.base, given.project, 'checkout', '--quiet', '-b', 'other'),
    ['0010'],
    new RegExp(`branch checked out is other, ${ON_MASTER}`),
  ],
  [
    'a detached HEAD',
    (given) => git(given.base, given.project, 'checkout', '--quiet', '--detach'),
    ['0010'],
    new RegExp(`no branch is checked out, ${ON_MASTER}`),
  ],
  ['no directory for the digits', () => {}, ['0099'], /holds no directory for the unit 0099/],
  [
    'digits that open two directories',
    (given) => {
      write(given.project, 'changes/0010-twin/record.md', recordText('task'));
      git(given.base, given.project, 'add', '-A');
      git(given.base, given.project, 'commit', '--quiet', '-m', 'Twin');
    },
    ['0010'],
    /open more than one directory/,
  ],
  [
    'no record.md',
    (given) => commitWithout(given, `changes/${TASK}/record.md`),
    ['0011'],
    /changes\/0011-a-task\/record\.md does not exist/,
  ],
  [
    'a record without status',
    (given) => commitRecord(given, TASK, (text) => text.replace('status: draft\n', '')),
    ['0011'],
    /missing a status field/,
  ],
  [
    'a record without kind',
    (given) => commitRecord(given, TASK, (text) => text.replace('kind: task\n', '')),
    ['0011'],
    /missing a kind field/,
  ],
  [
    'a record without ## Log',
    (given) => commitRecord(given, TASK, (text) => text.replace('## Log', '## Notes')),
    ['0011'],
    /missing a ## Log heading/,
  ],
  [
    'the kind epic',
    (given) => commitRecord(given, TASK, (text) => text.replace('kind: task', 'kind: epic')),
    ['0011'],
    /gives the kind epic/,
  ],
  [
    'the status approved',
    (given) => commitRecord(given, TASK, (text) => text.replace('draft', 'approved')),
    ['0011'],
    /is approved, and an approval moves a unit from draft/,
  ],
  [
    'a feature with no spec.md',
    (given) => commitWithout(given, `changes/${FEATURE}/spec.md`),
    ['0010'],
    /spec\.md does not exist, and the approval of a feature or a bug is that of its spec/,
  ],
  [
    'a bug with no spec.md',
    (given) => commitRecord(given, TASK, (text) => text.replace('kind: task', 'kind: bug')),
    ['0011'],
    /spec\.md does not exist/,
  ],
  ['a spec.md changed', editSpec, ['0010'], listed(`changes/${FEATURE}/spec.md`, 'changed')],
  [
    'a spec.md staged',
    (given) => {
      editSpec(given);
      git(given.base, given.project, 'add', '-A');
    },
    ['0010'],
    listed(`changes/${FEATURE}/spec.md`, 'staged'),
  ],
  [
    'a notes.md not tracked',
    (given) => write(given.project, `changes/${FEATURE}/notes.md`, 'n\n'),
    ['0010'],
    listed(`changes/${FEATURE}/notes.md`, 'not tracked'),
  ],
];

function commitRecord(given, directory, change) {
  const path = join(given.project, 'changes', directory, 'record.md');
  writeFileSync(path, change(readFileSync(path, 'utf-8')));
  git(given.base, given.project, 'commit', '--quiet', '-am', 'Change the record');
}

for (const [name, arrange, args, message] of REFUSALS) {
  test(`approve refuses ${name}, writes nothing and exits 1`, (context) => {
    const given = fixture(context);
    arrange(given);
    const directory = args[0] === '0011' ? TASK : FEATURE;
    const recordPath = join(given.project, 'changes', directory, 'record.md');
    const before = {
      head: git(given.base, given.project, 'rev-parse', 'HEAD').trim(),
      status: git(given.base, given.project, 'status', '--porcelain'),
      record: existsSync(recordPath) ? readFileSync(recordPath, 'utf-8') : null,
    };

    const result = approveIn(given, ...args);

    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, message);
    assert.equal(git(given.base, given.project, 'rev-parse', 'HEAD').trim(), before.head);
    assert.equal(git(given.base, given.project, 'status', '--porcelain'), before.status);
    assert.equal(existsSync(recordPath) ? readFileSync(recordPath, 'utf-8') : null, before.record);
  });
}

test('approve refuses a project in no git repository', (context) => {
  const given = fixture(context);
  rmSync(join(given.project, '.git'), { recursive: true });
  const result = approveIn(given, '0010');
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /is in no git repository, and an approval is committed on the default branch master/);
  assert.match(readFileSync(join(given.project, 'changes', FEATURE, 'record.md'), 'utf-8'), /status: draft/);
});

for (const args of [[], ['0010', '0011'], ['0010', '--json'], ['0010', '--']]) {
  test(`approve ${args.join(' ')} exits 2 with the line and the form, and changes nothing`, (context) => {
    const given = fixture(context);
    const before = stateOf(given);
    const result = approveIn(given, ...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, new RegExp(`^.+\\n${APPROVE_FORM}\\n$`));
    assert.deepEqual(stateOf(given), before);
  });
}

test('agentrite with no argument names approve after units', (context) => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf-8' });
  const forms = result.stderr + result.stdout;
  assert.ok(forms.includes(APPROVE_FORM.replace('usage: ', '       ')) || forms.includes(APPROVE_FORM));
  assert.ok(forms.indexOf('agentrite units') < forms.indexOf('agentrite approve'));
});
