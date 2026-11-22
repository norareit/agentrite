import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
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

test('complete passes for a reviewed commit that is no ancestor with the same tree outside the unit', (testContext) => {
  const given = fixture(testContext);
  const { base, project } = given;
  const tree = git(base, project, 'rev-parse', 'HEAD^{tree}').trim();
  const start = git(base, project, 'rev-parse', 'master').trim();
  const other = git(base, project, 'commit-tree', tree, '-p', start, '-m', 'The same work').trim();
  logEntry(given, reviewLine(other.slice(0, 9)));
  const result = runIn(given, [UNIT]);
  assert.equal(result.status, 0, result.stderr);
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

// Two commits whose object names share their first seven characters, found by trying messages until two do, and
// written to the repository. Returns the shared characters.
function twoCommitsWithOnePrefix({ base, project }) {
  const tree = git(base, project, 'rev-parse', 'HEAD^{tree}').trim();
  const parent = git(base, project, 'rev-parse', 'HEAD').trim();
  const seen = new Map();
  for (let count = 0; ; count += 1) {
    const content =
      `tree ${tree}\nparent ${parent}\nauthor A <a@example.com> 1700000000 +0000\n` +
      `committer A <a@example.com> 1700000000 +0000\n\n${count}\n`;
    const name = createHash('sha1').update(`commit ${Buffer.byteLength(content)}\0${content}`).digest('hex');
    const earlier = seen.get(name.slice(0, 7));
    if (earlier === undefined) {
      seen.set(name.slice(0, 7), content);
      continue;
    }
    for (const found of [earlier, content]) {
      const written = spawnSync('git', ['hash-object', '-t', 'commit', '-w', '--stdin'], {
        cwd: project,
        encoding: 'utf-8',
        input: found,
        env: environment(base),
      });
      assert.equal(written.status, 0, written.stderr);
    }
    return name.slice(0, 7);
  }
}

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
    'a hash that names no commit',
    (given) => logEntry(given, reviewLine('1234567')),
    /names 1234567, which is no commit of the repository/,
  ],
  [
    'a hash that names two commits',
    (given) => logEntry(given, reviewLine(twoCommitsWithOnePrefix(given))),
    /which names more than one commit/,
  ],
  [
    'a file outside the unit changed after the review',
    (given) => {
      logEntry(given, reviewLine(given.reviewed));
      write(given.project, 'tracked.txt', 'three\n');
      commitAll(given, 'More work');
    },
    /differ between the last review[^]*- tracked\.txt\nThe work changed after the last review, so the reviewer reviews/,
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
    /- brought\.txt/,
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
