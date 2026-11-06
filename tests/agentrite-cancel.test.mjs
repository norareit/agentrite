import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  CANCEL_FORM,
  cancelledLine,
  cancelledRecord,
  cancellationEntry,
  cancellationMessage,
  cancellationRefusal,
  parseCancelArgs,
  wrappedEntry,
} from '../scripts/agentrite-cancel.mjs';
import { installKit, kitSettingsText } from './installed-kit.mjs';
import { commitRecord, environment, git, installHook, write } from './record-command.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const INSTANT = '2026-11-06T14:04:56Z';

test('parseCancelArgs gives the unit, the reason and the unit by', () => {
  assert.deepEqual(parseCancelArgs(['0099', '--reason', 'x']), { unit: '0099', reason: 'x', by: undefined });
  assert.deepEqual(parseCancelArgs(['0099', '--reason=x', '--by=0042']), { unit: '0099', reason: 'x', by: '0042' });
  assert.deepEqual(parseCancelArgs(['--by', '0042', '--reason', 'x', 'changes/0099-y/']), {
    unit: 'changes/0099-y/',
    reason: 'x',
    by: '0042',
  });
});

test('parseCancelArgs removes the white space and one final full stop of the reason', () => {
  assert.equal(parseCancelArgs(['0099', '--reason', '  Done.  ']).reason, 'Done');
  assert.equal(parseCancelArgs(['0099', '--reason', 'Done..']).reason, 'Done.');
});

for (const [args, line] of [
  [[], 'no unit given'],
  [['--reason', 'x'], 'no unit given'],
  [['0099'], '--reason is required, and gives the reason in words'],
  [['0099', '0100', '--reason', 'x'], 'unexpected argument: 0100'],
  [['0099', '--reason'], '--reason takes a reason, and none was given'],
  [['0099', '--reason', '--by', '0042'], '--reason takes a reason, and none was given'],
  [['0099', '--reason', 'a', '--reason', 'b'], '--reason was given twice'],
  [['0099', '--reason', 'x', '--by'], '--by takes a unit, and none was given'],
  [['0099', '--reason', 'x', '--by', 'a', '--by', 'b'], '--by was given twice'],
  [['0099', '--reason', ' . '], '--reason gives no reason once its white space and final full stop are removed'],
  [['0099', '--reason', 'a\nb'], '--reason holds a line break, and the reason is one line'],
  [['0099', '--reason', 'a\rb'], '--reason holds a line break, and the reason is one line'],
  [['0099', '--reason', 'x\n'], '--reason holds a line break, and the reason is one line'],
  [['0099', '--reason', 'x', '--json'], 'unknown option: --json'],
  [['0099', '--reason', 'x', '--'], 'unexpected argument: --'],
]) {
  test(`parseCancelArgs refuses ${JSON.stringify(args)} with the line and the form`, () => {
    assert.throws(() => parseCancelArgs(args), { message: `${line}\n${CANCEL_FORM}` });
  });
}

test('cancellationEntry gives the entry without and with the unit by', () => {
  assert.equal(
    cancellationEntry(INSTANT, 'Not needed', undefined),
    `- ${INSTANT} [human] cancelled the unit: Not needed. The status is \`cancelled\``,
  );
  assert.equal(
    cancellationEntry(INSTANT, 'Done elsewhere', '0042-x'),
    `- ${INSTANT} [human] cancelled the unit: Done elsewhere. The unit \`0042-x\` did the work or made it moot. ` +
      'The status is `cancelled`',
  );
});

test('wrappedEntry keeps an entry that fits one line', () => {
  assert.deepEqual(wrappedEntry('- a b c'), ['- a b c']);
});

test('wrappedEntry wraps at 120 characters and indents each line after the first by two spaces', () => {
  const words = Array.from({ length: 70 }, (_, index) => `w${index}`);
  const lines = wrappedEntry(`- ${words.join(' ')}`);
  assert.equal(lines.length, 3);
  for (const line of lines) assert.ok(line.length <= 120, line);
  assert.equal(lines[0].startsWith('- w0 '), true);
  for (const line of lines.slice(1)) assert.match(line, /^ {2}\S/);
  assert.equal(lines.join(' ').replaceAll(/ {2,}/g, ' '), `- ${words.join(' ')}`);
});

test('wrappedEntry fills a line to exactly 120 characters', () => {
  const full = `- ${'a'.repeat(115)} bb`;
  assert.equal(full.length, 120);
  assert.deepEqual(wrappedEntry(full), [full]);
  assert.deepEqual(wrappedEntry(`${full} cc`), [full, '  cc']);
});

test('wrappedEntry leaves a word longer than a line alone and unbroken', () => {
  const long = 'x'.repeat(130);
  assert.deepEqual(wrappedEntry(`- one ${long} two`), ['- one', `  ${long}`, '  two']);
});

const RECORD = [
  '---',
  'kind: feature',
  'status: in-progress',
  'timestamp: 2026-11-06T10:00:00Z',
  '---',
  '',
  '# 0010 A title',
  '',
  '## Log',
  '',
];

test('cancelledRecord changes the status line alone of the front matter', () => {
  const before = [...RECORD, '- one', ''].join('\n');
  assert.equal(
    cancelledRecord(before, ['- two']),
    [...RECORD, '- one', '- two', ''].join('\n').replace('status: in-progress', 'status: cancelled'),
  );
});

test('cancelledRecord puts a wrapped entry after a last entry of several lines', () => {
  const before = [...RECORD, '- one', '  more', ''].join('\n');
  const after = cancelledRecord(before, ['- two', '  wrapped']);
  assert.ok(after.endsWith('- one\n  more\n- two\n  wrapped\n'));
});

test('cancelledRecord puts the entry before a section that follows the Log', () => {
  const before = [...RECORD, '- one', '', '## Amendments', ''].join('\n');
  const after = cancelledRecord(before, ['- two', '  wrapped']);
  assert.ok(after.endsWith('- one\n- two\n  wrapped\n\n## Amendments\n'));
});

test('cancelledRecord puts the entry after one blank line under a Log with no entry', () => {
  const after = cancelledRecord(RECORD.join('\n'), ['- two']);
  assert.ok(after.endsWith('## Log\n\n- two\n'));
});

test('cancellationRefusal gives nothing for the statuses a unit is cancelled from', () => {
  for (const status of ['draft', 'approved', 'in-progress']) {
    assert.equal(cancellationRefusal('0010-x', status), undefined);
  }
});

for (const [status, line] of [
  [
    'implemented',
    'the unit changes/0010-x/ is implemented, and an implemented unit is never cancelled: undoing its work is a new ' +
      'unit that names it in supersedes',
  ],
  ['cancelled', 'the unit changes/0010-x/ is cancelled already on the branch checked out'],
  ['done', 'the unit changes/0010-x/ is done, and a unit is cancelled from draft, approved or in-progress'],
]) {
  test(`cancellationRefusal refuses the status ${status}`, () => {
    assert.equal(cancellationRefusal('0010-x', status), line);
  });
}

test('cancellationMessage gives the prefix of each kind and the four digits', () => {
  assert.equal(cancellationMessage('feature', '0010-x'), 'feature-0010 Cancel the unit');
  assert.equal(cancellationMessage('bug', '0010-x'), 'bugfix-0010 Cancel the unit');
  assert.equal(cancellationMessage('task', '0010-x'), 'task-0010 Cancel the unit');
});

test('cancelledLine names the directory, the branch and the commit', () => {
  assert.equal(
    cancelledLine('0098-fast-tests-by-default', 'master', 'b79f39c', 'feature-0098 Cancel the unit'),
    'changes/0098-fast-tests-by-default/ is cancelled on master, in b79f39c feature-0098 Cancel the unit',
  );
});

// The command, in a git repository.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const FEATURE = '0010-a-feature';
const TASK = '0011-a-task';
const DONE = '0012-done';
const INSTANT_FORM = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/;

function recordText(kind, status) {
  const front = `---\nkind: ${kind}\nstatus: ${status}\ntimestamp: 2026-10-23T10:00:00Z\n---\n`;
  return `${front}\n# A unit\n\n## Log\n\n- 2026-10-23T10:00:00Z [human] began\n`;
}

// A project made by `git init` on `master`, with a draft feature, an approved task and an implemented feature.
function fixture(testContext) {
  const base = temporaryDirectory(testContext, 'agentrite-cancel-');
  const project = join(base, 'project');
  mkdirSync(join(base, 'home'));
  writeFileSync(join(base, 'home', '.gitconfig'), '[user]\n\tname = Ada Lovelace\n\temail = ada@example.com\n');
  mkdirSync(project);
  git(base, project, 'init', '--quiet', '--initial-branch', 'master');
  installKit(project);
  write(project, 'agentrite.json', kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: false }));
  write(project, '.gitignore', 'node_modules\n');
  write(project, `changes/${FEATURE}/spec.md`, '# A feature\n');
  write(project, `changes/${FEATURE}/record.md`, recordText('feature', 'draft'));
  write(project, `changes/${TASK}/record.md`, recordText('task', 'approved'));
  write(project, `changes/${DONE}/spec.md`, '# Done\n');
  write(project, `changes/${DONE}/record.md`, recordText('feature', 'implemented'));
  write(project, 'tracked.txt', 'one\n');
  git(base, project, 'add', '-A');
  git(base, project, 'commit', '--quiet', '-m', 'Start');
  return { base, project };
}

function cancelIn({ base, project }, ...args) {
  return spawnSync(process.execPath, [script, 'cancel', ...args], {
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
    record: existsSync(join(project, 'changes', directory, 'record.md'))
      ? readFileSync(join(project, 'changes', directory, 'record.md'), 'utf-8')
      : null,
  };
}

// The record of `before` as the command leaves it: the status changed, and the entry's lines after the last entry.
function entryOf(before, after, status) {
  const prefix = before.replace(`status: ${status}`, 'status: cancelled');
  assert.ok(after.startsWith(prefix), after);
  return after.slice(prefix.length);
}

const LONG_REASON = `${'a reason of many words '.repeat(6)}ends here`;

for (const [name, branch, directory, status, args, message] of [
  ['draft feature on master', 'master', FEATURE, 'draft', ['0010', '--reason', 'Not needed.'],
    'feature-0010 Cancel the unit'],
  ['in-progress task on its branch', 'task-0011-a-task', TASK, 'in-progress',
    ['changes/0011-a-task/', '--reason=Out of date'], 'task-0011 Cancel the unit'],
]) {
  test(`cancel commits the cancellation of the ${name} and prints one line`, (context) => {
    const given = fixture(context);
    const { base, project } = given;
    if (branch !== 'master') {
      git(base, project, 'switch', '--quiet', '--create', branch);
      commitRecord(given, directory, (text) => text.replace('status: approved', 'status: in-progress'));
    }
    const before = stateOf(given, directory);
    const masterBefore = git(base, project, 'rev-parse', 'master').trim();
    const hookMessage = join(base, 'hook-message.txt');
    installHook(given, `cat "$1" > "${hookMessage}"`);

    const result = cancelIn(given, ...args);

    const after = stateOf(given, directory);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    const hash = git(base, project, 'rev-parse', '--short', 'HEAD').trim();
    assert.equal(result.stdout, `changes/${directory}/ is cancelled on ${branch}, in ${hash} ${message}\n`);
    assert.equal(git(base, project, 'rev-parse', 'HEAD~1').trim(), before.head);
    if (branch !== 'master') assert.equal(git(base, project, 'rev-parse', 'master').trim(), masterBefore);
    assert.equal(git(base, project, 'log', '-1', '--format=%B').trim(), message);
    assert.equal(git(base, project, 'log', '-1', '--format=%an').trim(), 'Ada Lovelace');
    assert.equal(git(base, project, 'show', '--name-only', '--format=').trim(), `changes/${directory}/record.md`);
    assert.equal(readFileSync(hookMessage, 'utf-8').trim(), message);
    assert.equal(after.status, '');
    const reason = args[args.length - 1].replace('--reason=', '').replace(/\.$/, '');
    assert.match(
      entryOf(before.record, after.record, status),
      new RegExp(
        `^- ${INSTANT_FORM.source} \\[human\\] cancelled the unit: ${reason}\\. The status is \`cancelled\`\\n$`,
      ),
    );
  });
}

test('cancel names the unit by in a long entry wrapped within 120 characters', (context) => {
  const given = fixture(context);
  const before = stateOf(given);

  const result = cancelIn(given, '0010', '--reason', LONG_REASON, '--by', '0012');

  assert.equal(result.status, 0, result.stderr);
  const entry = entryOf(before.record, stateOf(given).record, 'draft');
  const lines = entry.split('\n').slice(0, -1);
  assert.ok(lines.length >= 2, entry);
  for (const line of lines) assert.ok(line.length <= 120, line);
  for (const line of lines.slice(1)) assert.match(line, /^ {2}\S/);
  assert.ok(entry.replaceAll('\n  ', ' ').includes(`The unit \`${DONE}\` did the work or made it moot. The status is`));
});

test('cancel moves no branch but the one checked out', (context) => {
  const given = fixture(context);
  const { base, project } = given;
  git(base, project, 'branch', 'other');
  git(base, project, 'switch', '--quiet', '--create', 'task-0011-a-task');
  commitRecord(given, TASK, (text) => text.replace('status: approved', 'status: in-progress'));
  const heads = () => git(base, project, 'for-each-ref', 'refs/heads').split('\n');
  const before = heads();

  const result = cancelIn(given, '0011', '--reason', 'x');

  assert.equal(result.status, 0, result.stderr);
  const moved = heads().filter((line) => !before.includes(line));
  assert.equal(moved.length, 1);
  assert.match(moved[0], /refs\/heads\/task-0011-a-task$/);
  assert.equal(heads().length, before.length);
});

test('cancel leaves files staged and changed outside the unit out of the commit and as they were', (context) => {
  const given = fixture(context);
  const { base, project } = given;
  write(project, 'other.txt', 'staged\n');
  git(base, project, 'add', 'other.txt');
  write(project, 'tracked.txt', 'two\n');
  const before = stateOf(given);

  const result = cancelIn(given, '0010', '--reason', 'x');

  const after = stateOf(given);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(git(base, project, 'show', '--name-only', '--format=').trim(), `changes/${FEATURE}/record.md`);
  assert.equal(after.status, before.status);
  assert.equal(after.staged, before.staged);
  assert.equal(readFileSync(join(project, 'tracked.txt'), 'utf-8'), 'two\n');
});

test('cancel puts the record back when a hook refuses the commit, and leaves the index as it was', (context) => {
  const given = fixture(context);
  const { base, project } = given;
  installHook(given, 'echo "refused by the hook" >&2\nexit 1');
  write(project, 'other.txt', 'staged\n');
  git(base, project, 'add', 'other.txt');
  const before = stateOf(given);

  const result = cancelIn(given, '0010', '--reason', 'x');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^refused by the hook$/m);
  assert.match(result.stderr, /the commit failed, and changes\/0010-a-feature\/record\.md is as it was/);
  assert.deepEqual(stateOf(given), before);
});

function commitWithout(given, path) {
  rmSync(join(given.project, path));
  git(given.base, given.project, 'commit', '--quiet', '-am', `Remove ${path}`);
}

function listed(path, state) {
  return new RegExp(`- ${path.replaceAll('.', '\\.')}: ${state}\\n.*commit these files`, 's');
}

const REASON = ['--reason', 'x'];
const REFUSALS = [
  ['no agentrite.json', (given) => commitWithout(given, 'agentrite.json'), ['0010', ...REASON], /agentrite\.json/],
  [
    'an agentrite.json that is not JSON',
    (given) => {
      write(given.project, 'agentrite.json', 'not json');
      git(given.base, given.project, 'commit', '--quiet', '-am', 'Break');
    },
    ['0010', ...REASON],
    /agentrite\.json/,
  ],
  [
    'a detached HEAD',
    (given) => git(given.base, given.project, 'checkout', '--quiet', '--detach'),
    ['0010', ...REASON],
    /no branch is checked out, and a cancellation is committed on a branch/,
  ],
  ['digits that name no directory', () => {}, ['0099', ...REASON], /changes\/ holds no directory for the unit 0099/],
  [
    'digits that open two directories',
    (given) => {
      write(given.project, 'changes/0010-other/record.md', recordText('task', 'draft'));
      git(given.base, given.project, 'add', '-A');
      git(given.base, given.project, 'commit', '--quiet', '-m', 'Add');
    },
    ['0010', ...REASON],
    /open more than one directory/,
  ],
  [
    'no record.md',
    (given) => commitWithout(given, `changes/${TASK}/record.md`),
    ['0011', ...REASON],
    /changes\/0011-a-task\/record\.md does not exist/,
  ],
  [
    'a record without status',
    (given) => commitRecord(given, TASK, (text) => text.replace('status: approved\n', '')),
    ['0011', ...REASON],
    /missing a status field/,
  ],
  [
    'a record without kind',
    (given) => commitRecord(given, TASK, (text) => text.replace('kind: task\n', '')),
    ['0011', ...REASON],
    /missing a kind field/,
  ],
  [
    'a record without ## Log',
    (given) => commitRecord(given, TASK, (text) => text.replace('## Log', '## Notes')),
    ['0011', ...REASON],
    /missing a ## Log heading/,
  ],
  [
    'the kind epic',
    (given) => commitRecord(given, TASK, (text) => text.replace('kind: task', 'kind: epic')),
    ['0011', ...REASON],
    /gives the kind epic/,
  ],
  [
    'the status implemented',
    () => {},
    ['0012', ...REASON],
    /is implemented, and an implemented unit is never cancelled.*new unit that names it in supersedes/,
  ],
  [
    'the status cancelled',
    (given) => commitRecord(given, TASK, (text) => text.replace('status: approved', 'status: cancelled')),
    ['0011', ...REASON],
    /is cancelled already on the branch checked out/,
  ],
  [
    'the status done',
    (given) => commitRecord(given, TASK, (text) => text.replace('status: approved', 'status: done')),
    ['0011', ...REASON],
    /is done, and a unit is cancelled from draft, approved or in-progress/,
  ],
  [
    '--by naming no directory',
    () => {},
    ['0010', ...REASON, '--by', '0098'],
    /--by was given 0098, and changes\/ holds no directory/,
  ],
  [
    '--by digits that open two directories',
    (given) => {
      write(given.project, 'changes/0012-other/record.md', recordText('task', 'draft'));
      git(given.base, given.project, 'add', '-A');
      git(given.base, given.project, 'commit', '--quiet', '-m', 'Add');
    },
    ['0010', ...REASON, '--by', '0012'],
    /--by was given 0012, and the digits 0012 open more than one directory/,
  ],
  [
    '--by naming the unit',
    () => {},
    ['0010', ...REASON, '--by', '0010'],
    /--by was given 0010, which names the unit being cancelled, changes\/0010-a-feature\//,
  ],
  [
    'a spec changed',
    (given) => write(given.project, `changes/${FEATURE}/spec.md`, 'edited\n'),
    ['0010', ...REASON],
    listed(`changes/${FEATURE}/spec.md`, 'changed'),
  ],
  [
    'a spec staged',
    (given) => {
      write(given.project, `changes/${FEATURE}/spec.md`, 'edited\n');
      git(given.base, given.project, 'add', '-A');
    },
    ['0010', ...REASON],
    listed(`changes/${FEATURE}/spec.md`, 'staged'),
  ],
  [
    'a notes.md not tracked',
    (given) => write(given.project, `changes/${FEATURE}/notes.md`, 'n\n'),
    ['0010', ...REASON],
    listed(`changes/${FEATURE}/notes.md`, 'not tracked'),
  ],
];

for (const [name, arrange, args, message] of REFUSALS) {
  test(`cancel refuses ${name}, writes nothing and exits 1`, (context) => {
    const given = fixture(context);
    arrange(given);
    const directory = args[0] === '0011' ? TASK : args[0] === '0012' ? DONE : FEATURE;
    const before = existsSync(join(given.project, '.git')) ? stateOf(given, directory) : null;

    const result = cancelIn(given, ...args);

    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, message);
    if (before !== null) assert.deepEqual(stateOf(given, directory), before);
  });
}

test('cancel refuses a project in no git repository', (context) => {
  const given = fixture(context);
  rmSync(join(given.project, '.git'), { recursive: true });
  const result = cancelIn(given, '0010', ...REASON);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /is in no git repository, and a cancellation is committed on a branch/);
  assert.match(readFileSync(join(given.project, 'changes', FEATURE, 'record.md'), 'utf-8'), /status: draft/);
});

for (const [args, line] of [
  [[], 'no unit given'],
  [['0010'], '--reason is required'],
  [['0010', '0011', ...REASON], 'unexpected argument: 0011'],
  [['0010', '--reason'], '--reason takes a reason'],
  [['0010', ...REASON, '--by'], '--by takes a unit'],
  [['0010', ...REASON, ...REASON], '--reason was given twice'],
  [['0010', '--reason', ' . '], '--reason gives no reason'],
  [['0010', '--reason', 'a\nb'], '--reason holds a line break'],
  [['0010', ...REASON, '--json'], 'unknown option: --json'],
  [['0010', ...REASON, '--'], 'unexpected argument: --'],
]) {
  test(`cancel ${JSON.stringify(args)} exits 2 with the line and the form, and changes nothing`, (context) => {
    const given = fixture(context);
    const before = stateOf(given);
    const result = cancelIn(given, ...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.ok(result.stderr.startsWith(line), result.stderr);
    assert.ok(result.stderr.endsWith(`\n${CANCEL_FORM}\n`), result.stderr);
    assert.deepEqual(stateOf(given), before);
  });
}

test('agentrite with no argument names cancel after approve', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf-8' });
  const forms = result.stderr + result.stdout;
  assert.ok(forms.includes(CANCEL_FORM.replace('usage: ', '       ')) || forms.includes(CANCEL_FORM));
  assert.ok(forms.indexOf('agentrite approve') < forms.indexOf('agentrite cancel'));
});
