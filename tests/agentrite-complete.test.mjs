import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  addingCommit,
  branchRefusal,
  changedAfterRefusal,
  COMPLETE_FORM,
  completedLine,
  completedRecord,
  completionEntry,
  completionMessage,
  decisionsRefusal,
  filesOutside,
  lastReview,
  mergeRefusal,
  openingCount,
  parentsListed,
  parseCompleteArgs,
  planRefusal,
  reviewCommitRefusal,
  reviewOpening,
  runOfBranch,
  statusRefusal,
} from '../scripts/agentrite-complete.mjs';
import { logEntries } from '../scripts/agentrite-log-forms.mjs';
import { installKit, kitSettingsText } from './installed-kit.mjs';
import { environment, git, installHook, write } from './record-command.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

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

test('parentsListed reads each commit and its parents, none for a commit at the root', () => {
  assert.deepEqual(parentsListed(''), []);
  assert.deepEqual(parentsListed('c b\nm c s\nr\n'), [
    { commit: 'c', parents: ['b'] },
    { commit: 'm', parents: ['c', 's'] },
    { commit: 'r', parents: [] },
  ]);
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

test('lastReview refuses a last review wrapped before the end of its opening, and passes one wrapped after it', () => {
  const wrappedInside = entriesOf(
    `- 2026-11-22T10:00:00Z ${AGENT}`,
    '  as the reviewer, reviewed the unit at `aaaaaaa` in full. Blocking findings: none.',
  );
  assert.equal(wrappedInside[0].role, 'reviewer');
  assert.throws(() => lastReview(wrappedInside, null, "the unit's branch"), {
    message:
      "the last review of the unit's branch, at 2026-11-22T10:00:00Z, is not of the form the command reads, and a " +
      'review in that form, as a delta review of the commit checked out, lets the command go on',
  });
  const wrappedAfter = entriesOf(
    `- 2026-11-22T10:00:00Z ${AGENT} as the reviewer,`,
    '  reviewed the unit at `aaaaaaa` in full. Blocking findings: none.',
  );
  assert.equal(lastReview(wrappedAfter, null, "the unit's branch").commit, 'aaaaaaa');
});

test('reviewOpening gives the opening of the entry, up to and including the role', () => {
  const [entry] = entriesOf(review('2026-11-22T10:00:00Z', 'aaaaaaa', 'none'));
  assert.equal(reviewOpening(entry), `- 2026-11-22T10:00:00Z ${AGENT} as the reviewer`);
});

const OPENING = `- 2026-11-22T10:00:00Z ${AGENT} as the reviewer`;

test('openingCount counts the lines that start with the opening', () => {
  assert.equal(openingCount('', OPENING), 0);
  assert.equal(openingCount('# A record\n- 2026-11-22T10:00:00Z [human] approved\n', OPENING), 0);
  assert.equal(openingCount(`${OPENING}, reviewed`, OPENING), 1);
  assert.equal(openingCount(`## Log\n\n${OPENING}, reviewed\n`, OPENING), 1);
  assert.equal(openingCount(`## Log\n  ${OPENING}, quoted\n`, OPENING), 0);
  assert.equal(openingCount(`- an entry that quotes ${OPENING}\n`, OPENING), 0);
  assert.equal(openingCount(`${OPENING}, one\n${OPENING}, two\n`, OPENING), 2);
});

test('openingCount reads the timestamp and who made the entry literally', () => {
  const opening = '- 2026-11-22T10:00:00Z [A.b [c] as the reviewer';
  assert.equal(openingCount(`${opening}, reviewed\n`, opening), 1);
  assert.equal(openingCount('- 2026-11-22T10:00:00Z [Axb [c] as the reviewer, reviewed\n', opening), 0);
  assert.equal(openingCount('- 2026-11-22T10x00:00Z [A.b [c] as the reviewer, reviewed\n', opening), 0);
});

// The counts as `addingCommit` asks for them, a commit that is not given holding the opening on no line.
const countsOf = (counts) => (commit) => counts.get(commit) ?? 0;

test('addingCommit gives the newest commit that holds the opening more often than each of its parents', () => {
  const counts = new Map([
    ['e', 1],
    ['d', 1],
    ['c', 2],
    ['b', 1],
    ['a', 0],
  ]);
  const listed = [
    { commit: 'e', parents: ['d'] },
    { commit: 'd', parents: ['c'] },
    { commit: 'c', parents: ['b'] },
    { commit: 'b', parents: ['a'] },
  ];
  // e edits the entry past its opening, d removes an earlier entry with the same opening, and c adds the entry.
  assert.equal(addingCommit(listed, countsOf(counts)).commit, 'c');
  assert.equal(addingCommit(listed.slice(3), countsOf(counts)).commit, 'b');
});

test('addingCommit asks for the count of no commit past the one it finds and its parents', () => {
  const counts = new Map([
    ['c', 1],
    ['b', 1],
    ['a', 0],
  ]);
  const asked = new Set();
  const listed = [
    { commit: 'c', parents: ['b'] },
    { commit: 'b', parents: ['a'] },
    { commit: 'a', parents: ['root'] },
  ];
  const found = addingCommit(listed, (commit) => {
    asked.add(commit);
    return counts.get(commit) ?? 0;
  });
  assert.equal(found.commit, 'b');
  assert.deepEqual([...asked].sort(), ['a', 'b', 'c']);
});

test('addingCommit passes over a merge that holds the entry by one parent, and takes the commit of that side', () => {
  const counts = new Map([
    ['merge', 1],
    ['main', 0],
    ['side', 1],
    ['start', 0],
  ]);
  const listed = [
    { commit: 'merge', parents: ['main', 'side'] },
    { commit: 'side', parents: ['start'] },
  ];
  assert.deepEqual(addingCommit(listed, countsOf(counts)), { commit: 'side', parents: ['start'] });
});

test('addingCommit takes a commit with no parent that holds the entry, and throws when no commit qualifies', () => {
  assert.deepEqual(addingCommit([{ commit: 'root', parents: [] }], countsOf(new Map([['root', 1]]))), {
    commit: 'root',
    parents: [],
  });
  assert.throws(
    () => addingCommit([{ commit: 'b', parents: ['a'] }], countsOf(new Map([['a', 1], ['b', 1]]))),
    { message: /the history holds no commit that adds the entry/ },
  );
});

test('reviewCommitRefusal names the files, the commit of the review and its parent', () => {
  assert.equal(
    reviewCommitRefusal({
      directory: '0117-x',
      timestamp: '2026-11-22T10:00:00Z',
      commit: 'abc1234',
      parent: 'def5678',
      files: ['tracked.txt', 'src/a.mjs'],
    }),
    [
      'these files outside changes/0117-x/ are in abc1234, the commit that added the last review, at ' +
        '2026-11-22T10:00:00Z:',
      '- tracked.txt',
      '- src/a.mjs',
      'The commit of the last review also holds other work, so the reviewer reviews it again from def5678, ' +
        'the parent of that commit',
    ].join('\n'),
  );
});

test('reviewCommitRefusal says when the commit of the review has no parent in the history held', () => {
  const message = reviewCommitRefusal({
    directory: '0117-x',
    timestamp: '2026-11-22T10:00:00Z',
    commit: 'abc1234',
    parent: null,
    files: ['tracked.txt'],
  });
  assert.equal(
    message.split('\n').at(-1),
    'The commit of the last review also holds other work, and has no parent in the history the repository holds: ' +
      'fetching the full history, or another review, lets the command go on',
  );
  assert.match(message, /^these files outside changes\/0117-x\/ are in abc1234,[^]*\n- tracked\.txt\n/);
});

test('mergeRefusal names the merge commit and says how to go on', () => {
  assert.equal(
    mergeRefusal('2026-11-22T10:00:00Z', 'abc1234'),
    'the commits from the last review, at 2026-11-22T10:00:00Z, on include the merge commit abc1234, and the ' +
      'command reads no merge: rebasing the branch on the default branch, or another review, lets the command go on',
  );
});

test('changedAfterRefusal names each file once and the commit that added the review', () => {
  assert.equal(
    changedAfterRefusal({
      directory: '0117-x',
      timestamp: '2026-11-22T10:00:00Z',
      commit: 'abc1234',
      files: ['b.txt', 'a.txt', 'b.txt'],
    }),
    [
      'these files outside changes/0117-x/ changed in the commits after abc1234, which added the last review, at ' +
        '2026-11-22T10:00:00Z:',
      '- b.txt',
      '- a.txt',
      'The work changed after the last review, so the reviewer reviews it again',
    ].join('\n'),
  );
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

// The command, in a git repository.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const UNIT = '0010-a-feature';
const BRANCH = `feature-${UNIT}`;
const DONE = '0012-done';
const REVIEWER = '[OpenCode, openai/gpt-6.2-sol] as the reviewer,';
const IMPLEMENTER = '[Claude Code, anthropic/claude-opus-5-5] as the implementer,';
const INSTANT_FORM = /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z/;

function recordText(kind, status) {
  const front = `---\nkind: ${kind}\nstatus: ${status}\ntimestamp: 2026-10-23T10:00:00Z\n---\n`;
  return `${front}\n# A unit\n\n## Log\n\n- 2026-10-23T10:00:00Z [human] approved the spec\n`;
}

function commitAll(given, message) {
  git(given.base, given.project, 'add', '-A');
  git(given.base, given.project, 'commit', '--quiet', '-m', message);
  return git(given.base, given.project, 'rev-parse', '--short=12', 'HEAD').trim();
}

// A project on `master` that holds an approved unit and an implemented one, and then, on the unit's branch, the
// unit in progress with its work committed. `reviewed` is the commit of the work, which no review names yet.
function fixture(testContext, { kind = 'feature', plan = '- [x] the work\n' } = {}) {
  const base = temporaryDirectory(testContext, 'agentrite-complete-');
  const project = join(base, 'project');
  mkdirSync(join(base, 'home'));
  writeFileSync(join(base, 'home', '.gitconfig'), '[user]\n\tname = Ada Lovelace\n\temail = ada@example.com\n');
  mkdirSync(project);
  git(base, project, 'init', '--quiet', '--initial-branch', 'master');
  installKit(project);
  write(project, 'agentrite.json', kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: false }));
  write(project, '.gitignore', 'node_modules\n');
  write(project, `changes/${UNIT}/spec.md`, '# A unit\n');
  write(project, `changes/${UNIT}/record.md`, recordText(kind, 'approved'));
  write(project, `changes/${DONE}/spec.md`, '# Done\n');
  write(project, `changes/${DONE}/record.md`, recordText('feature', 'implemented'));
  write(project, 'tracked.txt', 'one\n');
  const given = { base, project };
  commitAll(given, 'Start');
  const branch = `${kind === 'bug' ? 'bugfix' : kind}-${UNIT}`;
  git(base, project, 'checkout', '--quiet', '-b', branch);
  if (plan !== undefined) write(project, `changes/${UNIT}/plan.md`, plan);
  write(project, `changes/${UNIT}/record.md`, recordText(kind, 'in-progress'));
  write(project, 'tracked.txt', 'two\n');
  return { ...given, branch, reviewed: commitAll(given, 'The work') };
}

function recordPath({ project }) {
  return join(project, 'changes', UNIT, 'record.md');
}

// Appends the entries to the log of the unit's record, and commits it.
function logEntry(given, ...lines) {
  const path = recordPath(given);
  writeFileSync(path, `${readFileSync(path, 'utf-8')}${lines.join('\n')}\n`);
  return commitAll(given, 'Log');
}

function reviewLine(commit, blocking = 'none', variant = '') {
  return (
    `- 2026-11-22T10:00:00Z ${REVIEWER} ${variant}reviewed the unit at \`${commit}\` in full. ` +
    `Blocking findings: ${blocking}.`
  );
}

function runIn({ base, project }, args, options = {}) {
  return spawnSync(process.execPath, [script, 'complete', ...args], {
    cwd: project,
    encoding: 'utf-8',
    env: environment(base),
    ...options,
  });
}

function stateOf({ base, project }) {
  return {
    head: git(base, project, 'rev-parse', 'HEAD').trim(),
    status: git(base, project, 'status', '--porcelain'),
    staged: git(base, project, 'diff', '--cached'),
    record: readFileSync(recordPath({ project }), 'utf-8'),
  };
}

// Runs the command for the unit and asserts that it refuses, with the message, and changes nothing.
function assertRefused(given, expected) {
  const before = stateOf(given);
  const result = runIn(given, [UNIT]);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, expected);
  assert.equal(result.stderr.split('\n').filter((line) => line.startsWith('agentrite: ')).length, 1);
  assert.deepEqual(stateOf(given), before);
  return result;
}

// What the command leaves of the record: the status changed, and one entry after the last of its log.
function assertCompleted(given, before, result, branch = given.branch) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const hash = git(given.base, given.project, 'rev-parse', '--short', 'HEAD').trim();
  const prefix = given.kind === 'bug' ? 'bugfix' : given.kind;
  assert.equal(
    result.stdout,
    `changes/${UNIT}/ is implemented on ${branch}, in ${hash} ${prefix}-0010 Set the unit to implemented\n`,
  );
  const after = stateOf(given);
  const unchanged = before.record.replace('status: in-progress', 'status: implemented');
  assert.ok(after.record.startsWith(unchanged), after.record);
  const entry = after.record.slice(unchanged.length);
  assert.match(
    entry,
    new RegExp(
      `^- ${INSTANT_FORM.source} \\[human\\] set the unit to implemented, on the review at ` +
        `\`${given.named}\`\\. The status is \`implemented\`\n$`,
    ),
  );
  const changed = git(given.base, given.project, 'diff', '--name-only', before.head, 'HEAD').trim();
  assert.equal(changed, `changes/${UNIT}/record.md`);
  assert.equal(git(given.base, given.project, 'rev-list', '--count', `${before.head}..HEAD`).trim(), '1');
  assert.equal(
    git(given.base, given.project, 'log', '-1', '--format=%s').trim(),
    `${prefix}-0010 Set the unit to implemented`,
  );
  assert.equal(after.status, '');
}

test('complete sets a unit to implemented on its branch, and commits its record alone', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  given.named = given.reviewed.slice(0, 7);
  logEntry(given, reviewLine(given.named));
  const before = stateOf(given);
  assertCompleted(given, before, runIn(given, [UNIT]));
});

test('complete sets a unit to implemented on a variant branch by the reviews of the variant', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  given.named = given.reviewed.slice(0, 7);
  git(given.base, given.project, 'checkout', '--quiet', '-b', `${BRANCH}--opus`);
  logEntry(given, reviewLine(given.named, 'none', 'on the variant `opus`, '));
  const before = stateOf(given);
  assertCompleted(given, before, runIn(given, [UNIT]), `${BRANCH}--opus`);
});

test('complete wraps the entry within 120 characters for a commit of 40 characters', (testContext) => {
  const given = fixture(testContext);
  const full = git(given.base, given.project, 'rev-parse', 'HEAD').trim();
  logEntry(given, reviewLine(full));
  const result = runIn(given, [UNIT]);
  assert.equal(result.status, 0, result.stderr);
  const lines = stateOf(given).record.trimEnd().split('\n');
  const start = lines.findIndex((line) => line.includes('set the unit to implemented'));
  assert.ok(lines.slice(start).join(' ').replaceAll(/ +/g, ' ').includes(`on the review at \`${full}\`. The status`));
  for (const line of lines.slice(start)) assert.ok(line.length <= 120, line);
  assert.ok(lines.length - start > 1);
});

test('complete passes after a commit that changes only the record, and for a bug without a plan', (testContext) => {
  const given = fixture(testContext, { kind: 'bug', plan: undefined });
  logEntry(given, reviewLine(given.reviewed));
  logEntry(given, '- 2026-11-22T11:00:00Z [human] a note');
  const result = runIn(given, [UNIT]);
  assert.equal(result.status, 0, result.stderr);
  assert.match(git(given.base, given.project, 'log', '-1', '--format=%s'), /^bugfix-0010 Set the unit/);
});

function shortHash({ base, project }, commit) {
  return git(base, project, 'rev-parse', '--short', commit).trim();
}

// The review's entry, at an instant after that of `reviewLine`.
function laterReviewLine(commit) {
  return reviewLine(commit).replace('2026-11-22T10:00:00Z', '2026-11-22T12:00:00Z');
}

// Adds a commit that touches a file outside the unit to `master`, and rebases the unit's branch on it.
function moveMasterAndRebase(given) {
  const { base, project, branch } = given;
  git(base, project, 'checkout', '--quiet', 'master');
  write(project, 'other.txt', 'other\n');
  commitAll(given, 'Other work');
  git(base, project, 'checkout', '--quiet', branch);
  git(base, project, 'rebase', '--quiet', 'master');
}

test('complete passes after a clean rebase of the branch on a default branch that moved', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  given.named = given.reviewed.slice(0, 7);
  logEntry(given, reviewLine(given.named));
  moveMasterAndRebase(given);
  assertCompleted(given, stateOf(given), runIn(given, [UNIT]));
});

test('complete passes in a fresh clone of a rebased branch, which lacks the commit the review names', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  given.named = given.reviewed;
  logEntry(given, reviewLine(given.named));
  moveMasterAndRebase(given);
  const clone = join(given.base, 'clone');
  git(given.base, given.base, 'clone', '--quiet', '--no-local', given.project, clone);
  installKit(clone);
  const cloned = { ...given, project: clone };
  const lookup = spawnSync('git', ['cat-file', '-e', `${given.named}^{commit}`], {
    cwd: clone,
    env: environment(given.base),
  });
  assert.notEqual(lookup.status, 0);
  assert.match(git(given.base, clone, 'branch', '--all'), /remotes\/origin\/master/);
  assertCompleted(cloned, stateOf(cloned), runIn(cloned, [UNIT]));
});

test('complete refuses a code commit after the review, naming the file and the commit of the review', (testContext) => {
  const given = fixture(testContext);
  const added = logEntry(given, reviewLine(given.reviewed));
  write(given.project, 'tracked.txt', 'three\n');
  commitAll(given, 'More work');
  assertRefused(
    given,
    new RegExp(
      `changed in the commits after ${shortHash(given, added)}, which added the last review, at ` +
        '2026-11-22T10:00:00Z:\n- tracked\\.txt\nThe work changed after the last review',
    ),
  );
});

test('complete passes commits after the review that touch only the plan and the record, and an empty one', (t) => {
  const given = { ...fixture(t), kind: 'feature' };
  given.named = given.reviewed;
  logEntry(given, reviewLine(given.named));
  write(given.project, `changes/${UNIT}/plan.md`, '- [x] the work\n- [x] a note\n');
  commitAll(given, 'Plan');
  logEntry(given, '- 2026-11-22T11:00:00Z [human] a note');
  git(given.base, given.project, 'commit', '--quiet', '--allow-empty', '-m', 'Nothing');
  assertCompleted(given, stateOf(given), runIn(given, [UNIT]));
});

test('complete finds the commit of the review after an edit of its text past its opening', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  given.named = given.reviewed;
  logEntry(given, reviewLine(given.named));
  rewriteRecord(given, (text) => text.replace('in full.', 'in full, with the suites run.'));
  commitAll(given, 'Edit the review');
  assertCompleted(given, stateOf(given), runIn(given, [UNIT]));
});

test('complete passes a record whose versions after the review hold more than a mebibyte together', (t) => {
  const given = { ...fixture(t), kind: 'feature' };
  given.named = given.reviewed;
  logEntry(given, reviewLine(given.named));
  // Each version is under a mebibyte, and the versions together are several, as many entries over a long run make.
  for (let version = 1; version <= 40; version += 1) {
    rewriteRecord(given, (text) => text.replace('# A unit\n', `# A unit\n\n${'x'.repeat(10240)}\n`));
    commitAll(given, `Grow the record ${version}`);
  }
  assertCompleted(given, stateOf(given), runIn(given, [UNIT]));
});

test('complete refuses a code commit between the review and an edit of its text', (testContext) => {
  const given = fixture(testContext);
  const added = logEntry(given, reviewLine(given.reviewed));
  write(given.project, 'tracked.txt', 'three\n');
  commitAll(given, 'More work');
  rewriteRecord(given, (text) => text.replace('in full.', 'in full, with the suites run.'));
  commitAll(given, 'Edit the review');
  assertRefused(given, new RegExp(`after ${shortHash(given, added)}, which added the last review[^]*- tracked\\.txt`));
});

test('complete refuses a commit of the review that also holds code, naming its parent', (testContext) => {
  const given = fixture(testContext);
  write(given.project, 'tracked.txt', 'three\n');
  const added = logEntry(given, reviewLine(given.reviewed));
  assertRefused(
    given,
    new RegExp(
      `are in ${shortHash(given, added)}, the commit that added the last review, at 2026-11-22T10:00:00Z:\n` +
        '- tracked\\.txt\nThe commit of the last review also holds other work, so the reviewer reviews it again ' +
        `from ${shortHash(given, `${added}~1`)}, the parent of that commit\n`,
    ),
  );
});

test('complete refuses a commit of the review that has no parent, saying so', (testContext) => {
  const given = fixture(testContext);
  const { base, project } = given;
  logEntry(given, reviewLine(given.reviewed));
  const tree = git(base, project, 'rev-parse', 'HEAD^{tree}').trim();
  const root = git(base, project, 'commit-tree', tree, '-m', 'All at once').trim();
  git(base, project, 'branch', '--force', 'master', root);
  git(base, project, 'reset', '--quiet', '--hard', root);
  assertRefused(
    given,
    new RegExp(
      `are in ${shortHash(given, root)}, the commit that added the last review[^]*- tracked\\.txt\n[^]*` +
        'has no parent in the history the repository holds: fetching the full history, or another review, lets ' +
        'the command go on',
    ),
  );
});

test('complete refuses a last review wrapped before the end of its opening as not of the form', (testContext) => {
  const given = fixture(testContext);
  logEntry(
    given,
    '- 2026-11-22T10:00:00Z [OpenCode, openai/gpt-6.2-sol]',
    `  as the reviewer, reviewed the unit at \`${given.reviewed}\` in full. Blocking findings: none.`,
  );
  assertRefused(given, /the last review of the unit's branch, at 2026-11-22T10:00:00Z, is not of the form/);
});

test('complete refuses a merge after the review, naming it, and passes a review after the merge', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  const { base, project } = given;
  logEntry(given, reviewLine(given.reviewed));
  git(base, project, 'checkout', '--quiet', '-b', 'side');
  write(project, `changes/${UNIT}/notes.md`, 'notes\n');
  commitAll(given, 'Side notes');
  git(base, project, 'checkout', '--quiet', BRANCH);
  logEntry(given, '- 2026-11-22T11:00:00Z [human] a note');
  git(base, project, 'merge', '--quiet', '--no-ff', '-m', 'Merge the side', 'side');
  assertRefused(
    given,
    new RegExp(
      `include the merge commit ${shortHash(given, 'HEAD')}, and the command reads no merge: rebasing the branch on ` +
        'the default branch, or another review, lets the command go on',
    ),
  );
  given.named = shortHash(given, 'HEAD');
  logEntry(given, laterReviewLine(given.named));
  assertCompleted(given, stateOf(given), runIn(given, [UNIT]));
});

test('complete finds a review commit that came in by a merge, and refuses the merge after it', (testContext) => {
  const given = fixture(testContext);
  const { base, project } = given;
  git(base, project, 'checkout', '--quiet', '-b', `sandbox/${BRANCH}`);
  const side = logEntry(given, reviewLine(given.reviewed));
  git(base, project, 'checkout', '--quiet', BRANCH);
  write(project, `changes/${UNIT}/plan.md`, '- [x] the work\n- [x] more\n');
  commitAll(given, 'Plan on the host');
  git(base, project, 'merge', '--quiet', '--no-ff', '-m', 'Merge the waiting commits', `sandbox/${BRANCH}`);
  const result = assertRefused(given, new RegExp(`include the merge commit ${shortHash(given, 'HEAD')}, `));
  assert.ok(!result.stderr.includes(shortHash(given, side)), result.stderr);
});

test('complete refuses a file changed after the review, under diff.relative', (testContext) => {
  const given = fixture(testContext);
  logEntry(given, reviewLine(given.reviewed));
  write(given.project, 'top.txt', 'top\n');
  commitAll(given, 'Top');
  git(given.base, given.project, 'config', 'diff.relative', 'true');
  assertRefused(given, /changed in the commits after [0-9a-f]+, which added the last review[^]*:\n- top\.txt\nThe/);
});

test('complete names both paths of a file renamed after the review', (testContext) => {
  const given = fixture(testContext);
  logEntry(given, reviewLine(given.reviewed));
  git(given.base, given.project, 'mv', 'tracked.txt', 'moved.txt');
  commitAll(given, 'Rename');
  git(given.base, given.project, 'config', 'diff.renames', 'copies');
  assertRefused(given, /:\n- moved\.txt\n- tracked\.txt\nThe work changed after the last review/);
});

test('complete runs no external diff and no textconv driver', (testContext) => {
  const given = { ...fixture(testContext), kind: 'feature' };
  const { base, project } = given;
  const marker = join(base, 'marker');
  const tool = join(base, 'mark.sh');
  writeFileSync(tool, `#!/bin/sh\ntouch '${marker}'\ncat "$1"\n`);
  chmodSync(tool, 0o755);
  git(base, project, 'config', 'diff.external', tool);
  git(base, project, 'config', 'diff.marked.textconv', tool);
  writeFileSync(join(project, '.git', 'info', 'attributes'), '* diff=marked\n');
  given.named = given.reviewed;
  logEntry(given, reviewLine(given.named));
  logEntry(given, '- 2026-11-22T11:00:00Z [human] a note');
  assertCompleted(given, stateOf(given), runIn(given, [UNIT]));
  assert.equal(existsSync(marker), false);
});

test('complete leaves the refs, the index and files outside the unit as they were', (testContext) => {
  const given = fixture(testContext);
  logEntry(given, reviewLine(given.reviewed));
  const { base, project } = given;
  git(base, project, 'branch', 'other');
  write(project, 'staged.txt', 'staged\n');
  git(base, project, 'add', 'staged.txt');
  write(project, 'tracked.txt', 'changed again\n');
  const refs = () => git(base, project, 'for-each-ref', '--format=%(refname) %(objectname)').trim().split('\n');
  const before = refs();
  const head = git(base, project, 'rev-parse', 'HEAD').trim();
  const result = runIn(given, [UNIT]);
  assert.equal(result.status, 0, result.stderr);
  const after = refs();
  const moved = after.filter((line) => !before.includes(line));
  assert.equal(moved.length, 1);
  assert.match(moved[0], new RegExp(`^refs/heads/${BRANCH} `));
  assert.equal(git(base, project, 'rev-parse', 'HEAD~1').trim(), head);
  assert.equal(git(base, project, 'symbolic-ref', 'HEAD').trim(), `refs/heads/${BRANCH}`);
  assert.equal(git(base, project, 'status', '--porcelain'), 'A  staged.txt\n M tracked.txt\n');
  assert.equal(git(base, project, 'show', '--name-only', '--format=', 'HEAD').trim(), `changes/${UNIT}/record.md`);
});

test('complete puts the record back and exits 1 when a hook refuses the commit', (testContext) => {
  const given = fixture(testContext);
  logEntry(given, reviewLine(given.reviewed));
  installHook(given, 'echo "the hook says no" >&2\nexit 1');
  const before = stateOf(given);
  const result = runIn(given, [UNIT]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /the hook says no/);
  assert.deepEqual(stateOf(given), before);
});

test('complete runs with its standard input closed, and with no controlling terminal', (testContext) => {
  const given = fixture(testContext);
  logEntry(given, reviewLine(given.reviewed));
  const closed = runIn(given, [UNIT], { stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(closed.status, 0, closed.stderr);
  git(given.base, given.project, 'reset', '--quiet', '--hard', 'HEAD~1');
  const detached = runIn(given, [UNIT], { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
  assert.equal(detached.status, 0, detached.stderr);
  assert.match(stateOf(given).record, /status: implemented/);
});

for (const [args, line] of [
  [[], 'no unit given'],
  [['0010', '0011'], 'unexpected argument: 0011'],
  [['0010', '--force'], 'unknown option: --force'],
  [['--', '0010'], 'unexpected argument: --'],
]) {
  test(`complete exits 2 with the line and the form for ${JSON.stringify(args)}`, (testContext) => {
    const given = fixture(testContext);
    logEntry(given, reviewLine(given.reviewed));
    const before = stateOf(given);
    const result = runIn(given, args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `${line}\n${COMPLETE_FORM}\n`);
    assert.deepEqual(stateOf(given), before);
  });
}

test('complete is listed after cancel in the usage', () => {
  const result = spawnSync(process.execPath, [script], { encoding: 'utf-8' });
  const lines = result.stderr.split('\n').map((line) => line.trim());
  const cancel = lines.findIndex((line) => line.includes('agentrite cancel'));
  assert.equal(lines.indexOf('agentrite complete <unit>'), cancel + 1);
});

const REFUSALS = [
  ['no agentrite.json', (given) => rmSync(join(given.project, 'agentrite.json')), /agentrite\.json/],
  ['an invalid agentrite.json', (given) => write(given.project, 'agentrite.json', '{'), /agentrite\.json/],
  ['no git repository', (given) => rmSync(join(given.project, '.git'), { recursive: true }), /is in no git repository/],
  [
    'a detached HEAD',
    (given) => git(given.base, given.project, 'checkout', '--quiet', '--detach'),
    /no branch is checked out, and a unit is set to implemented on its branch/,
  ],
  ['no directory for the unit', (given) => (given.unit = '0099'), /holds no directory for the unit 0099/],
  [
    'two directories for the digits',
    (given) => {
      write(given.project, 'changes/0010-other/record.md', recordText('feature', 'draft'));
      given.unit = '0010';
    },
    /0010/,
  ],
  ['no record.md', (given) => rmSync(recordPath(given)), /record\.md does not exist/],
  [
    'no status field',
    (given) => rewriteRecord(given, (text) => text.replace('status: in-progress\n', '')),
    /record\.md is missing a status field/,
  ],
  [
    'no kind field',
    (given) => rewriteRecord(given, (text) => text.replace('kind: feature\n', '')),
    /record\.md is missing a kind field/,
  ],
  [
    'no log heading',
    (given) => rewriteRecord(given, (text) => text.replace('## Log', '## Notes')),
    /record\.md is missing a ## Log heading/,
  ],
  [
    'the kind epic',
    (given) => rewriteRecord(given, (text) => text.replace('kind: feature', 'kind: epic')),
    /gives the kind epic/,
  ],
  [
    'the default branch checked out',
    (given) => git(given.base, given.project, 'checkout', '--quiet', 'master'),
    new RegExp(`the branch checked out is master, and the unit is set to implemented on its branch ${BRANCH}`),
  ],
  [
    'another unit branch checked out',
    (given) => git(given.base, given.project, 'checkout', '--quiet', '-b', 'feature-0011-other'),
    /the branch checked out is feature-0011-other/,
  ],
  [
    'a variant name that is none',
    (given) => git(given.base, given.project, 'checkout', '--quiet', '-b', `${BRANCH}--Opus`),
    /the branch checked out is feature-0010-a-feature--Opus/,
  ],
  [
    'a feature without a plan.md',
    (given) => {
      git(given.base, given.project, 'rm', '--quiet', `changes/${UNIT}/plan.md`);
      commitAll(given, 'No plan');
    },
    new RegExp(`changes/${UNIT}/plan\\.md does not exist, and a feature is built by its plan`),
  ],
  [
    'a plan with an open task',
    (given) => {
      write(given.project, `changes/${UNIT}/plan.md`, '- [x] a\n- [ ] b\n');
      commitAll(given, 'Open task');
    },
    new RegExp(`changes/${UNIT}/plan\\.md has 1 task not ticked`),
  ],
  [
    'a changed file in the unit directory',
    (given) => write(given.project, `changes/${UNIT}/spec.md`, '# Changed\n'),
    new RegExp(`- changes/${UNIT}/spec\\.md: changed[^]*commit these files, or discard their changes`),
  ],
  [
    'a staged file in the unit directory',
    (given) => {
      write(given.project, `changes/${UNIT}/spec.md`, '# Staged\n');
      git(given.base, given.project, 'add', '-A');
    },
    new RegExp(`- changes/${UNIT}/spec\\.md: staged`),
  ],
  [
    'an untracked file in the unit directory',
    (given) => write(given.project, `changes/${UNIT}/notes.md`, 'notes\n'),
    new RegExp(`- changes/${UNIT}/notes\\.md: not tracked`),
  ],
  [
    'a change check that fails',
    (given) => {
      write(given.project, `changes/${DONE}/spec.md`, '# Done, changed\n');
      commitAll(given, 'Change a frozen spec');
    },
    /the change check failed:\nChange documents need attention:/,
  ],
  [
    'no review in the run',
    () => {},
    /the run of the unit's branch has no review, and the reviewer reviews the unit first/,
  ],
  [
    'no review in the run, with one in another variant run',
    (given) => logEntry(given, reviewLine(given.reviewed, 'none', 'on the variant `opus`, ')),
    /the run of the unit's branch has no review/,
  ],
  [
    'a last review of the habit before the forms',
    (given) => {
      logEntry(given, reviewLine(given.reviewed));
      logEntry(
        given,
        `- 2026-11-22T11:00:00Z ${REVIEWER} reviewed \`${UNIT}\` at \`${given.reviewed}\` in full. ` +
          'Returned non-blocking P1',
      );
    },
    /the last review of the unit's branch, at 2026-11-22T11:00:00Z, is not of the form the command reads/,
  ],
  [
    'a file outside the unit changed after the review',
    (given) => {
      logEntry(given, reviewLine(given.reviewed));
      write(given.project, 'tracked.txt', 'three\n');
      commitAll(given, 'More work');
    },
    /changed in the commits after [0-9a-f]+, which added the last review[^]*- tracked\.txt\nThe work changed after/,
  ],
  [
    'a merge after the review that brings in a file outside the unit',
    (given) => {
      logEntry(given, reviewLine(given.reviewed));
      const { base, project } = given;
      git(base, project, 'checkout', '--quiet', '-b', 'side');
      write(project, 'brought.txt', 'brought\n');
      commitAll(given, 'Side work');
      git(base, project, 'checkout', '--quiet', BRANCH);
      logEntry(given, '- 2026-11-22T11:00:00Z [human] a note');
      git(base, project, 'merge', '--quiet', '--no-ff', '-m', 'Merge the side', 'side');
    },
    /include the merge commit [0-9a-f]+, and the command reads no merge/,
  ],
  [
    'a changed gitlink after the review, with submodules ignored by the configuration',
    (given) => {
      const { base, project } = given;
      const link = (hash) => git(base, project, 'update-index', '--add', '--cacheinfo', `160000,${hash},vendor`);
      link('1'.repeat(40));
      git(base, project, 'commit', '--quiet', '-m', 'Add a gitlink');
      // The record alone, since adding every file would remove the gitlink, which has no directory.
      const path = recordPath(given);
      const named = git(base, project, 'rev-parse', '--short=12', 'HEAD').trim();
      writeFileSync(path, `${readFileSync(path, 'utf-8')}${reviewLine(named)}\n`);
      git(base, project, 'commit', '--quiet', '-m', 'Log', '--', `changes/${UNIT}/record.md`);
      link('2'.repeat(40));
      git(base, project, 'commit', '--quiet', '-m', 'Change the gitlink');
      git(base, project, 'config', 'diff.ignoreSubmodules', 'all');
    },
    /- vendor\nThe work changed after the last review/,
  ],
  [
    'a blocking finding still open',
    (given) => logEntry(given, reviewLine(given.reviewed, '`S1`, `C2`')),
    /the last review lists blocking findings still open: S1, C2/,
  ],
  [
    'a proposed decline with no decision',
    (given) => {
      logEntry(given, `- 2026-11-22T10:30:00Z ${IMPLEMENTER} proposed to decline \`S2\`: a reason`);
      logEntry(given, reviewLine(given.reviewed));
    },
    /the proposed declines of S2 have no decision of the human, and the human decides them/,
  ],
  [
    'a proposed decline of the variant decided only on the unit branch',
    (given) => {
      git(given.base, given.project, 'checkout', '--quiet', '-b', `${BRANCH}--opus`);
      logEntry(
        given,
        `- 2026-11-22T10:30:00Z ${IMPLEMENTER} on the variant \`opus\`, proposed to decline \`S2\`: a reason`,
      );
      logEntry(given, '- 2026-11-22T10:40:00Z [human] decided the proposed decline of `S2`: declined');
      logEntry(given, reviewLine(given.reviewed, 'none', 'on the variant `opus`, '));
    },
    /the proposed declines of S2 have no decision/,
  ],
  [
    'a decision to be fixed after the last review',
    (given) => {
      logEntry(given, reviewLine(given.reviewed));
      logEntry(given, '- 2026-11-22T11:00:00Z [human] decided the proposed decline of `S2`: to be fixed');
    },
    /the human decided S2 to be fixed after the last review, and the fix is reviewed first/,
  ],
];

for (const status of ['implemented', 'cancelled', 'draft', 'approved', 'blocked']) {
  REFUSALS.push([
    `the status ${status}`,
    (given) => {
      rewriteRecord(given, (text) => text.replace('status: in-progress', `status: ${status}`));
      commitAll(given, 'Status');
    },
    new RegExp(`^agentrite: the unit changes/${UNIT}/ is ${status === 'implemented' ? 'implemented already' : ''}`),
  ]);
}

function rewriteRecord(given, change) {
  write(given.project, `changes/${UNIT}/record.md`, change(readFileSync(recordPath(given), 'utf-8')));
}

for (const [name, setup, expected] of REFUSALS) {
  test(`complete refuses ${name}, and changes nothing`, (testContext) => {
    const given = fixture(testContext);
    setup(given);
    const hasRepository = !name.startsWith('no git repository');
    const before = hasRepository && !name.includes('record.md') ? stateOf(given) : undefined;
    const result = runIn(given, [given.unit ?? UNIT]);
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, expected);
    assert.equal(result.stderr.split('\n').filter((line) => line.startsWith('agentrite: ')).length, 1);
    if (before !== undefined) assert.deepEqual(stateOf(given), before);
  });
}
