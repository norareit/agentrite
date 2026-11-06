import assert from 'node:assert/strict';
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
