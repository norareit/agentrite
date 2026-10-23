import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  isRunDirectory,
  parseRunsArgs,
  runFrom,
  runsJson,
  runsListing,
  RUNS_FORM,
  runStateOf,
  selectRuns,
} from '../scripts/agentrite-runs.mjs';
import { readRuns } from '../scripts/agentrite.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const DEFAULT = readFileSync(new URL('../orchestrator.json', import.meta.url), 'utf-8');
const INSTANT = '2026-10-21T10:00:00Z';
const NOW = Date.parse('2026-10-21T12:00:00Z');

// R6, R19: the arguments

test('no argument gives the default limit, no number and text', () => {
  assert.deepEqual(parseRunsArgs([]), { number: undefined, limit: 50, json: false });
});

test('a number, a limit and --json are read, the options at any place among the arguments', () => {
  assert.deepEqual(parseRunsArgs(['0029']), { number: '0029', limit: 50, json: false });
  assert.equal(parseRunsArgs(['--limit', '5']).limit, 5);
  assert.equal(parseRunsArgs(['--limit=5']).limit, 5);
  assert.equal(parseRunsArgs(['--limit', '0']).limit, 0);
  assert.equal(parseRunsArgs(['--json']).json, true);
  for (const args of [
    ['--json', '--limit', '3', '0029'],
    ['--limit', '3', '0029', '--json'],
    ['0029', '--json', '--limit', '3'],
  ]) {
    assert.deepEqual(parseRunsArgs(args), { number: '0029', limit: 3, json: true });
  }
});

test('each wrong argument throws the line that names it, then the form', () => {
  for (const [args, line] of [
    [['29'], '<number> is exactly four digits, not 29'],
    [['00290'], '<number> is exactly four digits, not 00290'],
    [['0029', '0030'], 'unexpected argument: 0030'],
    [['--limit'], '--limit takes a count, and none was given'],
    [['--limit', '--json'], '--limit takes a count, and none was given'],
    [['--limit', '1', '--limit', '2'], '--limit was given twice'],
    [['--limit', '-1'], '--limit takes a count, and none was given'],
    [['--limit=-1'], '--limit takes a whole number of zero or more, not -1'],
    [['--limit', '1.5'], '--limit takes a whole number of zero or more, not 1.5'],
    [['--limit', 'x'], '--limit takes a whole number of zero or more, not x'],
    [['--json=yes'], '--json takes no value'],
    [['--status', 'draft'], 'unknown option: --status'],
  ]) {
    assert.throws(() => parseRunsArgs(args), { message: `${line}\n${RUNS_FORM}` }, args.join(' '));
  }
});

// R7: which directories are runs

test('the directory of a run is an instant, alone or followed by -- and a variant', () => {
  for (const name of [INSTANT, `${INSTANT}--opus`, `${INSTANT}--gpt-6-1`]) assert.ok(isRunDirectory(name), name);
  for (const name of [
    `${INSTANT}--`,
    `${INSTANT}--Opus`,
    `${INSTANT}-opus`,
    '2026-10-21T10:00Z',
    '2026-10-21 10:00:00Z',
    `.${INSTANT}`,
    'latest',
  ]) {
    assert.ok(!isRunDirectory(name), name);
  }
});

// The files of a run, as the orchestrator writes them.

const STEP_AT = { number: 2, item: 1, round: { at: 1, of: 3 }, index: 1 };
const FIRST_AT = { number: 0, item: 0, round: null, index: null };

function stateText(overrides = {}) {
  const state = {
    unit: '0029-x',
    definition: 'node_modules/agentrite/orchestrator.json',
    branch: null,
    at: STEP_AT,
    sessions: [{ role: 'planner', harness: 'claude', session: 'abc' }],
    ended: null,
    ...overrides,
  };
  for (const key of Object.keys(overrides)) if (overrides[key] === undefined) delete state[key];
  return `${JSON.stringify(state, null, 2)}\n`;
}

const ONE_HUNDRED_AND_ONE = JSON.stringify({
  steps: [{ repeat: { times: 101, steps: [{ role: 'implementer', harness: 'claude', model: 'm' }] } }],
});

function read(overrides = {}, { name = INSTANT, definition = DEFAULT, ...given } = {}) {
  const heartbeat = 'heartbeat' in given ? given.heartbeat : '2026-10-21T10:00:30Z\n';
  return runFrom('0029-x', name, { state: stateText(overrides), definition, heartbeat });
}

test('a run at a step in a repeat gives its step, its head and the name of its followed file', () => {
  const run = read();
  assert.deepEqual(run.step, {
    number: 2,
    round: 1,
    rounds: 3,
    role: 'reviewer',
    harness: 'opencode',
    model: 'openai/gpt-6.1-sol',
  });
  assert.equal(run.head, 'step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol');
  assert.equal(run.followedName, '02-reviewer.followed.jsonl');
  assert.equal(run.directory, `.orchestrator/0029-x/${INSTANT}`);
  assert.equal(run.number, '0029');
  assert.equal(run.run, INSTANT);
});

test('a run at a step outside a repeat has no round and no rounds, and one before its first step has no step', () => {
  const first = read({ at: FIRST_AT });
  assert.deepEqual(first.step, {
    number: 0,
    round: null,
    rounds: null,
    role: 'planner',
    harness: 'claude',
    model: 'claude-opus-5-5',
  });
  assert.equal(first.head, 'step 0, planner, claude, claude-opus-5-5');
  assert.equal(first.followedName, '00-planner.followed.jsonl');

  const before = read({ at: null });
  assert.equal(before.step, null);
  assert.equal(before.head, null);
  assert.equal(before.followedName, null);
});

test('a followed file of a definition of 101 steps is numbered with three digits', () => {
  const at = { number: 100, item: 0, round: { at: 101, of: 101 }, index: 0 };
  assert.equal(read({ at }, { definition: ONE_HUNDRED_AND_ONE }).followedName, '100-implementer.followed.jsonl');
});

test('the branch is the one state.json holds, and null for a state.json without one', () => {
  assert.equal(read({ branch: 'feature-0029-x--opus' }).branch, 'feature-0029-x--opus');
  assert.equal(read({ branch: undefined }).branch, null);
});

test('the variant is what the directory name gives after the --, and null without one', () => {
  assert.equal(read({}, { name: `${INSTANT}--opus` }).variant, 'opus');
  assert.equal(read({}, { name: `${INSTANT}--gpt-6-1` }).variant, 'gpt-6-1');
  assert.equal(read({}, { name: INSTANT }).variant, null);
  assert.equal(read({}, { name: `${INSTANT}--opus` }).run, INSTANT);
});

test('an end is kept, and a run with an end is ended whatever its heartbeat holds', () => {
  const run = read({ ended: { status: 0, line: 'The run ran every item of the definition to its end.' } });
  assert.deepEqual(run.ended, { status: 0, line: 'The run ran every item of the definition to its end.' });
  assert.equal(runStateOf(run, Date.parse('2026-10-21T10:00:30Z')), 'ended');
  assert.equal(read().ended, null);
});

test('a run without an end is running up to 60 seconds after its heartbeat, and stale after', () => {
  const run = read();
  const beat = Date.parse('2026-10-21T10:00:30Z');
  assert.equal(runStateOf(run, beat), 'running');
  assert.equal(runStateOf(run, beat + 60_000), 'running');
  assert.equal(runStateOf(run, beat + 60_001), 'stale');
});

test('a heartbeat that is missing or not of the form is null, and the run is stale', () => {
  for (const heartbeat of [undefined, '', '2026-10-21T10:00:30Z', '2026-10-21T10:00:30Z\nmore\n']) {
    const run = read({}, { heartbeat });
    assert.equal(run.heartbeat, null, String(heartbeat));
    assert.equal(runStateOf(run, Date.parse('2026-10-21T10:00:31Z')), 'stale');
  }
});

test('a heartbeat of the form that no instant reads is kept, and the run is stale', () => {
  const run = read({}, { heartbeat: '2026-99-99T99:99:99Z\n' });
  assert.equal(run.heartbeat, '2026-99-99T99:99:99Z');
  assert.equal(runStateOf(run, NOW), 'stale');
});

// R13: the refusals

const STATE_FILE = `.orchestrator/0029-x/${INSTANT}/state.json`;
const DEFINITION_FILE = `.orchestrator/0029-x/${INSTANT}/definition.json`;

function refusesRun(texts, message) {
  assert.throws(() => runFrom('0029-x', INSTANT, texts), { message });
}

test('a state.json that is not of the form the orchestrator writes is refused, naming the file and the fault', () => {
  const definition = DEFAULT;
  const refuses = (state, message) => refusesRun({ state, definition, heartbeat: undefined }, message);
  const withKey = (key, value) => JSON.parse(stateText({ [key]: value }));

  assert.throws(() => runFrom('0029-x', INSTANT, { state: 'x', definition, heartbeat: undefined }), {
    message: new RegExp(`^${STATE_FILE.replaceAll('.', '\\.')} is not JSON: `),
  });
  refuses('[]', `${STATE_FILE} holds [], which is no JSON object`);
  refuses(
    JSON.stringify({ ...withKey('extra', 1) }),
    `${STATE_FILE}: extra is no key of state.json. state.json holds unit, definition, branch, at, sessions and ended`,
  );
  const { unit, ...withoutUnit } = withKey('at', null);
  refuses(JSON.stringify(withoutUnit), `${STATE_FILE}: unit is missing. It must hold a string that is not empty`);
  refuses(
    JSON.stringify(withKey('branch', '')),
    `${STATE_FILE}: branch is "". It must hold a string that is not empty`,
  );
  refuses(
    JSON.stringify(withKey('at', { ...STEP_AT, number: -1 })),
    `${STATE_FILE}: at.number is -1. It must hold a whole number of 0 or more`,
  );
  refuses(
    JSON.stringify(withKey('at', { ...STEP_AT, round: { at: 4, of: 3 } })),
    `${STATE_FILE}: at.round is {"at":4,"of":3}. It must hold an at of at most of`,
  );
  refuses(
    JSON.stringify(withKey('sessions', [{ role: 'planner', harness: 'claude' }])),
    `${STATE_FILE}: sessions[0].session is missing. It must hold a string that is not empty`,
  );
  refuses(
    JSON.stringify(withKey('ended', { status: '0', line: 'x' })),
    `${STATE_FILE}: ended.status is "0". It must hold a whole number`,
  );
});

test('a definition.json that is not of the form is refused, naming the file', () => {
  const state = stateText();
  assert.throws(() => runFrom('0029-x', INSTANT, { state, definition: 'x', heartbeat: undefined }), {
    message: new RegExp(`^${DEFINITION_FILE.replaceAll('.', '\\.')} is not JSON: `),
  });
  assert.throws(() => runFrom('0029-x', INSTANT, { state, definition: '{}', heartbeat: undefined }), {
    message: `${DEFINITION_FILE}: steps is missing. It must hold a list of one or more items, each a step or a repeat`,
  });
});

test('an at that names a step the definition does not have is refused', () => {
  const message = `${STATE_FILE}: at names a step that ${DEFINITION_FILE} does not have`;
  for (const at of [
    { ...STEP_AT, item: 2 },
    { ...STEP_AT, index: 2 },
    { ...STEP_AT, round: null },
    { ...STEP_AT, round: { at: 1, of: 2 } },
    { ...FIRST_AT, index: 0 },
    { ...FIRST_AT, round: { at: 1, of: 1 } },
  ]) {
    refusesRun({ state: stateText({ at }), definition: DEFAULT, heartbeat: undefined }, message);
  }
});

// R9, R15

function listed(unit, name, overrides = {}) {
  const run = runFrom(unit, name, {
    state: stateText({ unit, ...overrides }),
    definition: DEFAULT,
    heartbeat: '2026-10-21T11:59:30Z\n',
  });
  return { ...run, state: runStateOf(run, NOW), followed: null };
}

test('runs come the latest first, runs of one instant by their unit, and a unit by its directory names', () => {
  const runs = [
    listed('0030-y', '2026-10-21T09:00:00Z'),
    listed('0029-x', `${INSTANT}--opus`),
    listed('0030-y', INSTANT),
    listed('0029-x', INSTANT),
    listed('0029-x', `${INSTANT}--gpt-6-1`),
    listed('0029-x', '2026-10-22T09:00:00Z'),
  ];
  const copy = [...runs];

  const { runs: ordered, total } = selectRuns(runs, 0);

  assert.deepEqual(
    ordered.map(({ unit, directory }) => `${unit} ${directory.split('/').at(-1)}`),
    [
      '0029-x 2026-10-22T09:00:00Z',
      `0029-x ${INSTANT}`,
      `0029-x ${INSTANT}--gpt-6-1`,
      `0029-x ${INSTANT}--opus`,
      `0030-y ${INSTANT}`,
      '0030-y 2026-10-21T09:00:00Z',
    ],
  );
  assert.equal(total, 6);
  assert.deepEqual(runs, copy);
});

test('60 runs are cut to 50 with a total of 60, to a limit given, and not at all with 0', () => {
  const runs = Array.from({ length: 60 }, (_, index) =>
    listed('0029-x', `2026-10-21T10:${String(index).padStart(2, '0')}:00Z`),
  );
  assert.equal(selectRuns(runs, 50).runs.length, 50);
  assert.equal(selectRuns(runs, 50).total, 60);
  assert.equal(selectRuns(runs, 5).runs.length, 5);
  assert.equal(selectRuns(runs, 0).runs.length, 60);
  assert.equal(selectRuns(runs, 50).runs[0].run, '2026-10-21T10:59:00Z');
});

// R12, R16, R17: the text

const ENDED = { status: 3, line: 'The run stopped at step 2: the reviewer found blocking findings.' };

test('each state gives its line, the columns lined up, with and without a variant', () => {
  const runs = [
    listed('0029-x', `${INSTANT}--opus`),
    listed('0030-y', '2026-10-21T09:00:00Z', { heartbeat: undefined }),
    listed('0031-z', '2026-10-21T08:00:00Z', { ended: ENDED }),
  ];
  const stale = runFrom('0030-y', '2026-10-21T09:00:00Z', {
    state: stateText({ unit: '0030-y' }),
    definition: DEFAULT,
    heartbeat: '2026-10-21T09:00:30Z\n',
  });
  runs[1] = { ...stale, state: runStateOf(stale, NOW), followed: null };

  assert.equal(
    runsListing({ runs, total: 3 }, undefined),
    '2026-10-21T10:00:00Z  0029--opus  running  step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol\n' +
      '2026-10-21T09:00:00Z  0030        stale    no sign of life since 2026-10-21T09:00:30Z, ' +
      'at step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol\n' +
      `2026-10-21T08:00:00Z  0031        ended    ${ENDED.line}\n`,
  );
});

test('a run before its first step, running and stale with no heartbeat, says so', () => {
  const running = listed('0029-x', INSTANT, { at: null });
  const state = stateText({ at: null });
  const bare = runFrom('0029-x', INSTANT, { state, definition: DEFAULT, heartbeat: undefined });
  const stale = { ...bare, state: runStateOf(bare, NOW), followed: null };

  assert.equal(
    runsListing({ runs: [running], total: 1 }, undefined),
    `${INSTANT}  0029  running  before its first step\n`,
  );
  assert.equal(
    runsListing({ runs: [stale], total: 1 }, undefined),
    `${INSTANT}  0029  stale  no sign of life, before its first step\n`,
  );
});

test('a run with no heartbeat at a step says no sign of life, then where it was', () => {
  const bare = runFrom('0029-x', INSTANT, { state: stateText(), definition: DEFAULT, heartbeat: undefined });
  const stale = { ...bare, state: runStateOf(bare, NOW), followed: null };

  assert.equal(
    runsListing({ runs: [stale], total: 1 }, undefined),
    `${INSTANT}  0029  stale  no sign of life, at step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol\n`,
  );
});

test('a line has no space at its end, also for an ended run whose line is empty', () => {
  const run = listed('0029-x', INSTANT, { ended: { status: 0, line: '' } });
  assert.equal(runsListing({ runs: [run], total: 1 }, undefined), `${INSTANT}  0029  ended\n`);
});

test('the closing line is printed only when runs were left out', () => {
  const run = listed('0029-x', INSTANT, { at: null });
  assert.ok(!runsListing({ runs: [run], total: 1 }, undefined).includes('showing'));
  assert.ok(
    runsListing({ runs: [run], total: 3 }, undefined).endsWith('\nshowing 1 of 3 runs, --limit 0 shows them all\n'),
  );
});

test('with nothing to show the listing is one line, naming the number when one was given', () => {
  assert.equal(runsListing({ runs: [], total: 0 }, undefined), 'no runs\n');
  assert.equal(runsListing({ runs: [], total: 0 }, '0029'), 'no runs of 0029\n');
});

// R18: the JSON document

test('the document holds the keys of a run and of its step in order, each as a value and as null', () => {
  const withEverything = {
    ...listed('0029-x', `${INSTANT}--opus`, { branch: 'feature-0029-x--opus', ended: ENDED }),
    followed: `.orchestrator/0029-x/${INSTANT}--opus/02-reviewer.followed.jsonl`,
  };
  const withNothing = listed('0030-y', '2026-10-21T09:00:00Z', { at: null });
  const parsed = JSON.parse(runsJson({ runs: [withEverything, { ...withNothing, heartbeat: null }], total: 7 }));

  assert.equal(parsed.total, 7);
  assert.deepEqual(Object.keys(parsed.runs[0]), [
    'number',
    'unit',
    'variant',
    'branch',
    'run',
    'directory',
    'state',
    'heartbeat',
    'step',
    'followed',
    'ended',
  ]);
  assert.deepEqual(Object.keys(parsed.runs[0].step), ['number', 'round', 'rounds', 'role', 'harness', 'model']);
  assert.deepEqual(parsed.runs[0], {
    number: '0029',
    unit: '0029-x',
    variant: 'opus',
    branch: 'feature-0029-x--opus',
    run: INSTANT,
    directory: `.orchestrator/0029-x/${INSTANT}--opus`,
    state: 'ended',
    heartbeat: '2026-10-21T11:59:30Z',
    step: {
      number: 2,
      round: 1,
      rounds: 3,
      role: 'reviewer',
      harness: 'opencode',
      model: 'openai/gpt-6.1-sol',
    },
    followed: `.orchestrator/0029-x/${INSTANT}--opus/02-reviewer.followed.jsonl`,
    ended: ENDED,
  });
  assert.equal(parsed.runs[1].variant, null);
  assert.equal(parsed.runs[1].branch, null);
  assert.equal(parsed.runs[1].heartbeat, null);
  assert.equal(parsed.runs[1].step, null);
  assert.equal(parsed.runs[1].followed, null);
  assert.equal(parsed.runs[1].ended, null);
});

test('with nothing to show the document holds an empty list and a total of 0', () => {
  assert.equal(runsJson({ runs: [], total: 0 }), '{\n  "runs": [],\n  "total": 0\n}\n');
});

// readRuns, on a directory

function writeRun(root, unit, name, { state = stateText({ unit }), definition = DEFAULT, heartbeat, files = [] } = {}) {
  const directory = join(root, '.orchestrator', unit, name);
  const put = (file, text) => {
    mkdirSync(dirname(join(directory, file)), { recursive: true });
    writeFileSync(join(directory, file), text);
  };
  put('state.json', state);
  put('definition.json', definition);
  if (heartbeat !== undefined) put('heartbeat', heartbeat);
  for (const file of files) put(file, '');
}

test('readRuns of a directory without .orchestrator gives no run', (testContext) => {
  assert.deepEqual(readRuns(temporaryDirectory(testContext, 'agentrite-runs-'), undefined, NOW), []);
});

test('readRuns reads only the directories that are runs, and a run without state.json is left out', (testContext) => {
  const root = temporaryDirectory(testContext, 'agentrite-runs-');
  writeRun(root, '0029-x', INSTANT, { heartbeat: '2026-10-21T11:59:30Z\n' });
  const bad = { state: 'not json' };
  writeRun(root, 'history-0001-old', INSTANT, bad);
  writeRun(root, '0029-x', 'latest', bad);
  writeRun(root, '0029-x', `${INSTANT}--Opus`, bad);
  mkdirSync(join(root, '.orchestrator', '0030-y', INSTANT), { recursive: true });
  writeFileSync(join(root, '.orchestrator', '.gitignore'), '*\n');
  writeFileSync(join(root, '.orchestrator', '0031-z'), '');
  writeFileSync(join(root, '.orchestrator', '0029-x', '2026-10-21T09:00:00Z'), 'a file');

  const runs = readRuns(root, undefined, NOW);

  assert.deepEqual(
    runs.map(({ directory, state }) => [directory, state]),
    [[`.orchestrator/0029-x/${INSTANT}`, 'running']],
  );
});

test('readRuns refuses a state.json that is a directory or cannot be examined, naming it', (testContext) => {
  const root = temporaryDirectory(testContext, 'agentrite-runs-');
  const state = (name) => join(root, '.orchestrator', '0029-x', name, 'state.json');
  mkdirSync(state(INSTANT), { recursive: true });
  assert.throws(() => readRuns(root, undefined, NOW), new RegExp(`${INSTANT}/state\\.json cannot be read`));
  rmSync(state(INSTANT), { recursive: true });

  symlinkSync('state.json', state(INSTANT));
  assert.throws(() => readRuns(root, undefined, NOW), new RegExp(`${INSTANT}/state\\.json cannot be read: .*ELOOP`));
});

test('readRuns of a number reads the runs of that unit, of every variant, and of no other', (testContext) => {
  const root = temporaryDirectory(testContext, 'agentrite-runs-');
  writeRun(root, '0029-x', INSTANT);
  writeRun(root, '0029-x', `${INSTANT}--opus`);
  writeRun(root, '0290-y', INSTANT, { state: 'not json' });

  const runs = readRuns(root, '0029', NOW);

  assert.deepEqual(runs.map(({ directory }) => directory).sort(), [
    `.orchestrator/0029-x/${INSTANT}`,
    `.orchestrator/0029-x/${INSTANT}--opus`,
  ]);
});

test('followed is the path of the followed file of the step when it is a file, and null otherwise', (testContext) => {
  const root = temporaryDirectory(testContext, 'agentrite-runs-');
  writeRun(root, '0029-x', '2026-10-21T10:00:00Z', { files: ['02-reviewer.followed.jsonl'] });
  writeRun(root, '0029-x', '2026-10-21T10:00:01Z');
  writeRun(root, '0029-x', '2026-10-21T10:00:02Z', { state: stateText({ at: null }) });
  writeRun(root, '0029-x', '2026-10-21T10:00:03Z', {
    state: stateText({ at: { number: 100, item: 0, round: { at: 101, of: 101 }, index: 0 } }),
    definition: ONE_HUNDRED_AND_ONE,
    files: ['100-implementer.followed.jsonl'],
  });

  const followed = Object.fromEntries(readRuns(root, undefined, NOW).map((run) => [run.run, run.followed]));

  assert.deepEqual(followed, {
    '2026-10-21T10:00:00Z': '.orchestrator/0029-x/2026-10-21T10:00:00Z/02-reviewer.followed.jsonl',
    '2026-10-21T10:00:01Z': null,
    '2026-10-21T10:00:02Z': null,
    '2026-10-21T10:00:03Z': '.orchestrator/0029-x/2026-10-21T10:00:03Z/100-implementer.followed.jsonl',
  });
});

test('readRuns refuses a run whose definition.json is missing, naming the file', (testContext) => {
  const root = temporaryDirectory(testContext, 'agentrite-runs-');
  writeRun(root, '0029-x', INSTANT);
  const file = `.orchestrator/0029-x/${INSTANT}/definition.json`;
  rmSync(join(root, file));

  assert.throws(() => readRuns(root, undefined, NOW), {
    message: new RegExp(`^${file.replaceAll('.', '\\.')} cannot be read: `),
  });
});

// R26: the command, run in a directory with no agentrite.json, no changes/ and no git repository

function runsCommand(root, ...args) {
  return spawnSync(process.execPath, [script, 'runs', ...args], { cwd: root, encoding: 'utf-8' });
}

function projectOfRuns(testContext) {
  const root = temporaryDirectory(testContext, 'agentrite-runs-');
  const now = Date.now();
  const instant = (offset) => new Date(Math.floor((now + offset) / 1000) * 1000).toISOString().replace('.000', '');
  const beat = (offset) => `${instant(offset)}\n`;
  // 50 runs of 0029-x over two variants, in the minutes before the others
  for (let index = 0; index < 50; index += 1) {
    const variant = index % 2 === 0 ? '' : '--opus';
    writeRun(root, '0029-x', `${instant(-3_600_000 - index * 1000)}${variant}`, {
      state: stateText({ ended: { status: 0, line: `ended ${index}` } }),
    });
  }
  writeRun(root, '0030-y', instant(-1000), { state: stateText({ unit: '0030-y' }), heartbeat: beat(-1000) });
  writeRun(root, '0030-y', instant(-5000), { state: stateText({ unit: '0030-y' }), heartbeat: beat(-600_000) });
  writeRun(root, '0031-z', instant(-2000), {
    state: stateText({ unit: '0031-z', at: null, ended: { status: 4, line: 'done' } }),
  });
  return { root, instant };
}

test('the command lists 50 runs, the latest first, and the closing line, and exits 0', (testContext) => {
  const { root } = projectOfRuns(testContext);

  const result = runsCommand(root);

  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 51);
  assert.match(lines[0], /^\S+  0030\s+running  step 2, round 1 of 3, reviewer/);
  assert.match(lines[1], /^\S+  0031\s+ended    done$/);
  assert.match(lines[2], /^\S+  0030\s+stale    no sign of life since \S+, at step 2/);
  assert.equal(lines[50], 'showing 50 of 53 runs, --limit 0 shows them all');
});

test('a number lists the runs of that unit only, of every variant', (testContext) => {
  const { root } = projectOfRuns(testContext);

  const result = runsCommand(root, '0029', '--limit', '0');

  assert.equal(result.status, 0, result.stderr);
  const lines = result.stdout.trimEnd().split('\n');
  assert.equal(lines.length, 50);
  assert.ok(lines.every((line) => /^\S+  0029(--opus)?\s+ended  ended \d+$/.test(line)), result.stdout);
  assert.ok(lines.some((line) => line.includes('0029--opus')));
});

test('--json prints the document with the total and the runs listed', (testContext) => {
  const { root } = projectOfRuns(testContext);

  const result = runsCommand(root, '--json');

  assert.equal(result.status, 0, result.stderr);
  const document = JSON.parse(result.stdout);
  assert.equal(document.total, 53);
  assert.equal(document.runs.length, 50);
  assert.deepEqual(
    document.runs.slice(0, 3).map(({ state }) => state),
    ['running', 'ended', 'stale'],
  );
});

test('a number of no run says so, and a directory without .orchestrator lists nothing, exiting 0', (testContext) => {
  const { root } = projectOfRuns(testContext);
  const empty = temporaryDirectory(testContext, 'agentrite-runs-');

  assert.equal(runsCommand(root, '0099').stdout, 'no runs of 0099\n');
  assert.equal(runsCommand(root, '0099').status, 0);
  assert.equal(runsCommand(empty).stdout, 'no runs\n');
  assert.equal(runsCommand(empty, '--json').stdout, '{\n  "runs": [],\n  "total": 0\n}\n');
  assert.equal(runsCommand(empty, '--json').status, 0);
});

test('a malformed state.json exits 1, printing nothing on standard output and naming the file', (testContext) => {
  const { root } = projectOfRuns(testContext);
  writeRun(root, '0032-w', INSTANT, { state: '{"unit": 1}' });

  const result = runsCommand(root);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, new RegExp(`^agentrite: \\.orchestrator/0032-w/${INSTANT}/state\\.json: `));
});

test('a wrong argument exits 2, printing the line and the usage on standard error', (testContext) => {
  const { root } = projectOfRuns(testContext);

  const result = runsCommand(root, '--limit', 'x');

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `--limit takes a whole number of zero or more, not x\n${RUNS_FORM}\n`);
});
