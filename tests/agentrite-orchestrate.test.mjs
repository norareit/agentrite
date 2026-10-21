import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
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

const NAMES = { roles: ['specifier', 'planner', 'implementer', 'reviewer'], harnesses: ['claude', 'opencode'] };
const DEFAULT = parseDefinition(readFileSync(new URL('../orchestrator.json', import.meta.url), 'utf-8'), {
  path: 'orchestrator.json',
  ...NAMES,
});

const FENCE = '```';

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
function runWith(definition, results) {
  const calls = [];
  const queue = [...results];
  const effects = {
    started: (planned) => calls.push(['started', planned]),
    run: (planned) => {
      calls.push(['run', planned]);
      assert.ok(queue.length > 0, `step ${planned.number} ran, and no result was listed for it`);
      return { status: 0, signal: null, response: undefined, session: undefined, milliseconds: 1000, ...queue.shift() };
    },
    ended: (ran) => calls.push(['ended', ran]),
  };
  const outcome = orchestrate(definition, effects);
  const planned = calls.filter(([kind]) => kind === 'run').map(([, step]) => step);
  return { ...outcome, calls, planned, left: queue.length };
}

const summary = (planned) =>
  planned.map(({ number, round, step }) => [number, step.role, round === undefined ? '-' : `${round.at}/${round.of}`]);

// R12, R19, R20

test('the default with no blocking finding at the first review runs steps 0 to 2 and ends complete', () => {
  const run = runWith(DEFAULT, [done(), done(), clean()]);
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

test('the default with blocking findings at the first two reviews runs seven steps, and at all three runs out', () => {
  const seven = runWith(DEFAULT, [done(), done(), blocked(), done(), blocked(), done(), clean()]);
  assert.equal(seven.planned.length, 7);
  assert.deepEqual(seven.end, { kind: 'complete' });
  assert.deepEqual(summary(seven.planned).slice(5), [
    [5, 'implementer', '3/3'],
    [6, 'reviewer', '3/3'],
  ]);

  const out = runWith(DEFAULT, [done(), done(), blocked(), done(), blocked(), done(), blocked()]);
  assert.equal(out.planned.length, 7);
  assert.equal(out.end.kind, 'ran-out');
  assert.equal(out.end.rounds, 3);
  assert.equal(out.end.ran.planned.number, 6);
  assert.equal(exitStatus(out.end), 3);
});

test('a repeat without until runs all its rounds, whatever the findings, and then the step after it', () => {
  const definition = {
    steps: [
      { repeat: { times: 2, steps: [{ role: 'reviewer', harness: 'opencode', model: 'm' }] } },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const run = runWith(definition, [blocked(), blocked(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'reviewer', '1/2'],
    [1, 'reviewer', '2/2'],
    [2, 'planner', '-'],
  ]);
  assert.deepEqual(run.end, { kind: 'complete' });
});

test('a repeat with until that holds at once goes on with the item after it', () => {
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
  const run = runWith(definition, [clean(), done()]);
  assert.deepEqual(summary(run.planned), [
    [0, 'reviewer', '1/3'],
    [1, 'planner', '-'],
  ]);
  assert.deepEqual(run.end, { kind: 'complete' });
});

// R18, R19: stopWhen, and the step judged before the repeat.

test('stopWhen on a step outside a repeat stops after it at a blocking finding, and not without one', () => {
  const definition = {
    steps: [
      { role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' },
      { role: 'planner', harness: 'claude', model: 'm' },
    ],
  };
  const stopped = runWith(definition, [blocked()]);
  assert.equal(stopped.planned.length, 1);
  assert.equal(stopped.end.kind, 'stopped');
  assert.equal(stopped.end.by, 'stopWhen');
  assert.equal(exitStatus(stopped.end), 3);

  const going = runWith(definition, [clean(), done()]);
  assert.equal(going.planned.length, 2);
  assert.deepEqual(going.end, { kind: 'complete' });
});

test('stopWhen on the last step of a repeat with until stops at its first blocking finding, before until', () => {
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
  const run = runWith(definition, [done(), blocked()]);
  assert.equal(run.planned.length, 2);
  assert.equal(run.end.kind, 'stopped');
  assert.equal(run.end.by, 'stopWhen');
  assert.equal(run.end.ran.planned.number, 1);
});

// R18: each case stops at the step it holds for.

test('each case of requirement 18 stops at the step it holds for and runs nothing after it', () => {
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
    const run = runWith(DEFAULT, [done(), done(), result]);
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
  const ok = { status: 0, signal: null };
  assert.equal(judgeStep(step, { status: 1, signal: null }, { kind: 'none' }), 'harness');
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

test('a harness that exits 1 with an outcome that is done stops by harness, and its outcome is read', () => {
  const run = runWith(DEFAULT, [{ status: 1, ...done() }]);
  assert.equal(run.end.by, 'harness');
  assert.equal(run.ran[0].reading.kind, 'outcome');
});

// R13: the sessions.

test('a later step of one role and harness gets the session the earlier one returned, and another harness none', () => {
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
  const run = runWith(definition, [
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
});

test('started and ended are called once each per step, in order, ended with the reading and the stop', () => {
  const run = runWith(DEFAULT, [done(), done(), clean()]);
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
  const full = { status: 0, signal: null, response: undefined, session: undefined, milliseconds: 8000, ...result };
  const reading = full.response === undefined ? { kind: 'none' } : readOutcome(full.response);
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

function reportOf(results, definition = DEFAULT, where = WHERE) {
  const run = runWith(definition, results);
  return endReport(run.ran, run.end, where).split('\n');
}

test('the report of a run that ran every item gives the table, the line of the end, the summary and where', () => {
  const lines = reportOf([done(), done(), done({ summary: 'Reviewed it.', findings: [MINOR] })]);
  assert.deepEqual(lines.slice(3), [
    '',
    'The run ran every item of the definition to its end.',
    'Summary: Reviewed it.',
    ...WHERE_LINES,
    '',
  ]);
  assert.match(lines[0], /^0 {2}planner {6}claude {4}claude-opus-5-5 {5}0m 01s$/);
});

test('the report of a repeat that ran out gives the open blocking findings and the rounds', () => {
  const findings = [BLOCKING, MINOR, { ...BLOCKING, id: 'S2', summary: 'R2' }];
  const last = done({ summary: 'Reviewed again.', findings });
  const lines = reportOf([done(), done(), blocked(), done(), blocked(), done(), last]);
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

test('the report of a stop by stopWhen gives the open blocking findings', () => {
  const definition = { steps: [{ role: 'reviewer', harness: 'opencode', model: 'm', stopWhen: 'blocking-findings' }] };
  const lines = reportOf([blocked()], definition);
  assert.deepEqual(lines.slice(2), [
    'Step 0 stopped the run: it holds stopWhen "blocking-findings", and a finding of its outcome blocks.',
    'Summary: Did it.',
    'Blocking findings still open:',
    '  S1: R1 is not met',
    ...WHERE_LINES,
    '',
  ]);
});

test('the report of a stop for the human gives the questions and the proposed declines', () => {
  const asks = done({
    outcome: 'needs-human',
    summary: 'Stopped.',
    questions: ['Which branch?', 'May I add a dependency?'],
    declines: [{ finding: 'S1', reason: 'The spec allows it.' }],
  });
  assert.deepEqual(reportOf([done(), asks]).slice(3), [
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
  assert.deepEqual(reportOf([done(), declines]).slice(3, 7), [
    'Step 1 stopped the run: it proposes declines of findings, which the human decides.',
    'Summary: Did it.',
    'Proposed declines:',
    '  S1: The spec allows it.',
  ]);
  assert.equal(reportOf([done(), done({ outcome: 'failed' })])[3], 'Step 1 stopped the run: its outcome is failed.');
});

test('the report of a step with no outcome of the form gives the path of its response, or that there is none', () => {
  const where = { ...WHERE, responsePath: '.orchestrator/0029-x/2026-10-21T10:00:00Z/01-implementer.response.md' };
  const malformed = { response: `${FENCE}json\n{"outcome": "done", "summary": "Secret."}\n${FENCE}` };
  assert.deepEqual(reportOf([done({ summary: 'Planned.' }), malformed], DEFAULT, where).slice(3), [
    'Step 1 stopped the run: its outcome is not of the form asked for. questions is missing. ' +
      'It must hold a list of strings.',
    `The final response of step 1 is at ${where.responsePath}.`,
    ...WHERE_LINES,
    '',
  ]);
  assert.deepEqual(reportOf([done(), { response: 'No block.' }], DEFAULT, where).slice(3, 5), [
    'Step 1 stopped the run: its final response holds no block marked json.',
    `The final response of step 1 is at ${where.responsePath}.`,
  ]);
  assert.equal(
    reportOf([done(), { response: `${responseOf(DONE)}${responseOf(DONE)}` }], DEFAULT, where)[3],
    'Step 1 stopped the run: its final response holds 2 blocks marked json, not one.',
  );
  assert.deepEqual(reportOf([done(), { status: 1 }]).slice(3, 5), [
    'Step 1 stopped the run: its harness exited with 1.',
    'The harness gave step 1 no final response.',
  ]);
  assert.equal(
    reportOf([done(), { status: null, signal: 'SIGTERM' }])[3],
    'Step 1 stopped the run: its harness was ended by SIGTERM.',
  );
});

test('the report of a harness that failed after it gave an outcome gives the outcome', () => {
  assert.deepEqual(reportOf([done(), { status: 1, ...done({ summary: 'Half done.' }) }]).slice(3, 5), [
    'Step 1 stopped the run: its harness exited with 1.',
    'Summary: Half done.',
  ]);
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
