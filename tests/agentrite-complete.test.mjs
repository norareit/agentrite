import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  branchRefusal,
  commitsNamed,
  COMPLETE_FORM,
  completedLine,
  completedRecord,
  completionEntry,
  completionMessage,
  decisionsRefusal,
  filesOutside,
  lastReview,
  parseCompleteArgs,
  planRefusal,
  runOfBranch,
  statusRefusal,
} from '../scripts/agentrite-complete.mjs';
import { logEntries } from '../scripts/agentrite-log-forms.mjs';

test('parseCompleteArgs gives the unit as it was given', () => {
  assert.deepEqual(parseCompleteArgs(['0117']), { unit: '0117' });
  assert.deepEqual(parseCompleteArgs(['changes/0117-x/']), { unit: 'changes/0117-x/' });
});

for (const [args, line] of [
  [[], 'no unit given'],
  [['0117', '0118'], 'unexpected argument: 0118'],
  [['0117', '--json'], 'unknown option: --json'],
  [['-x', '0117'], 'unknown option: -x'],
  [['--', '0117'], 'unexpected argument: --'],
  [['0117', '--'], 'unexpected argument: --'],
]) {
  test(`parseCompleteArgs refuses ${JSON.stringify(args)} with the line and the form`, () => {
    assert.throws(() => parseCompleteArgs(args), { message: `${line}\n${COMPLETE_FORM}` });
  });
}

const UNIT_BRANCH = 'feature-0117-a-unit';

test('runOfBranch reads the run of the unit branch and of a variant branch', () => {
  assert.deepEqual(runOfBranch(UNIT_BRANCH, UNIT_BRANCH), { variant: null });
  assert.deepEqual(runOfBranch(`${UNIT_BRANCH}--opus`, UNIT_BRANCH), { variant: 'opus' });
  assert.deepEqual(runOfBranch(`${UNIT_BRANCH}--opus-2`, UNIT_BRANCH), { variant: 'opus-2' });
});

for (const branch of [
  `${UNIT_BRANCH}--Opus`,
  `${UNIT_BRANCH}--a--b`,
  `${UNIT_BRANCH}--`,
  `${UNIT_BRANCH}-x`,
  'feature-0118-another-unit',
  'master',
]) {
  test(`runOfBranch gives null for ${branch}`, () => {
    assert.equal(runOfBranch(branch, UNIT_BRANCH), null);
  });
}

test('branchRefusal names the branch checked out and the unit branch', () => {
  assert.equal(
    branchRefusal('master', UNIT_BRANCH),
    `the branch checked out is master, and the unit is set to implemented on its branch ${UNIT_BRANCH} ` +
      "or a variant's branch of it",
  );
});

test('statusRefusal passes a unit in progress and says what to do for each other status', () => {
  assert.equal(statusRefusal('0117-x', 'in-progress'), undefined);
  assert.match(
    statusRefusal('0117-x', 'implemented'),
    /implemented already on the branch checked out.*amendment.*supersedes/,
  );
  assert.match(statusRefusal('0117-x', 'cancelled'), /never set back.*new unit that names it in supersedes/);
  assert.match(statusRefusal('0117-x', 'draft'), /not approved.*npx agentrite approve/);
  assert.match(statusRefusal('0117-x', 'approved'), /work has not begun.*implementer moves it to in-progress/);
  assert.match(statusRefusal('0117-x', 'review'), /is review, and a unit is set to implemented from in-progress/);
  assert.match(statusRefusal('0117-x', 'draft'), /^the unit changes\/0117-x\//);
});

test('planRefusal refuses a feature without a plan and a plan with open tasks', () => {
  assert.equal(
    planRefusal('0117-x', 'feature', undefined),
    'changes/0117-x/plan.md does not exist, and a feature is built by its plan',
  );
  assert.equal(planRefusal('0117-x', 'feature', '- [x] a\n- [ ] b\n'), 'changes/0117-x/plan.md has 1 task not ticked');
  assert.equal(
    planRefusal('0117-x', 'bug', '- [ ] a\n- [ ] b\n  - [ ] c\n'),
    'changes/0117-x/plan.md has 3 tasks not ticked',
  );
  assert.equal(planRefusal('0117-x', 'bug', undefined), undefined);
  assert.equal(planRefusal('0117-x', 'task', undefined), undefined);
  assert.equal(planRefusal('0117-x', 'feature', '- [x] a\n'), undefined);
});

test('commitsNamed keeps the names of commits only', () => {
  assert.deepEqual(commitsNamed(''), []);
  assert.deepEqual(commitsNamed('aaa111 commit\n'), ['aaa111']);
  assert.deepEqual(commitsNamed('aaa111 commit\naaa222 blob\n'), ['aaa111']);
  assert.deepEqual(commitsNamed('aaa111 commit\naaa222 commit\n'), ['aaa111', 'aaa222']);
});

test('filesOutside gives the paths that are not in the unit directory', () => {
  const unit = '0117-x';
  assert.deepEqual(filesOutside('changes/0117-x/plan.md\0changes/0117-x/record.md\0', '', unit), []);
  assert.deepEqual(filesOutside('changes/0117-x/plan.md\0scripts/a.mjs\0', '', unit), ['scripts/a.mjs']);
  assert.deepEqual(filesOutside('old.mjs\0changes/0117-x/b.md\0new.mjs\0', '', unit), ['old.mjs', 'new.mjs']);
  assert.deepEqual(filesOutside('app/changes/0117-x/plan.md\0app/src/a.mjs\0', 'app/', unit), ['app/src/a.mjs']);
  assert.deepEqual(filesOutside('changes/0118-y/record.md\0', '', unit), ['changes/0118-y/record.md']);
  assert.deepEqual(filesOutside('', '', unit), []);
});

const AGENT = '[Claude Code, anthropic/claude-opus-5-5]';

function entriesOf(...lines) {
  return logEntries(['## Log', '', ...lines, ''].join('\n'));
}

const review = (instant, commit, blocking, variant = '') =>
  `- ${instant} ${AGENT} as the reviewer, ${variant}reviewed the unit at \`${commit}\` in full. ` +
  `Blocking findings: ${blocking}.`;

test('lastReview gives the last review of the run, whatever the timestamps say', () => {
  const entries = entriesOf(
    review('2026-11-22T12:00:00Z', 'aaaaaaa', 'none'),
    review('2026-11-22T10:00:00Z', 'bbbbbbb', '`S1`'),
    `- 2026-11-22T13:00:00Z ${AGENT} as the implementer, applied S1`,
  );
  assert.deepEqual(lastReview(entries, null, "the unit's branch"), { commit: 'bbbbbbb', blocking: ['S1'], index: 1 });
});

test('lastReview refuses a run with no review, while another run has one', () => {
  const entries = entriesOf(review('2026-11-22T12:00:00Z', 'aaaaaaa', 'none', 'on the variant `opus`, '));
  assert.throws(() => lastReview(entries, null, "the unit's branch"), {
    message: "the run of the unit's branch has no review, and the reviewer reviews the unit first",
  });
  assert.equal(lastReview(entries, 'opus', 'the variant `opus`').commit, 'aaaaaaa');
});

test('lastReview refuses a last review that is not of the form, after one that is', () => {
  const entries = entriesOf(
    review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none'),
    `- 2026-11-22T11:00:00Z ${AGENT} as the reviewer, reviewed \`0117-x\` at \`bbbbbbb\` in full. Returned P1`,
  );
  assert.throws(() => lastReview(entries, null, "the unit's branch"), {
    message:
      "the last review of the unit's branch, at 2026-11-22T11:00:00Z, is not of the form the command reads, and a " +
      'review in that form, as a delta review of the commit checked out, lets the command go on',
  });
});

const proposed = (label, variant = '') =>
  `- 2026-11-22T11:00:00Z ${AGENT} as the implementer, ${variant}proposed to decline \`${label}\`: a reason`;
const decided = (label, decision, variant = '') =>
  `- 2026-11-22T12:00:00Z [human] ${variant}decided the proposed decline of \`${label}\`: ${decision}`;

function refusal(variant, ...lines) {
  const entries = entriesOf(...lines);
  const form = lastReview(entries, variant, 'the run');
  return decisionsRefusal(entries, variant, form);
}

test('decisionsRefusal passes a review with nothing open and nothing undecided', () => {
  assert.equal(refusal(null, review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none')), undefined);
});

test('decisionsRefusal names the blocking findings of the last review', () => {
  assert.equal(
    refusal(null, review('2026-11-22T10:00:00Z', 'aaaaaaa', '`S1`, `C2`')),
    'the last review lists blocking findings still open: S1, C2',
  );
});

test('decisionsRefusal refuses a proposed decline with no decision after it', () => {
  const message = 'the proposed declines of S2 have no decision of the human, and the human decides them';
  const head = review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none');
  assert.equal(refusal(null, proposed('S2'), head), message);
  assert.equal(refusal(null, decided('S2', 'declined'), proposed('S2'), head), message);
  assert.equal(
    refusal(null, proposed('S2'), decided('S2', 'declined', 'on the variant `opus`, '), head),
    message,
  );
  const own = 'on the variant `opus`, ';
  const ownReview = review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none', own);
  assert.equal(refusal('opus', proposed('S2', own), decided('S2', 'declined'), ownReview), message);
});

test('decisionsRefusal passes a proposed decline the same run decided after it', () => {
  const head = review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none');
  assert.equal(refusal(null, proposed('S2'), decided('S2', 'declined'), head), undefined);
  assert.equal(
    refusal(
      'opus',
      proposed('S2', 'on the variant `opus`, '),
      decided('S2', 'declined', 'on the variant `opus`, '),
      review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none', 'on the variant `opus`, '),
    ),
    undefined,
  );
});

test('decisionsRefusal refuses a decision to fix after the last review and passes one before it', () => {
  const head = review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none');
  assert.equal(
    refusal(null, proposed('S2'), head, decided('S2', 'to be fixed')),
    'the human decided S2 to be fixed after the last review, and the fix is reviewed first',
  );
  assert.equal(refusal(null, proposed('S2'), decided('S2', 'to be fixed'), head), undefined);
  assert.equal(refusal(null, proposed('S2'), head, decided('S2', 'declined')), undefined);
});

test('decisionsRefusal gives the blocking findings before the undecided declines', () => {
  assert.match(
    refusal(null, proposed('S2'), review('2026-11-22T10:00:00Z', 'aaaaaaa', '`S1`')),
    /blocking findings still open: S1/,
  );
  assert.match(
    refusal(null, proposed('S2'), review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none'), decided('C1', 'to be fixed')),
    /proposed declines of S2/,
  );
});

test('completionEntry, completionMessage and completedLine are the texts of the command', () => {
  assert.equal(
    completionEntry('2026-11-22T14:02:11Z', 'ff437ce'),
    '- 2026-11-22T14:02:11Z [human] set the unit to implemented, on the review at `ff437ce`. ' +
      'The status is `implemented`',
  );
  assert.equal(completionMessage('bug', '0116-x'), 'bugfix-0116 Set the unit to implemented');
  assert.equal(completionMessage('feature', '0042-a-unit'), 'feature-0042 Set the unit to implemented');
  assert.equal(completionMessage('task', '0042-a-unit'), 'task-0042 Set the unit to implemented');
  assert.equal(
    completedLine('0042-a-unit', 'feature-0042-a-unit', '1a2b3c4', 'feature-0042 Set the unit to implemented'),
    'changes/0042-a-unit/ is implemented on feature-0042-a-unit, in 1a2b3c4 feature-0042 Set the unit to implemented',
  );
});

test('completedRecord changes the status line alone and adds the entry after the last of the log', () => {
  const record = (status, entries) =>
    [
      ...['---', 'kind: feature', `status: ${status}`, 'timestamp: t', '---', '', '## Log', ''],
      ...[...entries, '', '## Amendments', ''],
    ].join('\n');
  assert.equal(
    completedRecord(record('in-progress', ['- one']), ['- two', '  wrapped']),
    record('implemented', ['- one', '- two', '  wrapped']),
  );
});
