import assert from 'node:assert/strict';
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
