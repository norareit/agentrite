import { parseArgs } from 'node:util';
import { readOutcome } from './agentrite-outcome.mjs';
import { optionError } from './agentrite-run.mjs';

/**
 * @typedef {import('./agentrite-definition.mjs').Definition} Definition
 * @typedef {import('./agentrite-definition.mjs').Step} Step
 * @typedef {import('./agentrite-headless.mjs').Followed} Followed
 * @typedef {import('./agentrite-outcome.mjs').Finding} Finding
 * @typedef {import('./agentrite-outcome.mjs').Outcome} Outcome
 * @typedef {import('./agentrite-outcome.mjs').Reading} Reading
 * @typedef {{
 *   number: number,
 *   item: number,
 *   round: { at: number, of: number } | undefined,
 *   index: number | undefined,
 *   step: Step,
 *   session: string | undefined,
 *   asked: boolean,
 * }} Planned A step about to run: its number in the order the steps run, its item of the definition, its round and
 *   its place among the steps of a repeat, the session it continues, and whether it is an ask again, which asks the
 *   step before it, in its session, for the outcome its final response did not hold
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
 * A step judged `none` whose session is known, and that is not itself an ask again, is followed by an ask again of
 * the same step in that session, whose `Ran` stands for the step's in how the run goes on and ends. `unfixed` holds,
 * in the order the repeats ran, the last step of each repeat that let the run go on with findings still open.
 *
 * @param {Definition} definition
 * @param {Effects} effects
 * @returns {Promise<{ ran: Ran[], end: End, unfixed: Ran[] }>}
 */
export async function orchestrate(definition, effects) {
  /** @type {Ran[]} */ const ran = [];
  /** @type {Ran[]} */ const unfixed = [];
  /** @type {Map<string, string>} */ const sessions = new Map();

  /**
   * @param {Step} step
   * @param {number} item
   * @param {{ at: number, of: number } | undefined} round
   * @param {number | undefined} index
   * @param {boolean} [asked]
   * @returns {Promise<Ran>}
   */
  const runStep = async (step, item, round, index, asked = false) => {
    const key = JSON.stringify([step.role, step.harness]);
    /** @type {Planned} */ const planned = {
      number: ran.length,
      item,
      round,
      index,
      step,
      session: sessions.get(key),
      asked,
    };
    effects.started(planned);
    const result = await effects.run(planned);
    if (result.session !== undefined) sessions.set(key, result.session);
    // A step the command ended did not finish, so what it printed is not its outcome, and is kept as its response.
    /** @type {Reading} */ const reading =
      result.response === undefined || result.timedOut ? { kind: 'none' } : readOutcome(result.response);
    const stop = judgeStep(step, result, reading);
    // `none` is judged only of a harness that exited 0 by itself, within its time limit, with no block marked json or
    // no final response: a step that finished, whose outcome alone is missing.
    const askAgain = stop === 'none' && !asked && sessions.has(key);
    /** @type {Ran} */ const entry = { planned, result, reading, stop: askAgain ? undefined : stop };
    ran.push(entry);
    effects.ended(entry);
    return askAgain ? runStep(step, item, round, index, true) : entry;
  };

  for (const [item, entry] of definition.steps.entries()) {
    /** @type {{ end: End | undefined, unfixed?: Ran }} */ const ended =
      'repeat' in entry
        ? await runRepeat(entry.repeat, item, runStep)
        : { end: stoppedBy(await runStep(entry, item, undefined, undefined)) };
    if (ended.unfixed !== undefined) unfixed.push(ended.unfixed);
    if (ended.end !== undefined) return { ran, end: ended.end, unfixed };
  }
  return { ran, end: { kind: 'complete' }, unfixed };
}

/**
 * @param {Ran} ran
 * @returns {End | undefined}
 */
function stoppedBy(ran) {
  return ran.stop === undefined ? undefined : { kind: 'stopped', by: ran.stop, ran };
}

/**
 * True when `until` holds for the outcome of the last step of a round.
 *
 * @param {NonNullable<import('./agentrite-definition.mjs').Repeat['until']>} until
 * @param {Outcome} outcome
 * @returns {boolean}
 */
function untilHolds(until, outcome) {
  return until === 'no-findings' ? outcome.findings.length === 0 : !blocks(outcome);
}

/**
 * Runs the rounds of a repeat, and gives in `end` how it stopped the run, or `undefined` when the run goes on after
 * it. The step is judged first, and the repeat's `until` only on the last step of a round that let the run go on.
 * When `until` does not hold after the last round and no finding blocks, as under `"no-findings"`, the run goes on,
 * and `unfixed` is that last step, whose findings are still open.
 *
 * @param {import('./agentrite-definition.mjs').Repeat} repeat
 * @param {number} item
 * @param {(step: Step, item: number, round: { at: number, of: number }, index: number) => Promise<Ran>} runStep
 * @returns {Promise<{ end: End | undefined, unfixed?: Ran }>}
 */
async function runRepeat({ times, until, steps }, item, runStep) {
  for (let at = 1; at <= times; at += 1) {
    /** @type {Ran | undefined} */ let last;
    for (const [index, step] of steps.entries()) {
      last = await runStep(step, item, { at, of: times }, index);
      const end = stoppedBy(last);
      if (end !== undefined) return { end };
    }
    if (until === undefined || last === undefined || last.reading.kind !== 'outcome') continue;
    if (untilHolds(until, last.reading.outcome)) return { end: undefined };
    if (at < times) continue;
    if (blocks(last.reading.outcome)) return { end: { kind: 'ran-out', rounds: times, ran: last } };
    return { end: undefined, unfixed: last };
  }
  return { end: undefined };
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

/** The source of the form a variant takes: the one `./sandbox.sh --variant` takes. */
export const VARIANT_PATTERN = '[a-z0-9]+(?:-[a-z0-9]+)*';

/** The source of the instant a run's directory is named by, as `instantOf` writes it. */
export const INSTANT_PATTERN = '\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}Z';

/**
 * The variant of a run, by the rule of `process.md`: what follows the last `--` in the name of its branch, or `null`
 * for a run without a branch and for a branch with no `--`. A variant of another form is refused, since it would
 * name the run's directory.
 *
 * @param {string | null} branch
 * @returns {string | null}
 */
export function variantOf(branch) {
  if (branch === null || !branch.includes('--')) return null;
  const variant = branch.slice(branch.lastIndexOf('--') + 2);
  if (!new RegExp(`^${VARIANT_PATTERN}$`).test(variant)) {
    throw new Error(
      `the branch ${branch} gives the variant "${variant}", and a variant is one or more words of the lowercase ` +
        'letters a to z and the digits 0 to 9, joined by single hyphens',
    );
  }
  return variant;
}

/**
 * The name of a run's directory: the instant it started, and for a run on a variant `--` and the variant.
 *
 * @param {string} instant
 * @param {string | null} variant
 * @returns {string}
 */
export function runName(instant, variant) {
  return variant === null ? instant : `${instant}--${variant}`;
}

/**
 * What names a step in the lines about it: its number, round, role, harness and model.
 *
 * @param {Pick<Planned, 'number' | 'round' | 'step'>} planned
 * @returns {string}
 */
export function stepHead({ number, round, step }) {
  return `step ${number}${inRound(round)}, ${step.role}, ${step.harness}, ${step.model}`;
}

/**
 * How many digits the number of a step's files takes: those of the highest number the definition can reach, with an
 * ask again after every step, and two at least, so that the names sort in the order the steps ran.
 *
 * @param {Definition} definition
 * @returns {number}
 */
export function numberWidth(definition) {
  const count = definition.steps.reduce(
    (total, item) => total + ('repeat' in item ? item.repeat.times * item.repeat.steps.length : 1),
    0,
  );
  return Math.max(2, String(2 * count - 1).length);
}

/**
 * The name of the file of kind `kind` that a run keeps for a step, such as `02-reviewer.followed.jsonl`.
 *
 * @param {Definition} definition
 * @param {number} number
 * @param {string} role
 * @param {string} kind
 * @returns {string}
 */
export function stepFileName(definition, number, role, kind) {
  return `${String(number).padStart(numberWidth(definition), '0')}-${role}.${kind}`;
}

/**
 * The line before a step, and with `ended` the line after it, each saying of an ask again that it is one.
 *
 * @param {Planned} planned
 * @param {Ran} [ended]
 * @returns {string}
 */
export function stepLine(planned, ended) {
  const head = `${stepHead(planned)}${planned.asked ? ', asked again for its outcome' : ''}`;
  if (ended === undefined) return `${head}: started`;
  return `${head}: ${stepResult(ended)} after ${duration(ended.result.milliseconds)}`;
}

/**
 * The list of every step that ran, one line each: its number, role, harness, model, how long it took and, for an ask
 * again, `asked again`, each column as wide as its widest entry and two spaces apart, the duration aligned right, and
 * no line ending in a space.
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
    planned.asked ? 'asked again' : '',
  ]);
  const widths = rows[0].map((_cell, column) => Math.max(...rows.map((row) => row[column].length)));
  const durationColumn = 4;
  const aligned = (/** @type {string} */ cell, /** @type {number} */ column) =>
    column === durationColumn ? cell.padStart(widths[column]) : cell.padEnd(widths[column]);
  return rows.map((row) => row.map(aligned).join('  ').trimEnd()).join('\n');
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
 * form. Nothing is taken from an outcome not of the form, and nothing but the items for after the run, which
 * `afterwardsLines` gives, and the findings a repeat left open, which `unfixedLines` gives, from an earlier step.
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
    lines.push('Blocking findings still open:', ...open.map(findingLine));
  }
  if (questions.length > 0) lines.push('Questions:', ...questions.map((question) => `  - ${question}`));
  if (declines.length > 0) {
    lines.push('Proposed declines:', ...declines.map((decline) => `  ${decline.finding}: ${decline.reason}`));
  }
  return lines;
}

/**
 * The line of one finding in a list of findings of the end report.
 *
 * @param {Finding} finding
 * @returns {string}
 */
function findingLine(finding) {
  return `  ${finding.id}: ${finding.summary}`;
}

/**
 * The findings still open of each repeat that let the run go on with them, in the order the repeats ran, each after
 * a line that names the step whose outcome holds them.
 *
 * @param {Ran[]} unfixed
 * @returns {string[]}
 */
function unfixedLines(unfixed) {
  return unfixed.flatMap(({ planned, reading }) => [
    `Non-blocking findings still open after step ${planned.number}:`,
    ...(reading.kind === 'outcome' ? reading.outcome.findings.map(findingLine) : []),
  ]);
}

/**
 * The items for after the run of every step that gave an outcome of the form, grouped by step in the order the steps
 * ran, each as the step gave it. A step that left none is left out, and so is the whole part when no step left one.
 *
 * @param {Ran[]} ran
 * @returns {string[]}
 */
function afterwardsLines(ran) {
  /** @type {string[]} */ const lines = [];
  for (const { planned, reading } of ran) {
    if (reading.kind !== 'outcome' || reading.outcome.afterwards.length === 0) continue;
    lines.push(`  step ${planned.number}${inRound(planned.round)}, ${planned.step.role}:`);
    lines.push(...reading.outcome.afterwards.map((item) => `    - ${item}`));
  }
  return lines.length === 0 ? [] : ['After the run:', ...lines];
}

/**
 * What the command prints last, when a run ends: the steps that ran, how the run ended, what the last step's outcome
 * holds, the findings each repeat left open, the items for after the run of every step, and where the run and the
 * reviewer's findings are.
 *
 * @param {Ran[]} ran
 * @param {End} end
 * @param {Ran[]} unfixed
 * @param {{ runDirectory: string, unitDirectory: string, responsePath: string | undefined }} where
 * @returns {string}
 */
export function endReport(ran, end, unfixed, { runDirectory, unitDirectory, responsePath }) {
  return [
    ranTable(ran),
    '',
    endLine(end),
    ...lastStepLines(/** @type {Ran} */ (ran.at(-1)), end, responsePath),
    ...unfixedLines(unfixed),
    ...afterwardsLines(ran),
    '',
    `The run's directory: ${runDirectory}/`,
    `The reviewer's findings are under .reviews/${unitDirectory}/.`,
    '',
  ].join('\n');
}

/**
 * The time of a followed item, in UTC, as `14:03:27`.
 *
 * @param {number} time milliseconds since the epoch
 * @returns {string}
 */
export function clockTime(time) {
  return new Date(time).toISOString().slice(11, 19);
}

/** The most of a command's first line a call's label holds, in code points. */
const COMMAND_LENGTH = 100;

/**
 * What a tool call is labelled by: the first of its description, the path it acts on, the pattern it searches for and
 * the first line of its command, cut to `COMMAND_LENGTH` code points, that is not empty, or `undefined` for none. A
 * line feed or a carriage return in it is written as `\n` or `\r`, so that the call stays on one line.
 *
 * @param {Extract<Followed, { kind: 'call' }>} call
 * @returns {string | undefined}
 */
export function callLabel({ description, path, pattern, command }) {
  const firstLine = command === undefined ? undefined : Array.from(command.split('\n')[0]).slice(0, COMMAND_LENGTH);
  const label = [description, path, pattern, firstLine?.join('')].find((text) => text !== undefined && text !== '');
  return label?.replaceAll('\n', '\\n').replaceAll('\r', '\\r');
}

/**
 * A followed item as it is printed, with no line break after it: a text message in full after its time, and a tool
 * call as one dimmed line, so that the messages stand out.
 *
 * @param {Followed} item
 * @param {string} time the item's time, as `clockTime` gives it
 * @returns {string}
 */
export function followedText(item, time) {
  if (item.kind === 'text') return `${time} ${item.text.replace(/[\r\n]+$/, '')}`;
  const label = callLabel(item);
  return `\x1b[2m${time} → ${item.tool}${label === undefined ? '' : ` ${label}`}\x1b[22m`;
}

/**
 * The line of the followed file for one item: a JSON object and a line break. The label is the one the terminal
 * prints, so that the two cannot drift apart, and `JSON.stringify` writes a line break of a text as `\n`, so the line
 * holds none but its last.
 *
 * @param {Followed} item
 * @param {string} instant the item's time, as `instantOf` gives it
 * @returns {string}
 */
export function followedLine(item, instant) {
  const object =
    item.kind === 'text'
      ? { time: instant, kind: 'text', text: item.text }
      : { time: instant, kind: 'call', tool: item.tool, label: callLabel(item) ?? null };
  return `${JSON.stringify(object)}\n`;
}

/**
 * A followed item with its time known.
 *
 * @typedef {import('./agentrite-headless.mjs').Followed & { time: number }} Timed
 */

/**
 * The items with the time each is followed at: the time the harness gave, or what `now` gives for an item it gave
 * none for. The terminal and the followed file take the same instant of an item because it is set once, here.
 *
 * @param {Followed[]} items
 * @param {() => number} now
 * @returns {Timed[]}
 */
export function timedItems(items, now) {
  return items.map((item) => ({ ...item, time: item.time ?? now() }));
}

/**
 * The printer of one step: it writes the items followed of the step as they are made known, each text message
 * between blank lines, one blank line between two of them, and the calls on consecutive lines. The first item has no
 * blank line before it, as the frame it follows ends in one.
 *
 * @param {(text: string) => void} write
 * @returns {(items: Timed[]) => void}
 */
export function followPrinter(write) {
  // The printer starts as though a blank line was just written: the frame the step's first item follows ends in one.
  let afterBlank = true;
  return (items) => {
    for (const item of items) {
      const text = followedText(item, clockTime(item.time));
      if (item.kind === 'call') write(`${text}\n`);
      else write(`${afterBlank ? '' : '\n'}${text}\n\n`);
      afterBlank = item.kind === 'text';
    }
  };
}

/**
 * What the command prints on standard output while it runs a definition: the line before a step, the items followed
 * of the step, the line after it, and the end report.
 *
 * @typedef {object} RunOutput
 * @property {(line: string) => void} started
 * @property {(items: Timed[]) => void} items
 * @property {(line: string) => void} ended
 * @property {(text: string) => void} report
 */

/**
 * The output without `--follow`: the lines of the steps, a blank line and the end report, and nothing of the items.
 *
 * @param {(text: string) => void} write
 * @returns {RunOutput}
 */
export function plainOutput(write) {
  return {
    started: (line) => write(`${line}\n`),
    items: () => {},
    ended: (line) => write(`${line}\n`),
    report: (text) => write(`\n${text}`),
  };
}

const RULE_WIDTH = 80;

/** The rule that opens a frame of the command's own output. */
export const OPENING_RULE = '==== agentrite '.padEnd(RULE_WIDTH, '=');

/** The rule that closes a frame of the command's own output. */
export const CLOSING_RULE = '='.repeat(RULE_WIDTH);

/**
 * The output with `--follow`: as `plainOutput`, with the items of each step printed between its two lines, and the
 * command's own lines in frames. The line a step starts with has a frame of its own when it is the first step, the
 * line a step ends with shares one with the line the next step starts with, and the line the last step ends with
 * shares one with the end report. No frame is open while a step runs, so what the harness prints on standard error
 * then stands outside one.
 *
 * @param {(text: string) => void} write
 * @returns {RunOutput}
 */
export function framedOutput(write) {
  let tail = '';
  let open = false;
  const put = (/** @type {string} */ text) => {
    write(text);
    tail = (tail + text).slice(-2);
  };
  const openFrame = () => {
    if (open) return;
    if (tail !== '' && tail !== '\n\n') put('\n');
    put(`${OPENING_RULE}\n`);
    open = true;
  };
  let print = followPrinter(put);
  return {
    started: (line) => {
      openFrame();
      put(`${line}\n${CLOSING_RULE}\n\n`);
      open = false;
      print = followPrinter(put);
    },
    items: (items) => print(items),
    ended: (line) => {
      openFrame();
      put(`${line}\n`);
    },
    report: (text) => {
      openFrame();
      put(`\n${text}${CLOSING_RULE}\n`);
      open = false;
    },
  };
}

/** How `orchestrate` is run. */
export const ORCHESTRATE_FORM =
  'usage: agentrite orchestrate <unit> [--definition <file>] [--skip-permissions] [--follow]';

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
    "  --follow             print each step's messages and tool calls while it runs",
  ].join('\n');
}

const ORCHESTRATE_OPTIONS = /** @type {const} */ ({
  definition: { type: 'string' },
  'skip-permissions': { type: 'boolean' },
  follow: { type: 'boolean' },
});

const ORCHESTRATE_VALUES = { definition: 'a file' };

/**
 * The arguments of `orchestrate`. What it throws holds the usage: alone when there is no argument at all, and
 * otherwise after a line that names the first argument the command does not take. It takes no `--`, since it passes
 * nothing on to a harness.
 *
 * @param {string[]} args
 * @returns {{ unit: string, definition: string | undefined, skipPermissions: boolean, follow: boolean }}
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
    follow: values.follow === true,
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
