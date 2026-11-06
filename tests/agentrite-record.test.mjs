import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  commitPrefix,
  loggedRecord,
  recordFields,
  uncommittedFiles,
  uncommittedRefusal,
} from '../scripts/agentrite-record.mjs';

const RECORD = [
  '---',
  'kind: feature',
  'status: draft',
  'supersedes: 0001-x',
  'timestamp: 2026-10-23T10:00:00Z',
  '---',
];

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

test('commitPrefix gives the prefix of each kind', () => {
  assert.deepEqual(['feature', 'bug', 'task'].map(commitPrefix), ['feature', 'bugfix', 'task']);
});

test('loggedRecord sets the status and joins an entry of two lines by the ending of the record', () => {
  const text = record({ log: ['- one'], lineEnd: '\r\n' });
  const logged = loggedRecord(text, 'cancelled', ['- two', '  more']);
  assert.ok(logged.includes('status: cancelled\r\n'));
  assert.ok(logged.includes('- one\r\n- two\r\n  more\r\n'));
  assert.equal(logged.replaceAll('\r\n', '').includes('\n'), false);
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
    uncommittedRefusal('0010-x', [{ path: 'changes/0010-x/spec.md', state: 'changed' }], 'approves'),
    'changes/0010-x/ holds files that differ from the commit checked out:\n' +
      '- changes/0010-x/spec.md: changed\n' +
      'The human approves what is committed, so commit these files, or discard their changes, and run the command ' +
      'again',
  );
});

test('uncommittedRefusal ends by what the human does with what is committed', () => {
  const files = [{ path: 'changes/0010-x/spec.md', state: 'changed' }];
  assert.equal(
    uncommittedRefusal('0010-x', files, 'cancels'),
    'changes/0010-x/ holds files that differ from the commit checked out:\n' +
      '- changes/0010-x/spec.md: changed\n' +
      'The human cancels what is committed, so commit these files, or discard their changes, and run the command ' +
      'again',
  );
});
