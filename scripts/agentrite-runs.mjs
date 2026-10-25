import { parseArgs } from 'node:util';
import { parseDefinition } from './agentrite-definition.mjs';
import { isObject, jsonFault, jsonKeyFault, jsonPath } from './agentrite-json.mjs';
import { INSTANT_PATTERN, stepFileName, stepHead, VARIANT_PATTERN } from './agentrite-orchestrate.mjs';
import { optionError } from './agentrite-run.mjs';
import { DEFAULT_LIMIT, limitError, numberError } from './agentrite-units.mjs';

/** How `runs` is run, on one line. */
export const RUNS_FORM = 'usage: agentrite runs [<number>] [--limit <count>] [--json]';

/** How long after its last sign of life a run that has not ended is still taken to run, by unit 0079. */
export const STALE_MILLISECONDS = 60_000;

const RUNS_OPTIONS = /** @type {const} */ ({
  limit: { type: 'string' },
  json: { type: 'boolean' },
});

/** What `--limit` takes, as the line that says none was given names it. */
const OPTION_VALUES = { limit: 'a count' };

/**
 * @typedef {object} RunsArguments
 * @property {string | undefined} number
 * @property {number} limit
 * @property {boolean} json
 */

/**
 * @typedef {object} RunStep
 * @property {number} number
 * @property {number | null} round
 * @property {number | null} rounds
 * @property {string} role
 * @property {string} harness
 * @property {string} model
 */

/**
 * A run as its directory holds it. `variant` is the one its directory's name gives, and `branch` the one its
 * `state.json` holds. `followedName` is the name of the file that holds the followed output of its step, which may
 * not be made yet.
 *
 * @typedef {object} Run
 * @property {string} number
 * @property {string} unit
 * @property {string | null} variant
 * @property {string | null} branch
 * @property {string} run
 * @property {string} directory
 * @property {string | null} heartbeat
 * @property {RunStep | null} step
 * @property {string | null} followedName
 * @property {string | null} head
 * @property {{ status: number, line: string } | null} ended
 */

/**
 * @typedef {Run & { state: 'running' | 'stale' | 'ended', followed: string | null }} Listed A run with its state and
 *   the path of its followed file, which are judged when the run is read
 */

/**
 * The arguments of `runs`. What it throws is the line that names what is wrong, then the form.
 *
 * @param {string[]} args
 * @returns {RunsArguments}
 */
export function parseRunsArgs(args) {
  // Not strict, so that an option `runs` does not take is named in the kit's words and not in node's.
  const { values, positionals, tokens } = parseArgs({
    args,
    options: RUNS_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const options = tokens.filter((token) => token.kind === 'option');
  const names = options.map((token) => token.name);
  const error =
    options.map((token) => optionError(RUNS_OPTIONS, OPTION_VALUES, token)).find(Boolean) ??
    (names.filter((name) => name === 'limit').length > 1 ? '--limit was given twice' : undefined) ??
    numberError(positionals) ??
    limitError(values.limit);
  if (error !== undefined) throw new Error(`${error}\n${RUNS_FORM}`);

  return {
    number: positionals[0],
    limit: values.limit === undefined ? DEFAULT_LIMIT : Number(values.limit),
    json: values.json === true,
  };
}

/**
 * Whether a directory of a unit's directory in `.orchestrator/` is a run: the instant it started, alone or followed by
 * `--` and a variant.
 *
 * @param {string} name
 * @returns {boolean}
 */
export function isRunDirectory(name) {
  return new RegExp(`^${INSTANT_PATTERN}(?:--${VARIANT_PATTERN})?$`).test(name);
}

/**
 * The variant of the run whose directory is named `name`: what follows its `--`, or `null` for a name without one.
 *
 * @param {string} name
 * @returns {string | null}
 */
export function variantOfRun(name) {
  return name.includes('--') ? name.slice(name.indexOf('--') + 2) : null;
}

const isFilledString = (/** @type {unknown} */ value) => typeof value === 'string' && value !== '';
const isBoolean = (/** @type {unknown} */ value) => typeof value === 'boolean';
const isCountOf = (/** @type {number} */ least) => (/** @type {unknown} */ value) =>
  typeof value === 'number' && Number.isInteger(value) && value >= least;

/**
 * The fault of a value that `holds` does not hold, or `undefined`.
 *
 * @param {string} path
 * @param {unknown} value
 * @param {(value: unknown) => boolean} holds
 * @param {string} must
 * @returns {string | undefined}
 */
function valueFault(path, value, holds, must) {
  return holds(value) ? undefined : jsonFault(path, value, must);
}

/**
 * The first fault of an object at `path` that must hold `place.keys`, each as its check judges it, checked in the
 * order of `place.keys`, or `undefined`. A value that is no object is a fault of its own.
 *
 * @param {unknown} value
 * @param {string} path
 * @param {{ name: string, keys: string[], holds: string }} place
 * @param {Record<string, (value: unknown, path: string) => string | undefined>} checks
 * @returns {string | undefined}
 */
function objectFault(value, path, place, checks) {
  if (!isObject(value)) return jsonFault(path, value, `an object of ${place.keys.join(', ')}`);
  const extra = jsonKeyFault(value, path, place);
  if (extra !== undefined) return extra;
  for (const key of place.keys) {
    const fault = checks[key]?.(value[key], jsonPath(path, key));
    if (fault !== undefined) return fault;
  }
  return undefined;
}

const filledAt = (/** @type {unknown} */ value, /** @type {string} */ path) =>
  valueFault(path, value, isFilledString, 'a string that is not empty');

const nullableFilledAt = (/** @type {unknown} */ value, /** @type {string} */ path) =>
  value === undefined || value === null ? undefined : filledAt(value, path);

const countAt = (/** @type {number} */ least) => (/** @type {unknown} */ value, /** @type {string} */ path) =>
  valueFault(path, value, isCountOf(least), `a whole number of ${least} or more`);

const ROUND_PLACE = { name: 'a round', keys: ['at', 'of'], holds: 'A round holds at and of' };
const AT_PLACE = {
  name: 'at',
  keys: ['number', 'item', 'round', 'index', 'asked'],
  holds: 'at holds number, item, round, index and asked',
};
const SESSION_PLACE = {
  name: 'a session',
  keys: ['role', 'harness', 'session'],
  holds: 'A session holds role, harness and session',
};
const ENDED_PLACE = { name: 'ended', keys: ['status', 'line'], holds: 'ended holds status and line' };
const STATE_PLACE = {
  name: 'state.json',
  keys: ['unit', 'definition', 'branch', 'resumes', 'at', 'sessions', 'ended'],
  holds: 'state.json holds unit, definition, branch, resumes, at, sessions and ended',
};

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string | undefined}
 */
function roundFault(value, path) {
  const fault = objectFault(value, path, ROUND_PLACE, { at: countAt(1), of: countAt(1) });
  if (fault !== undefined || !isObject(value)) return fault;
  return Number(value.at) <= Number(value.of) ? undefined : jsonFault(path, value, 'an at of at most of');
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string | undefined}
 */
function atFault(value, path) {
  if (value === null) return undefined;
  return objectFault(value, path, AT_PLACE, {
    number: countAt(0),
    item: countAt(0),
    round: (round, roundPath) => (round === null ? undefined : roundFault(round, roundPath)),
    index: (index, indexPath) => (index === null ? undefined : countAt(0)(index, indexPath)),
    asked: (asked, askedPath) =>
      asked === undefined ? undefined : valueFault(askedPath, asked, isBoolean, 'true or false'),
  });
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string | undefined}
 */
function sessionsFault(value, path) {
  if (!Array.isArray(value)) return jsonFault(path, value, 'a list of sessions');
  for (const [index, session] of value.entries()) {
    const fault = objectFault(session, jsonPath(path, index), SESSION_PLACE, {
      role: filledAt,
      harness: filledAt,
      session: filledAt,
    });
    if (fault !== undefined) return fault;
  }
  return undefined;
}

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string | undefined}
 */
function endedFault(value, path) {
  if (value === null) return undefined;
  return objectFault(value, path, ENDED_PLACE, {
    status: (status, statusPath) => valueFault(statusPath, status, Number.isInteger, 'a whole number'),
    line: (line, linePath) => valueFault(linePath, line, (given) => typeof given === 'string', 'a string'),
  });
}

/**
 * The first fault of the `state.json` the orchestrator writes, in the order of its keys, or `undefined`. A `branch`
 * that is missing is no fault, since a run from before unit 0081 has none, and neither is a `resumes` or an `asked` of
 * `at` that is missing, since a run from before unit 0089 has neither.
 *
 * @param {unknown} state
 * @returns {string | undefined}
 */
function stateFault(state) {
  return objectFault(state, '', STATE_PLACE, {
    unit: filledAt,
    definition: filledAt,
    branch: nullableFilledAt,
    resumes: nullableFilledAt,
    at: atFault,
    sessions: sessionsFault,
    ended: endedFault,
  });
}

/**
 * The value of the JSON `text` of the file `file`, judged by `fault`. Throws, naming the file, when the text is not
 * JSON or has a fault.
 *
 * @param {string} text
 * @param {string} file
 * @returns {unknown}
 */
function parseState(text, file) {
  /** @type {unknown} */ let state;
  try {
    state = JSON.parse(text);
  } catch (error) {
    throw new Error(`${file} is not JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isObject(state)) throw new Error(`${file} holds ${JSON.stringify(state)}, which is no JSON object`);
  const fault = stateFault(state);
  if (fault !== undefined) throw new Error(`${file}: ${fault}`);
  return state;
}

/**
 * The step of `definition` that `at` names, or `undefined` when it names none: an item of the definition, and for a
 * repeat a round of its times and a step of its steps.
 *
 * @param {import('./agentrite-definition.mjs').Definition} definition
 * @param {{ item: number, round: { at: number, of: number } | null, index: number | null }} at
 * @returns {import('./agentrite-definition.mjs').Step | undefined}
 */
function stepNamedBy(definition, { item, round, index }) {
  const entry = definition.steps[item];
  if (entry === undefined) return undefined;
  if (!('repeat' in entry)) return round === null && index === null ? entry : undefined;
  if (round === null || index === null || round.of !== entry.repeat.times) return undefined;
  return entry.repeat.steps[index];
}

/**
 * The instant a `heartbeat` holds, or `null` when its text is not an instant and a line break alone.
 *
 * @param {string | undefined} text
 * @returns {string | null}
 */
function heartbeatInstant(text) {
  return text?.match(new RegExp(`^(${INSTANT_PATTERN})\\n$`))?.[1] ?? null;
}

/**
 * The `state.json` of a run, with every key the orchestrator reads of it. `branch` is missing in a run from before
 * unit 0081, and `resumes` and `asked` of `at` in a run from before unit 0089.
 *
 * @typedef {{
 *   unit: string,
 *   definition: string,
 *   branch?: string | null,
 *   resumes?: string | null,
 *   at: {
 *     number: number,
 *     item: number,
 *     round: { at: number, of: number } | null,
 *     index: number | null,
 *     asked?: boolean,
 *   } | null,
 *   sessions: { role: string, harness: string, session: string }[],
 *   ended: { status: number, line: string } | null,
 * }} RunState
 */

/**
 * What the directory `name` of the unit directory `unit` holds, from the text of its `state.json` and of its
 * `definition.json`: the state, the definition, and the step of the definition that `at` names, or `null` for a run
 * before its first step. Throws, naming the file by its path from the project root, when a file is not of the form
 * the orchestrator writes, or `at` names a step the definition does not have.
 *
 * @param {string} unit
 * @param {string} name
 * @param {{ state: string, definition: string }} texts
 * @returns {{
 *   state: RunState,
 *   definition: import('./agentrite-definition.mjs').Definition,
 *   step: import('./agentrite-definition.mjs').Step | null,
 * }}
 */
export function parseRun(unit, name, texts) {
  const directory = `.orchestrator/${unit}/${name}`;
  const [stateFile, definitionFile] = [`${directory}/state.json`, `${directory}/definition.json`];
  const state = /** @type {RunState} */ (parseState(texts.state, stateFile));
  const definition = parseDefinition(texts.definition, { path: definitionFile });
  const step = state.at === null ? null : (stepNamedBy(definition, state.at) ?? null);
  if (state.at !== null && step === null) {
    throw new Error(`${stateFile}: at names a step that ${definitionFile} does not have`);
  }
  return { state, definition, step };
}

/**
 * The run that the directory `name` of the unit directory `unit` holds, from the text of its `state.json`, of its
 * `definition.json` and of its `heartbeat`, which is `undefined` when it is missing. Throws, naming the file by its
 * path from the directory `runs` runs in, when a file is not of the form the orchestrator writes.
 *
 * @param {string} unit
 * @param {string} name
 * @param {{ state: string, definition: string, heartbeat: string | undefined }} texts
 * @returns {Run}
 */
export function runFrom(unit, name, texts) {
  const directory = `.orchestrator/${unit}/${name}`;
  const { state, definition, step: found } = parseRun(unit, name, texts);
  const { at } = state;
  const step =
    at === null || found === null
      ? null
      : {
          number: at.number,
          round: at.round?.at ?? null,
          rounds: at.round?.of ?? null,
          role: found.role,
          harness: found.harness,
          model: found.model,
        };

  return {
    number: unit.slice(0, 4),
    unit,
    variant: variantOfRun(name),
    branch: state.branch ?? null,
    run: name.slice(0, 20),
    directory,
    heartbeat: heartbeatInstant(texts.heartbeat),
    step,
    followedName: step === null ? null : stepFileName(definition, step.number, step.role, 'followed.jsonl'),
    head:
      at === null || found === null
        ? null
        : stepHead({ number: at.number, round: at.round ?? undefined, step: found }),
    ended: state.ended,
  };
}

/**
 * The state of a run at the instant `now`, in milliseconds since the epoch, by the rule of unit 0079: `ended` when
 * it holds an end, `running` when its heartbeat is at most a minute old, and `stale` otherwise.
 *
 * @param {Pick<Run, 'ended' | 'heartbeat'>} run
 * @param {number} now
 * @returns {'running' | 'stale' | 'ended'}
 */
export function runStateOf({ ended, heartbeat }, now) {
  if (ended !== null) return 'ended';
  // A heartbeat of the form that no instant reads gives NaN, for which the comparison is false.
  return heartbeat !== null && now - Date.parse(heartbeat) <= STALE_MILLISECONDS ? 'running' : 'stale';
}

/**
 * @param {string} first
 * @param {string} second
 * @returns {number}
 */
function compared(first, second) {
  return first.localeCompare(second);
}

/**
 * The runs to show: the latest first, runs of one instant in the order of their unit directories, and those of one
 * unit in the order of their directories' names, cut to `limit` unless it is 0. `total` is how many there are before
 * the cut.
 *
 * @template {Run} Kind
 * @param {Kind[]} runs
 * @param {number} limit
 * @returns {{ runs: Kind[], total: number }}
 */
export function selectRuns(runs, limit) {
  const ordered = [...runs].sort(
    (earlier, later) =>
      compared(later.run, earlier.run) ||
      compared(earlier.unit, later.unit) ||
      compared(earlier.directory, later.directory),
  );
  return { runs: limit === 0 ? ordered : ordered.slice(0, limit), total: ordered.length };
}

/**
 * What the state of a run gives on its line.
 *
 * @param {Listed} listed
 * @returns {string}
 */
export function detailOf({ state, head, heartbeat, ended }) {
  if (state === 'ended') return /** @type {{ line: string }} */ (ended).line;
  const at = head ?? 'before its first step';
  if (state === 'running') return at;
  const since = heartbeat === null ? 'no sign of life' : `no sign of life since ${heartbeat}`;
  return `${since}, ${head === null ? at : `at ${at}`}`;
}

/**
 * The unit of a run as its line names it: its four digits, and for a run on a variant `--` and the variant.
 *
 * @param {Run} run
 * @returns {string}
 */
function unitCell({ number, variant }) {
  return variant === null ? number : `${number}--${variant}`;
}

/**
 * What `agentrite runs` prints: a line a run, and a closing line when the limit left runs out. With no run, the line
 * that says so, naming `number` when one was given.
 *
 * @param {{ runs: Listed[], total: number }} selection
 * @param {string | undefined} number
 * @returns {string}
 */
export function runsListing({ runs, total }, number) {
  if (runs.length === 0) return `${number === undefined ? 'no runs' : `no runs of ${number}`}\n`;
  const widest = (/** @type {(listed: Listed) => string} */ cell) =>
    Math.max(...runs.map((listed) => cell(listed).length));
  const [unitWidth, stateWidth] = [widest(unitCell), widest((listed) => listed.state)];
  const lines = runs.map((listed) =>
    [
      listed.run.padEnd(20),
      unitCell(listed).padEnd(unitWidth),
      listed.state.padEnd(stateWidth),
      detailOf(listed),
    ]
      .join('  ')
      .trimEnd(),
  );
  if (runs.length < total) lines.push(`showing ${runs.length} of ${total} runs, --limit 0 shows them all`);
  return `${lines.join('\n')}\n`;
}

/**
 * What `agentrite runs --json` prints, for a script.
 *
 * @param {{ runs: Listed[], total: number }} selection
 * @returns {string}
 */
export function runsJson({ runs, total }) {
  const listed = runs.map((run) => ({
    number: run.number,
    unit: run.unit,
    variant: run.variant,
    branch: run.branch,
    run: run.run,
    directory: run.directory,
    state: run.state,
    heartbeat: run.heartbeat,
    step: run.step,
    followed: run.followed,
    ended: run.ended,
  }));
  return `${JSON.stringify({ runs: listed, total }, null, 2)}\n`;
}
