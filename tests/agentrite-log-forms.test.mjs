import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  declineDecision,
  logEntries,
  proposedDecline,
  reviewForm,
  runEntries,
} from '../scripts/agentrite-log-forms.mjs';

const AGENT = '[Claude Code, anthropic/claude-opus-5-5]';

function record(...sections) {
  return ['---', 'kind: feature', 'status: in-progress', '---', '', '# 0001 A title', '', ...sections].join('\n');
}

test('logEntries reads an entry on one line and one wrapped over three lines, its lines joined by one space', () => {
  const text = record(
    '## Log',
    '',
    `- 2026-11-22T10:00:00Z ${AGENT} as the reviewer, reviewed the unit at \`abc1234\`.`,
    `- 2026-11-22T11:00:00Z ${AGENT} as the reviewer, reviewed the unit at`,
    '  `abc1234` as a delta review.',
    '    Blocking findings: none.',
    '',
    '## Amendments',
    '',
    '- 2026-11-22T12:00:00Z [human] an amendment',
  );
  const entries = logEntries(text);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].text, 'reviewed the unit at `abc1234`.');
  assert.equal(entries[1].text, 'reviewed the unit at `abc1234` as a delta review. Blocking findings: none.');
});

test('logEntries gives the first line of a wrapped entry as it stands', () => {
  const first = `- 2026-11-22T11:00:00Z ${AGENT} as the reviewer, reviewed the unit at`;
  const text = record('## Log', '', first, '  `abc1234` as a delta review.', '    Blocking findings: none.');
  const [entry] = logEntries(text);
  assert.equal(entry.firstLine, first);
  assert.equal(entry.text, 'reviewed the unit at `abc1234` as a delta review. Blocking findings: none.');
});

test('logEntries leaves out the entries of other sections and ends an entry at a blank line', () => {
  const text = record(
    '## Log',
    '- 2026-11-22T10:00:00Z [human] one',
    '',
    '  not a continuation',
    '',
    '## Notes',
    '',
    '- 2026-11-22T10:30:00Z [human] two',
  );
  assert.deepEqual(
    logEntries(text).map((entry) => entry.text),
    ['one'],
  );
  assert.deepEqual(logEntries(record('# no log')), []);
});

test('logEntries reads the author, the role and the variant of an entry', () => {
  const lines = [
    `- 2026-11-22T10:00:00Z ${AGENT} as the reviewer, reviewed the unit`,
    `- 2026-11-22T10:01:00Z ${AGENT} as the reviewer, on the variant \`opus\`, reviewed the unit`,
    '- 2026-11-22T10:02:00Z [human] on the variant `opus-2`, decided the proposed decline of `S1`: declined',
    `- 2026-11-22T10:03:00Z ${AGENT} began the work`,
    `- 2026-11-22T10:04:00Z ${AGENT} as the implementer on the variant \`opus\`, began`,
    '- 2026-11-22T10:05:00Z [human] approved the spec',
  ];
  const text = record('## Log', '', ...lines);
  assert.deepEqual(logEntries(text), [
    {
      timestamp: '2026-11-22T10:00:00Z',
      author: 'Claude Code, anthropic/claude-opus-5-5',
      role: 'reviewer',
      variant: null,
      firstLine: lines[0],
      text: 'reviewed the unit',
    },
    {
      timestamp: '2026-11-22T10:01:00Z',
      author: 'Claude Code, anthropic/claude-opus-5-5',
      role: 'reviewer',
      variant: 'opus',
      firstLine: lines[1],
      text: 'reviewed the unit',
    },
    {
      timestamp: '2026-11-22T10:02:00Z',
      author: 'human',
      role: null,
      variant: 'opus-2',
      firstLine: lines[2],
      text: 'decided the proposed decline of `S1`: declined',
    },
    {
      timestamp: '2026-11-22T10:03:00Z',
      author: 'Claude Code, anthropic/claude-opus-5-5',
      role: null,
      variant: null,
      firstLine: lines[3],
      text: 'began the work',
    },
    {
      timestamp: '2026-11-22T10:04:00Z',
      author: 'Claude Code, anthropic/claude-opus-5-5',
      role: 'implementer',
      variant: null,
      firstLine: lines[4],
      text: 'on the variant `opus`, began',
    },
    {
      timestamp: '2026-11-22T10:05:00Z',
      author: 'human',
      role: null,
      variant: null,
      firstLine: lines[5],
      text: 'approved the spec',
    },
  ]);
});

test('logEntries reads a variant phrase wrapped at its space', () => {
  const text = record(
    '## Log',
    '',
    `- 2026-11-22T10:00:00Z ${AGENT} as the reviewer, on the variant`,
    '  `opus`, reviewed',
  );
  assert.equal(logEntries(text)[0].variant, 'opus');
  assert.equal(logEntries(text)[0].text, 'reviewed');
});

test('runEntries keeps the entries of one variant, and those of the unit branch for null', () => {
  const text = record(
    '## Log',
    '',
    '- 2026-11-22T10:00:00Z [human] one',
    '- 2026-11-22T10:01:00Z [human] on the variant `a`, two',
    '- 2026-11-22T10:02:00Z [human] on the variant `b`, three',
  );
  const entries = logEntries(text);
  assert.deepEqual(runEntries(entries, null).map((entry) => entry.text), ['one']);
  assert.deepEqual(runEntries(entries, 'a').map((entry) => entry.text), ['two']);
  assert.deepEqual(runEntries(entries, 'c'), []);
});

for (const [name, text, expected] of [
  ['none', 'reviewed the unit at `abc1234` in full. Blocking findings: none.', { commit: 'abc1234', blocking: [] }],
  [
    'one label',
    'reviewed the unit at `abc1234` in full. Returned `S1`. Blocking findings: `S1`.',
    { commit: 'abc1234', blocking: ['S1'] },
  ],
  [
    'two labels and a full hash, followed by more',
    `reviewed the unit at \`${'a'.repeat(40)}\` in full. Blocking findings: \`S1\`, \`C2\`. Did not verify x.`,
    { commit: 'a'.repeat(40), blocking: ['S1', 'C2'] },
  ],
]) {
  test(`reviewForm reads a review with ${name}`, () => {
    assert.deepEqual(reviewForm(text), expected);
  });
}

for (const [name, text] of [
  ['the habit before the forms', 'reviewed `0116-no-branch` at `dc65325` in full. Returned non-blocking P1'],
  ['a hash of 6 characters', 'reviewed the unit at `abc123` in full. Blocking findings: none.'],
  ['a hash of 41 characters', `reviewed the unit at \`${'a'.repeat(41)}\` in full. Blocking findings: none.`],
  ['a hash in upper case', 'reviewed the unit at `ABC1234` in full. Blocking findings: none.'],
  ['no space after the hash', 'reviewed the unit at `abc1234`, in full. Blocking findings: none.'],
  ['no sentence of blocking findings', 'reviewed the unit at `abc1234` in full.'],
  [
    'two sentences of blocking findings',
    'reviewed the unit at `abc1234` x. Blocking findings: none. Blocking findings: none.',
  ],
  ['a label not in backticks', 'reviewed the unit at `abc1234` x. Blocking findings: S1.'],
  ['labels apart by a comma alone', 'reviewed the unit at `abc1234` x. Blocking findings: `S1`,`C2`.'],
  ['no final full stop', 'reviewed the unit at `abc1234` x. Blocking findings: `S1`'],
  ['no full stop before the sentence', 'reviewed the unit at `abc1234` in full Blocking findings: none.'],
]) {
  test(`reviewForm refuses ${name}`, () => {
    assert.equal(reviewForm(text), null);
  });
}

test('proposedDecline reads the label of a proposed decline, and nothing else', () => {
  assert.equal(proposedDecline('proposed to decline `S2`: the reason'), 'S2');
  assert.equal(proposedDecline('proposed to decline `S2` the reason'), null);
  assert.equal(proposedDecline('declined `S2`: the reason'), null);
});

test('declineDecision reads the decision of the human, on one line and wrapped', () => {
  const text = record(
    '## Log',
    '',
    '- 2026-11-22T10:00:00Z [human] decided the proposed decline of `S2`: declined',
    '- 2026-11-22T10:01:00Z [human] on the variant `opus`, decided the proposed decline of `C1`: to be',
    '  fixed. Thanks',
  );
  const [first, second] = logEntries(text);
  assert.deepEqual(declineDecision(first), { label: 'S2', decision: 'declined' });
  assert.deepEqual(declineDecision(second), { label: 'C1', decision: 'to be fixed' });
});

test('declineDecision refuses an agent, another word and a word that only starts with one', () => {
  const entry = (author, text) => ({ timestamp: 't', author, role: null, variant: null, text });
  assert.equal(declineDecision(entry('Claude Code, x/y', 'decided the proposed decline of `S2`: declined')), null);
  assert.equal(declineDecision(entry('human', 'decided the proposed decline of `S2`: accepted')), null);
  assert.equal(declineDecision(entry('human', 'decided the proposed decline of `S2`: to be fixedly')), null);
  assert.equal(declineDecision(entry('human', 'decided the proposed decline of `S2`: declined.')) !== null, true);
});
