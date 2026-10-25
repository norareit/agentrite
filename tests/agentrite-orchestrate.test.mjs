import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  appendFileSync,
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  symlinkSync,
  truncateSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { parseDefinition } from '../scripts/agentrite-definition.mjs';
import {
  callLabel,
  clockTime,
  duration,
  endReport,
  exitStatus,
  followedLine,
  followedText,
  CLOSING_RULE,
  framedOutput,
  followPrinter,
  OPENING_RULE,
  plainOutput,
  judgeStep,
  resumePosition,
  orchestrate,
  openingLine,
  orchestrateUsage,
  parseOrchestrateArgs,
  ranTable,
  runName,
  stepFileName,
  stepHead,
  stepLine,
  timedItems,
  variantOf,
} from '../scripts/agentrite-orchestrate.mjs';
import { followedFile, heartbeatText, instantOf, startHeartbeat, writeWhole } from '../scripts/agentrite.mjs';
import { HEADLESS } from '../scripts/agentrite-headless.mjs';
import { askAgainRequest, outcomeRequest, readOutcome, RESUMED } from '../scripts/agentrite-outcome.mjs';
import { installKit } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const NAMES = { roles: ['specifier', 'planner', 'implementer', 'reviewer'], harnesses: ['claude', 'opencode'] };
const DEFAULT = parseDefinition(readFileSync(new URL('../orchestrator.json', import.meta.url), 'utf-8'), {
  path: 'orchestrator.json',
  ...NAMES,
});

const HEARTBEAT_FORM = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n$/;
const FENCE = '```';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The final response of a step that gives `outcome`, with prose around it.
function responseOf(outcome) {
  return `I did the work.\n\n${FENCE}json\n${JSON.stringify(outcome, null, 2)}\n${FENCE}\n`;
}

const DONE = { outcome: 'done', summary: 'Did it.', questions: [], afterwards: [], findings: [], declines: [] };
const BLOCKING = { id: 'S1', blocking: true, summary: 'R1 is not met' };
const MINOR = { id: 'C1', blocking: false, summary: 'A name could be clearer' };

const done = (overrides = {}) => ({ response: responseOf({ ...DONE, ...overrides }) });
const blocked = () => done({ findings: [BLOCKING, MINOR] });
const clean = () => done({ findings: [MINOR] });
const later = (...afterwards) => done({ afterwards });

// Runs `definition` with effects whose `run` gives the results listed, in turn, and records what it is given. With
// `from`, it starts at that position, as a resume does.
async function runWith(definition, results, from) {
  const calls = [];
  const queue = [...results];
  const effects = {
    started: (planned) => calls.push(['started', planned]),
    run: async (planned) => {
      calls.push(['run', planned]);
      assert.ok(queue.length > 0, `step ${planned.number} ran, and no result was listed for it`);
      const result = { status: 0, signal: null, response: undefined, session: undefined, milliseconds: 1000 };
      return { ...result, timedOut: false, ...queue.shift() };
    },
    ended: (ran) => calls.push(['ended', ran]),
  };
  const outcome = await orchestrate(definition, effects, from);
  const planned = calls.filter(([kind]) => kind === 'run').map(([, step]) => step);
  return { ...outcome, calls, planned, left: queue.length };
}

const summary = (planned) =>
  planned.map(({ number, round, step }) => [number, step.role, round === undefined ? '-' : `${round.at}/${round.of}`]);

// R12, R19, R20

test('the default with no finding at the first review runs steps 0 to 2 and ends complete', async () => {
  const run = await runWith(DEFAULT, [done(), done(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'planner', '-'],
    [1, 'implementer', '1/3'],
    [2, 'reviewer', '1/3'],
  ]);
  assert.deepEqual(
    run.planned.map(({ item, index }) => [item, index]),
    [
      [0, undefined],
      [1, 0],
      [1, 1],
    ],
  );
  assert.deepEqual(run.end, { kind: 'complete' });
  assert.equal(exitStatus(run.end), 0);
  assert.equal(run.ran.length, 3);
});

test(
  'the default with blocking findings at the first two reviews runs seven steps, and at all three runs out',
  async () => {
    const seven = await runWith(DEFAULT, [done(), done(), blocked(), done(), blocked(), done(), clean()]);
    assert.equal(seven.planned.length, 7);
    assert.deepEqual(seven.end, { kind: 'complete' });
    assert.deepEqual(summary(seven.planned).slice(5), [
      [5, 'implementer', '3/3'],
      [6, 'reviewer', '3/3'],
    ]);

    const out = await runWith(DEFAULT, [done(), done(), blocked(), done(), blocked(), done(), blocked()]);
    assert.equal(out.planned.length, 7);
    assert.equal(out.end.kind, 'ran-out');
    assert.equal(out.end.rounds, 3);
    assert.equal(out.end.ran.planned.number, 6);
    assert.equal(exitStatus(out.end), 3);
  },
);

test('a repeat without until runs all its rounds, whatever the findings, and then the step after it', async () => {
  const definition = {
    steps: [
      { repeat: { times: 2, steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }] } },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const run = await runWith(definition, [blocked(), blocked(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'reviewer', '1/2'],
    [1, 'reviewer', '2/2'],
    [2, 'planner', '-'],
  ]);
  assert.deepEqual(run.end, { kind: 'complete' });
});

test('a repeat with until that holds at once goes on with the item after it', async () => {
  const definition = {
    steps: [
      {
        repeat: {
          times: 3,
          until: 'no-blocking-findings',
          steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }],
        },
      },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const run = await runWith(definition, [clean(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'reviewer', '1/3'],
    [1, 'planner', '-'],
  ]);
  assert.deepEqual(run.end, { kind: 'complete' });
});

// Unit 0087, R2 to R5: the two values of until, in a repeat of 3 rounds of the step of a reviewer, and a planner after
// it.

function untilRepeat(until) {
  return {
    steps: [
      { repeat: { times: 3, until, steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }] } },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
}

const UNTIL_NO_FINDINGS = untilRepeat('no-findings');
const UNTIL_NO_BLOCKING = untilRepeat('no-blocking-findings');

const roles = (run) => run.planned.map(({ step }) => step.role);
const reviewsThenPlanner = (reviews) => [...Array(reviews).fill('reviewer'), 'planner'];

// The run of a repeat of `untilRepeat` whose three reviews each blocked.
function assertRanOut(run) {
  assert.deepEqual(roles(run), ['reviewer', 'reviewer', 'reviewer']);
  assert.equal(run.end.kind, 'ran-out');
  assert.equal(run.end.rounds, 3);
  assert.equal(run.end.ran.planned.number, 2);
  assert.equal(exitStatus(run.end), 3);
  assert.deepEqual(run.unfixed, []);
}

test('until no-findings ends the repeat at a review with no finding, and goes on with the planner', async () => {
  const run = await runWith(UNTIL_NO_FINDINGS, [done(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'reviewer', '1/3'],
    [1, 'planner', '-'],
  ]);
  assert.deepEqual(run.end, { kind: 'complete' });
  assert.deepEqual(run.unfixed, []);
});

test('until no-findings goes on to the next round after a review with only a non-blocking finding', async () => {
  const run = await runWith(UNTIL_NO_FINDINGS, [clean(), clean(), done(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'reviewer', '1/3'],
    [1, 'reviewer', '2/3'],
    [2, 'reviewer', '3/3'],
    [3, 'planner', '-'],
  ]);
  assert.deepEqual(run.end, { kind: 'complete' });
  assert.deepEqual(run.unfixed, []);
});

test('until no-findings goes on to the next round after a review with a blocking finding', async () => {
  const run = await runWith(UNTIL_NO_FINDINGS, [blocked(), done(), done()]);
  assert.deepEqual(roles(run), reviewsThenPlanner(2));
  assert.deepEqual(run.end, { kind: 'complete' });
  assert.deepEqual(run.unfixed, []);
});

test('until no-findings runs out at a blocking finding in the last round, and runs nothing after it', async () => {
  assertRanOut(await runWith(UNTIL_NO_FINDINGS, [blocked(), blocked(), blocked()]));
});

test('until no-findings with only non-blocking findings in the last round goes on, leaving them open', async () => {
  const run = await runWith(UNTIL_NO_FINDINGS, [clean(), clean(), clean(), done()]);
  assert.deepEqual(roles(run), reviewsThenPlanner(3));
  assert.deepEqual(run.end, { kind: 'complete' });
  assert.equal(exitStatus(run.end), 0);
  assert.equal(run.unfixed.length, 1);
  assert.equal(run.unfixed[0], run.ran[2]);
});

test('until no-blocking-findings ends the repeat at the first review that blocks nothing, as before', async () => {
  const cases = [
    [[done(), done()], 1],
    [[clean(), done()], 1],
    [[blocked(), done(), done()], 2],
    [[blocked(), clean(), done()], 2],
    [[blocked(), blocked(), done(), done()], 3],
    [[blocked(), blocked(), clean(), done()], 3],
  ];
  for (const [results, reviews] of cases) {
    const run = await runWith(UNTIL_NO_BLOCKING, results);
    assert.deepEqual(roles(run), reviewsThenPlanner(reviews));
    assert.deepEqual(run.end, { kind: 'complete' });
    assert.deepEqual(run.unfixed, []);
  }
  assertRanOut(await runWith(UNTIL_NO_BLOCKING, [blocked(), blocked(), blocked()]));
});

// The review's finding S1: an outcome in a blockquote lets the run go on.
test('a step that gives its outcome in a blockquote does not stop the run', async () => {
  const quoted = (outcome) => ({ response: responseOf(outcome).replace(/^/gm, '> ') });
  const run = await runWith(DEFAULT, [quoted(DONE), quoted(DONE), quoted(DONE)]);
  assert.equal(run.planned.length, 3);
  assert.deepEqual(run.end, { kind: 'complete' });
});

// The delta review's finding S2: a quoted block left open does not hide the outcome after it.
test('a step whose quoted block is left open before its outcome does not stop the run', async () => {
  const after = (outcome) => ({ response: `> ${FENCE}bash\n> npm test\n\n${responseOf(outcome)}` });
  const run = await runWith(DEFAULT, [after(DONE), after(DONE), after(DONE)]);
  assert.equal(run.planned.length, 3);
  assert.deepEqual(run.end, { kind: 'complete' });
});

// R18, R19: stopWhen, and the step judged before the repeat.

test('stopWhen on a step outside a repeat stops after it at a blocking finding, and not without one', async () => {
  const definition = {
    steps: [
      { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const stopped = await runWith(definition, [blocked()]);
  assert.equal(stopped.planned.length, 1);
  assert.equal(stopped.end.kind, 'stopped');
  assert.equal(stopped.end.by, 'stopWhen');
  assert.equal(exitStatus(stopped.end), 3);

  const going = await runWith(definition, [clean(), done()]);
  assert.equal(going.planned.length, 2);
  assert.deepEqual(going.end, { kind: 'complete' });
});

test('stopWhen on the last step of a repeat with until stops at its first blocking finding, before until', async () => {
  const reviewer = { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' };
  const definition = {
    steps: [
      {
        repeat: {
          times: 3,
          until: 'no-blocking-findings',
          steps: [{ role: 'implementer', harness: 'claude', model: 'm' }, reviewer],
        },
      },
    ],
  };
  const run = await runWith(definition, [done(), blocked()]);
  assert.equal(run.planned.length, 2);
  assert.equal(run.end.kind, 'stopped');
  assert.equal(run.end.by, 'stopWhen');
  assert.equal(run.end.ran.planned.number, 1);
});

// R18: each case stops at the step it holds for.

test('each case of requirement 18 stops at the step it holds for and runs nothing after it', async () => {
  for (const [result, by] of [
    [{ status: 1, ...done() }, 'harness'],
    [{ status: null, signal: 'SIGTERM', ...done() }, 'harness'],
    [{ response: 'No block here.' }, 'none'],
    [{ response: undefined }, 'none'],
    [{ response: `${responseOf(DONE)}\n${responseOf(DONE)}` }, 'several'],
    [{ response: `${FENCE}json\n{"outcome": "done"}\n${FENCE}` }, 'malformed'],
    [done({ outcome: 'needs-human', questions: ['Which?'] }), 'needs-human'],
    [done({ outcome: 'failed' }), 'failed'],
    [done({ questions: ['Which?'] }), 'questions'],
    [done({ declines: [{ finding: 'S1', reason: 'It holds.' }] }), 'declines'],
  ]) {
    const run = await runWith(DEFAULT, [done(), done(), result]);
    assert.equal(run.planned.length, 3, by);
    assert.equal(run.end.kind, 'stopped', by);
    assert.equal(run.end.by, by, by);
    assert.equal(run.end.ran.planned.number, 2, by);
    assert.equal(exitStatus(run.end), 3, by);
  }
});

// Unit 0088, R1 to R3: the ask again.

test('a step without a final response, or without a block, is asked again as itself, numbered next', async () => {
  for (const response of [undefined, 'No block here.']) {
    const run = await runWith(DEFAULT, [done(), { response, session: 'abc' }, done(), done()]);
    assert.deepEqual(
      run.planned.map(({ number, step, item, round, index, asked }) => [number, step.role, item, round, index, asked]),
      [
        [0, 'planner', 0, undefined, undefined, false],
        [1, 'implementer', 1, { at: 1, of: 3 }, 0, false],
        [2, 'implementer', 1, { at: 1, of: 3 }, 0, true],
        [3, 'reviewer', 1, { at: 1, of: 3 }, 1, false],
      ],
    );
    assert.equal(run.planned[2].step, run.planned[1].step);
    assert.equal(run.planned[2].session, 'abc');
    assert.equal(run.ran[1].reading.kind, 'none');
    assert.equal(run.ran[1].stop, undefined);
    assert.deepEqual(run.end, { kind: 'complete' });
    assert.equal(run.left, 0);
  }
});

test('an ask again without an outcome stops the run by none at the ask again, and is not asked again', async () => {
  const run = await runWith(DEFAULT, [done(), { response: 'No block.', session: 'abc' }, { response: 'None.' }]);
  assert.equal(run.planned.length, 3);
  assert.equal(run.end.kind, 'stopped');
  assert.equal(run.end.by, 'none');
  assert.equal(run.end.ran.planned.number, 2);
  assert.equal(run.end.ran.planned.asked, true);
});

test('the ask again of the last step of a round stands for it under until', async () => {
  const noBlock = { response: 'No block.', session: 'r' };
  const again = await runWith(DEFAULT, [done(), done(), noBlock, blocked(), done(), done()]);
  assert.deepEqual(summary(again.planned), [
    [0, 'planner', '-'],
    [1, 'implementer', '1/3'],
    [2, 'reviewer', '1/3'],
    [3, 'reviewer', '1/3'],
    [4, 'implementer', '2/3'],
    [5, 'reviewer', '2/3'],
  ]);
  assert.deepEqual(again.end, { kind: 'complete' });

  const ends = await runWith(DEFAULT, [done(), done(), noBlock, done()]);
  assert.equal(ends.planned.length, 4);
  assert.deepEqual(ends.end, { kind: 'complete' });
});

test('the ask again of a step with stopWhen that gives a blocking finding stops by stopWhen', async () => {
  const definition = {
    steps: [
      { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const run = await runWith(definition, [{ response: 'No block.', session: 's' }, blocked()]);
  assert.equal(run.planned.length, 2);
  assert.equal(run.end.by, 'stopWhen');
  assert.equal(run.end.ran.planned.number, 1);
});

test('a failed harness, a time limit reached, several blocks and an unknown session are not asked again', async () => {
  for (const [result, by] of [
    [{ status: 1, response: 'No block.', session: 'abc' }, 'harness'],
    [{ status: null, signal: 'SIGTERM', timedOut: true, response: 'No block.', session: 'abc' }, 'timeout'],
    [{ response: `${responseOf(DONE)}\n${responseOf(DONE)}`, session: 'abc' }, 'several'],
    [{ response: 'No block.' }, 'none'],
  ]) {
    const run = await runWith(DEFAULT, [done(), done(), result]);
    assert.equal(run.planned.length, 3, by);
    assert.equal(run.end.by, by, by);
    assert.equal(run.end.ran.planned.number, 2, by);
  }
});

test('of two cases that hold, the first of the order is named', () => {
  const step = { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' };
  const reading = (outcome) => readOutcome(responseOf(outcome));
  const ok = { status: 0, signal: null, timedOut: false };
  assert.equal(judgeStep(step, { ...ok, status: 1 }, { kind: 'none' }), 'harness');
  assert.equal(judgeStep(step, ok, { kind: 'none' }), 'none');
  assert.equal(judgeStep(step, ok, { kind: 'several', count: 2 }), 'several');
  assert.equal(judgeStep(step, ok, { kind: 'malformed', fault: 'x' }), 'malformed');
  const all = { ...DONE, outcome: 'needs-human', findings: [BLOCKING], declines: [{ finding: 'S1', reason: 'r' }] };
  assert.equal(judgeStep(step, ok, reading(all)), 'needs-human');
  assert.equal(judgeStep(step, ok, reading({ ...all, outcome: 'failed' })), 'failed');
  assert.equal(judgeStep(step, ok, reading({ ...all, outcome: 'done' })), 'declines');
  const asked = { ...all, questions: ['Which?'] };
  assert.equal(judgeStep(step, ok, reading(asked)), 'needs-human');
  assert.equal(judgeStep(step, ok, reading({ ...asked, outcome: 'failed' })), 'failed');
  assert.equal(judgeStep(step, ok, reading({ ...asked, outcome: 'done' })), 'questions');
  assert.equal(judgeStep(step, ok, reading({ ...all, outcome: 'done', declines: [] })), 'stopWhen');
  assert.equal(judgeStep(step, ok, reading({ ...DONE, findings: [MINOR] })), undefined);
  assert.equal(judgeStep({ ...step, stopWhen: undefined }, ok, reading({ ...DONE, findings: [BLOCKING] })), undefined);
});

// R7 to R9 of unit 0076: items for after the run stop no run, and questions of a done outcome do.

test('a run whose steps give done with items in afterwards and no question runs to its end', async () => {
  const run = await runWith(DEFAULT, [later('Read the plan.'), later('Check it in the IDE.'), later('Try macOS.')]);
  assert.equal(run.planned.length, 3);
  assert.deepEqual(run.end, { kind: 'complete' });
  assert.equal(exitStatus(run.end), 0);
  assert.ok(run.ran.every((entry) => entry.stop === undefined));
});

test('a harness that exits 1 with an outcome that is done stops by harness, and its outcome is read', async () => {
  const run = await runWith(DEFAULT, [{ status: 1, ...done() }]);
  assert.equal(run.end.by, 'harness');
  assert.equal(run.ran[0].reading.kind, 'outcome');
});

// R13: the sessions.

test(
  'a later step of one role and harness gets the session the earlier one returned, and another harness none',
  async () => {
    const definition = {
      steps: [
        { role: 'implementer', harness: 'claude', model: 'm' },
        { role: 'implementer', harness: 'opencode', model: 'm' },
        { role: 'reviewer', harness: 'claude', model: 'm' },
        { role: 'implementer', harness: 'claude', model: 'm' },
        { role: 'implementer', harness: 'opencode', model: 'm' },
        { role: 'implementer', harness: 'claude', model: 'm' },
      ],
    };
    const run = await runWith(definition, [
      { ...done(), session: 'claude-1' },
      { ...done(), session: 'ses_1' },
      { ...done(), session: 'claude-review' },
      { ...done(), session: 'claude-2' },
      { ...done() },
      { ...done() },
    ]);
    assert.deepEqual(
      run.planned.map(({ session }) => session),
      [undefined, undefined, undefined, 'claude-1', 'ses_1', 'claude-2'],
    );
  },
);

test('started and ended are called once each per step, in order, ended with the reading and the stop', async () => {
  const run = await runWith(DEFAULT, [done(), done(), done()]);
  assert.deepEqual(
    run.calls.map(([kind, value]) => [kind, kind === 'ended' ? value.planned.number : value.number]),
    [
      ['started', 0],
      ['run', 0],
      ['ended', 0],
      ['started', 1],
      ['run', 1],
      ['ended', 1],
      ['started', 2],
      ['run', 2],
      ['ended', 2],
    ],
  );
  const [, ended] = run.calls[2];
  assert.equal(ended.reading.kind, 'outcome');
  assert.equal(ended.stop, undefined);
  assert.equal(ended.result.milliseconds, 1000);
});

// Unit 0089, R2, R4, R6: a run that starts at the position of the step that stopped a run.

const sessionKey = (role, harness) => JSON.stringify([role, harness]);
const IMPLEMENTER_SESSION = [{ role: 'implementer', harness: 'claude', session: 'implementer-session' }];

test('the position of a resume is the step at names, and for an ask again the step it asked', () => {
  const sessions = [
    { role: 'planner', harness: 'claude', session: 'p' },
    { role: 'reviewer', harness: 'opencode', session: 'ses_r' },
  ];
  const map = new Map([
    [sessionKey('planner', 'claude'), 'p'],
    [sessionKey('reviewer', 'opencode'), 'ses_r'],
  ]);
  assert.deepEqual(resumePosition({ number: 0, item: 0, round: null, index: null }, sessions), {
    item: 0,
    round: undefined,
    index: undefined,
    number: 0,
    sessions: map,
  });
  const inRepeat = { number: 4, item: 1, round: { at: 2, of: 3 }, index: 1 };
  for (const asked of [undefined, false]) {
    assert.deepEqual(resumePosition({ ...inRepeat, asked }, sessions), {
      item: 1,
      round: { at: 2, of: 3 },
      index: 1,
      number: 4,
      sessions: map,
    });
  }
  assert.deepEqual(resumePosition({ ...inRepeat, number: 5, asked: true }, []), {
    item: 1,
    round: { at: 2, of: 3 },
    index: 1,
    number: 4,
    sessions: new Map(),
  });
});

const positionAt = (at, sessions = []) => resumePosition(at, sessions);
const REVIEW_ROUND_2 = { number: 4, item: 1, round: { at: 2, of: 3 }, index: 1 };
const IMPLEMENT_ROUND_2 = { number: 3, item: 1, round: { at: 2, of: 3 }, index: 0 };

test('a run from a position runs no item before it, and goes on from its round and index', async () => {
  const run = await runWith(DEFAULT, [done(), blocked(), done(), clean()], positionAt(IMPLEMENT_ROUND_2));
  assert.deepEqual(
    run.planned.map(({ number, step, item, round, index, rerun }) => [number, step.role, item, round, index, rerun]),
    [
      [3, 'implementer', 1, { at: 2, of: 3 }, 0, true],
      [4, 'reviewer', 1, { at: 2, of: 3 }, 1, false],
      [5, 'implementer', 1, { at: 3, of: 3 }, 0, false],
      [6, 'reviewer', 1, { at: 3, of: 3 }, 1, false],
    ],
  );
  assert.deepEqual(run.end, { kind: 'complete' });

  const outside = await runWith(DEFAULT, [done(), done(), done()], positionAt({ number: 0, item: 0, round: null }));
  assert.deepEqual(summary(outside.planned), [
    [0, 'planner', '-'],
    [1, 'implementer', '1/3'],
    [2, 'reviewer', '1/3'],
  ]);
  assert.equal(outside.planned[0].rerun, true);
});

test('a run without a position marks no step as a rerun', async () => {
  const run = await runWith(DEFAULT, [done(), done(), done()]);
  assert.ok(run.planned.every(({ rerun }) => rerun === false));
});

test('the rerun continues the session the position holds for its role and harness, and none without', async () => {
  const sessions = [
    { role: 'implementer', harness: 'claude', session: 'implementer-session' },
    { role: 'planner', harness: 'claude', session: 'planner-session' },
  ];
  const run = await runWith(DEFAULT, [done(), done()], positionAt(IMPLEMENT_ROUND_2, sessions));
  assert.deepEqual(
    run.planned.map(({ session }) => session),
    ['implementer-session', undefined],
  );
  const fresh = await runWith(DEFAULT, [{ ...done(), session: 'new' }, done()], positionAt(REVIEW_ROUND_2, sessions));
  assert.equal(fresh.planned[0].session, undefined);
});

test('a rerun without an outcome is asked again in its session, numbered one more, and not a rerun', async () => {
  const from = positionAt(IMPLEMENT_ROUND_2, IMPLEMENTER_SESSION);
  const run = await runWith(DEFAULT, [{ response: 'No block.' }, done(), done()], from);
  assert.deepEqual(
    run.planned.map(({ number, step, asked, rerun, session }) => [number, step.role, asked, rerun, session]),
    [
      [3, 'implementer', false, true, 'implementer-session'],
      [4, 'implementer', true, false, 'implementer-session'],
      [5, 'reviewer', false, false, undefined],
    ],
  );
  assert.deepEqual(run.end, { kind: 'complete' });
});

test('a rerun of a step that stopped for questions goes on when done, and stops again when not', async () => {
  const from = positionAt(IMPLEMENT_ROUND_2, IMPLEMENTER_SESSION);
  const goes = await runWith(DEFAULT, [done(), done()], from);
  assert.deepEqual(summary(goes.planned), [
    [3, 'implementer', '2/3'],
    [4, 'reviewer', '2/3'],
  ]);
  assert.deepEqual(goes.end, { kind: 'complete' });

  const stops = await runWith(DEFAULT, [done({ questions: ['Which branch?'] })], from);
  assert.equal(stops.planned.length, 1);
  assert.equal(stops.end.by, 'questions');
  assert.equal(stops.end.ran.planned.number, 3);
});

test('a rerun of a step that stopped by stopWhen goes on when clean, and stops again at a blocking one', async () => {
  const definition = {
    steps: [
      { role: 'implementer', harness: 'claude', model: 'm' },
      { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const from = positionAt({ number: 1, item: 1, round: null, index: null });
  const goes = await runWith(definition, [clean(), done()], from);
  assert.deepEqual(summary(goes.planned), [
    [1, 'reviewer', '-'],
    [2, 'planner', '-'],
  ]);
  assert.deepEqual(goes.end, { kind: 'complete' });

  const stops = await runWith(definition, [blocked()], from);
  assert.equal(stops.planned.length, 1);
  assert.equal(stops.end.by, 'stopWhen');
});

test('a rerun of the last step of a repeat that ran out ends it when until holds, else runs out again', async () => {
  const definition = { steps: [...DEFAULT.steps, { role: 'planner', harness: 'claude', model: 'm' }] };
  const from = positionAt({ number: 6, item: 1, round: { at: 3, of: 3 }, index: 1 });
  const goes = await runWith(definition, [done(), done()], from);
  assert.deepEqual(summary(goes.planned), [
    [6, 'reviewer', '3/3'],
    [7, 'planner', '-'],
  ]);
  assert.deepEqual(goes.end, { kind: 'complete' });

  const out = await runWith(definition, [blocked()], from);
  assert.equal(out.planned.length, 1);
  assert.equal(out.end.kind, 'ran-out');
  assert.equal(out.end.rounds, 3);
  assert.equal(out.end.ran.planned.number, 6);
});

// R14

const planner = {
  number: 0,
  item: 0,
  round: undefined,
  index: undefined,
  step: DEFAULT.steps[0],
  session: undefined,
  asked: false,
};
const reviewer = {
  number: 2,
  item: 1,
  round: { at: 1, of: 3 },
  index: 1,
  step: DEFAULT.steps[1].repeat.steps[1],
  session: undefined,
  asked: false,
};

function ended(planned, result) {
  const defaults = { status: 0, signal: null, response: undefined, session: undefined, milliseconds: 8000 };
  const full = { ...defaults, timedOut: false, ...result };
  const reading = full.response === undefined || full.timedOut ? { kind: 'none' } : readOutcome(full.response);
  return { planned, result: full, reading, stop: judgeStep(planned.step, full, reading) };
}

test('the head of a step gives its number, its round in a repeat, its role, harness and model', () => {
  assert.equal(stepHead(reviewer), 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol');
  assert.equal(stepHead(planner), 'step 0, planner, claude, claude-opus-5-5');
});

test('the name of a step file has as many digits as the highest step number needs, and two at least', () => {
  assert.equal(stepFileName(DEFAULT, 0, 'planner', 'outcome.json'), '00-planner.outcome.json');
  const many = { steps: [{ repeat: { times: 101, steps: [DEFAULT.steps[0]] } }] };
  assert.equal(stepFileName(many, 0, 'implementer', 'followed.jsonl'), '000-implementer.followed.jsonl');
  assert.equal(stepFileName(many, 100, 'implementer', 'followed.jsonl'), '100-implementer.followed.jsonl');
});

// Unit 0088, R4: room for an ask again after every step.
test('the name of a step file leaves room for an ask again after every step the definition can reach', () => {
  const fifty = { steps: [{ repeat: { times: 50, steps: [DEFAULT.steps[0]] } }] };
  assert.equal(stepFileName(fifty, 0, 'planner', 'outcome.json'), '00-planner.outcome.json');
  const fiftyOne = { steps: [{ repeat: { times: 51, steps: [DEFAULT.steps[0]] } }] };
  assert.equal(stepFileName(fiftyOne, 0, 'planner', 'outcome.json'), '000-planner.outcome.json');
  assert.equal(stepFileName(fiftyOne, 101, 'planner', 'outcome.json'), '101-planner.outcome.json');
});

test('the variant of a run is what follows the last -- of its branch, and none without one', () => {
  assert.equal(variantOf(null), null);
  assert.equal(variantOf('feature-0029-try-the-orchestrator'), null);
  assert.equal(variantOf('feature-0029-try-the-orchestrator--opus'), 'opus');
  assert.equal(variantOf('a--b--gpt-6-1'), 'gpt-6-1');
});

test('a variant that is not words of a to z and 0 to 9 joined by single hyphens is refused', () => {
  for (const [branch, variant] of [
    ['feature-0029-x--Opus', 'Opus'],
    ['feature-0029-x--', ''],
    ['feature-0029-x--a/b', 'a/b'],
  ]) {
    assert.throws(
      () => variantOf(branch),
      new Error(
        `the branch ${branch} gives the variant "${variant}", and a variant is one or more words of the lowercase ` +
          'letters a to z and the digits 0 to 9, joined by single hyphens',
      ),
    );
  }
});

test('the name of a run is its instant, followed by -- and its variant for a run with one', () => {
  assert.equal(runName('2026-10-21T10:00:00Z', null), '2026-10-21T10:00:00Z');
  assert.equal(runName('2026-10-21T10:00:00Z', 'opus'), '2026-10-21T10:00:00Z--opus');
});

test('the line before a step gives its number, its round in a repeat, its role, harness and model', () => {
  assert.equal(stepLine(planner), 'step 0, planner, claude, claude-opus-5-5: started');
  assert.equal(stepLine(reviewer), 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: started');
});

test('the line after a step adds its outcome and how long it took, the harness case first', () => {
  const head = 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol';
  for (const [result, said] of [
    [done(), 'done'],
    [done({ outcome: 'needs-human' }), 'needs-human'],
    [done({ outcome: 'failed' }), 'failed'],
    [{ response: 'Nothing.' }, 'no outcome'],
    [{ response: undefined }, 'no outcome'],
    [{ response: `${responseOf(DONE)}${responseOf(DONE)}${responseOf(DONE)}` }, '3 outcomes'],
    [{ response: `${FENCE}json\n[]\n${FENCE}` }, 'an outcome not of the form asked for'],
    [{ status: 2, ...done() }, 'the harness exited with 2'],
    [{ status: null, signal: 'SIGKILL' }, 'the harness was ended by SIGKILL'],
  ]) {
    assert.equal(stepLine(reviewer, ended(reviewer, result)), `${head}: ${said} after 0m 08s`);
  }
  const line = 'step 0, planner, claude, claude-opus-5-5: done after 0m 08s';
  assert.equal(stepLine(planner, ended(planner, done())), line);
});

// Unit 0088, R4
test('the lines of an ask again say that it asked again for the outcome, and its head does not', () => {
  const asked = { ...reviewer, number: 3, asked: true };
  const head = 'step 3, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol, asked again for its outcome';
  assert.equal(stepLine(asked), `${head}: started`);
  assert.equal(stepLine(asked, ended(asked, done())), `${head}: done after 0m 08s`);
  assert.equal(stepLine(asked, ended(asked, { response: 'No.' })), `${head}: no outcome after 0m 08s`);
  assert.equal(stepHead(asked), 'step 3, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol');
});

test('duration rounds to whole seconds, and gives hours from an hour on', () => {
  assert.equal(duration(0), '0m 00s');
  assert.equal(duration(999), '0m 01s');
  assert.equal(duration(8000), '0m 08s');
  assert.equal(duration(724000), '12m 04s');
  assert.equal(duration(3723000), '1h 02m 03s');
});

// R21

const SPEC_STEPS = [
  [DEFAULT.steps[0], 724000],
  [DEFAULT.steps[1].repeat.steps[0], 2497000],
  [DEFAULT.steps[1].repeat.steps[1], 492000],
  [DEFAULT.steps[1].repeat.steps[0], 950000],
  [DEFAULT.steps[1].repeat.steps[1], 363000],
];

test('the table of the steps that ran is the spec example, line for line', () => {
  const ran = SPEC_STEPS.map(([step, milliseconds], number) => {
    const planned = { number, item: 0, round: undefined, index: undefined, step, session: undefined };
    return ended(planned, { ...done(), milliseconds });
  });
  assert.equal(
    ranTable(ran),
    [
      '0  planner      claude    claude-opus-5-5     12m 04s',
      '1  implementer  claude    claude-sonnet-5-5   41m 37s',
      '2  reviewer     opencode  openai/gpt-6.1-sol   8m 12s',
      '3  implementer  claude    claude-sonnet-5-5   15m 50s',
      '4  reviewer     opencode  openai/gpt-6.1-sol   6m 03s',
    ].join('\n'),
  );
});

// Unit 0088, R4
test('the table marks an ask again in a last column, and its other rows end with no space', () => {
  const ran = SPEC_STEPS.slice(0, 3).map(([step, milliseconds], number) => {
    const asked = number === 2;
    const planned = { number, item: 0, round: undefined, index: undefined, step, session: undefined, asked };
    return ended(planned, { ...done(), milliseconds });
  });
  assert.equal(
    ranTable(ran),
    [
      '0  planner      claude    claude-opus-5-5     12m 04s',
      '1  implementer  claude    claude-sonnet-5-5   41m 37s',
      '2  reviewer     opencode  openai/gpt-6.1-sol   8m 12s  asked again',
    ].join('\n'),
  );
});

const WHERE = {
  runDirectory: '.orchestrator/0029-x/2026-10-21T10:00:00Z',
  unitDirectory: '0029-x',
  responsePath: undefined,
};
const WHERE_LINES = [
  '',
  "The run's directory: .orchestrator/0029-x/2026-10-21T10:00:00Z/",
  "The reviewer's findings are under .reviews/0029-x/.",
];

async function reportOf(results, definition = DEFAULT, where = WHERE) {
  const run = await runWith(definition, results);
  return endReport(run.ran, run.end, run.unfixed, where).split('\n');
}

test(
  'the report of a run that ran every item gives the table, the line of the end, the summary and where',
  async () => {
    const lines = await reportOf([done(), done(), done({ summary: 'Reviewed it.' })]);
    assert.deepEqual(lines.slice(3), [
      '',
      'The run ran every item of the definition to its end.',
      'Summary: Reviewed it.',
      ...WHERE_LINES,
      '',
    ]);
    assert.match(lines[0], /^0 {2}planner {6}claude {4}claude-opus-5-5 {5}0m 01s$/);
  },
);

test('the report of a repeat that ran out gives the open blocking findings and the rounds', async () => {
  const findings = [BLOCKING, MINOR, { ...BLOCKING, id: 'S2', summary: 'R2' }];
  const last = done({ summary: 'Reviewed again.', findings });
  const lines = await reportOf([done(), done(), blocked(), done(), blocked(), done(), last]);
  assert.deepEqual(lines.slice(8), [
    'Step 6 stopped the run: the repeat ran its 3 rounds, and its until did not hold after the last.',
    'Summary: Reviewed again.',
    'Blocking findings still open:',
    '  S1: R1 is not met',
    '  S2: R2',
    ...WHERE_LINES,
    '',
  ]);
});

test('the report of a stop by stopWhen gives the open blocking findings', async () => {
  const definition = { steps: [{ role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' }] };
  const lines = await reportOf([blocked()], definition);
  assert.deepEqual(lines.slice(2), [
    'Step 0 stopped the run: it holds stopWhen "blocking-findings", and a finding of its outcome blocks.',
    'Summary: Did it.',
    'Blocking findings still open:',
    '  S1: R1 is not met',
    ...WHERE_LINES,
    '',
  ]);
});

test('the report of a stop for the human gives the questions and the proposed declines', async () => {
  const asks = done({
    outcome: 'needs-human',
    summary: 'Stopped.',
    questions: ['Which branch?', 'May I add a dependency?'],
    declines: [{ finding: 'S1', reason: 'The spec allows it.' }],
  });
  assert.deepEqual((await reportOf([done(), asks])).slice(3), [
    'Step 1 stopped the run: its outcome is needs-human.',
    'Summary: Stopped.',
    'Questions:',
    '  - Which branch?',
    '  - May I add a dependency?',
    'Proposed declines:',
    '  S1: The spec allows it.',
    ...WHERE_LINES,
    '',
  ]);
  const declines = done({ declines: [{ finding: 'S1', reason: 'The spec allows it.' }] });
  assert.deepEqual((await reportOf([done(), declines])).slice(3, 7), [
    'Step 1 stopped the run: it proposes declines of findings, which the human decides.',
    'Summary: Did it.',
    'Proposed declines:',
    '  S1: The spec allows it.',
  ]);
  assert.equal(
    (await reportOf([done(), done({ outcome: 'failed' })]))[3],
    'Step 1 stopped the run: its outcome is failed.',
  );
});

test(
  'the report of a step with no outcome of the form gives the path of its response, or that there is none',
  async () => {
    const where = { ...WHERE, responsePath: '.orchestrator/0029-x/2026-10-21T10:00:00Z/01-implementer.response.md' };
    const malformed = { response: `${FENCE}json\n{"outcome": "done", "summary": "Secret."}\n${FENCE}` };
    assert.deepEqual((await reportOf([done({ summary: 'Planned.' }), malformed], DEFAULT, where)).slice(3), [
      'Step 1 stopped the run: its outcome is not of the form asked for. questions is missing. ' +
        'It must hold a list of strings.',
      `The final response of step 1 is at ${where.responsePath}.`,
      ...WHERE_LINES,
      '',
    ]);
    assert.deepEqual((await reportOf([done(), { response: 'No block.' }], DEFAULT, where)).slice(3, 5), [
      'Step 1 stopped the run: its final response holds no block marked json.',
      `The final response of step 1 is at ${where.responsePath}.`,
    ]);
    assert.equal(
      (await reportOf([done(), { response: `${responseOf(DONE)}${responseOf(DONE)}` }], DEFAULT, where))[3],
      'Step 1 stopped the run: its final response holds 2 blocks marked json, not one.',
    );
    assert.deepEqual((await reportOf([done(), { status: 1 }])).slice(3, 5), [
      'Step 1 stopped the run: its harness exited with 1.',
      'The harness gave step 1 no final response.',
    ]);
    assert.equal(
      (await reportOf([done(), { status: null, signal: 'SIGTERM' }]))[3],
      'Step 1 stopped the run: its harness was ended by SIGTERM.',
    );
  },
);

test('the report of a harness that failed after it gave an outcome gives the outcome', async () => {
  assert.deepEqual((await reportOf([done(), { status: 1, ...done({ summary: 'Half done.' }) }])).slice(3, 5), [
    'Step 1 stopped the run: its harness exited with 1.',
    'Summary: Half done.',
  ]);
});

// Unit 0087, R4 and R6: the non-blocking findings a repeat with until no-findings left open, in the end report.

const UNFIXED_LINES = ['Non-blocking findings still open after step 2:', '  C1: A name could be clearer'];

test('the report gives the non-blocking findings still open after the summary of the last step', async () => {
  const lines = await reportOf([clean(), clean(), clean(), done()], UNTIL_NO_FINDINGS);
  assert.deepEqual(lines.slice(4), [
    '',
    'The run ran every item of the definition to its end.',
    'Summary: Did it.',
    ...UNFIXED_LINES,
    ...WHERE_LINES,
    '',
  ]);
});

test('the non-blocking findings still open stand before the items for after the run', async () => {
  const lines = await reportOf([clean(), clean(), clean(), later('Check it on macOS.')], UNTIL_NO_FINDINGS);
  assert.deepEqual(lines.slice(6, -WHERE_LINES.length - 1), [
    'Summary: Did it.',
    ...UNFIXED_LINES,
    'After the run:',
    '  step 3, planner:',
    '    - Check it on macOS.',
  ]);
});

test('the non-blocking findings still open are given when a later step stops the run', async () => {
  const asks = done({ outcome: 'needs-human', summary: 'Stopped.' });
  const lines = await reportOf([clean(), clean(), clean(), asks], UNTIL_NO_FINDINGS);
  assert.deepEqual(lines.slice(5), [
    'Step 3 stopped the run: its outcome is needs-human.',
    'Summary: Stopped.',
    ...UNFIXED_LINES,
    ...WHERE_LINES,
    '',
  ]);
});

test('the non-blocking findings still open of two repeats are given for each, in the order they ran', async () => {
  const review = { role: 'reviewer', harness: 'opencode', model: 'm' };
  const once = { repeat: { times: 1, until: 'no-findings', steps: [review] } };
  const other = { id: 'C1', blocking: false, summary: 'A comment could be shorter' };
  const lines = await reportOf([clean(), done({ findings: [other] })], { steps: [once, once] });
  assert.deepEqual(lines.slice(3), [
    'The run ran every item of the definition to its end.',
    'Summary: Did it.',
    'Non-blocking findings still open after step 0:',
    '  C1: A name could be clearer',
    'Non-blocking findings still open after step 1:',
    '  C1: A comment could be shorter',
    ...WHERE_LINES,
    '',
  ]);
});

test('the report of a repeat with until no-findings that ran out gives the blocking findings alone', async () => {
  const lines = await reportOf([blocked(), blocked(), blocked()], UNTIL_NO_FINDINGS);
  assert.deepEqual(lines.slice(4), [
    'Step 2 stopped the run: the repeat ran its 3 rounds, and its until did not hold after the last.',
    'Summary: Did it.',
    'Blocking findings still open:',
    '  S1: R1 is not met',
    ...WHERE_LINES,
    '',
  ]);
});

// R8, R10 to R13 of unit 0076: the items for after the run, from every step, in the end report.

test('the report gives the items for after the run of every step, grouped by step, after the last step', async () => {
  const implementer = later(
    'Check the new action in a running IDE',
    'Decide the label of the button; the step built "Export"',
  );
  const lines = await reportOf([done(), implementer, later('Check the dialog on macOS')]);
  assert.deepEqual(lines.slice(4), [
    'The run ran every item of the definition to its end.',
    'Summary: Did it.',
    'After the run:',
    '  step 1, round 1 of 3, implementer:',
    '    - Check the new action in a running IDE',
    '    - Decide the label of the button; the step built "Export"',
    '  step 2, round 1 of 3, reviewer:',
    '    - Check the dialog on macOS',
    ...WHERE_LINES,
    '',
  ]);
});

test('a step outside a repeat is named without a round, an empty list is left out, and a repeat is kept', async () => {
  const lines = await reportOf([later('Check it on macOS.'), later(), later('Check it on macOS.')]);
  assert.deepEqual(lines.slice(6, -WHERE_LINES.length - 1), [
    'After the run:',
    '  step 0, planner:',
    '    - Check it on macOS.',
    '  step 2, round 1 of 3, reviewer:',
    '    - Check it on macOS.',
  ]);
});

test('the items of the steps before a last step without an outcome of the form are given', async () => {
  const where = { ...WHERE, responsePath: '.orchestrator/0029-x/2026-10-21T10:00:00Z/02-reviewer.response.md' };
  const lines = await reportOf([done(), later('Check it in the IDE.'), { response: 'No block.' }], DEFAULT, where);
  assert.deepEqual(lines.slice(4), [
    'Step 2 stopped the run: its final response holds no block marked json.',
    `The final response of step 2 is at ${where.responsePath}.`,
    'After the run:',
    '  step 1, round 1 of 3, implementer:',
    '    - Check it in the IDE.',
    ...WHERE_LINES,
    '',
  ]);
});

test('a run in which no step left an item has no part for after the run', async () => {
  const lines = await reportOf([done(), done(), done({ outcome: 'needs-human', questions: ['Which?'] })]);
  assert.ok(!lines.some((line) => line.startsWith('After the run')), lines.join('\n'));
});

test('the report of a stop by a done outcome with questions gives its end line, questions and items', async () => {
  const asks = done({ summary: 'Built it.', questions: ['Which branch?'], afterwards: ['Check it in the IDE.'] });
  assert.deepEqual((await reportOf([done(), asks])).slice(3), [
    'Step 1 stopped the run: its outcome is done, but holds questions, which the human answers.',
    'Summary: Built it.',
    'Questions:',
    '  - Which branch?',
    'After the run:',
    '  step 1, round 1 of 3, implementer:',
    '    - Check it in the IDE.',
    ...WHERE_LINES,
    '',
  ]);
});

// R5, R6 and R11 of unit 0069: a step that ran out of time.

const TIMED_OUT = { status: null, signal: 'SIGTERM', timedOut: true };

test('a step that ran out of time is judged so before its status, its signal and every case of its outcome', () => {
  const step = { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' };
  const reading = (outcome) => readOutcome(responseOf(outcome));
  for (const result of [TIMED_OUT, { ...TIMED_OUT, signal: 'SIGKILL' }, { ...TIMED_OUT, status: 1, signal: null }]) {
    for (const read of [
      { kind: 'none' },
      { kind: 'several', count: 2 },
      { kind: 'malformed', fault: 'x' },
      reading(DONE),
      reading({ ...DONE, outcome: 'needs-human' }),
      reading({ ...DONE, outcome: 'failed' }),
      reading({ ...DONE, declines: [{ finding: 'S1', reason: 'r' }] }),
      reading({ ...DONE, findings: [BLOCKING] }),
    ]) {
      assert.equal(judgeStep(step, result, read), 'timeout', JSON.stringify([result, read]));
    }
  }
  assert.equal(judgeStep(step, { status: 0, signal: null, timedOut: true }, reading(DONE)), 'timeout');
});

test('a step that ran out of time with a done outcome stops the run, read as no outcome, in a repeat too', async () => {
  const outside = await runWith(DEFAULT, [{ ...TIMED_OUT, ...done() }]);
  assert.equal(outside.planned.length, 1);
  assert.equal(outside.end.kind, 'stopped');
  assert.equal(outside.end.by, 'timeout');
  assert.deepEqual(outside.ran[0].reading, { kind: 'none' });
  assert.equal(outside.left, 0);

  const inside = await runWith(DEFAULT, [done(), { ...TIMED_OUT, ...done() }]);
  assert.equal(inside.planned.length, 2);
  assert.equal(inside.end.by, 'timeout');
  assert.equal(inside.end.ran.planned.number, 1);
  assert.deepEqual(inside.ran[1].reading, { kind: 'none' });
  assert.equal(exitStatus(inside.end), 3);
});

test('the line after a step that ran out of time says so, whatever it printed and however it ended', () => {
  const head = 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol';
  for (const result of [{ ...TIMED_OUT, ...done() }, { ...TIMED_OUT, signal: 'SIGKILL' }]) {
    assert.equal(stepLine(reviewer, ended(reviewer, result)), `${head}: ran out of time after 0m 08s`);
  }
});

test('the report of a step out of time gives its limit, and where its response is, or that it has none', async () => {
  const limited = (timeoutMinutes) => ({
    steps: [{ role: 'implementer', harness: 'claude', model: 'm', timeoutMinutes }],
  });
  const where = { ...WHERE, responsePath: '.orchestrator/0029-x/2026-10-21T10:00:00Z/00-implementer.response.md' };
  assert.deepEqual((await reportOf([{ ...TIMED_OUT, ...done() }], limited(30), where)).slice(2), [
    'Step 0 stopped the run: it ran past its time limit of 30 minutes.',
    `The final response of step 0 is at ${where.responsePath}.`,
    ...WHERE_LINES,
    '',
  ]);
  assert.deepEqual((await reportOf([TIMED_OUT], limited(1))).slice(2, 4), [
    'Step 0 stopped the run: it ran past its time limit of 1 minute.',
    'The harness gave step 0 no final response.',
  ]);
  assert.equal(
    (await reportOf([TIMED_OUT], limited(0.05)))[2],
    'Step 0 stopped the run: it ran past its time limit of 0.05 minutes.',
  );
});

// Unit 0075, R5 to R7: what is printed of a step that is followed.

const dim = (text) => `\x1b[2m${text}\x1b[22m`;
const NO_LABEL = { description: undefined, path: undefined, pattern: undefined, command: undefined };
const call = (fields, time = Date.UTC(2026, 9, 22, 14, 3, 31)) => ({
  kind: 'call',
  time,
  tool: 'Bash',
  ...NO_LABEL,
  ...fields,
});

test('clockTime gives the time in UTC as HH:MM:SS', () => {
  assert.equal(clockTime(Date.UTC(2026, 9, 22, 14, 3, 27, 900)), '14:03:27');
  assert.equal(clockTime(Date.UTC(2026, 9, 22, 0, 0, 5)), '00:00:05');
});

test('callLabel takes the description, then the path, the pattern and the first line of the command', () => {
  const all = { description: 'Run the tests', path: '/work/a.mjs', pattern: 'follow', command: 'npm test' };
  assert.equal(callLabel(call(all)), 'Run the tests');
  assert.equal(callLabel(call({ ...all, description: undefined })), '/work/a.mjs');
  assert.equal(callLabel(call({ ...all, description: undefined, path: undefined })), 'follow');
  assert.equal(callLabel(call({ command: 'npm test' })), 'npm test');
  assert.equal(callLabel(call({ command: 'cd /work\nnpm test' })), 'cd /work');
  assert.equal(callLabel(call({ description: '', path: '/work/a.mjs' })), '/work/a.mjs');
  assert.equal(callLabel(call({})), undefined);
});

test('callLabel writes a line feed or a carriage return of a description, a path or a pattern as \\n or \\r', () => {
  assert.equal(callLabel(call({ description: 'Run\nthe tests', path: '/work/a.mjs' })), 'Run\\nthe tests');
  assert.equal(callLabel(call({ path: '/work/a\r.mjs', pattern: 'follow' })), '/work/a\\r.mjs');
  assert.equal(callLabel(call({ pattern: 'first\r\nsecond', command: 'grep' })), 'first\\r\\nsecond');
  assert.equal(callLabel(call({ command: 'cd /work\r\nnpm test' })), 'cd /work\\r');
});

test('a call with a pattern of two lines is printed on one line, in each harness', () => {
  const claude = JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'tool_use', name: 'Grep', input: { pattern: 'first\nsecond', multiline: true } }] },
    parent_tool_use_id: null,
    timestamp: '2026-10-22T14:03:27.000Z',
  });
  const opencode = JSON.stringify({
    type: 'tool_use',
    timestamp: Date.UTC(2026, 9, 22, 14, 3, 27),
    part: { type: 'tool', tool: 'grep', state: { status: 'completed', input: { pattern: 'first\nsecond' } } },
  });
  for (const [harness, line, tool] of [
    ['claude', claude, 'Grep'],
    ['opencode', opencode, 'grep'],
  ]) {
    /** @type {string[]} */ const written = [];
    followPrinter((text) => written.push(text))(timedItems(HEADLESS[harness].follow(line), Date.now));
    assert.equal(written.join(''), `${dim(`14:03:27 → ${tool} first\\nsecond`)}\n`, harness);
  }
});

test('calls OpenCode makes known in the reverse of the order made are printed as made known, each at its time', () => {
  const ended = (second, command) =>
    JSON.stringify({
      type: 'tool_use',
      timestamp: Date.UTC(2026, 9, 22, 17, 12, second),
      part: { type: 'tool', tool: 'bash', state: { status: 'completed', input: { command } } },
    });
  /** @type {string[]} */ const written = [];
  const print = followPrinter((text) => written.push(text));
  for (const line of [ended(7, 'true'), ended(9, 'sleep 2')]) {
    print(timedItems(HEADLESS.opencode.follow(line), Date.now));
  }
  assert.equal(written.join(''), `${dim('17:12:07 → bash true')}\n${dim('17:12:09 → bash sleep 2')}\n`);
});

test('callLabel cuts a command to its first 100 code points, splitting no character', () => {
  const hundred = 'a'.repeat(100);
  assert.equal(callLabel(call({ command: hundred })), hundred);
  assert.equal(callLabel(call({ command: `${hundred}b` })), hundred);
  assert.equal(callLabel(call({ command: '😀'.repeat(101) })), '😀'.repeat(100));
});

test('followedText gives a call as one dimmed line, and a text as its time and its full text', () => {
  const time = '14:03:31';
  assert.equal(
    followedText(call({ description: 'Run the tests' }), time),
    '\x1b[2m14:03:31 → Bash Run the tests\x1b[22m',
  );
  assert.equal(followedText(call({}), time), '\x1b[2m14:03:31 → Bash\x1b[22m');
  assert.equal(
    followedText({ kind: 'text', time: undefined, text: 'First line.\n\nSecond line.\n\n' }, time),
    '14:03:31 First line.\n\nSecond line.',
  );
});

test('timedItems keeps the time of an item and gives one without the instant now gives, changing no item', () => {
  const given = [
    { kind: 'text', time: Date.UTC(2026, 9, 22, 9, 0, 3), text: 'Kept.' },
    { kind: 'text', time: undefined, text: 'Stamped.' },
    { ...call({ command: 'ls' }), time: undefined },
  ];
  const before = structuredClone(given);
  let calls = 0;
  const now = () => Date.UTC(2026, 9, 22, 9, 0, ++calls);
  const timed = timedItems(given, now);
  assert.deepEqual(
    timed.map((item) => item.time),
    [Date.UTC(2026, 9, 22, 9, 0, 3), Date.UTC(2026, 9, 22, 9, 0, 1), Date.UTC(2026, 9, 22, 9, 0, 2)],
  );
  assert.equal(calls, 2);
  assert.deepEqual(given, before);
});

test('followedLine gives a text as one line of JSON holding its full text, with the keys in order', () => {
  const words = 'First "line".\n\nSecond line.\n';
  const line = followedLine({ kind: 'text', time: 0, text: words }, '2026-10-22T14:03:27Z');
  assert.equal(line.indexOf('\n'), line.length - 1);
  assert.deepEqual(JSON.parse(line), { time: '2026-10-22T14:03:27Z', kind: 'text', text: words });
  assert.deepEqual(Object.keys(JSON.parse(line)), ['time', 'kind', 'text']);
});

test('followedLine gives a call with the label callLabel gives, or null for none', () => {
  const instant = '2026-10-22T14:03:31Z';
  const parsed = (fields) => JSON.parse(followedLine(call(fields), instant));
  assert.deepEqual(parsed({ description: 'Run the tests' }), {
    time: instant,
    kind: 'call',
    tool: 'Bash',
    label: 'Run the tests',
  });
  assert.equal(parsed({ pattern: 'first\nsecond' }).label, 'first\\nsecond');
  assert.equal(parsed({}).label, null);
  assert.deepEqual(Object.keys(parsed({})), ['time', 'kind', 'tool', 'label']);
});

test('followedLine takes the instant it is given, with its date in UTC', () => {
  const time = Date.UTC(2026, 9, 22, 14, 3, 27, 900);
  const line = followedLine({ kind: 'text', time, text: 'Hello' }, instantOf(time));
  assert.equal(JSON.parse(line).time, '2026-10-22T14:03:27Z');
  assert.ok(`${instantOf(time)}`.endsWith(clockTime(time) + 'Z'));
});

test('followPrinter sets each text apart by one blank line, and the calls on lines of their own', () => {
  /** @type {string[]} */ const written = [];
  const now = () => Date.UTC(2026, 9, 22, 9, 0, 0);
  const print = followPrinter((text) => written.push(text));
  const text = (words, time) => ({ kind: 'text', time, text: words });
  print(timedItems([text('First.', undefined)], now));
  print(timedItems([call({ command: 'ls' }), call({ path: '/work/a.mjs' }, Date.UTC(2026, 9, 22, 9, 0, 2))], now));
  print(timedItems([text('Second.', Date.UTC(2026, 9, 22, 9, 0, 3)), text('Third.', undefined)], now));
  assert.equal(
    written.join(''),
    [
      '09:00:00 First.',
      '',
      '\x1b[2m14:03:31 → Bash ls\x1b[22m',
      '\x1b[2m09:00:02 → Bash /work/a.mjs\x1b[22m',
      '',
      '09:00:03 Second.',
      '',
      '09:00:00 Third.',
      '',
      '',
    ].join('\n'),
  );
});

// R5, R6

function runThrough(output) {
  const now = () => Date.UTC(2026, 9, 22, 9, 0, 0);
  const text = (words) => ({ kind: 'text', time: undefined, text: words });
  output.started('step 0: started');
  output.items(timedItems([text('First.'), call({ command: 'ls' })], now));
  output.ended('step 0: done');
  output.started('step 1: started');
  output.items(timedItems([call({ command: 'pwd' })], now));
  output.ended('step 1: done');
  output.report('The report.\n');
}

test('plainOutput writes the line of each step and a blank line before the report, and nothing of the items', () => {
  /** @type {string[]} */ const written = [];
  runThrough(plainOutput((text) => written.push(text)));
  assert.equal(
    written.join(''),
    'step 0: started\nstep 0: done\nstep 1: started\nstep 1: done\n\nThe report.\n',
  );
});

// Unit 0089, R10: the opening line of a resume.

test('the opening line names the run resumed and the step rerun, by its head', () => {
  const step = { role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5' };
  assert.equal(
    openingLine(`.orchestrator/${'0029-x'}/2026-10-21T10:00:00Z`, { number: 2, round: { at: 1, of: 3 }, step }),
    'Resuming the run .orchestrator/0029-x/2026-10-21T10:00:00Z/ at step 2, round 1 of 3, implementer, claude, ' +
      'claude-sonnet-5-5',
  );
  assert.equal(
    openingLine('.orchestrator/0029-x/2026-10-21T10:00:00Z--opus', { number: 0, round: undefined, step }),
    'Resuming the run .orchestrator/0029-x/2026-10-21T10:00:00Z--opus/ at step 0, implementer, claude, ' +
      'claude-sonnet-5-5',
  );
});

test('plainOutput writes the opening line as a line before the line of the first step', () => {
  /** @type {string[]} */ const written = [];
  const output = plainOutput((text) => written.push(text));
  output.opening('Resuming the run x/ at step 2');
  output.started('step 2: started');
  output.ended('step 2: done');
  output.report('The report.\n');
  assert.equal(written.join(''), 'Resuming the run x/ at step 2\nstep 2: started\nstep 2: done\n\nThe report.\n');
});

// R4, R8

test('the rules are 80 plain characters, the opening one naming agentrite', () => {
  assert.equal(OPENING_RULE, `==== agentrite ${'='.repeat(65)}`);
  assert.equal(CLOSING_RULE, '='.repeat(80));
  for (const rule of [OPENING_RULE, CLOSING_RULE]) {
    assert.equal(rule.length, 80);
    assert.ok(!rule.includes('\x1b'));
  }
});

const framed = (...lines) => lines.join('\n');

test('framedOutput frames a step with no item and the report, no two rules on consecutive lines', () => {
  /** @type {string[]} */ const written = [];
  const output = framedOutput((text) => written.push(text));
  output.started('step 0: started');
  output.ended('step 0: done');
  output.report('The report.\nIts end.\n');
  assert.equal(
    written.join(''),
    framed(
      OPENING_RULE,
      'step 0: started',
      CLOSING_RULE,
      '',
      OPENING_RULE,
      'step 0: done',
      '',
      'The report.',
      'Its end.',
      CLOSING_RULE,
      '',
    ),
  );
});

test('framedOutput puts two steps in the frames of the run, with a blank line between a rule and an item', () => {
  /** @type {string[]} */ const written = [];
  const output = framedOutput((text) => written.push(text));
  const now = () => Date.UTC(2026, 9, 22, 9, 0, 0);
  const text = (words) => ({ kind: 'text', time: undefined, text: words });
  output.started('step 0: started');
  output.items(timedItems([call({ command: 'ls' })], now));
  output.ended('step 0: done');
  output.started('step 1: started');
  output.items(timedItems([text('Only.')], now));
  output.ended('step 1: done');
  output.report('The report.\n');
  assert.equal(
    written.join(''),
    framed(
      OPENING_RULE,
      'step 0: started',
      CLOSING_RULE,
      '',
      dim('14:03:31 → Bash ls'),
      '',
      OPENING_RULE,
      'step 0: done',
      'step 1: started',
      CLOSING_RULE,
      '',
      '09:00:00 Only.',
      '',
      OPENING_RULE,
      'step 1: done',
      '',
      'The report.',
      CLOSING_RULE,
      '',
    ),
  );
});

// Unit 0089, R10
test('framedOutput puts the opening line and the line of the first step in one frame', () => {
  /** @type {string[]} */ const written = [];
  const output = framedOutput((text) => written.push(text));
  output.opening('Resuming the run x/ at step 2');
  output.started('step 2: started');
  output.ended('step 2: done');
  output.report('The report.\n');
  assert.equal(
    written.join(''),
    framed(
      OPENING_RULE,
      'Resuming the run x/ at step 2',
      'step 2: started',
      CLOSING_RULE,
      '',
      OPENING_RULE,
      'step 2: done',
      '',
      'The report.',
      CLOSING_RULE,
      '',
    ),
  );
});

test('framedOutput leaves no frame open while a step runs', () => {
  /** @type {string[]} */ const written = [];
  const output = framedOutput((text) => written.push(text));
  output.started('step 0: started');
  const before = written.join('');
  assert.ok(before.endsWith(`${CLOSING_RULE}\n\n`), before);
  output.items(timedItems([call({ command: 'ls' })], Date.now));
  assert.equal(written.join('').split(OPENING_RULE).length, 2);
});

// R10

const USAGE_FORM =
  'usage: agentrite orchestrate <unit> [--definition <file>] [--resume [--prompt <text>]] [--skip-permissions] ' +
  '[--follow]';
const PARSED = { definition: undefined, skipPermissions: false, follow: false, resume: false, prompt: undefined };

test('parseOrchestrateArgs takes the unit, --definition, --skip-permissions and --follow, at any place', () => {
  assert.deepEqual(parseOrchestrateArgs(['0029']), { unit: '0029', ...PARSED });
  for (const args of [
    ['0029', '--definition', 'other.json', '--skip-permissions'],
    ['--definition=other.json', '0029', '--skip-permissions'],
    ['--skip-permissions', '--definition', 'other.json', '0029'],
  ]) {
    assert.deepEqual(
      parseOrchestrateArgs(args),
      { unit: '0029', ...PARSED, definition: 'other.json', skipPermissions: true },
      args.join(' '),
    );
  }
  assert.equal(parseOrchestrateArgs(['0029', '--definition=-odd.json']).definition, '-odd.json');
  for (const [args, expected] of [
    [['--follow', '0029'], { unit: '0029', ...PARSED, follow: true }],
    [['0029', '--follow', '--skip-permissions'], { unit: '0029', ...PARSED, skipPermissions: true, follow: true }],
    [
      ['0029', '--definition', 'other.json', '--follow'],
      { unit: '0029', ...PARSED, definition: 'other.json', follow: true },
    ],
  ]) {
    assert.deepEqual(parseOrchestrateArgs(args), expected, args.join(' '));
  }
});

// Unit 0089, R3, R9, R12
test('parseOrchestrateArgs takes --resume and --prompt <text>, at any place, and --definition with them', () => {
  for (const args of [
    ['0029', '--resume', '--prompt', 'Take the second reading.'],
    ['--prompt=Take the second reading.', '--resume', '0029'],
    ['--resume', '--prompt', 'Take the second reading.', '0029'],
  ]) {
    assert.deepEqual(
      parseOrchestrateArgs(args),
      { unit: '0029', ...PARSED, resume: true, prompt: 'Take the second reading.' },
      args.join(' '),
    );
  }
  assert.deepEqual(parseOrchestrateArgs(['0029', '--resume']), { unit: '0029', ...PARSED, resume: true });
  assert.equal(parseOrchestrateArgs(['0029', '--resume', '--prompt=-a\nb']).prompt, '-a\nb');
  assert.deepEqual(parseOrchestrateArgs(['0029', '--resume', '--definition', 'other.json', '--follow']), {
    unit: '0029',
    ...PARSED,
    definition: 'other.json',
    follow: true,
    resume: true,
  });
});

test('orchestrateUsage says what --resume and --prompt do', () => {
  const lines = orchestrateUsage().split('\n');
  assert.equal(lines[0], USAGE_FORM);
  for (const line of [
    '  --resume             resume the latest run of the unit on the branch checked out, which stopped for the',
    '  --prompt <text>      with --resume, the words of the human to the step that the resume reruns',
  ]) {
    assert.ok(lines.includes(line), orchestrateUsage());
  }
});

test('orchestrateUsage says what --follow does', () => {
  assert.ok(
    orchestrateUsage()
      .split('\n')
      .includes("  --follow             print each step's messages and tool calls while it runs"),
    orchestrateUsage(),
  );
});

test('parseOrchestrateArgs gives the usage alone for no argument', () => {
  assert.throws(
    () => parseOrchestrateArgs([]),
    (error) => {
      assert.ok(error.message.startsWith(`${USAGE_FORM}\n\n`), error.message);
      return true;
    },
  );
});

test('parseOrchestrateArgs names what it does not take, and gives the usage after it', () => {
  for (const [args, line] of [
    [['0029', '--model', 'x'], 'unknown option: --model'],
    [['0029', '--definition'], '--definition takes a file, and none was given'],
    [['0029', '--definition='], '--definition takes a file, and none was given'],
    [['0029', '--definition', '--skip-permissions'], '--definition takes a file, and none was given'],
    [['0029', '--skip-permissions=yes'], '--skip-permissions takes no value'],
    [['--skip-permissions'], 'no unit given'],
    [['0029', '--follow=yes'], '--follow takes no value'],
    [['0029', '--resume=yes'], '--resume takes no value'],
    [['0029', '--resume', '--prompt'], '--prompt takes a text, and none was given'],
    [['0029', '--resume', '--prompt='], '--prompt takes a text, and none was given'],
    [['0029', '--prompt', '--resume'], '--prompt takes a text, and none was given'],
    [['0029', '--prompt', 'Go on.'], '--prompt is taken only with --resume'],
    [['0029', '--prompt=Go on.', '--follow'], '--prompt is taken only with --resume'],
    [['--follow'], 'no unit given'],
    [['0029', '0030'], 'unexpected argument: 0030'],
    [['0029', '--'], 'unexpected argument: --'],
    [['0029', '--', '--model'], 'unexpected argument: --'],
  ]) {
    assert.throws(
      () => parseOrchestrateArgs(args),
      (error) => {
        assert.ok(error.message.startsWith(`${line}\n${USAGE_FORM}\n\n`), `${args.join(' ')}: ${error.message}`);
        return true;
      },
    );
  }
});

// R10 to R24, R30: `agentrite orchestrate` as a command, in a project with the kit installed, the wrappers refresh
// writes, an approved unit, and a PATH that holds nothing but one fake that stands for both harnesses.

// Counts its calls in $FAKE_DIR, writes its name and arguments to call-<n>, prints out-<n>, then the lines of err-<n>
// on standard error, and exits with the status in status-<n>, or 0. With wait-<n>, it writes its process id to
// pid-<n> and becomes a sleep of that many seconds, ignoring SIGTERM with ignore-term-<n>. With linger-<n>, it leaves
// a sleep of that many seconds in the background, holding its standard output, and exits. With seen-<n>, it writes to
// seen-<n>.out, before it prints, a line for each followed file of the runs, its name and empty or holding. Nothing but
// the builtins of sh and the sleep linked into the PATH, since it holds no other command. The sleep is exec'd, so that
// the harness stays one process whose id the test knows: a job started in the background would ignore SIGINT, where
// the harness would not.
const FAKE_HARNESS = `#!/bin/sh
count=0
if [ -f "$FAKE_DIR/count" ]; then read -r count < "$FAKE_DIR/count"; fi
count=$((count + 1))
printf '%s\\n' "$count" > "$FAKE_DIR/count"
printf '%s\\n' "\${0##*/}" "$@" > "$FAKE_DIR/call-$count"
if [ -f "$FAKE_DIR/seen-$count" ]; then
  for file in .orchestrator/*/*/*.followed.jsonl; do
    if [ -f "$file" ]; then
      state=empty
      if [ -s "$file" ]; then state=holding; fi
      printf '%s %s\\n' "\${file##*/}" "$state"
    fi
  done > "$FAKE_DIR/seen-$count.out"
fi
if [ -f "$FAKE_DIR/out-$count" ]; then
  while IFS= read -r line || [ -n "$line" ]; do printf '%s\\n' "$line"; done < "$FAKE_DIR/out-$count"
fi
if [ -f "$FAKE_DIR/err-$count" ]; then
  while IFS= read -r line || [ -n "$line" ]; do printf '%s\\n' "$line" >&2; done < "$FAKE_DIR/err-$count"
fi
if [ -f "$FAKE_DIR/linger-$count" ]; then
  read -r seconds < "$FAKE_DIR/linger-$count"
  sleep "$seconds" &
fi
if [ -f "$FAKE_DIR/wait-$count" ]; then
  read -r seconds < "$FAKE_DIR/wait-$count"
  if [ -f "$FAKE_DIR/ignore-term-$count" ]; then trap '' TERM; fi
  printf '%s\\n' "$$" > "$FAKE_DIR/pid-$count"
  exec sleep "$seconds"
fi
status=0
if [ -f "$FAKE_DIR/status-$count" ]; then read -r status < "$FAKE_DIR/status-$count"; fi
exit "$status"
`;

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const SLEEP = spawnSync('sh', ['-c', 'command -v sleep'], { encoding: 'utf-8' }).stdout.trim();
const GIT = spawnSync('sh', ['-c', 'command -v git'], { encoding: 'utf-8' }).stdout.trim();
const SETTINGS = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const UNIT = '0029-try-the-orchestrator';
const APPROVED = '---\nkind: feature\nstatus: approved\ntimestamp: 2026-10-21T10:00:00Z\n---\n\n# 0029\n';

function project(testContext) {
  const base = temporaryDirectory(testContext, 'agentrite-orchestrate-');
  installKit(base);
  const fakes = join(base, 'fakes');
  mkdirSync(fakes);
  const write = (path, content) => {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  };
  const read = (path) => readFileSync(join(base, path), 'utf-8');
  for (const harness of ['claude', 'opencode']) {
    write(`bin/${harness}`, FAKE_HARNESS);
    chmodSync(join(base, 'bin', harness), 0o755);
  }
  symlinkSync(SLEEP, join(base, 'bin', 'sleep'));
  symlinkSync(GIT, join(base, 'bin', 'git'));
  const options = { cwd: base, env: { PATH: join(base, 'bin'), FAKE_DIR: fakes } };
  const agentrite = (...args) => spawnSync(process.execPath, [script, ...args], { ...options, encoding: 'utf-8' });
  // The command run as if it was `time` milliseconds after the epoch, so that runs start at an instant of the test's
  // choosing.
  const agentriteAt = (time, ...args) => {
    const clock = encodeURIComponent(`Date.now = () => ${time};`);
    const env = { ...options.env, NODE_OPTIONS: `--import=data:text/javascript,${clock}` };
    return spawnSync(process.execPath, [script, ...args], { ...options, env, encoding: 'utf-8' });
  };
  // The command started and not waited on, with a promise of how it ended and what it printed, one of how it exited,
  // which does not wait for whatever process it left holding its output, and what it printed on standard output so
  // far.
  const started = (...args) => {
    const child = spawn(process.execPath, [script, ...args], { ...options, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => (stdout += chunk));
    child.stderr.on('data', (chunk) => (stderr += chunk));
    const ended = new Promise((settle) =>
      child.on('close', (status, signal) => settle({ status, signal, stdout, stderr })),
    );
    const exited = new Promise((settle) => child.on('exit', (status, signal) => settle({ status, signal, stderr })));
    return { child, ended, exited, output: () => stdout };
  };
  write('agentrite.json', SETTINGS);
  assert.equal(agentrite('refresh').status, 0);
  write(`changes/${UNIT}/record.md`, APPROVED);
  // What the fake prints, and the status it exits with, at its call `number`, counted from 1.
  const answer = (number, printed, status) => {
    writeFileSync(join(fakes, `out-${number}`), printed);
    if (status !== undefined) writeFileSync(join(fakes, `status-${number}`), `${status}\n`);
  };
  // What the fake prints on standard error at its call `number`, after what it prints on standard output.
  const complains = (number, printed) => writeFileSync(join(fakes, `err-${number}`), printed);
  // That the fake waits `seconds` at its call `number`, after it printed, and ignores SIGTERM with `ignoreTerm`.
  const waits = (number, seconds, ignoreTerm = false) => {
    writeFileSync(join(fakes, `wait-${number}`), `${seconds}\n`);
    if (ignoreTerm) writeFileSync(join(fakes, `ignore-term-${number}`), '');
  };
  // That the fake leaves a sleep of `seconds` holding its output at its call `number`, and exits.
  const lingers = (number, seconds) => writeFileSync(join(fakes, `linger-${number}`), `${seconds}\n`);
  // That the fake at its call `number` records which followed files exist and whether they hold anything.
  const sees = (number) => writeFileSync(join(fakes, `seen-${number}`), '');
  // The process id of the fake at its call `number`, once it wrote it.
  const pidOf = async (number) => {
    const path = join(fakes, `pid-${number}`);
    for (let tries = 0; tries < 500 && !existsSync(path); tries += 1) await delay(20);
    return Number(readFileSync(path, 'utf-8'));
  };
  const calls = () =>
    readdirSync(fakes)
      .filter((name) => name.startsWith('call-'))
      .sort((first, second) => Number(first.slice(5)) - Number(second.slice(5)))
      .map((name) => callOf(readFileSync(join(fakes, name), 'utf-8')));
  return { base, write, read, agentrite, agentriteAt, started, answer, complains, waits, lingers, sees, pidOf, calls };
}

// Checks out `branch` in the project at `base`, making it a git repository when it is none yet. The branch has no
// commit, which is all the command reads of it.
function onBranch(base, branch) {
  const git = (...args) => {
    const result = spawnSync('git', args, { cwd: base, encoding: 'utf-8' });
    assert.equal(result.status, 0, result.stderr);
  };
  if (!existsSync(join(base, '.git'))) git('init', '--quiet');
  git('symbolic-ref', 'HEAD', `refs/heads/${branch}`);
}

// A call of the fake: its name, the arguments before the prompt, and the prompt, which is the last argument and may
// hold line breaks.
function callOf(text) {
  const lines = text.slice(0, -1).split('\n');
  const end = lines.indexOf('--');
  return { harness: lines[0], options: lines.slice(1, end), prompt: lines.slice(end + 1).join('\n') };
}

// What Claude Code prints headless with `stream-json` for a final response, an event a line, with the session's id
// when one is given.
function claudePrinted(response, session) {
  const id = session === undefined ? {} : { session_id: session };
  return [
    { type: 'system', subtype: 'init', ...id },
    { type: 'assistant', message: { content: [{ type: 'text', text: response }] }, parent_tool_use_id: null, ...id },
    { type: 'result', subtype: 'success', is_error: false, result: response, ...id },
  ]
    .map((event) => `${JSON.stringify(event)}\n`)
    .join('');
}

// What OpenCode prints headless for a final response: its text event and the step_finish of its message.
function opencodePrinted(response) {
  const part = { messageID: 'msg_1', sessionID: 'ses_test' };
  return [
    { type: 'step_start', sessionID: 'ses_test', part: { ...part, id: 'prt_0', type: 'step-start' } },
    { type: 'text', sessionID: 'ses_test', part: { ...part, id: 'prt_1', type: 'text', text: response } },
    { type: 'step_finish', sessionID: 'ses_test', part: { ...part, id: 'prt_2', type: 'step-finish', reason: 'stop' } },
  ]
    .map((event) => `${JSON.stringify(event)}\n`)
    .join('');
}

const PRINTED = { claude: claudePrinted, opencode: opencodePrinted };
// The harness of each call of the default definition, from 1: the planner, then the implementer and the reviewer in
// turn.
const DEFAULT_HARNESSES = ['claude', 'claude', 'opencode', 'claude', 'opencode', 'claude', 'opencode'];

// Answers the calls of the default definition, from 1, with the outcomes given, each as its harness prints it.
function answerDefault(answer, outcomes) {
  outcomes.forEach((outcome, index) => {
    const harness = DEFAULT_HARNESSES[index];
    answer(index + 1, PRINTED[harness](responseOf({ ...DONE, ...outcome })));
  });
}

function runDirectoryOf(base) {
  const unitDirectory = join(base, '.orchestrator', UNIT);
  const runs = readdirSync(unitDirectory);
  assert.equal(runs.length, 1, runs.join(', '));
  assert.match(runs[0], /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
  return { name: `.orchestrator/${UNIT}/${runs[0]}`, path: join(unitDirectory, runs[0]) };
}

// The lines of requirement 14, before and after each step, as the command printed them.
function stepLines(stdout) {
  return stdout.split('\n').filter((line) => line.startsWith('step '));
}

const REQUEST_LINE = "AgentRite's orchestrator runs this step";
const IMPLEMENTER_PROMPT =
  "From round 2, this definition accepts review findings you agree with. Propose declining others.";

test('a run whose every item ends runs the default definition and exits 0', (testContext) => {
  const { base, agentrite, answer, calls, read } = project(testContext);
  answerDefault(answer, [{ summary: 'Planned.' }, { summary: 'Built.' }, { summary: 'Reviewed.' }]);

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 0, result.stderr);
  const lines = stepLines(result.stdout);
  assert.equal(lines.length, 6);
  assert.equal(lines[0], 'step 0, planner, claude, claude-opus-5-5: started');
  assert.match(lines[1], /^step 0, planner, claude, claude-opus-5-5: done after 0m 0\ds$/);
  assert.equal(lines[2], 'step 1, round 1 of 3, implementer, claude, claude-sonnet-5-5: started');
  assert.equal(lines[4], 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: started');
  assert.match(lines[5], /^step 2, round 1 of 3, reviewer, opencode, openai\/gpt-6\.1-sol: done after /);

  const run = runDirectoryOf(base);
  assert.ok(
    result.stdout.endsWith(
      '\nThe run ran every item of the definition to its end.\nSummary: Reviewed.\n\n' +
        `The run's directory: ${run.name}/\nThe reviewer's findings are under .reviews/${UNIT}/.\n`,
    ),
    result.stdout,
  );

  const [planner, implementer, reviewer] = calls();
  assert.equal(calls().length, 3);
  assert.equal(planner.harness, 'claude');
  assert.deepEqual(planner.options.slice(0, 8), [
    '--print',
    '--agent',
    'planner',
    '--model',
    'claude-opus-5-5',
    '--output-format',
    'stream-json',
    '--verbose',
  ]);
  assert.equal(planner.options[8], '--session-id');
  assert.match(planner.options[9], UUID);
  assert.ok(planner.prompt.startsWith(`The unit is changes/${UNIT}/.\n\n${REQUEST_LINE}, and reads`), planner.prompt);
  assert.ok(implementer.prompt.startsWith(`The unit is changes/${UNIT}/.\n\n${IMPLEMENTER_PROMPT}\n\n`));
  assert.ok(implementer.prompt.includes(`${REQUEST_LINE}, in round 1 of a repeat of at most 3 rounds, and reads`));
  assert.equal(reviewer.harness, 'opencode');
  assert.deepEqual(reviewer.options, [
    'run',
    '--agent',
    'reviewer',
    '--model',
    'openai/gpt-6.1-sol',
    '--format',
    'json',
  ]);
  assert.ok(reviewer.prompt.includes(`${REQUEST_LINE}, in round 1 of a repeat of at most 3 rounds, and reads`));

  assert.deepEqual(readdirSync(run.path).sort(), [
    '00-planner.followed.jsonl',
    '00-planner.outcome.json',
    '01-implementer.followed.jsonl',
    '01-implementer.outcome.json',
    '02-reviewer.followed.jsonl',
    '02-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
  assert.equal(read(`${run.name}/definition.json`), read('node_modules/agentrite/orchestrator.json'));
  assert.deepEqual(JSON.parse(read(`${run.name}/00-planner.outcome.json`)), { ...DONE, summary: 'Planned.' });
  const state = JSON.parse(read(`${run.name}/state.json`));
  assert.equal(state.unit, UNIT);
  assert.equal(state.definition, 'node_modules/agentrite/orchestrator.json');
  assert.equal(state.branch, null);
  assert.deepEqual(state.at, { number: 2, item: 1, round: { at: 1, of: 3 }, index: 1, asked: false });
  assert.deepEqual(state.sessions, [
    { role: 'planner', harness: 'claude', session: planner.options[9] },
    { role: 'implementer', harness: 'claude', session: implementer.options[9] },
    { role: 'reviewer', harness: 'opencode', session: 'ses_test' },
  ]);
  assert.deepEqual(state.ended, { status: 0, line: 'The run ran every item of the definition to its end.' });
});

// R7, R10, R11, R14, R17 of unit 0076

test('a run whose steps leave items for after the run exits 0, and gives them grouped by step', (testContext) => {
  const { base, agentrite, answer, calls, read } = project(testContext);
  const built = ['Check the new action in a running IDE', 'Check it on Windows'];
  answerDefault(answer, [{}, { afterwards: built }, { afterwards: ['Check the dialog on macOS'] }]);

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls().length, 3);
  const run = runDirectoryOf(base);
  assert.ok(
    result.stdout.endsWith(
      '\nThe run ran every item of the definition to its end.\nSummary: Did it.\nAfter the run:\n' +
        '  step 1, round 1 of 3, implementer:\n    - Check the new action in a running IDE\n' +
        '    - Check it on Windows\n  step 2, round 1 of 3, reviewer:\n    - Check the dialog on macOS\n\n' +
        `The run's directory: ${run.name}/\nThe reviewer's findings are under .reviews/${UNIT}/.\n`,
    ),
    result.stdout,
  );
  assert.deepEqual(JSON.parse(read(`${run.name}/01-implementer.outcome.json`)).afterwards, built);
  assert.deepEqual(JSON.parse(read(`${run.name}/02-reviewer.outcome.json`)).afterwards, ['Check the dialog on macOS']);
  assert.deepEqual(readdirSync(run.path).sort(), [
    '00-planner.followed.jsonl',
    '00-planner.outcome.json',
    '01-implementer.followed.jsonl',
    '01-implementer.outcome.json',
    '02-reviewer.followed.jsonl',
    '02-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
});

test('a run whose repeat ends at its first round goes on with the item after the repeat', (testContext) => {
  const { base, write, agentrite, answer, calls } = project(testContext);
  write(
    'definitions/after.json',
    JSON.stringify({
      steps: [
        {
          repeat: {
            times: 3,
            until: 'no-blocking-findings',
            steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }],
          },
        },
        { role: 'planner', harness: 'claude', model: 'claude-opus-5-5' },
      ],
    }),
  );
  answer(1, opencodePrinted(responseOf({ ...DONE, findings: [MINOR] })));
  answer(2, claudePrinted(responseOf(DONE)));

  const result = agentrite('orchestrate', '0029', '--definition', 'definitions/after.json');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    calls().map((call) => [call.harness, call.options[2]]),
    [
      ['opencode', 'reviewer'],
      ['claude', 'planner'],
    ],
  );
  assert.equal(stepLines(result.stdout)[2], 'step 1, planner, claude, claude-opus-5-5: started');
  assert.ok(readdirSync(runDirectoryOf(base).path).includes('01-planner.outcome.json'));
});

// Unit 0087, R11
test('a run whose repeat with until no-findings ends on non-blocking findings exits 0, listing them', (testContext) => {
  const { write, agentrite, answer, calls } = project(testContext);
  write(
    'definitions/until.json',
    JSON.stringify({
      steps: [
        {
          repeat: { times: 2, until: 'no-findings', steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }] },
        },
      ],
    }),
  );
  for (const number of [1, 2]) answer(number, opencodePrinted(responseOf({ ...DONE, findings: [MINOR] })));

  const result = agentrite('orchestrate', '0029', '--definition', 'definitions/until.json');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls().length, 2);
  assert.ok(
    result.stdout.includes('\nNon-blocking findings still open after step 1:\n  C1: A name could be clearer\n'),
    result.stdout,
  );
});

test(
  'a run whose repeat runs out exits 3, with the open findings and the rounds, the sessions continued',
  (testContext) => {
    const { agentrite, answer, calls } = project(testContext);
    const blocking = { findings: [BLOCKING, MINOR] };
    answerDefault(answer, [{}, {}, blocking, {}, blocking, {}, { ...blocking, summary: 'Still blocked.' }]);

    const result = agentrite('orchestrate', '0029');

    assert.equal(result.status, 3, result.stderr);
    assert.equal(stepLines(result.stdout).length, 14);
    assert.ok(
      result.stdout.includes(
        '\nStep 6 stopped the run: the repeat ran its 3 rounds, and its until did not hold after the last.\n' +
          'Summary: Still blocked.\nBlocking findings still open:\n  S1: R1 is not met\n\n',
      ),
      result.stdout,
    );
    const made = calls();
    assert.equal(made.length, 7);
    const session = made[1].options.at(-1);
    assert.equal(made[1].options.at(-2), '--session-id');
    for (const later of [made[3], made[5]]) assert.deepEqual(later.options.slice(-2), ['--resume', session]);
    assert.deepEqual(made[2].options.slice(-2), ['--format', 'json']);
    for (const later of [made[4], made[6]]) assert.deepEqual(later.options.slice(-2), ['--session', 'ses_test']);
    assert.ok(made[3].prompt.includes('in round 2 of a repeat of at most 3 rounds'));
    assert.ok(made[6].prompt.includes('in round 3 of a repeat of at most 3 rounds'));
  },
);

test('a Claude Code session that prints another id is resumed by the id it printed', (testContext) => {
  const { agentrite, answer, calls } = project(testContext);
  const blocking = responseOf({ ...DONE, findings: [BLOCKING] });
  answer(1, claudePrinted(responseOf(DONE)));
  answer(2, claudePrinted(responseOf(DONE), 'printed-by-the-second'));
  answer(3, opencodePrinted(blocking));
  answer(4, claudePrinted(responseOf(DONE), 'printed-by-the-fourth'));
  answer(5, opencodePrinted(blocking));
  answer(6, claudePrinted(responseOf(DONE)));
  answer(7, opencodePrinted(responseOf(DONE)));

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 0, result.stderr);
  const made = calls();
  assert.deepEqual(made[3].options.slice(-2), ['--resume', 'printed-by-the-second']);
  assert.deepEqual(made[5].options.slice(-2), ['--resume', 'printed-by-the-fourth']);
});

test('a repeat without until runs all its rounds, and the run then ends', (testContext) => {
  const { write, agentrite, answer, calls } = project(testContext);
  write(
    'other.json',
    JSON.stringify({
      steps: [{ repeat: { times: 2, steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }] } }],
    }),
  );
  answer(1, opencodePrinted(responseOf({ ...DONE, findings: [BLOCKING] })));
  answer(2, opencodePrinted(responseOf({ ...DONE, findings: [BLOCKING] })));

  const result = agentrite('orchestrate', '0029', '--definition=other.json');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls().length, 2);
  assert.ok(result.stdout.includes('\nThe run ran every item of the definition to its end.\n'));
});

test('stopWhen stops a run outside a repeat, and inside it on the review, exiting 3', (testContext) => {
  for (const definition of [
    {
      steps: [
        { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' },
        { role: 'planner', harness: 'claude', model: 'm' },
      ],
    },
    {
      steps: [
        {
          repeat: {
            times: 3,
            until: 'no-blocking-findings',
            steps: [{ role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' }],
          },
        },
      ],
    },
  ]) {
    const { write, agentrite, answer, calls } = project(testContext);
    write('stop.json', JSON.stringify(definition));
    answer(1, opencodePrinted(responseOf({ ...DONE, findings: [BLOCKING] })));

    const result = agentrite('orchestrate', '0029', '--definition', 'stop.json');

    assert.equal(result.status, 3, result.stderr);
    assert.equal(calls().length, 1);
    assert.ok(
      result.stdout.includes(
        'Step 0 stopped the run: it holds stopWhen "blocking-findings", and a finding of its outcome blocks.\n' +
          'Summary: Did it.\nBlocking findings still open:\n  S1: R1 is not met\n',
      ),
      result.stdout,
    );
  }
});

// Unit 0088, R1 to R5, R7: a step whose final response holds no block marked json is asked again for its outcome.

const ASK_AGAIN_LINE = 'Your last response held no block marked json';
const NO_BLOCK = 'I did the work, and give no block.';

test('a step without a block is asked again in its session, and the run goes on by the answer', (testContext) => {
  const { base, agentrite, answer, calls, read } = project(testContext);
  answer(1, claudePrinted(responseOf({ ...DONE, summary: 'Planned.' })));
  answer(2, claudePrinted(NO_BLOCK, 'implementer-session'));
  answer(3, claudePrinted(responseOf({ ...DONE, summary: 'Built.' })));
  answer(4, opencodePrinted(responseOf({ ...DONE, summary: 'Reviewed.' })));

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 0, result.stderr);
  const made = calls();
  assert.equal(made.length, 4);
  const asked = made[2];
  assert.equal(asked.harness, 'claude');
  assert.deepEqual(asked.options.slice(-2), ['--resume', 'implementer-session']);
  assert.equal(asked.prompt, `The unit is changes/${UNIT}/.\n\n${askAgainRequest({ at: 1, of: 3 })}`);
  assert.ok(asked.prompt.includes(`\n\n${ASK_AGAIN_LINE}`));
  assert.ok(!asked.prompt.includes(IMPLEMENTER_PROMPT));
  assert.equal(made[3].harness, 'opencode');

  const lines = stepLines(result.stdout);
  assert.equal(lines.length, 8);
  assert.match(lines[3], /^step 1, round 1 of 3, implementer, claude, claude-sonnet-5-5: no outcome after /);
  const head = 'step 2, round 1 of 3, implementer, claude, claude-sonnet-5-5, asked again for its outcome';
  assert.equal(lines[4], `${head}: started`);
  assert.match(lines[5], new RegExp(`^${head}: done after 0m 0\\ds$`));
  assert.equal(lines[6], 'step 3, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: started');
  const rows = result.stdout.split('\n').filter((line) => /^\d  /.test(line));
  assert.equal(rows.length, 4);
  assert.match(rows[2], /^2  implementer  claude {4}claude-sonnet-5-5 {3}0m 0\ds {2}asked again$/);
  for (const row of [rows[0], rows[1], rows[3]]) assert.ok(!row.endsWith(' ') && !row.includes('asked'), row);

  const run = runDirectoryOf(base);
  assert.deepEqual(readdirSync(run.path).sort(), [
    '00-planner.followed.jsonl',
    '00-planner.outcome.json',
    '01-implementer.followed.jsonl',
    '01-implementer.response.md',
    '02-implementer.followed.jsonl',
    '02-implementer.outcome.json',
    '03-reviewer.followed.jsonl',
    '03-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
  assert.equal(read(`${run.name}/01-implementer.response.md`), NO_BLOCK);
  assert.deepEqual(JSON.parse(read(`${run.name}/02-implementer.outcome.json`)), { ...DONE, summary: 'Built.' });
  assert.deepEqual(JSON.parse(read(`${run.name}/state.json`)).at, {
    number: 3,
    item: 1,
    round: { at: 1, of: 3 },
    index: 1,
    asked: false,
  });
});

test('an ask again without a block stops the run, and both responses are kept', (testContext) => {
  const { base, agentrite, answer, calls, read } = project(testContext);
  answer(1, claudePrinted(responseOf(DONE)));
  answer(2, claudePrinted(NO_BLOCK, 'implementer-session'));
  answer(3, claudePrinted('I still give no block.'));

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 3, result.stderr);
  assert.equal(calls().length, 3);
  const run = runDirectoryOf(base);
  const report = result.stdout.split('\n');
  const at = report.indexOf('Step 2 stopped the run: its final response holds no block marked json.');
  assert.notEqual(at, -1, result.stdout);
  assert.equal(report[at + 1], `The final response of step 2 is at ${run.name}/02-implementer.response.md.`);
  assert.equal(read(`${run.name}/01-implementer.response.md`), NO_BLOCK);
  assert.equal(read(`${run.name}/02-implementer.response.md`), 'I still give no block.');
});

test('a step of OpenCode without a block is asked again in its session', (testContext) => {
  const { agentrite, answer, calls } = project(testContext);
  answer(1, claudePrinted(responseOf(DONE)));
  answer(2, claudePrinted(responseOf(DONE)));
  answer(3, opencodePrinted('No block.'));
  answer(4, opencodePrinted(responseOf(DONE)));

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 0, result.stderr);
  const made = calls();
  assert.equal(made.length, 4);
  assert.equal(made[3].harness, 'opencode');
  assert.deepEqual(made[3].options.slice(-2), ['--session', 'ses_test']);
  assert.equal(made[3].prompt, `The unit is changes/${UNIT}/.\n\n${askAgainRequest({ at: 1, of: 3 })}`);
});

test('each stop of a step exits 3, starts nothing after the step and says what the human needs', (testContext) => {
  for (const [printed, status, lines, file] of [
    [
      claudePrinted(responseOf({ ...DONE, outcome: 'needs-human', questions: ['Which branch?'] })),
      undefined,
      ['Step 1 stopped the run: its outcome is needs-human.', 'Summary: Did it.', 'Questions:', '  - Which branch?'],
      'outcome.json',
    ],
    [
      claudePrinted(responseOf({ ...DONE, questions: ['Which branch?'] })),
      undefined,
      [
        'Step 1 stopped the run: its outcome is done, but holds questions, which the human answers.',
        'Summary: Did it.',
        'Questions:',
        '  - Which branch?',
      ],
      'outcome.json',
    ],
    [
      claudePrinted(responseOf({ ...DONE, declines: [{ finding: 'S1', reason: 'It holds.' }] })),
      undefined,
      [
        'Step 1 stopped the run: it proposes declines of findings, which the human decides.',
        'Summary: Did it.',
        'Proposed declines:',
        '  S1: It holds.',
      ],
      'outcome.json',
    ],
    [
      claudePrinted(`${responseOf(DONE)}\n${responseOf(DONE)}`),
      undefined,
      ['Step 1 stopped the run: its final response holds 2 blocks marked json, not one.'],
      'response.md',
    ],
    [
      claudePrinted(`${FENCE}json\n{"outcome": "done", "summary": "Hidden."}\n${FENCE}\n`),
      undefined,
      [
        'Step 1 stopped the run: its outcome is not of the form asked for. questions is missing. ' +
          'It must hold a list of strings.',
        'The final response of step 1 is at',
      ],
      'response.md',
    ],
    ['', 1, ['Step 1 stopped the run: its harness exited with 1.', 'The harness gave step 1 no final response.'], null],
  ]) {
    const { base, agentrite, answer, calls, read } = project(testContext);
    answer(1, claudePrinted(responseOf(DONE)));
    answer(2, printed, status);

    const result = agentrite('orchestrate', '0029');

    assert.equal(result.status, 3, `${lines[0]}: ${result.stderr}`);
    assert.equal(calls().length, 2, lines[0]);
    assert.equal(stepLines(result.stdout).length, 4, lines[0]);
    const report = result.stdout.split('\n');
    const at = report.indexOf(lines[0]);
    assert.notEqual(at, -1, result.stdout);
    for (const [offset, line] of lines.entries()) assert.ok(report[at + offset].startsWith(line), report[at + offset]);
    assert.ok(!result.stdout.includes('Hidden.'));
    const run = runDirectoryOf(base);
    const names = readdirSync(run.path).filter((name) => !name.endsWith('.followed.jsonl'));
    if (file === null) {
      assert.ok(!names.some((name) => name.startsWith('01-')), names.join(', '));
    } else {
      assert.ok(names.includes(`01-implementer.${file}`), names.join(', '));
    }
    if (file === 'response.md') {
      const path = `${run.name}/01-implementer.response.md`;
      assert.ok(result.stdout.includes(`The final response of step 1 is at ${path}.`));
      assert.ok(read(path).length > 0);
    }
    assert.equal(JSON.parse(read(`${run.name}/state.json`)).ended.status, 3);
  }
});

test('--skip-permissions gives every call the flag of its harness', (testContext) => {
  const { agentrite, answer, calls } = project(testContext);
  answerDefault(answer, [{}, {}, {}]);

  const result = agentrite('orchestrate', '--skip-permissions', '0029');

  assert.equal(result.status, 0, result.stderr);
  const [planner, implementer, reviewer] = calls();
  assert.ok(planner.options.includes('--dangerously-skip-permissions'));
  assert.ok(implementer.options.includes('--dangerously-skip-permissions'));
  assert.ok(reviewer.options.includes('--auto'));
});

test(
  'a definition given with --definition, relative or absolute, is run and copied into the run directory',
  (testContext) => {
    for (const absolute of [false, true]) {
      const { base, write, read, agentrite, answer, calls } = project(testContext);
      const definition = { steps: [{ role: 'reviewer', harness: 'opencode', model: 'theirs' }] };
      const text = `${JSON.stringify(definition, null, 2)}\n`;
      write('trial/one.json', text);
      answer(1, opencodePrinted(responseOf(DONE)));
      const given = absolute ? join(base, 'trial/one.json') : 'trial/one.json';

      const result = agentrite('orchestrate', '0029', '--definition', given);

      assert.equal(result.status, 0, result.stderr);
      assert.equal(calls().length, 1);
      assert.equal(calls()[0].options[4], 'theirs');
      const run = runDirectoryOf(base);
      assert.equal(read(`${run.name}/definition.json`), text);
      assert.equal(JSON.parse(read(`${run.name}/state.json`)).definition, given);
      assert.match(read('agentrite.json'), /"orchestrator": "node_modules\/agentrite\/orchestrator\.json"/);
    }
  },
);

// R11

function refused(testContext, prepare, args, message) {
  const { base, agentrite, calls, write } = project(testContext);
  prepare({ base, write });

  const result = agentrite('orchestrate', ...args);

  assert.equal(result.status, 1, `${message}: ${result.stdout}`);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `agentrite: ${message}\n`);
  assert.equal(calls().length, 0);
  assert.ok(!existsSync(join(base, '.orchestrator')), message);
}

const OPTED_OUT =
  'the project opted out of the orchestrator: orchestrator in agentrite.json is false. ' +
  'To use it, set orchestrator to the path of a definition, as node_modules/agentrite/orchestrator.json';

test('the refusals of requirement 11 exit 1, start nothing and make no .orchestrator', (testContext) => {
  const settings = JSON.parse(SETTINGS);
  const optOut = ({ write }) => write('agentrite.json', JSON.stringify({ ...settings, orchestrator: false }));
  const status = (record) => ({ write }) => write(`changes/${UNIT}/record.md`, record);
  for (const [prepare, args, message] of [
    [
      ({ base }) => rmSync(join(base, 'agentrite.json')),
      ['0029'],
      'the project has no agentrite.json. Run: npx agentrite config, which writes one',
    ],
    [
      ({ write }) => write('agentrite.json', JSON.stringify({ ...settings, orchestrator: true })),
      ['0029'],
      'agentrite.json: orchestrator is true. It must hold false, for a project that does not use the orchestrator, ' +
        'or the path of a file, relative to the project root, that does not lead outside the project',
    ],
    [optOut, ['0029'], OPTED_OUT],
    [optOut, ['0029', '--definition', 'node_modules/agentrite/orchestrator.json'], OPTED_OUT],
    [() => {}, ['0029', '--definition', 'missing.json'], '--definition names missing.json, and there is no file at it'],
    [
      ({ write }) => write('dir.json/x', ''),
      ['0029', '--definition=dir.json'],
      '--definition names dir.json, and there is no file at it',
    ],
    [
      ({ write }) => {
        const step = { role: 'reviewer', harness: 'opencode', model: '' };
        write('bad.json', JSON.stringify({ steps: [{ repeat: { times: 2, steps: [step] } }] }));
      },
      ['0029', '--definition', 'bad.json'],
      'bad.json: steps[0].repeat.steps[0].model is "". It must hold the harness\'s own id of a model, as a string ' +
        'that is not empty',
    ],
    [() => {}, ['0042'], 'changes/ holds no directory for the unit 0042'],
    [
      ({ write }) => write('changes/0029-another/record.md', APPROVED),
      ['0029'],
      'the digits 0029 open more than one directory of changes/, so give the unit by its name:\n' +
        `- changes/0029-another\n- changes/${UNIT}`,
    ],
    ...['draft', 'in-progress', 'implemented', 'cancelled'].map((name) => [
      status(APPROVED.replace('approved', name)),
      ['0029'],
      `the unit changes/${UNIT}/ is ${name}, and a run starts the work of an approved unit`,
    ]),
    [status('# 0029\n'), ['0029'], `changes/${UNIT}/record.md is missing a status field`],
    [
      ({ base }) => rmSync(join(base, 'changes', UNIT, 'record.md')),
      ['0029'],
      `changes/${UNIT}/record.md is missing a status field`,
    ],
  ]) {
    refused(testContext, prepare, args, message);
  }
});

// R25: the branch and the variant of a run

test('agentrite runs lists a run the orchestrator wrote, with its end, step and followed file', (testContext) => {
  const { base, write, agentrite, answer } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  answer(1, claudePrinted(responseOf({ ...DONE, summary: 'Built.' })));
  assert.equal(agentrite('orchestrate', '0029', '--definition', 'one.json').status, 0);

  const result = agentrite('runs', '--json');

  assert.equal(result.status, 0, result.stderr);
  const { runs, total } = JSON.parse(result.stdout);
  const run = runDirectoryOf(base);
  assert.equal(total, 1);
  assert.equal(runs[0].state, 'ended');
  assert.equal(runs[0].branch, null);
  assert.equal(runs[0].directory, run.name);
  assert.equal(runs[0].step.number, 0);
  assert.equal(runs[0].step.role, 'implementer');
  assert.equal(runs[0].followed, `${run.name}/00-implementer.followed.jsonl`);
  assert.equal(runs[0].ended.status, 0);
});

const TRY_BRANCH = 'feature-0029-try-the-orchestrator';
const STARTED_AT = '2026-10-21T10:00:00Z';

function implemented() {
  return claudePrinted(responseOf({ ...DONE, summary: 'Built.' }));
}

test('three runs in one second, on two variants and the unit branch, each run and keep their branch', (testContext) => {
  const { base, write, agentriteAt, answer, read } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  const branches = [`${TRY_BRANCH}--opus`, `${TRY_BRANCH}--gpt-6-1`, TRY_BRANCH];
  branches.forEach((_branch, index) => answer(index + 1, implemented()));

  const directories = branches.map((branch) => {
    onBranch(base, branch);
    const result = agentriteAt(Date.parse(STARTED_AT), 'orchestrate', '0029', '--definition', 'one.json');
    assert.equal(result.status, 0, result.stderr);
    return branch;
  });

  assert.deepEqual(readdirSync(join(base, '.orchestrator', UNIT)).sort(), [
    STARTED_AT,
    `${STARTED_AT}--gpt-6-1`,
    `${STARTED_AT}--opus`,
  ]);
  for (const [name, branch] of [
    [`${STARTED_AT}--opus`, directories[0]],
    [`${STARTED_AT}--gpt-6-1`, directories[1]],
    [STARTED_AT, directories[2]],
  ]) {
    assert.equal(JSON.parse(read(`.orchestrator/${UNIT}/${name}/state.json`)).branch, branch);
  }
});

test('a run on a detached HEAD writes no branch, and its directory is named by the instant alone', (testContext) => {
  const { base, write, agentriteAt, answer, read } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  answer(1, implemented());
  onBranch(base, TRY_BRANCH);
  const identity = ['-c', 'user.name=test', '-c', 'user.email=test@example.com', '-c', 'commit.gpgsign=false'];
  const commit = [...identity, 'commit', '--quiet', '--allow-empty', '-m', 'x'];
  const commands = [commit, ['checkout', '--quiet', '--detach']];
  for (const args of commands) {
    assert.equal(spawnSync('git', args, { cwd: base, encoding: 'utf-8' }).status, 0);
  }

  const result = agentriteAt(Date.parse(STARTED_AT), 'orchestrate', '0029', '--definition', 'one.json');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(readdirSync(join(base, '.orchestrator', UNIT)), [STARTED_AT]);
  assert.equal(JSON.parse(read(`.orchestrator/${UNIT}/${STARTED_AT}/state.json`)).branch, null);
});

test('a run keeps the branch it started on when another is checked out while it runs', async (testContext) => {
  const { base, write, started, answer, waits, read } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  answer(1, implemented());
  waits(1, 2);
  onBranch(base, `${TRY_BRANCH}--opus`);
  const { ended } = started('orchestrate', '0029', '--definition', 'one.json');
  const unitDirectory = join(base, '.orchestrator', UNIT);
  const made = () => existsSync(unitDirectory) && readdirSync(unitDirectory).length > 0;
  for (let tries = 0; tries < 250 && !made(); tries += 1) await delay(20);
  const [name] = readdirSync(unitDirectory);
  assert.match(name, /--opus$/);

  onBranch(base, 'other');
  const result = await ended;

  assert.equal(result.status, 0, result.stderr);
  const state = JSON.parse(read(`.orchestrator/${UNIT}/${name}/state.json`));
  assert.equal(state.branch, `${TRY_BRANCH}--opus`);
  assert.notEqual(state.ended, null);
});

test('a run on a branch whose variant is not of the form is refused, writing nothing', (testContext) => {
  const branch = `${TRY_BRANCH}--Opus`;
  refused(
    testContext,
    ({ base }) => onBranch(base, branch),
    ['0029'],
    `the branch ${branch} gives the variant "Opus", and a variant is one or more words of the lowercase letters a to ` +
      'z and the digits 0 to 9, joined by single hyphens',
  );
});

const ORCHESTRATE_USAGE_FORM = USAGE_FORM;

test(
  'no argument, or one it does not take, prints the usage on standard error and exits 2, starting nothing',
  (testContext) => {
    for (const [args, first] of [
      [[], ORCHESTRATE_USAGE_FORM],
      [['0029', '--model', 'x'], 'unknown option: --model'],
    ]) {
      const { base, agentrite, calls } = project(testContext);

      const result = agentrite('orchestrate', ...args);

      assert.equal(result.status, 2);
      assert.equal(result.stdout, '');
      assert.equal(result.stderr.split('\n')[0], first);
      assert.ok(result.stderr.includes(`${ORCHESTRATE_USAGE_FORM}\n\n  <unit>`), result.stderr);
      assert.equal(calls().length, 0);
      assert.ok(!existsSync(join(base, '.orchestrator')));
    }
  },
);

// R24

test(
  '.orchestrator/.gitignore is written when missing or holding anything else, and left when it holds *',
  (testContext) => {
    for (const [before, kept] of [
      [undefined, false],
      ['node_modules\n', false],
      ['*', false],
      ['*\n', true],
    ]) {
      const { base, write, agentrite, answer } = project(testContext);
      const path = join(base, '.orchestrator', '.gitignore');
      if (before !== undefined) {
        write('.orchestrator/.gitignore', before);
        utimesSync(path, new Date(2020, 0, 1), new Date(2020, 0, 1));
      }
      answerDefault(answer, [{}, {}, {}]);

      assert.equal(agentrite('orchestrate', '0029').status, 0);

      assert.equal(readFileSync(path, 'utf-8'), '*\n');
      assert.equal(statSync(path).mtime.getFullYear() === 2020, kept, JSON.stringify(before));
    }
  },
);

// R22

test('a run writes nothing outside .orchestrator, and leaves the record as it was', (testContext) => {
  const { base, agentrite, answer } = project(testContext);
  answerDefault(answer, [{}, { findings: [BLOCKING] }, { findings: [BLOCKING] }, {}, {}]);
  const before = snapshot(base);

  const result = agentrite('orchestrate', '0029');

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(snapshot(base), before);
});

// Every file of the project with its content, but those under .orchestrator and the fakes' own.
function snapshot(base, relative = '') {
  return readdirSync(join(base, relative), { withFileTypes: true })
    .filter((entry) => !['.orchestrator', 'fakes'].includes(join(relative, entry.name)))
    .flatMap((entry) => {
      const path = join(relative, entry.name);
      if (entry.isDirectory()) return [[path, null], ...snapshot(base, path)];
      return [[path, readFileSync(join(base, path), 'utf-8')]];
    });
}

// R9, R12 of unit 0069: a step in a process group of its own, and the signals the command passes on to it.

// True once the process `pid` is gone: there is none, or on Linux it is a zombie not yet reaped by whatever adopted
// it. Polls for up to 5 seconds, since the reaping is not instant.
async function gone(pid) {
  for (let tries = 0; tries < 250; tries += 1) {
    try {
      process.kill(pid, 0);
      if (process.platform === 'linux' && zombie(pid)) return true;
    } catch (error) {
      if (error.code === 'ESRCH') return true;
      throw error;
    }
    await delay(20);
  }
  return false;
}

// True when /proc gives the process `pid` the state Z, or no longer has it, as when it went after the look before.
function zombie(pid) {
  try {
    const stat = readFileSync(`/proc/${pid}/stat`, 'utf-8');
    return stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z');
  } catch (error) {
    if (error.code === 'ENOENT') return true;
    throw error;
  }
}

const ONE_STEP = { steps: [{ role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5' }] };

test(
  'a signal to the command alone while a step runs ends the step, and the command by that signal',
  async (testContext) => {
    for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
      const { write, started, waits, pidOf } = project(testContext);
      write('one.json', JSON.stringify(ONE_STEP));
      waits(1, 60);
      const { child, exited } = started('orchestrate', '0029', '--definition', 'one.json');
      const harness = await pidOf(1);

      process.kill(child.pid, signal);

      const result = await exited;
      assert.equal(result.signal, signal, `${signal}: ${result.stderr}`);
      assert.ok(await gone(harness), `${signal}: the harness ${harness} is left`);
    }
  },
);

// R3 to R8 and R12 of unit 0069: a step that runs past its time limit.

// A definition of a step of the implementer with `timeoutMinutes`, and a review after it.
function limitedTo(timeoutMinutes) {
  return {
    steps: [
      { role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5', timeoutMinutes },
      { role: 'reviewer', harness: 'opencode', model: 'openai/gpt-6.1-sol' },
    ],
  };
}

const LIMIT_LINE = 'Step 0 stopped the run: it ran past its time limit of 0.02 minutes.';

test(
  'a step past its limit is ended by SIGTERM, and the run stops by the case, its response kept',
  async (testContext) => {
    const { base, write, read, started, answer, waits, pidOf, calls } = project(testContext);
    write('limited.json', JSON.stringify(limitedTo(0.02)));
    answer(1, claudePrinted(responseOf({ ...DONE, summary: 'Not finished.' })));
    waits(1, 60);

    const { ended } = started('orchestrate', '0029', '--definition', 'limited.json');
    const harness = await pidOf(1);
    const result = await ended;

    assert.equal(result.status, 3, result.stderr);
    assert.equal(calls().length, 1);
    const lines = stepLines(result.stdout);
    assert.equal(lines.length, 2);
    assert.match(lines[1], /^step 0, implementer, claude, claude-sonnet-5-5: ran out of time after 0m 0[12]s$/);
    const run = runDirectoryOf(base);
    const path = `${run.name}/00-implementer.response.md`;
    assert.ok(
      result.stdout.includes(`\n${LIMIT_LINE}\nThe final response of step 0 is at ${path}.\n\n`),
      result.stdout,
    );
    assert.ok(!result.stdout.includes('Not finished.'), result.stdout);
    assert.ok(read(path).includes('"summary": "Not finished."'));
    assert.deepEqual(readdirSync(run.path).sort(), [
      '00-implementer.followed.jsonl',
      '00-implementer.response.md',
      'definition.json',
      'heartbeat',
      'state.json',
    ]);
    const state = JSON.parse(read(`${run.name}/state.json`));
    assert.deepEqual(state.sessions, [{ role: 'implementer', harness: 'claude', session: calls()[0].options[9] }]);
    assert.match(state.sessions[0].session, UUID);
    assert.deepEqual(state.ended, { status: 3, line: LIMIT_LINE });
    const [kept, ...rest] = read(`${run.name}/00-implementer.followed.jsonl`).split('\n');
    assert.deepEqual(rest, ['']);
    const { time, ...item } = JSON.parse(kept);
    assert.match(time, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
    assert.deepEqual(item, { kind: 'text', text: responseOf({ ...DONE, summary: 'Not finished.' }) });
    assert.ok(await gone(harness), `the harness ${harness} is left`);
  },
);

test('a step that ignores SIGTERM past its limit is ended by SIGKILL 10 seconds later', async (testContext) => {
  const { write, started, answer, waits, pidOf, calls } = project(testContext);
  write('limited.json', JSON.stringify(limitedTo(0.02)));
  answer(1, claudePrinted(responseOf(DONE)));
  waits(1, 60, true);

  const began = performance.now();
  const { ended } = started('orchestrate', '0029', '--definition', 'limited.json');
  const harness = await pidOf(1);
  const result = await ended;
  const seconds = (performance.now() - began) / 1000;

  assert.equal(result.status, 3, result.stderr);
  assert.ok(seconds >= 0.02 * 60 + 10, `the run ended after ${seconds} seconds`);
  assert.ok(seconds < 30, `the run ended after ${seconds} seconds`);
  assert.equal(calls().length, 1);
  // The step's time ends with its agentrite run, which SIGTERM ends at once, and not with the harness.
  assert.match(stepLines(result.stdout)[1], /: ran out of time after 0m 0[12]s$/);
  assert.ok(result.stdout.includes(`\n${LIMIT_LINE}\n`), result.stdout);
  assert.ok(await gone(harness), `the harness ${harness} is left`);
});

test('a step with a limit that ends in time ends as it would without the limit', (testContext) => {
  const { write, agentrite, answer, calls } = project(testContext);
  write('limited.json', JSON.stringify(limitedTo(1)));
  answer(1, claudePrinted(responseOf(DONE)));
  answer(2, opencodePrinted(responseOf(DONE)));

  const result = agentrite('orchestrate', '0029', '--definition', 'limited.json');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls().length, 2);
  assert.match(stepLines(result.stdout)[1], /^step 0, implementer, claude, claude-sonnet-5-5: done after 0m 0\ds$/);
  assert.ok(result.stdout.includes('\nThe run ran every item of the definition to its end.\n'), result.stdout);
});

// The review's finding S1: the limit ends with the step's agentrite run, and not with its output.
test(
  'a step that ends in time and leaves a process holding its output past the limit keeps its outcome',
  (testContext) => {
    const { write, agentrite, answer, lingers, calls } = project(testContext);
    write('limited.json', JSON.stringify(limitedTo(0.02)));
    answer(1, claudePrinted(responseOf(DONE)));
    lingers(1, 3);
    answer(2, opencodePrinted(responseOf(DONE)));

    const result = agentrite('orchestrate', '0029', '--definition', 'limited.json');

    assert.equal(result.status, 0, result.stdout);
    assert.equal(calls().length, 2);
    assert.match(stepLines(result.stdout)[1], /^step 0, implementer, claude, claude-sonnet-5-5: done after 0m 0\ds$/);
  },
);

// Unit 0075, R3, R4, R9 to R11, R15: a run followed with --follow, and one without it, of a step in each harness.

const FOLLOWED = {
  steps: [
    { role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5' },
    { role: 'reviewer', harness: 'opencode', model: 'openai/gpt-6.1-sol' },
  ],
};
const IMPLEMENTER_HEAD = 'step 0, implementer, claude, claude-sonnet-5-5';
const REVIEWER_HEAD = 'step 1, reviewer, opencode, openai/gpt-6.1-sol';
const HIDDEN = ['TOOL RESULT', 'REASONING'];

// What Claude Code prints with `stream-json` for a step that says what it will do, makes a call with a label and one
// with none, thinks, is given a tool's result, and answers with `response`.
function claudeFollowed(response) {
  const assistant = (second, content) => ({
    type: 'assistant',
    message: { content },
    parent_tool_use_id: null,
    session_id: 'claude-session',
    timestamp: `2026-10-22T14:03:${second}.500Z`,
  });
  return [
    { type: 'system', subtype: 'init', session_id: 'claude-session' },
    assistant(27, [
      { type: 'thinking', thinking: 'REASONING', signature: 'x' },
      { type: 'text', text: 'I will run the tests.' },
    ]),
    assistant(28, [
      { type: 'tool_use', id: 'toolu_1', name: 'Bash', input: { command: 'npm test', description: 'Run the tests' } },
    ]),
    {
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'TOOL RESULT' }] },
      parent_tool_use_id: null,
    },
    assistant(29, [{ type: 'tool_use', id: 'toolu_2', name: 'TodoWrite', input: { todos: [] } }]),
    assistant(30, [{ type: 'text', text: response }]),
    { type: 'result', subtype: 'success', is_error: false, result: response, session_id: 'claude-session' },
  ]
    .map((event) => `${JSON.stringify(event)}\n`)
    .join('');
}

// What OpenCode prints for the same step, in two messages, the second of them its final response.
function opencodeFollowed(response) {
  const event = (type, second, message, part) => ({
    type,
    timestamp: Date.UTC(2026, 9, 22, 15, 0, second),
    sessionID: 'ses_follow',
    part: { id: `prt_${second}`, messageID: message, sessionID: 'ses_follow', ...part },
  });
  const call = (tool, input) => ({ type: 'tool', tool, state: { status: 'completed', input, output: 'TOOL RESULT' } });
  return [
    event('step_start', 1, 'msg_1', { type: 'step-start' }),
    event('reasoning', 2, 'msg_1', { type: 'reasoning', text: 'REASONING' }),
    event('text', 3, 'msg_1', { type: 'text', text: 'I will read the diff.' }),
    event('tool_use', 4, 'msg_1', call('bash', { command: 'git diff', description: 'Show the diff' })),
    event('tool_use', 5, 'msg_1', call('todowrite', { todos: [] })),
    event('step_finish', 6, 'msg_1', { type: 'step-finish', reason: 'tool-calls' }),
    event('step_start', 7, 'msg_2', { type: 'step-start' }),
    event('text', 8, 'msg_2', { type: 'text', text: response }),
    event('step_finish', 9, 'msg_2', { type: 'step-finish', reason: 'stop' }),
  ]
    .map((line) => `${JSON.stringify(line)}\n`)
    .join('');
}

const IMPLEMENTED = responseOf({ ...DONE, summary: 'Implemented.' });
const REVIEWED = responseOf({ ...DONE, summary: 'Reviewed.' });

// What was printed between the closing rule after the line before the step of `head` and the opening rule before the
// line after it.
function between(stdout, head) {
  const start = stdout.indexOf(`${head}: started\n${CLOSING_RULE}\n`) + `${head}: started\n${CLOSING_RULE}\n`.length;
  return stdout.slice(start, stdout.indexOf(`${OPENING_RULE}\n${head}: `, start));
}

// A run of `FOLLOWED`, each step answered as its harness prints it and with a line on standard error.
async function followedRun(testContext, ...options) {
  const { base, write, read, started, answer, complains } = project(testContext);
  write('followed.json', JSON.stringify(FOLLOWED));
  answer(1, claudeFollowed(IMPLEMENTED));
  complains(1, 'claude complains\n');
  answer(2, opencodeFollowed(REVIEWED));
  complains(2, 'opencode complains\n');
  const result = await started('orchestrate', '0029', '--definition', 'followed.json', ...options).ended;
  const run = runDirectoryOf(base);
  const files = readdirSync(run.path).sort();
  return { result, run, files, contents: files.map((name) => read(`${run.name}/${name}`)) };
}

test(
  'a run with --follow prints the messages and calls of each step between its lines, the report last',
  async (testContext) => {
    const { result } = await followedRun(testContext, '--follow');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      between(result.stdout, IMPLEMENTER_HEAD),
      [
        '',
        '14:03:27 I will run the tests.',
        '',
        dim('14:03:28 → Bash Run the tests'),
        dim('14:03:29 → TodoWrite'),
        '',
        `14:03:30 ${IMPLEMENTED.replace(/\n+$/, '')}`,
        '',
        '',
      ].join('\n'),
    );
    assert.equal(
      between(result.stdout, REVIEWER_HEAD),
      [
        '',
        '15:00:03 I will read the diff.',
        '',
        dim('15:00:04 → bash Show the diff'),
        dim('15:00:05 → todowrite'),
        '',
        `15:00:08 ${REVIEWED.replace(/\n+$/, '')}`,
        '',
        '',
      ].join('\n'),
    );
    for (const hidden of HIDDEN) assert.ok(!result.stdout.includes(hidden), result.stdout);
    assert.match(stepLines(result.stdout).at(-1), /^step 1, reviewer, opencode, openai\/gpt-6\.1-sol: done after /);
    const report = endReportOf(result.stdout);
    assert.ok(report.startsWith('0  implementer'), result.stdout);
    assert.ok(report.includes('\nThe run ran every item of the definition to its end.\n'), result.stdout);
    assert.ok(!report.includes('→') && !report.includes('I will'), result.stdout);
    assert.ok(result.stderr.includes('claude complains\n'), result.stderr);
    assert.ok(result.stderr.includes('opencode complains\n'), result.stderr);
  },
);

test('a run with --follow frames its step lines and the end report, items between', async (testContext) => {
  const { result, run } = await followedRun(testContext, '--follow');

  const fixed = result.stdout.replace(/ after [^\n]*/g, ' after TIME').replaceAll(run.name, 'RUN');
  const report = endReportOf(result.stdout).replaceAll(run.name, 'RUN');
  assert.ok(fixed.startsWith(`${OPENING_RULE}\n${IMPLEMENTER_HEAD}: started\n${CLOSING_RULE}\n\n14:03:27 `), fixed);
  const frames = fixed.split(`${OPENING_RULE}\n`).slice(1);
  assert.equal(frames.length, 3, fixed);
  assert.equal(
    frames[1],
    `${IMPLEMENTER_HEAD}: done after TIME\n${REVIEWER_HEAD}: started\n${CLOSING_RULE}\n` +
      between(fixed, REVIEWER_HEAD),
  );
  assert.equal(frames[2], `${REVIEWER_HEAD}: done after TIME\n\n${report}${CLOSING_RULE}\n`);
  assert.ok(result.stdout.endsWith(`${CLOSING_RULE}\n`), result.stdout);
});

// What the command printed after the line after the last step and the blank line below it: the end report.
function endReportOf(stdout) {
  const last = stepLines(stdout).at(-1);
  return stdout.slice(stdout.lastIndexOf(`${last}\n`) + `${last}\n\n`.length).replace(`${CLOSING_RULE}\n`, '');
}

test(
  'a run without --follow prints the lines of its steps and the end report, and nothing of the steps',
  async (testContext) => {
    const { result } = await followedRun(testContext);

    assert.equal(result.status, 0, result.stderr);
    const lines = result.stdout.split('\n');
    const report = endReportOf(result.stdout).split('\n');
    assert.deepEqual(lines.slice(0, 4).map((line) => line.replace(/ after .*$/, '')), [
      `${IMPLEMENTER_HEAD}: started`,
      `${IMPLEMENTER_HEAD}: done`,
      `${REVIEWER_HEAD}: started`,
      `${REVIEWER_HEAD}: done`,
    ]);
    assert.deepEqual(lines.slice(4), ['', ...report]);
    assert.ok(!lines.includes(OPENING_RULE) && !lines.includes(CLOSING_RULE), result.stdout);
    assert.ok(report[0].startsWith('0  implementer'), result.stdout);
    for (const shown of ['I will run the tests.', 'I will read the diff.', '→', ...HIDDEN]) {
      assert.ok(!result.stdout.includes(shown), result.stdout);
    }
    assert.ok(result.stderr.includes('claude complains\n'), result.stderr);
    assert.ok(result.stderr.includes('opencode complains\n'), result.stderr);
  },
);

test('a run with --follow ends, writes its directory and exits as the same run without it', async (testContext) => {
  const followed = await followedRun(testContext, '--follow');
  const plain = await followedRun(testContext);

  assert.equal(followed.result.status, plain.result.status);
  const steps = (stdout) => stepLines(stdout).map((line) => line.replace(/ after .*$/, ''));
  assert.deepEqual(steps(followed.result.stdout), steps(plain.result.stdout));
  assert.equal(
    endReportOf(followed.result.stdout).replaceAll(followed.run.name, 'RUN'),
    endReportOf(plain.result.stdout).replaceAll(plain.run.name, 'RUN'),
  );
  assert.deepEqual(followed.files, plain.files);
  assert.deepEqual(followed.files, [
    '00-implementer.followed.jsonl',
    '00-implementer.outcome.json',
    '01-reviewer.followed.jsonl',
    '01-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
  const heartbeatAt = followed.files.indexOf('heartbeat');
  for (const run of [followed, plain]) assert.match(run.contents[heartbeatAt], HEARTBEAT_FORM);
  const withoutHeartbeat = (run) => run.contents.filter((content, index) => index !== heartbeatAt);
  assert.deepEqual(withoutHeartbeat(followed), withoutHeartbeat(plain));
  assert.deepEqual(JSON.parse(followed.contents.at(-1)).sessions, [
    { role: 'implementer', harness: 'claude', session: 'claude-session' },
    { role: 'reviewer', harness: 'opencode', session: 'ses_follow' },
  ]);
});

test('with --follow a message of a step is printed while the step still runs', async (testContext) => {
  const { write, started, answer, waits, pidOf } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  answer(1, claudeFollowed(IMPLEMENTED).split('\n').slice(0, 2).join('\n'));
  waits(1, 60);
  const { child, exited, output } = started('orchestrate', '0029', '--definition', 'one.json', '--follow');
  const harness = await pidOf(1);

  for (let tries = 0; tries < 250 && !output().includes('I will run the tests.'); tries += 1) await delay(20);
  assert.ok(output().includes('\n14:03:27 I will run the tests.\n'), output());
  assert.doesNotThrow(() => process.kill(harness, 0), 'the harness ended before the message was printed');

  process.kill(child.pid, 'SIGTERM');
  assert.equal((await exited).signal, 'SIGTERM');
  assert.ok(await gone(harness), `the harness ${harness} is left`);
});

// The lines of a followed file of the run, parsed, after the run ended; each file ends in a line break.
function followedLinesOf(name, read) {
  const text = read(name);
  assert.ok(text.endsWith('\n'), name);
  return text
    .slice(0, -1)
    .split('\n')
    .map((line) => JSON.parse(line));
}

test('the followed file of each step holds its messages and calls, with --follow and without', async (testContext) => {
  const implementer = [
    { time: '2026-10-22T14:03:27Z', kind: 'text', text: 'I will run the tests.' },
    { time: '2026-10-22T14:03:28Z', kind: 'call', tool: 'Bash', label: 'Run the tests' },
    { time: '2026-10-22T14:03:29Z', kind: 'call', tool: 'TodoWrite', label: null },
    { time: '2026-10-22T14:03:30Z', kind: 'text', text: IMPLEMENTED },
  ];
  const reviewer = [
    { time: '2026-10-22T15:00:03Z', kind: 'text', text: 'I will read the diff.' },
    { time: '2026-10-22T15:00:04Z', kind: 'call', tool: 'bash', label: 'Show the diff' },
    { time: '2026-10-22T15:00:05Z', kind: 'call', tool: 'todowrite', label: null },
    { time: '2026-10-22T15:00:08Z', kind: 'text', text: REVIEWED },
  ];
  const kept = [];
  for (const options of [['--follow'], []]) {
    const { result, run, contents, files } = await followedRun(testContext, ...options);
    assert.equal(result.status, 0, result.stderr);
    const read = (path) => contents[files.indexOf(path)];
    assert.deepEqual(followedLinesOf('00-implementer.followed.jsonl', read), implementer);
    assert.deepEqual(followedLinesOf('01-reviewer.followed.jsonl', read), reviewer);
    for (const content of contents) {
      for (const hidden of HIDDEN) assert.ok(!content.includes(hidden), content);
    }
    kept.push([read('00-implementer.followed.jsonl'), read('01-reviewer.followed.jsonl')]);
  }
  assert.deepEqual(kept[0], kept[1]);
});

test('without --follow the file is made empty first and holds a message while the step runs', async (testContext) => {
  const { base, write, read, started, answer, waits, sees, pidOf } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  answer(1, claudeFollowed(IMPLEMENTED).split('\n').slice(0, 2).join('\n'));
  sees(1);
  waits(1, 60);
  const { child, ended, exited, output } = started('orchestrate', '0029', '--definition', 'one.json');
  const harness = await pidOf(1);
  assert.equal(read('fakes/seen-1.out'), '00-implementer.followed.jsonl empty\n');

  const path = join(runDirectoryOf(base).path, '00-implementer.followed.jsonl');
  for (let tries = 0; tries < 250 && !readFileSync(path, 'utf-8').includes('\n'); tries += 1) await delay(20);
  assert.equal(
    readFileSync(path, 'utf-8'),
    `${JSON.stringify({ time: '2026-10-22T14:03:27Z', kind: 'text', text: 'I will run the tests.' })}\n`,
  );
  assert.doesNotThrow(() => process.kill(harness, 0), 'the harness ended before the message was added');
  assert.ok(!output().includes('I will run the tests.'), output());

  process.kill(child.pid, 'SIGTERM');
  assert.equal((await exited).signal, 'SIGTERM');
  await ended;
  assert.equal(readFileSync(path, 'utf-8').split('\n').length, 2);
  assert.ok(await gone(harness), `the harness ${harness} is left`);
});

test('instantOf gives an instant in UTC to the second', () => {
  assert.equal(instantOf(Date.UTC(2026, 9, 23, 10, 0, 5, 900)), '2026-10-23T10:00:05Z');
  assert.equal(instantOf(Date.UTC(2026, 0, 2, 3, 4, 5)), '2026-01-02T03:04:05Z');
});

const REAL_FILES = { writeFileSync, renameSync, rmSync };

test('writeWhole writes the temporary file, renames it over the file, and removes nothing', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-whole-');
  const calls = [];
  const recording = (name) => (...args) => {
    calls.push([name, ...args]);
    return REAL_FILES[name](...args);
  };

  writeWhole(join(directory, 'state.json'), '{}', {
    writeFileSync: recording('writeFileSync'),
    renameSync: recording('renameSync'),
    rmSync: recording('rmSync'),
  });

  assert.deepEqual(calls, [
    ['writeFileSync', join(directory, '.state.json'), '{}'],
    ['renameSync', join(directory, '.state.json'), join(directory, 'state.json')],
  ]);
});

test('writeWhole replaces a file and leaves the file alone in its directory', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-whole-');
  writeFileSync(join(directory, 'state.json'), 'first');

  writeWhole(join(directory, 'state.json'), 'second', REAL_FILES);

  assert.equal(readFileSync(join(directory, 'state.json'), 'utf-8'), 'second');
  assert.deepEqual(readdirSync(directory), ['state.json']);
});

test('writeWhole that fails while writing throws the error and leaves the file as it was', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-whole-');
  writeFileSync(join(directory, 'state.json'), 'first');
  const failure = new Error('disk full');
  const failing = (path) => {
    writeFileSync(path, 'par');
    throw failure;
  };

  assert.throws(
    () => writeWhole(join(directory, 'state.json'), 'second', { ...REAL_FILES, writeFileSync: failing }),
    failure,
  );

  assert.equal(readFileSync(join(directory, 'state.json'), 'utf-8'), 'first');
  assert.deepEqual(readdirSync(directory), ['state.json']);
});

test('writeWhole that fails while renaming throws and leaves no temporary file', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-whole-');
  mkdirSync(join(directory, 'heartbeat'));
  writeFileSync(join(directory, 'heartbeat', 'held'), 'x');

  assert.throws(() => writeWhole(join(directory, 'heartbeat'), 'text', REAL_FILES));

  assert.deepEqual(readdirSync(directory), ['heartbeat']);
});

test('heartbeatText is one instant followed by a line break, and nothing else', () => {
  const text = heartbeatText(Date.UTC(2026, 9, 23, 10, 0, 5, 900));

  assert.equal(text, '2026-10-23T10:00:05Z\n');
  assert.match(text, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n$/);
});

test('startHeartbeat writes at once and then every 10 seconds', (testContext) => {
  testContext.mock.timers.enable({ apis: ['setInterval', 'Date'], now: Date.UTC(2026, 9, 23, 10, 0, 5) });
  const written = [];

  const stop = startHeartbeat((text) => written.push(text));
  testContext.after(stop);

  assert.deepEqual(written, ['2026-10-23T10:00:05Z\n']);
  testContext.mock.timers.tick(9_999);
  assert.equal(written.length, 1);
  testContext.mock.timers.tick(1);
  assert.deepEqual(written.slice(1), ['2026-10-23T10:00:15Z\n']);
  testContext.mock.timers.tick(10_000);
  assert.deepEqual(written.slice(2), ['2026-10-23T10:00:25Z\n']);
});

test('the function startHeartbeat returns stops the writes, and can be called again', (testContext) => {
  testContext.mock.timers.enable({ apis: ['setInterval', 'Date'], now: Date.UTC(2026, 9, 23, 10, 0, 5) });
  const written = [];
  const stop = startHeartbeat((text) => written.push(text));

  stop();
  testContext.mock.timers.tick(60_000);

  assert.equal(written.length, 1);
  assert.doesNotThrow(stop);
});

test('a write of the heartbeat that fails does not stop it, and the next is made at its time', (testContext) => {
  testContext.mock.timers.enable({ apis: ['setInterval', 'Date'], now: Date.UTC(2026, 9, 23, 10, 0, 5) });
  const written = [];
  let calls = 0;
  const write = (text) => {
    calls += 1;
    if (calls <= 2) throw new Error('disk full');
    written.push(text);
  };

  let stop;
  assert.doesNotThrow(() => {
    stop = startHeartbeat(write);
  });
  testContext.after(() => stop());
  assert.doesNotThrow(() => testContext.mock.timers.tick(10_000));
  testContext.mock.timers.tick(10_000);

  assert.deepEqual(written, ['2026-10-23T10:00:25Z\n']);
});

test('a run keeps a heartbeat that moves on while a step runs and is left at its last instant', async (testContext) => {
  const { base, write, read, started, answer, waits, pidOf } = project(testContext);
  write('one.json', JSON.stringify(ONE_STEP));
  answer(1, claudePrinted(responseOf(DONE)));
  waits(1, 12);
  const { ended } = started('orchestrate', '0029', '--definition', 'one.json');
  const harness = await pidOf(1);

  const run = runDirectoryOf(base);
  const first = read(`${run.name}/heartbeat`);
  assert.match(first, HEARTBEAT_FORM);
  assert.ok(Math.abs(Date.now() - Date.parse(first.trim())) <= 5_000, first);
  assert.equal(JSON.parse(read(`${run.name}/state.json`)).ended, null);
  let moved = first;
  for (let tries = 0; tries < 150 && moved === first; tries += 1) {
    await delay(100);
    moved = read(`${run.name}/heartbeat`);
  }
  assert.ok(moved > first, `${first} then ${moved}`);
  assert.doesNotThrow(() => process.kill(harness, 0), 'the harness ended before the heartbeat moved on');

  const result = await ended;
  assert.equal(result.status, 0, result.stderr);
  assert.ok(read(`${run.name}/heartbeat`) >= moved);
  assert.deepEqual(readdirSync(run.path).sort(), [
    '00-implementer.followed.jsonl',
    '00-implementer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
  assert.equal(JSON.parse(read(`${run.name}/state.json`)).ended.status, 0);
});

const FOLLOWED_FILES = { writeFileSync, appendFileSync, truncateSync };

test('followedFile makes the file empty and adds each line whole, in order, leaving no other file', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-followed-');
  const path = join(directory, '00-implementer.followed.jsonl');

  const add = followedFile(path, FOLLOWED_FILES);
  assert.equal(readFileSync(path, 'utf-8'), '');
  add('{"a":1}\n');
  add('{"b":2}\n');

  assert.equal(readFileSync(path, 'utf-8'), '{"a":1}\n{"b":2}\n');
  assert.deepEqual(readdirSync(directory), ['00-implementer.followed.jsonl']);
});

test('followedFile whose making throws does not throw, and writes the lines added after it', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-followed-');
  const path = join(directory, 'followed.jsonl');
  const failing = () => {
    throw new Error('read-only');
  };

  const add = followedFile(path, { ...FOLLOWED_FILES, writeFileSync: failing });
  add('{"a":1}\n');

  assert.equal(readFileSync(path, 'utf-8'), '{"a":1}\n');
});

test('followedFile whose append wrote part of a line cuts the file back, and the next line is whole', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-followed-');
  const path = join(directory, 'followed.jsonl');
  let failNext = false;
  const partial = (target, line) => {
    if (!failNext) return appendFileSync(target, line);
    failNext = false;
    appendFileSync(target, line.slice(0, 3));
    throw new Error('disk full');
  };

  const add = followedFile(path, { ...FOLLOWED_FILES, appendFileSync: partial });
  add('{"a":1}\n');
  failNext = true;
  assert.doesNotThrow(() => add('{"é":2}\n'));
  assert.equal(readFileSync(path, 'utf-8'), '{"a":1}\n');
  add('{"c":3}\n');

  assert.equal(readFileSync(path, 'utf-8'), '{"a":1}\n{"c":3}\n');
});

test('followedFile whose append and cut back fail does not throw, and adds no line behind a part', (testContext) => {
  const directory = temporaryDirectory(testContext, 'agentrite-followed-');
  const path = join(directory, 'followed.jsonl');
  let broken = false;
  const failing = () => {
    throw new Error('gone');
  };
  const partial = (target, line) => {
    if (!broken) return appendFileSync(target, line);
    appendFileSync(target, line.slice(0, 3));
    return failing();
  };

  const add = followedFile(path, {
    ...FOLLOWED_FILES,
    appendFileSync: partial,
    truncateSync: (target, length) => (broken ? failing() : truncateSync(target, length)),
  });
  add('{"a":1}\n');
  broken = true;
  assert.doesNotThrow(() => add('{"b":2}\n'));
  assert.doesNotThrow(() => add('{"c":3}\n'));
  broken = false;
  add('{"d":4}\n');

  assert.equal(readFileSync(path, 'utf-8'), '{"a":1}\n{"d":4}\n');
});

// Unit 0089: `agentrite orchestrate --resume`, of runs the command wrote, on the unit's branch unless a test checks out
// another. Each command runs at an instant of its own, minutes after the first run, so that no two of one variant make
// the same directory.

const FIRST_RUN = Date.parse(STARTED_AT);
const minutesLater = (minutes) => FIRST_RUN + minutes * 60_000;
const VARIANT_BRANCH = `${TRY_BRANCH}--opus`;

// The run that started `minutes` after the first, on `variant`: its directory's name and its path from the root.
function runOf(minutes, variant = null) {
  const name = runName(instantOf(minutesLater(minutes)), variant);
  return { name, directory: `.orchestrator/${UNIT}/${name}` };
}

// A project on `branch` with `files` written, and a run of `args` that stopped, its calls answered from 1 with what
// `printed` lists: what the fake prints, or that and the status it exits with.
function stoppedRun(testContext, printed, { args = [], branch = TRY_BRANCH, files = {} } = {}) {
  const context = project(testContext);
  for (const [path, content] of Object.entries(files)) context.write(path, content);
  onBranch(context.base, branch);
  printed.forEach((entry, index) =>
    typeof entry === 'string' ? context.answer(index + 1, entry) : context.answer(index + 1, ...entry),
  );
  const result = context.agentriteAt(minutesLater(0), 'orchestrate', '0029', ...args);
  assert.equal(result.status, 3, `${result.stdout}${result.stderr}`);
  return { ...context, stopped: runOf(0, variantOf(branch)) };
}

// The resume of the project's latest run, `minutes` after the first run.
function resume(context, minutes, ...args) {
  return context.agentriteAt(minutesLater(minutes), 'orchestrate', '0029', '--resume', ...args);
}

const stateOf = (context, run) => JSON.parse(context.read(`${run.directory}/state.json`));
const filesOf = (context, run) => readdirSync(join(context.base, run.directory)).sort();
const firstLine = (stdout) => stdout.split('\n')[0];
const startedLines = (stdout) => stepLines(stdout).filter((line) => line.endsWith(': started'));

// A run stopped at the ask again of its implementer, which gave no outcome either.
const NO_OUTCOME = () => [
  claudePrinted(responseOf({ ...DONE, summary: 'Planned.' })),
  claudePrinted(NO_BLOCK, 'implementer-session'),
  claudePrinted('I still give no block.'),
];
const IMPLEMENTER_ROUND_1 = 'step 1, round 1 of 3, implementer, claude, claude-sonnet-5-5';
const REVIEWER_ROUND_1 = 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol';
const rerunPrompt = (...parts) => [`The unit is changes/${UNIT}/.`, ...parts].join('\n\n');

// R6

test('a run writes resumes as null, and at with asked, true at an ask again', (testContext) => {
  const context = stoppedRun(testContext, NO_OUTCOME());
  const state = stateOf(context, context.stopped);
  assert.deepEqual(Object.keys(state), ['unit', 'definition', 'branch', 'resumes', 'at', 'sessions', 'ended']);
  assert.equal(state.resumes, null);
  assert.deepEqual(state.at, { number: 2, item: 1, round: { at: 1, of: 3 }, index: 0, asked: true });
});

// R2, R3, R6, R10, R11: a missing outcome.

test('a resume after an ask again reruns the step asked, numbered as it, in its session', (testContext) => {
  const context = stoppedRun(testContext, NO_OUTCOME());
  const { answer, calls, stopped } = context;
  answer(4, claudePrinted(responseOf({ ...DONE, summary: 'Built.' })));
  answer(5, opencodePrinted(responseOf({ ...DONE, summary: 'Reviewed.' })));

  const result = resume(context, 1);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(firstLine(result.stdout), `Resuming the run ${stopped.directory}/ at ${IMPLEMENTER_ROUND_1}`);
  assert.deepEqual(startedLines(result.stdout), [`${IMPLEMENTER_ROUND_1}: started`, `${REVIEWER_ROUND_1}: started`]);
  assert.equal(calls().length, 5);
  const [rerun, reviewer] = calls().slice(3);
  assert.deepEqual(rerun.options.slice(-2), ['--resume', 'implementer-session']);
  assert.equal(rerun.prompt, rerunPrompt(IMPLEMENTER_PROMPT, RESUMED, outcomeRequest({ at: 1, of: 3 })));
  assert.equal(reviewer.harness, 'opencode');
  assert.ok(!reviewer.options.includes('--session'), reviewer.options.join(' '));
  assert.ok(result.stdout.includes('\nThe run ran every item of the definition to its end.\nSummary: Reviewed.\n'));

  const resumed = runOf(1);
  assert.deepEqual(filesOf(context, resumed), [
    '01-implementer.followed.jsonl',
    '01-implementer.outcome.json',
    '02-reviewer.followed.jsonl',
    '02-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
  const [before, after] = [stateOf(context, stopped), stateOf(context, resumed)];
  assert.equal(after.resumes, stopped.name);
  assert.deepEqual(after.at, { number: 2, item: 1, round: { at: 1, of: 3 }, index: 1, asked: false });
  const reviewerSession = { role: 'reviewer', harness: 'opencode', session: 'ses_test' };
  assert.deepEqual(after.sessions, [...before.sessions, reviewerSession]);
  assert.deepEqual(after.ended, { status: 0, line: 'The run ran every item of the definition to its end.' });
});

// R2, R3, R4, R11: questions, with the human's words, and the rounds after the rerun.

test('a resume after questions gives the rerun the words of --prompt, and goes on by its rounds', (testContext) => {
  const context = stoppedRun(testContext, [
    claudePrinted(responseOf(DONE)),
    claudePrinted(responseOf({ ...DONE, questions: ['Which reading of R2?'] }), 'implementer-session'),
  ]);
  const { answer, calls } = context;
  answer(3, claudePrinted(responseOf(DONE), 'implementer-session'));
  answer(4, opencodePrinted(responseOf({ ...DONE, findings: [BLOCKING] })));
  answer(5, claudePrinted(responseOf(DONE), 'implementer-session'));
  answer(6, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1, '--prompt', 'Take the second reading of R2.');

  assert.equal(result.status, 0, result.stderr);
  const made = calls().slice(2);
  assert.equal(made.length, 4);
  assert.equal(
    made[0].prompt,
    rerunPrompt(IMPLEMENTER_PROMPT, 'Take the second reading of R2.', outcomeRequest({ at: 1, of: 3 })),
  );
  assert.deepEqual(made[0].options.slice(-2), ['--resume', 'implementer-session']);
  assert.ok(!made[1].options.includes('--session'));
  assert.equal(made[2].prompt, rerunPrompt(IMPLEMENTER_PROMPT, outcomeRequest({ at: 2, of: 3 })));
  assert.deepEqual(made[2].options.slice(-2), ['--resume', 'implementer-session']);
  assert.deepEqual(made[3].options.slice(-2), ['--session', 'ses_test']);
  assert.deepEqual(startedLines(result.stdout), [
    `${IMPLEMENTER_ROUND_1}: started`,
    `${REVIEWER_ROUND_1}: started`,
    'step 3, round 2 of 3, implementer, claude, claude-sonnet-5-5: started',
    'step 4, round 2 of 3, reviewer, opencode, openai/gpt-6.1-sol: started',
  ]);
});

// R2, R3, R5, R11: a blocking finding of stopWhen, the words of the human on two lines, and the stopped run's
// definition.

const STOP_WHEN = {
  steps: [
    { role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5' },
    { role: 'reviewer', harness: 'opencode', model: 'openai/gpt-6.1-sol', stopWhen: 'blocking-findings' },
    { role: 'planner', harness: 'claude', model: 'claude-opus-5-5' },
  ],
};

test('a resume after stopWhen reruns the review in its session, and goes on when it is clean', (testContext) => {
  const files = { 'stop.json': JSON.stringify(STOP_WHEN) };
  const context = stoppedRun(
    testContext,
    [claudePrinted(responseOf(DONE)), opencodePrinted(responseOf({ ...DONE, findings: [BLOCKING] }))],
    { args: ['--definition', 'stop.json'], files },
  );
  const { answer, calls, stopped, read } = context;
  answer(3, opencodePrinted(responseOf({ ...DONE, findings: [MINOR] })));
  answer(4, claudePrinted(responseOf(DONE)));

  const result = resume(context, 1, '--prompt', 'Fixed S1.\nLook again.');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    firstLine(result.stdout),
    `Resuming the run ${stopped.directory}/ at step 1, reviewer, opencode, openai/gpt-6.1-sol`,
  );
  const [review, planner] = calls().slice(2);
  assert.equal(calls().length, 4);
  assert.deepEqual(review.options.slice(-2), ['--session', 'ses_test']);
  assert.equal(review.prompt, rerunPrompt('Fixed S1.\nLook again.', outcomeRequest(undefined)));
  assert.equal(planner.options[8], '--session-id');
  const resumed = runOf(1);
  assert.equal(read(`${resumed.directory}/definition.json`), files['stop.json']);
  assert.equal(stateOf(context, resumed).definition, 'stop.json');
});

test('a resume runs the definition of the run it resumes, and not the one agentrite.json names now', (testContext) => {
  const context = stoppedRun(testContext, [
    claudePrinted(responseOf(DONE)),
    claudePrinted(responseOf({ ...DONE, questions: ['Which?'] })),
  ]);
  const { answer, calls, read, write } = context;
  write('other.json', JSON.stringify(ONE_STEP));
  write('agentrite.json', JSON.stringify({ ...JSON.parse(SETTINGS), orchestrator: 'other.json' }));
  answer(3, claudePrinted(responseOf(DONE)));
  answer(4, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(
    calls().slice(2).map(({ harness }) => harness),
    ['claude', 'opencode'],
  );
  const resumed = runOf(1);
  assert.equal(read(`${resumed.directory}/definition.json`), read('node_modules/agentrite/orchestrator.json'));
  assert.equal(stateOf(context, resumed).definition, 'node_modules/agentrite/orchestrator.json');
});

// R2, R4, R7, R11: a repeat that ran out, and a resume resumed.

test('a resume of a repeat that ran out gets no round more, and is resumed in turn', (testContext) => {
  const block = opencodePrinted(responseOf({ ...DONE, findings: [BLOCKING] }));
  const built = claudePrinted(responseOf(DONE));
  const context = stoppedRun(testContext, [claudePrinted(responseOf(DONE)), built, block, built, block, built, block]);
  const { answer, calls, stopped, write } = context;
  // A step of the stopped run may have set the unit in progress.
  write(`changes/${UNIT}/record.md`, APPROVED.replace('approved', 'in-progress'));
  answer(8, block);

  const again = resume(context, 1);

  assert.equal(again.status, 3, again.stderr);
  assert.equal(calls().length, 8);
  assert.ok(
    again.stdout.includes(
      'Step 6 stopped the run: the repeat ran its 3 rounds, and its until did not hold after the last.\n',
    ),
    again.stdout,
  );
  const first = runOf(1);
  assert.deepEqual(filesOf(context, first), [
    '06-reviewer.followed.jsonl',
    '06-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);

  answer(9, opencodePrinted(responseOf(DONE)));
  const last = resume(context, 2);

  assert.equal(last.status, 0, last.stderr);
  assert.equal(calls().length, 9);
  assert.equal(
    firstLine(last.stdout),
    `Resuming the run ${first.directory}/ at step 6, round 3 of 3, reviewer, opencode, openai/gpt-6.1-sol`,
  );
  assert.deepEqual(calls()[8].options.slice(-2), ['--session', 'ses_test']);
  const [initial, middle, final] = [stopped, first, runOf(2)].map((run) => stateOf(context, run));
  assert.equal(middle.resumes, stopped.name);
  assert.equal(final.resumes, first.name);
  assert.deepEqual(final.sessions, initial.sessions);
  assert.equal(final.sessions.length, 3);
});

// R2, R11: a rerun with no session to continue.

test('a rerun whose role and harness the stopped run holds no session for starts a new one', (testContext) => {
  const files = {
    'review.json': JSON.stringify({ steps: [{ role: 'reviewer', harness: 'opencode', model: 'openai/gpt-6.1-sol' }] }),
  };
  const context = stoppedRun(testContext, [['', 1]], { args: ['--definition', 'review.json'], files });
  assert.deepEqual(stateOf(context, context.stopped).sessions, []);
  context.answer(2, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1);

  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(context.calls()[1].options, [
    'run',
    '--agent',
    'reviewer',
    '--model',
    'openai/gpt-6.1-sol',
    '--format',
    'json',
  ]);
});

// R6: the directory of a resume, on a variant, and an ask again after the rerun.

// Every file under `directory` of the project, with its content.
function filesUnder(base, directory) {
  return readdirSync(join(base, directory), { recursive: true })
    .sort()
    .map((path) => [path, readFileSync(join(base, directory, path), 'utf-8')]);
}

test('a resume runs in a directory of its own, numbering on, and leaves the stopped run be', (testContext) => {
  const context = stoppedRun(testContext, NO_OUTCOME(), { branch: VARIANT_BRANCH });
  const { answer, base, stopped } = context;
  assert.equal(stopped.name, `${STARTED_AT}--opus`);
  const before = filesUnder(base, stopped.directory);
  answer(4, claudePrinted('No block again.'));
  answer(5, claudePrinted(responseOf(DONE)));
  answer(6, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1);

  assert.equal(result.status, 0, result.stderr);
  const resumed = runOf(1, 'opus');
  assert.deepEqual(readdirSync(join(base, '.orchestrator', UNIT)).sort(), [stopped.name, resumed.name]);
  assert.deepEqual(filesOf(context, resumed), [
    '01-implementer.followed.jsonl',
    '01-implementer.response.md',
    '02-implementer.followed.jsonl',
    '02-implementer.outcome.json',
    '03-reviewer.followed.jsonl',
    '03-reviewer.outcome.json',
    'definition.json',
    'heartbeat',
    'state.json',
  ]);
  const state = stateOf(context, resumed);
  assert.equal(state.branch, VARIANT_BRANCH);
  assert.equal(state.resumes, stopped.name);
  assert.deepEqual(filesUnder(base, stopped.directory), before);
});

// R1: the run chosen.

test('a resume resumes the latest run of the unit on the variant of the branch checked out', (testContext) => {
  const context = project(testContext);
  const { base, write, agentriteAt, answer } = context;
  write('one.json', JSON.stringify(ONE_STEP));
  const gpt = `${TRY_BRANCH}--gpt-6-1`;
  let call = 0;
  for (const [minutes, branch] of [
    [-5, VARIANT_BRANCH],
    [0, VARIANT_BRANCH],
    [0, gpt],
    [-5, TRY_BRANCH],
    [0, TRY_BRANCH],
  ]) {
    call += 1;
    answer(call, claudePrinted(responseOf({ ...DONE, outcome: 'needs-human', questions: ['Which?'] })));
    onBranch(base, branch);
    assert.equal(agentriteAt(minutesLater(minutes), 'orchestrate', '0029', '--definition', 'one.json').status, 3);
  }

  for (const [branch, variant] of [
    [TRY_BRANCH, null],
    [VARIANT_BRANCH, 'opus'],
    [gpt, 'gpt-6-1'],
  ]) {
    call += 1;
    answer(call, implemented());
    onBranch(base, branch);

    const result = resume(context, 1);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(
      firstLine(result.stdout),
      `Resuming the run ${runOf(0, variant).directory}/ at step 0, implementer, claude, claude-sonnet-5-5`,
    );
  }
});

// R10

test('a resume with --follow opens its first frame with its opening line, and keeps its files', (testContext) => {
  const context = stoppedRun(testContext, NO_OUTCOME());
  const { answer, read, stopped } = context;
  answer(4, claudePrinted(responseOf(DONE)));
  answer(5, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1, '--follow');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(
    result.stdout.startsWith(
      `${OPENING_RULE}\nResuming the run ${stopped.directory}/ at ${IMPLEMENTER_ROUND_1}\n` +
        `${IMPLEMENTER_ROUND_1}: started\n${CLOSING_RULE}\n`,
    ),
    result.stdout,
  );
  const resumed = runOf(1);
  assert.match(read(`${resumed.directory}/heartbeat`), HEARTBEAT_FORM);
  assert.ok(filesOf(context, resumed).includes('01-implementer.followed.jsonl'));
});

// Review finding S1: a run written by unit 0088, before asked, as it leaves its state.json.

function withoutAsked(context, run) {
  const state = stateOf(context, run);
  delete state.at.asked;
  context.write(`${run.directory}/state.json`, `${JSON.stringify(state, null, 2)}\n`);
}

test('a run without asked that stopped at an ask again is resumed at the step asked, numbered as it', (testContext) => {
  const context = stoppedRun(testContext, NO_OUTCOME());
  const { answer, calls, stopped } = context;
  withoutAsked(context, stopped);
  answer(4, claudePrinted(responseOf(DONE)));
  answer(5, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(firstLine(result.stdout), `Resuming the run ${stopped.directory}/ at ${IMPLEMENTER_ROUND_1}`);
  assert.deepEqual(startedLines(result.stdout), [`${IMPLEMENTER_ROUND_1}: started`, `${REVIEWER_ROUND_1}: started`]);
  assert.deepEqual(calls()[3].options.slice(-2), ['--resume', 'implementer-session']);
  assert.ok(filesOf(context, runOf(1)).includes('01-implementer.outcome.json'));
});

test('a run without asked that stopped at a step that is no ask again is resumed at that step', (testContext) => {
  const context = stoppedRun(testContext, [
    claudePrinted(responseOf(DONE)),
    claudePrinted(responseOf({ ...DONE, questions: ['Which?'] }), 'implementer-session'),
  ]);
  const { answer, stopped } = context;
  withoutAsked(context, stopped);
  answer(3, claudePrinted(responseOf(DONE)));
  answer(4, opencodePrinted(responseOf(DONE)));

  const result = resume(context, 1);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(firstLine(result.stdout), `Resuming the run ${stopped.directory}/ at ${IMPLEMENTER_ROUND_1}`);
  assert.deepEqual(startedLines(result.stdout), [`${IMPLEMENTER_ROUND_1}: started`, `${REVIEWER_ROUND_1}: started`]);
});

// R8, R9: the refusals of a resume.

const STOPPED_END = { status: 3, line: 'Step 2 stopped the run: its outcome is needs-human.' };
const REVIEWER_AT = { number: 2, item: 1, round: { at: 1, of: 3 }, index: 1, asked: false };

// Writes the run that started `minutes` after the first, as the orchestrator leaves one that stopped at the review
// of round 1 on the unit's branch, with the keys of `state` replaced, or removed when `undefined`, and with the text
// of a file given in `texts` in the place of the orchestrator's.
function writeRun({ write, read }, minutes, { state = {}, texts = {}, variant = null } = {}) {
  const run = runOf(minutes, variant);
  const full = {
    unit: UNIT,
    definition: 'node_modules/agentrite/orchestrator.json',
    branch: TRY_BRANCH,
    resumes: null,
    at: REVIEWER_AT,
    sessions: [],
    ended: STOPPED_END,
    ...state,
  };
  for (const [key, value] of Object.entries(state)) if (value === undefined) delete full[key];
  write(`${run.directory}/state.json`, texts.state ?? `${JSON.stringify(full, null, 2)}\n`);
  write(`${run.directory}/definition.json`, texts.definition ?? read('node_modules/agentrite/orchestrator.json'));
  if (texts.heartbeat !== undefined) write(`${run.directory}/heartbeat`, texts.heartbeat);
  return run;
}

function resumeRefused(testContext, prepare, args, message, branch = TRY_BRANCH) {
  const context = project(testContext);
  onBranch(context.base, branch);
  prepare(context);
  const orchestrator = () =>
    existsSync(join(context.base, '.orchestrator')) ? snapshot(context.base, '.orchestrator') : null;
  const before = orchestrator();

  const result = resume(context, 1, ...args);

  assert.equal(result.status, 1, `${message}: ${result.stdout}${result.stderr}`);
  assert.equal(result.stdout, '');
  if (message instanceof RegExp) assert.match(result.stderr, message);
  else assert.equal(result.stderr, `agentrite: ${message}\n`);
  assert.equal(context.calls().length, 0);
  assert.deepEqual(orchestrator(), before);
}

const STARTED_RUN = `.orchestrator/${UNIT}/${STARTED_AT}`;
const RESUME_TAKES = 'A resume takes a run that ended with the status 3, which a run does when it stops for the human';
const notStopped = (state, detail) => `the latest run, ${STARTED_RUN}/, is ${state}: ${detail}\n${RESUME_TAKES}`;
const otherBranch = (ran, checked) =>
  `the latest run, ${STARTED_RUN}/, ${ran}, and the branch checked out is ${checked}. ` +
  'A resume runs on the branch of the run it resumes';

test('a resume refuses a unit with no run on the variant, and a latest run that did not stop', (testContext) => {
  for (const [prepare, message, branch] of [
    [() => {}, `the unit ${UNIT} has no run without a variant`],
    [(context) => writeRun(context, 0, { variant: 'opus' }), `the unit ${UNIT} has no run without a variant`],
    [(context) => writeRun(context, 0), `the unit ${UNIT} has no run on the variant opus`, VARIANT_BRANCH],
    [
      (context) => {
        writeRun(context, -5);
        writeRun(context, 0, { state: { ended: null }, texts: { heartbeat: heartbeatText(minutesLater(1)) } });
      },
      notStopped('running', REVIEWER_ROUND_1),
    ],
    [
      (context) =>
        writeRun(context, 0, { state: { ended: null }, texts: { heartbeat: heartbeatText(minutesLater(-3)) } }),
      notStopped('stale', `no sign of life since 2026-10-21T09:57:00Z, at ${REVIEWER_ROUND_1}`),
    ],
    [
      (context) => writeRun(context, 0, { state: { ended: { status: 0, line: 'The run ran every item.' } } }),
      notStopped('ended', 'The run ran every item.'),
    ],
    [
      (context) => writeRun(context, 0, { state: { ended: { status: 1, line: 'It failed.' } } }),
      notStopped('ended', 'It failed.'),
    ],
  ]) {
    resumeRefused(testContext, prepare, [], message, branch);
  }
});

test('a resume refuses a latest run of no branch or another, and files not of the form', (testContext) => {
  const STATE = `${STARTED_RUN}/state.json`;
  const DEFINITION = `${STARTED_RUN}/definition.json`;
  for (const [prepare, message] of [
    [(context) => writeRun(context, 0, { state: { branch: undefined } }), otherBranch('holds no branch', TRY_BRANCH)],
    [(context) => writeRun(context, 0, { state: { branch: null } }), otherBranch('holds no branch', TRY_BRANCH)],
    [
      (context) => writeRun(context, 0, { state: { branch: 'feature-0029-another' } }),
      otherBranch('ran on the branch feature-0029-another', TRY_BRANCH),
    ],
    [(context) => writeRun(context, 0, { texts: { state: '{' } }), new RegExp(`^agentrite: ${STATE} is not JSON: `)],
    [
      (context) => writeRun(context, 0, { state: { extra: 1 } }),
      `${STATE}: extra is no key of state.json. state.json holds unit, definition, branch, resumes, at, sessions and ` +
        'ended',
    ],
    [
      (context) => writeRun(context, 0, { state: { at: null } }),
      `${STATE}: at is null. It must hold the step the run was at, in a run that ended`,
    ],
    [
      (context) => writeRun(context, 0, { texts: { definition: '{' } }),
      new RegExp(`^agentrite: ${DEFINITION} is not JSON: `),
    ],
    [
      (context) => writeRun(context, 0, { texts: { definition: '{}' } }),
      `${DEFINITION}: steps is missing. It must hold a list of one or more items, each a step or a repeat`,
    ],
  ]) {
    resumeRefused(testContext, prepare, [], message);
  }
});

test('a resume refuses a unit not approved or in progress, --definition, and an opted out project', (testContext) => {
  const status = (name) => (context) => {
    writeRun(context, 0);
    context.write(`changes/${UNIT}/record.md`, APPROVED.replace('approved', name));
  };
  for (const [prepare, args, message] of [
    ...['implemented', 'cancelled', 'draft'].map((name) => [
      status(name),
      [],
      `the unit changes/${UNIT}/ is ${name}, and a resume takes a unit that is approved or in progress`,
    ]),
    [
      (context) => writeRun(context, 0),
      ['--definition', 'node_modules/agentrite/orchestrator.json'],
      '--definition is not taken with --resume, since a resume runs the definition of the run it resumes',
    ],
    [
      (context) => {
        writeRun(context, 0);
        context.write('agentrite.json', JSON.stringify({ ...JSON.parse(SETTINGS), orchestrator: false }));
      },
      [],
      OPTED_OUT,
    ],
  ]) {
    resumeRefused(testContext, prepare, args, message);
  }
});

test('--prompt without --resume exits 2 with the usage, and starts nothing', (testContext) => {
  const { base, agentrite, calls } = project(testContext);

  const result = agentrite('orchestrate', '0029', '--prompt', 'Go on.');

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr.split('\n')[0], '--prompt is taken only with --resume');
  assert.ok(result.stderr.includes(`${USAGE_FORM}\n\n  <unit>`), result.stderr);
  assert.equal(calls().length, 0);
  assert.ok(!existsSync(join(base, '.orchestrator')));
});
