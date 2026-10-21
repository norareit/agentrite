import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { setTimeout as delay } from 'node:timers/promises';
import { parseDefinition } from '../scripts/agentrite-definition.mjs';
import {
  duration,
  endReport,
  exitStatus,
  judgeStep,
  orchestrate,
  parseOrchestrateArgs,
  ranTable,
  stepLine,
} from '../scripts/agentrite-orchestrate.mjs';
import { readOutcome } from '../scripts/agentrite-outcome.mjs';
import { installKit } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const NAMES = { roles: ['specifier', 'planner', 'implementer', 'reviewer'], harnesses: ['claude', 'opencode'] };
const DEFAULT = parseDefinition(readFileSync(new URL('../orchestrator.json', import.meta.url), 'utf-8'), {
  path: 'orchestrator.json',
  ...NAMES,
});

const FENCE = '```';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

// The final response of a step that gives `outcome`, with prose around it.
function responseOf(outcome) {
  return `I did the work.\n\n${FENCE}json\n${JSON.stringify(outcome, null, 2)}\n${FENCE}\n`;
}

const DONE = { outcome: 'done', summary: 'Did it.', questions: [], findings: [], declines: [] };
const BLOCKING = { id: 'S1', blocking: true, summary: 'R1 is not met' };
const MINOR = { id: 'C1', blocking: false, summary: 'A name could be clearer' };

const done = (overrides = {}) => ({ response: responseOf({ ...DONE, ...overrides }) });
const blocked = () => done({ findings: [BLOCKING, MINOR] });
const clean = () => done({ findings: [MINOR] });

// Runs `definition` with effects whose `run` gives the results listed, in turn, and records what it is given.
async function runWith(definition, results) {
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
  const outcome = await orchestrate(definition, effects);
  const planned = calls.filter(([kind]) => kind === 'run').map(([, step]) => step);
  return { ...outcome, calls, planned, left: queue.length };
}

const summary = (planned) =>
  planned.map(({ number, round, step }) => [number, step.role, round === undefined ? '-' : `${round.at}/${round.of}`]);

// R12, R19, R20

test('the default with no blocking finding at the first review runs steps 0 to 2 and ends complete', async () => {
  const run = await runWith(DEFAULT, [done(), done(), clean()]);
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

// The review's finding S1: an outcome in a blockquote lets the run go on.
test('a step that gives its outcome in a blockquote does not stop the run', async () => {
  const quoted = (outcome) => ({ response: responseOf(outcome).replace(/^/gm, '> ') });
  const run = await runWith(DEFAULT, [quoted(DONE), quoted(DONE), quoted({ ...DONE, findings: [MINOR] })]);
  assert.equal(run.planned.length, 3);
  assert.deepEqual(run.end, { kind: 'complete' });
});

// The delta review's finding S2: a quoted block left open does not hide the outcome after it.
test('a step whose quoted block is left open before its outcome does not stop the run', async () => {
  const after = (outcome) => ({ response: `> ${FENCE}bash\n> npm test\n\n${responseOf(outcome)}` });
  const run = await runWith(DEFAULT, [after(DONE), after(DONE), after({ ...DONE, findings: [MINOR] })]);
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
  assert.equal(judgeStep(step, ok, reading({ ...all, outcome: 'done', declines: [] })), 'stopWhen');
  assert.equal(judgeStep(step, ok, reading({ ...DONE, findings: [MINOR] })), undefined);
  assert.equal(judgeStep({ ...step, stopWhen: undefined }, ok, reading({ ...DONE, findings: [BLOCKING] })), undefined);
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
  const run = await runWith(DEFAULT, [done(), done(), clean()]);
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

// R14

const planner = { number: 0, item: 0, round: undefined, index: undefined, step: DEFAULT.steps[0], session: undefined };
const reviewer = {
  number: 2,
  item: 1,
  round: { at: 1, of: 3 },
  index: 1,
  step: DEFAULT.steps[1].repeat.steps[1],
  session: undefined,
};

function ended(planned, result) {
  const defaults = { status: 0, signal: null, response: undefined, session: undefined, milliseconds: 8000 };
  const full = { ...defaults, timedOut: false, ...result };
  const reading = full.response === undefined || full.timedOut ? { kind: 'none' } : readOutcome(full.response);
  return { planned, result: full, reading, stop: judgeStep(planned.step, full, reading) };
}

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
  return endReport(run.ran, run.end, where).split('\n');
}

test(
  'the report of a run that ran every item gives the table, the line of the end, the summary and where',
  async () => {
    const lines = await reportOf([done(), done(), done({ summary: 'Reviewed it.', findings: [MINOR] })]);
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

// R10

const USAGE_FORM = 'usage: agentrite orchestrate <unit> [--definition <file>] [--skip-permissions]';

test('parseOrchestrateArgs takes the unit, --definition in both forms and --skip-permissions, at any place', () => {
  assert.deepEqual(parseOrchestrateArgs(['0029']), { unit: '0029', definition: undefined, skipPermissions: false });
  for (const args of [
    ['0029', '--definition', 'other.json', '--skip-permissions'],
    ['--definition=other.json', '0029', '--skip-permissions'],
    ['--skip-permissions', '--definition', 'other.json', '0029'],
  ]) {
    assert.deepEqual(
      parseOrchestrateArgs(args),
      { unit: '0029', definition: 'other.json', skipPermissions: true },
      args.join(' '),
    );
  }
  assert.equal(parseOrchestrateArgs(['0029', '--definition=-odd.json']).definition, '-odd.json');
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

// Counts its calls in $FAKE_DIR, writes its name and arguments to call-<n>, prints out-<n> and exits with the status
// in status-<n>, or 0. With wait-<n>, it writes its process id to pid-<n> and becomes a sleep of that many seconds,
// ignoring SIGTERM with ignore-term-<n>. Nothing but the builtins of sh and the sleep linked into the PATH, since it
// holds no other command. The sleep is exec'd, so that the harness stays one process whose id the test knows: a job
// started in the background would ignore SIGINT, where the harness would not.
const FAKE_HARNESS = `#!/bin/sh
count=0
if [ -f "$FAKE_DIR/count" ]; then read -r count < "$FAKE_DIR/count"; fi
count=$((count + 1))
printf '%s\\n' "$count" > "$FAKE_DIR/count"
printf '%s\\n' "\${0##*/}" "$@" > "$FAKE_DIR/call-$count"
if [ -f "$FAKE_DIR/out-$count" ]; then
  while IFS= read -r line || [ -n "$line" ]; do printf '%s\\n' "$line"; done < "$FAKE_DIR/out-$count"
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
const SETTINGS = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const UNIT = '0029-try-the-orchestrator';
const APPROVED = '---\nkind: feature\nstatus: approved\ntimestamp: 2026-10-21T10:00:00Z\n---\n\n# 0029\n';

function project(t) {
  const base = temporaryDirectory(t, 'agentrite-orchestrate-');
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
  const options = { cwd: base, env: { PATH: join(base, 'bin'), FAKE_DIR: fakes } };
  const agentrite = (...args) => spawnSync(process.execPath, [script, ...args], { ...options, encoding: 'utf-8' });
  // The command started and not waited on, with a promise of how it ended and what it printed, and one of how it
  // exited, which does not wait for whatever process it left holding its output.
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
    return { child, ended, exited };
  };
  write('agentrite.json', SETTINGS);
  assert.equal(agentrite('refresh').status, 0);
  write(`changes/${UNIT}/record.md`, APPROVED);
  // What the fake prints, and the status it exits with, at its call `number`, counted from 1.
  const answer = (number, printed, status) => {
    writeFileSync(join(fakes, `out-${number}`), printed);
    if (status !== undefined) writeFileSync(join(fakes, `status-${number}`), `${status}\n`);
  };
  // That the fake waits `seconds` at its call `number`, after it printed, and ignores SIGTERM with `ignoreTerm`.
  const waits = (number, seconds, ignoreTerm = false) => {
    writeFileSync(join(fakes, `wait-${number}`), `${seconds}\n`);
    if (ignoreTerm) writeFileSync(join(fakes, `ignore-term-${number}`), '');
  };
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
  return { base, write, read, agentrite, started, answer, waits, pidOf, calls };
}

// A call of the fake: its name, the arguments before the prompt, and the prompt, which is the last argument and may
// hold line breaks.
function callOf(text) {
  const lines = text.slice(0, -1).split('\n');
  const end = lines.indexOf('--');
  return { harness: lines[0], options: lines.slice(1, end), prompt: lines.slice(end + 1).join('\n') };
}

// What Claude Code prints headless for a final response, with the session's id when one is given.
function claudePrinted(response, session) {
  const printed = { type: 'result', subtype: 'success', is_error: false, result: response };
  return `${JSON.stringify(session === undefined ? printed : { ...printed, session_id: session })}\n`;
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

test('a run whose every item ends runs the default definition and exits 0', (t) => {
  const { base, agentrite, answer, calls, read } = project(t);
  answerDefault(answer, [{ summary: 'Planned.' }, { summary: 'Built.' }, { summary: 'Reviewed.', findings: [MINOR] }]);

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
  assert.deepEqual(planner.options.slice(0, 7), [
    '--print',
    '--agent',
    'planner',
    '--model',
    'claude-opus-5-5',
    '--output-format',
    'json',
  ]);
  assert.equal(planner.options[7], '--session-id');
  assert.match(planner.options[8], UUID);
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
    '00-planner.outcome.json',
    '01-implementer.outcome.json',
    '02-reviewer.outcome.json',
    'definition.json',
    'state.json',
  ]);
  assert.equal(read(`${run.name}/definition.json`), read('node_modules/agentrite/orchestrator.json'));
  assert.deepEqual(JSON.parse(read(`${run.name}/00-planner.outcome.json`)), { ...DONE, summary: 'Planned.' });
  const state = JSON.parse(read(`${run.name}/state.json`));
  assert.equal(state.unit, UNIT);
  assert.equal(state.definition, 'node_modules/agentrite/orchestrator.json');
  assert.deepEqual(state.at, { number: 2, item: 1, round: { at: 1, of: 3 }, index: 1 });
  assert.deepEqual(state.sessions, [
    { role: 'planner', harness: 'claude', session: planner.options[8] },
    { role: 'implementer', harness: 'claude', session: implementer.options[8] },
    { role: 'reviewer', harness: 'opencode', session: 'ses_test' },
  ]);
  assert.deepEqual(state.ended, { status: 0, line: 'The run ran every item of the definition to its end.' });
});

test('a run whose repeat ends at its first round goes on with the item after the repeat', (t) => {
  const { base, write, agentrite, answer, calls } = project(t);
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

test('a run whose repeat runs out exits 3, with the open findings and the rounds, the sessions continued', (t) => {
  const { agentrite, answer, calls } = project(t);
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
});

test('a Claude Code session that prints another id is resumed by the id it printed', (t) => {
  const { agentrite, answer, calls } = project(t);
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

test('a repeat without until runs all its rounds, and the run then ends', (t) => {
  const { write, agentrite, answer, calls } = project(t);
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

test('stopWhen stops a run outside a repeat, and inside it on the review, exiting 3', (t) => {
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
    const { write, agentrite, answer, calls } = project(t);
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

test('each stop of a step exits 3, starts nothing after the step and says what the human needs', (t) => {
  for (const [printed, status, lines, file] of [
    [
      claudePrinted(responseOf({ ...DONE, outcome: 'needs-human', questions: ['Which branch?'] })),
      undefined,
      ['Step 1 stopped the run: its outcome is needs-human.', 'Summary: Did it.', 'Questions:', '  - Which branch?'],
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
      claudePrinted('I did the work, and give no block.'),
      undefined,
      ['Step 1 stopped the run: its final response holds no block marked json.', 'The final response of step 1 is at'],
      'response.md',
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
    const { base, agentrite, answer, calls, read } = project(t);
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
    const names = readdirSync(run.path);
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

test('--skip-permissions gives every call the flag of its harness', (t) => {
  const { agentrite, answer, calls } = project(t);
  answerDefault(answer, [{}, {}, {}]);

  const result = agentrite('orchestrate', '--skip-permissions', '0029');

  assert.equal(result.status, 0, result.stderr);
  const [planner, implementer, reviewer] = calls();
  assert.ok(planner.options.includes('--dangerously-skip-permissions'));
  assert.ok(implementer.options.includes('--dangerously-skip-permissions'));
  assert.ok(reviewer.options.includes('--auto'));
});

test('a definition given with --definition, relative or absolute, is run and copied into the run directory', (t) => {
  for (const absolute of [false, true]) {
    const { base, write, read, agentrite, answer, calls } = project(t);
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
});

// R11

function refused(t, prepare, args, message) {
  const { base, agentrite, calls, write } = project(t);
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

test('the refusals of requirement 11 exit 1, start nothing and make no .orchestrator', (t) => {
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
    ...['draft', 'in-progress', 'implemented'].map((name) => [
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
    refused(t, prepare, args, message);
  }
});

const ORCHESTRATE_USAGE_FORM = 'usage: agentrite orchestrate <unit> [--definition <file>] [--skip-permissions]';

test('no argument, or one it does not take, prints the usage on standard error and exits 2, starting nothing', (t) => {
  for (const [args, first] of [
    [[], ORCHESTRATE_USAGE_FORM],
    [['0029', '--model', 'x'], 'unknown option: --model'],
  ]) {
    const { base, agentrite, calls } = project(t);

    const result = agentrite('orchestrate', ...args);

    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr.split('\n')[0], first);
    assert.ok(result.stderr.includes(`${ORCHESTRATE_USAGE_FORM}\n\n  <unit>`), result.stderr);
    assert.equal(calls().length, 0);
    assert.ok(!existsSync(join(base, '.orchestrator')));
  }
});

// R24

test('.orchestrator/.gitignore is written when missing or holding anything else, and left when it holds *', (t) => {
  for (const [before, kept] of [
    [undefined, false],
    ['node_modules\n', false],
    ['*', false],
    ['*\n', true],
  ]) {
    const { base, write, agentrite, answer } = project(t);
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
});

// R22

test('a run writes nothing outside .orchestrator, and leaves the record as it was', (t) => {
  const { base, agentrite, answer } = project(t);
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

// True once the process `pid` is gone: there is none, or it is a zombie not yet reaped by whatever adopted it. Polls
// for up to 5 seconds, since the reaping is not instant.
async function gone(pid) {
  for (let tries = 0; tries < 250; tries += 1) {
    try {
      process.kill(pid, 0);
      const stat = readFileSync(`/proc/${pid}/stat`, 'utf-8');
      if (stat.slice(stat.lastIndexOf(')') + 2).startsWith('Z')) return true;
    } catch (error) {
      // Gone between the two looks, when /proc no longer has it.
      if (error.code === 'ESRCH' || error.code === 'ENOENT') return true;
      throw error;
    }
    await delay(20);
  }
  return false;
}

const ONE_STEP = { steps: [{ role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5' }] };

test('a signal to the command alone while a step runs ends the step, and the command by that signal', async (t) => {
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    const { write, started, waits, pidOf } = project(t);
    write('one.json', JSON.stringify(ONE_STEP));
    waits(1, 60);
    const { child, exited } = started('orchestrate', '0029', '--definition', 'one.json');
    const harness = await pidOf(1);

    process.kill(child.pid, signal);

    const result = await exited;
    assert.equal(result.signal, signal, `${signal}: ${result.stderr}`);
    assert.ok(await gone(harness), `${signal}: the harness ${harness} is left`);
  }
});

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

test('a step past its limit is ended by SIGTERM, and the run stops by the case, its response kept', async (t) => {
  const { base, write, read, started, answer, waits, pidOf, calls } = project(t);
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
  assert.ok(result.stdout.includes(`\n${LIMIT_LINE}\nThe final response of step 0 is at ${path}.\n\n`), result.stdout);
  assert.ok(!result.stdout.includes('Not finished.'), result.stdout);
  assert.ok(read(path).includes('"summary": "Not finished."'));
  assert.deepEqual(readdirSync(run.path).sort(), ['00-implementer.response.md', 'definition.json', 'state.json']);
  const state = JSON.parse(read(`${run.name}/state.json`));
  assert.deepEqual(state.sessions, [{ role: 'implementer', harness: 'claude', session: calls()[0].options[8] }]);
  assert.match(state.sessions[0].session, UUID);
  assert.deepEqual(state.ended, { status: 3, line: LIMIT_LINE });
  assert.ok(await gone(harness), `the harness ${harness} is left`);
});

test('a step that ignores SIGTERM past its limit is ended by SIGKILL 10 seconds later', async (t) => {
  const { write, started, answer, waits, pidOf, calls } = project(t);
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

test('a step with a limit that ends in time ends as it would without the limit', (t) => {
  const { write, agentrite, answer, calls } = project(t);
  write('limited.json', JSON.stringify(limitedTo(1)));
  answer(1, claudePrinted(responseOf(DONE)));
  answer(2, opencodePrinted(responseOf(DONE)));

  const result = agentrite('orchestrate', '0029', '--definition', 'limited.json');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(calls().length, 2);
  assert.match(stepLines(result.stdout)[1], /^step 0, implementer, claude, claude-sonnet-5-5: done after 0m 0\ds$/);
  assert.ok(result.stdout.includes('\nThe run ran every item of the definition to its end.\n'), result.stdout);
});
