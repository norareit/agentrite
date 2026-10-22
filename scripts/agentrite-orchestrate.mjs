import { parseArgs } from 'node:util';
import { readOutcome } from './agentrite-outcome.mjs';
import { optionError } from './agentrite-run.mjs';

/**
 * @typedef {import('./agentrite-definition.mjs').Definition} Definition
 * @typedef {import('./agentrite-definition.mjs').Step} Step
 * @typedef {import('./agentrite-outcome.mjs').Outcome} Outcome
 * @typedef {import('./agentrite-outcome.mjs').Reading} Reading
 * @typedef {{
 *   number: number,
 *   item: number,
 *   round: { at: number, of: number } | undefined,
 *   index: number | undefined,
 *   step: Step,
 *   session: string | undefined,
 * }} Planned A step about to run: its number in the order the steps run, its item of the definition, its round and
 *   its place among the steps of a repeat, and the session it continues
 * @typedef {{
 *   status: number | null,
 *   signal: string | null,
 *   response: string | undefined,
 *   session: string | undefined,
 *   milliseconds: number,
 *   timedOut: boolean,
 * }} Result How the harness of a step ended, its final response, the id of its session, and whether the command ended
 *   it for running past its time limit
 * @typedef {'timeout'
 *   | 'harness'
 *   | 'none'
 *   | 'several'
 *   | 'malformed'
 *   | 'needs-human'
 *   | 'failed'
 *   | 'questions'
 *   | 'declines'
 *   | 'stopWhen'} Stop
 * @typedef {{ planned: Planned, result: Result, reading: Reading, stop: Stop | undefined }} Ran
 * @typedef {{ kind: 'complete' }
 *   | { kind: 'stopped', by: Stop, ran: Ran }
 *   | { kind: 'ran-out', rounds: number, ran: Ran }} End
 * @typedef {{
 *   started: (planned: Planned) => void,
 *   run: (planned: Planned) => Promise<Result>,
 *   ended: (ran: Ran) => void,
 * }} Effects
 */

/**
 * @param {Outcome} outcome
 * @returns {boolean}
 */
function blocks(outcome) {
  return outcome.findings.some((finding) => finding.blocking);
}

/**
 * The first case that holds for a step that ran, or `undefined` when none does and the run may go on: that it ran out
 * of time, by unit 0069, and then those of requirement 18 of unit 0065, with a done outcome that holds questions
 * after the outcome, by unit 0076. Running out of time is judged first, since the status of a harness the command
 * ended says nothing of the step. The outcome is read whatever the harness's status, so that the human sees what a
 * step that failed after it gave one said.
 *
 * @param {Step} step
 * @param {{ status: number | null, signal: string | null, timedOut: boolean }} result
 * @param {Reading} reading
 * @returns {Stop | undefined}
 */
export function judgeStep(step, { status, signal, timedOut }, reading) {
  if (timedOut) return 'timeout';
  if (status !== 0 || signal !== null) return 'harness';
  if (reading.kind !== 'outcome') return reading.kind;
  const { outcome } = reading;
  if (outcome.outcome !== 'done') return outcome.outcome;
  if (outcome.questions.length > 0) return 'questions';
  if (outcome.declines.length > 0) return 'declines';
  if (step.stopWhen === 'blocking-findings' && blocks(outcome)) return 'stopWhen';
  return undefined;
}

/**
 * Runs the items of `definition` in order, one step at a time, and a repeat's steps round after round, until every
 * item has run or a step or a repeat stops the run. A step of a role and a harness that already ran continues the
 * session the last of them gave. The running of a step, and what is said before and after it, are the caller's.
 *
 * @param {Definition} definition
 * @param {Effects} effects
 * @returns {Promise<{ ran: Ran[], end: End }>}
 */
export async function orchestrate(definition, effects) {
  /** @type {Ran[]} */ const ran = [];
  /** @type {Map<string, string>} */ const sessions = new Map();

  /**
   * @param {Step} step
   * @param {number} item
   * @param {{ at: number, of: number } | undefined} round
   * @param {number | undefined} index
   * @returns {Promise<Ran>}
   */
  const runStep = async (step, item, round, index) => {
    const key = JSON.stringify([step.role, step.harness]);
    /** @type {Planned} */ const planned = { number: ran.length, item, round, index, step, session: sessions.get(key) };
    effects.started(planned);
    const result = await effects.run(planned);
    if (result.session !== undefined) sessions.set(key, result.session);
    // A step the command ended did not finish, so what it printed is not its outcome, and is kept as its response.
    /** @type {Reading} */ const reading =
      result.response === undefined || result.timedOut ? { kind: 'none' } : readOutcome(result.response);
    /** @type {Ran} */ const entry = { planned, result, reading, stop: judgeStep(step, result, reading) };
    ran.push(entry);
    effects.ended(entry);
    return entry;
  };

  for (const [item, entry] of definition.steps.entries()) {
    const end =
      'repeat' in entry
        ? await runRepeat(entry.repeat, item, runStep)
        : stoppedBy(await runStep(entry, item, undefined, undefined));
    if (end !== undefined) return { ran, end };
  }
  return { ran, end: { kind: 'complete' } };
}

/**
 * @param {Ran} ran
 * @returns {End | undefined}
 */
function stoppedBy(ran) {
  return ran.stop === undefined ? undefined : { kind: 'stopped', by: ran.stop, ran };
}

/**
 * Runs the rounds of a repeat, and gives how it stopped the run, or `undefined` when the run goes on after it. The
 * step is judged first, and the repeat's `until` only on the last step of a round that let the run go on.
 *
 * @param {import('./agentrite-definition.mjs').Repeat} repeat
 * @param {number} item
 * @param {(step: Step, item: number, round: { at: number, of: number }, index: number) => Promise<Ran>} runStep
 * @returns {Promise<End | undefined>}
 */
async function runRepeat({ times, until, steps }, item, runStep) {
  for (let at = 1; at <= times; at += 1) {
    /** @type {Ran | undefined} */ let last;
    for (const [index, step] of steps.entries()) {
      last = await runStep(step, item, { at, of: times }, index);
      const end = stoppedBy(last);
      if (end !== undefined) return end;
    }
    if (until === undefined || last === undefined || last.reading.kind !== 'outcome') continue;
    if (!blocks(last.reading.outcome)) return undefined;
    if (at === times) return { kind: 'ran-out', rounds: times, ran: last };
  }
  return undefined;
}

/**
 * The exit status of a run: 0 for one that ran every item, and 3, the command's own, for one that stopped for the
 * human.
 *
 * @param {End} end
 * @returns {number}
 */
export function exitStatus(end) {
  return end.kind === 'complete' ? 0 : 3;
}

/**
 * How long a step took, in whole seconds: `12m 04s`, and from an hour on `1h 02m 03s`.
 *
 * @param {number} milliseconds
 * @returns {string}
 */
export function duration(milliseconds) {
  const seconds = Math.round(milliseconds / 1000);
  const two = (/** @type {number} */ value) => String(value).padStart(2, '0');
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  if (hours === 0) return `${minutes}m ${two(seconds % 60)}s`;
  return `${hours}h ${two(minutes)}m ${two(seconds % 60)}s`;
}

/**
 * What became of a step, in the line after it: that it ran out of time, how its harness ended when it did not end
 * well, and otherwise its outcome or what is wrong with it.
 *
 * @param {Ran} ran
 * @returns {string}
 */
function stepResult({ result, reading }) {
  if (result.timedOut) return 'ran out of time';
  if (result.signal !== null) return `the harness was ended by ${result.signal}`;
  if (result.status !== 0) return `the harness exited with ${result.status}`;
  if (reading.kind === 'outcome') return reading.outcome.outcome;
  if (reading.kind === 'none') return 'no outcome';
  if (reading.kind === 'several') return `${reading.count} outcomes`;
  return 'an outcome not of the form asked for';
}

/**
 * The round of a step in a repeat, as it follows the step's number, or nothing for a step outside one.
 *
 * @param {{ at: number, of: number } | undefined} round
 * @returns {string}
 */
function inRound(round) {
  return round === undefined ? '' : `, round ${round.at} of ${round.of}`;
}

/**
 * The line before a step, and with `ended` the line after it.
 *
 * @param {Planned} planned
 * @param {Ran} [ended]
 * @returns {string}
 */
export function stepLine({ number, round, step }, ended) {
  const head = `step ${number}${inRound(round)}, ${step.role}, ${step.harness}, ${step.model}`;
  if (ended === undefined) return `${head}: started`;
  return `${head}: ${stepResult(ended)} after ${duration(ended.result.milliseconds)}`;
}

/**
 * The list of every step that ran, one line each: its number, role, harness, model and how long it took, each column
 * as wide as its widest entry and two spaces apart, the duration aligned right.
 *
 * @param {Ran[]} ran
 * @returns {string}
 */
export function ranTable(ran) {
  const rows = ran.map(({ planned, result }) => [
    String(planned.number),
    planned.step.role,
    planned.step.harness,
    planned.step.model,
    duration(result.milliseconds),
  ]);
  const widths = rows[0].map((_, column) => Math.max(...rows.map((row) => row[column].length)));
  const last = widths.length - 1;
  const aligned = (/** @type {string} */ cell, /** @type {number} */ column) =>
    column === last ? cell.padStart(widths[column]) : cell.padEnd(widths[column]);
  return rows.map((row) => row.map(aligned).join('  ')).join('\n');
}

/**
 * The line that says how a run ended.
 *
 * @param {End} end
 * @returns {string}
 */
export function endLine(end) {
  if (end.kind === 'complete') return 'The run ran every item of the definition to its end.';
  const opening = `Step ${end.ran.planned.number} stopped the run: `;
  if (end.kind === 'ran-out') {
    return `${opening}the repeat ran its ${end.rounds} rounds, and its until did not hold after the last.`;
  }
  const { planned, result, reading } = end.ran;
  const limit = planned.step.timeoutMinutes;
  /** @type {Record<Stop, () => string>} */ const cases = {
    timeout: () => `it ran past its time limit of ${limit} ${limit === 1 ? 'minute' : 'minutes'}.`,
    harness: () =>
      result.signal === null
        ? `its harness exited with ${result.status}.`
        : `its harness was ended by ${result.signal}.`,
    none: () => 'its final response holds no block marked json.',
    several: () =>
      `its final response holds ${reading.kind === 'several' ? reading.count : 0} blocks marked json, not one.`,
    malformed: () => `its outcome is not of the form asked for. ${reading.kind === 'malformed' ? reading.fault : ''}.`,
    'needs-human': () => 'its outcome is needs-human.',
    failed: () => 'its outcome is failed.',
    questions: () => 'its outcome is done, but holds questions, which the human answers.',
    declines: () => 'it proposes declines of findings, which the human decides.',
    stopWhen: () => 'it holds stopWhen "blocking-findings", and a finding of its outcome blocks.',
  };
  return opening + cases[end.by]();
}

/**
 * What the last step's outcome holds that the human needs, or where its final response is when it has none of the
 * form. Nothing is taken from an outcome not of the form, nor from an earlier step.
 *
 * @param {Ran} last
 * @param {End} end
 * @param {string | undefined} responsePath
 * @returns {string[]}
 */
function lastStepLines(last, end, responsePath) {
  const { number } = last.planned;
  if (last.reading.kind !== 'outcome') {
    if (last.result.response === undefined) return [`The harness gave step ${number} no final response.`];
    return [`The final response of step ${number} is at ${responsePath}.`];
  }
  const { summary, findings, questions, declines } = last.reading.outcome;
  const lines = [`Summary: ${summary}`];
  const open = findings.filter((finding) => finding.blocking);
  if ((end.kind === 'ran-out' || (end.kind === 'stopped' && end.by === 'stopWhen')) && open.length > 0) {
    lines.push('Blocking findings still open:', ...open.map((finding) => `  ${finding.id}: ${finding.summary}`));
  }
  if (questions.length > 0) lines.push('Questions:', ...questions.map((question) => `  - ${question}`));
  if (declines.length > 0) {
    lines.push('Proposed declines:', ...declines.map((decline) => `  ${decline.finding}: ${decline.reason}`));
  }
  return lines;
}

/**
 * What the command prints last, when a run ends: the steps that ran, how the run ended, what the last step's outcome
 * holds, and where the run and the reviewer's findings are.
 *
 * @param {Ran[]} ran
 * @param {End} end
 * @param {{ runDirectory: string, unitDirectory: string, responsePath: string | undefined }} where
 * @returns {string}
 */
export function endReport(ran, end, { runDirectory, unitDirectory, responsePath }) {
  return [
    ranTable(ran),
    '',
    endLine(end),
    ...lastStepLines(/** @type {Ran} */ (ran.at(-1)), end, responsePath),
    '',
    `The run's directory: ${runDirectory}/`,
    `The reviewer's findings are under .reviews/${unitDirectory}/.`,
    '',
  ].join('\n');
}

/** How `orchestrate` is run. */
export const ORCHESTRATE_FORM = 'usage: agentrite orchestrate <unit> [--definition <file>] [--skip-permissions]';

/**
 * @returns {string}
 */
export function orchestrateUsage() {
  return [
    ORCHESTRATE_FORM,
    '',
    '  <unit>               an approved unit, a directory of changes/, by its name or by the four digits its',
    '                       name opens with',
    '  --definition <file>  the definition to run, in the place of the one orchestrator in agentrite.json names:',
    '                       a path relative to the project root, or absolute',
    '  --skip-permissions   given to the agentrite run of every step, so that no harness asks permission.',
    '                       Meant for the sandbox',
  ].join('\n');
}

const ORCHESTRATE_OPTIONS = /** @type {const} */ ({
  definition: { type: 'string' },
  'skip-permissions': { type: 'boolean' },
});

const ORCHESTRATE_VALUES = { definition: 'a file' };

/**
 * The arguments of `orchestrate`. What it throws holds the usage: alone when there is no argument at all, and
 * otherwise after a line that names the first argument the command does not take. It takes no `--`, since it passes
 * nothing on to a harness.
 *
 * @param {string[]} args
 * @returns {{ unit: string, definition: string | undefined, skipPermissions: boolean }}
 */
export function parseOrchestrateArgs(args) {
  if (args.length === 0) throw new Error(orchestrateUsage());
  // Not strict, so that an option the command does not take is named in the kit's words and not in node's.
  const { values, positionals, tokens } = parseArgs({
    args,
    options: ORCHESTRATE_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const error = tokensError(tokens) ?? (positionals.length === 0 ? 'no unit given' : undefined);
  if (error !== undefined) throw new Error(`${error}\n${orchestrateUsage()}`);
  return {
    unit: positionals[0],
    definition: /** @type {string | undefined} */ (values.definition),
    skipPermissions: values['skip-permissions'] === true,
  };
}

/**
 * What is wrong with the first token of the arguments that the command does not take, or `undefined`: an option it
 * does not take, or one given wrongly, a `--`, or a word after the unit.
 *
 * @param {ReturnType<typeof parseArgs>['tokens']} tokens
 * @returns {string | undefined}
 */
function tokensError(tokens) {
  let units = 0;
  for (const token of tokens ?? []) {
    if (token.kind === 'option') {
      const error = optionError(ORCHESTRATE_OPTIONS, ORCHESTRATE_VALUES, token);
      if (error !== undefined) return error;
    } else if (token.kind === 'option-terminator') {
      return 'unexpected argument: --';
    } else {
      units += 1;
      if (units > 1) return `unexpected argument: ${token.value}`;
    }
  }
  return undefined;
}
