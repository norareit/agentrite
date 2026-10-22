import { parseArgs } from 'node:util';
import { optionError } from './agentrite-run.mjs';
import { fieldFrom } from './check-changes.mjs';

/** How `units` is run, on one line. */
export const UNITS_FORM =
  'usage: agentrite units [<number>] [--open | --status <status>] [--kind <kind>] [--limit <count>] [--json]';

export const STATUSES = ['draft', 'approved', 'in-progress', 'implemented', 'cancelled'];

/** The statuses of a unit that is no longer worked on. */
export const END_STATUSES = ['implemented', 'cancelled'];

export const KINDS = ['feature', 'bug', 'task'];

/** How many units are listed unless `--limit` says another number. */
export const DEFAULT_LIMIT = 50;

const UNITS_OPTIONS = /** @type {const} */ ({
  open: { type: 'boolean' },
  status: { type: 'string' },
  kind: { type: 'string' },
  limit: { type: 'string' },
  json: { type: 'boolean' },
});

/** What each option that takes a value takes, as the line that says none was given names it. */
const OPTION_VALUES = { status: 'a status', kind: 'a kind', limit: 'a count' };

/**
 * @typedef {object} UnitsArguments
 * @property {string | undefined} number
 * @property {boolean} open
 * @property {string | undefined} status
 * @property {string | undefined} kind
 * @property {number} limit
 * @property {boolean} json
 */

/**
 * @typedef {object} Unit
 * @property {string} number
 * @property {string} directory
 * @property {string} status
 * @property {string} kind
 * @property {string} title
 */

/**
 * A token of the arguments, as `parseArgs` returns them: an option with what it was given, or another kind of word.
 *
 * @typedef {{
 *   kind: 'option',
 *   name: string,
 *   rawName: string,
 *   value: string | undefined,
 *   inlineValue: boolean | undefined,
 * } | { kind: 'positional' | 'option-terminator' }} Token
 */

/**
 * What is wrong with the options and the number as they were given, or `undefined` when nothing is.
 *
 * @param {Token[]} tokens
 * @param {{ status?: unknown, kind?: unknown, limit?: unknown, open?: unknown }} values
 * @param {string[]} positionals
 * @returns {string | undefined}
 */
function argumentError(tokens, values, positionals) {
  const options = tokens.filter((token) => token.kind === 'option');
  const optionProblem = options.map((token) => optionError(UNITS_OPTIONS, OPTION_VALUES, token)).find(Boolean);
  if (optionProblem !== undefined) return optionProblem;

  const names = options.map((token) => token.name);
  const twice = ['status', 'kind', 'limit'].find((name) => names.filter((given) => given === name).length > 1);
  if (twice !== undefined) return `--${twice} was given twice`;

  const [number, beyond] = positionals;
  if (number !== undefined && !/^\d{4}$/.test(number)) return `<number> is exactly four digits, not ${number}`;
  if (beyond !== undefined) return `unexpected argument: ${beyond}`;
  if (values.status !== undefined && !STATUSES.includes(String(values.status))) {
    return `unknown status: ${values.status}. --status takes ${listOf(STATUSES)}`;
  }
  if (values.kind !== undefined && !KINDS.includes(String(values.kind))) {
    return `unknown kind: ${values.kind}. --kind takes ${listOf(KINDS)}`;
  }
  if (values.limit !== undefined && !/^\d+$/.test(String(values.limit))) {
    return `--limit takes a whole number of zero or more, not ${values.limit}`;
  }
  if (values.open === true && values.status !== undefined) return '--open and --status cannot be given together';
  if (values.limit !== undefined && number !== undefined) return '--limit cannot be given with a number';
  return undefined;
}

/**
 * @param {string[]} words
 * @returns {string}
 */
function listOf(words) {
  return `${words.slice(0, -1).join(', ')} or ${words.at(-1)}`;
}

/**
 * The arguments of `units`. What it throws is the line that names what is wrong, then the form.
 *
 * @param {string[]} args
 * @returns {UnitsArguments}
 */
export function parseUnitsArgs(args) {
  // Not strict, so that an option `units` does not take is named in the kit's words and not in node's.
  const { values, positionals, tokens } = parseArgs({
    args,
    options: UNITS_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const error = argumentError(tokens, values, positionals);
  if (error !== undefined) throw new Error(`${error}\n${UNITS_FORM}`);

  return {
    number: positionals[0],
    open: values.open === true,
    status: /** @type {string | undefined} */ (values.status),
    kind: /** @type {string | undefined} */ (values.kind),
    limit: values.limit === undefined ? DEFAULT_LIMIT : Number(values.limit),
    json: values.json === true,
  };
}

/**
 * Whether a directory of `changes/` is a unit: four digits, a hyphen and at least one character more.
 *
 * @param {string} directory
 * @returns {boolean}
 */
export function isUnitDirectory(directory) {
  return /^\d{4}-./.test(directory);
}

/**
 * The unit a directory of `changes/` holds, read from the text of its `record.md`. The status and the kind are
 * as written there, and the title is the first `#` heading after the front matter, without the unit's number.
 *
 * @param {string} directory
 * @param {string} record
 * @returns {Unit}
 */
export function unitFrom(directory, record) {
  const recordFile = `changes/${directory}/record.md`;
  const status = fieldFrom(record, 'status', recordFile);
  const kind = fieldFrom(record, 'kind', recordFile);
  const number = directory.slice(0, 4);

  const body = record.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, '');
  const heading = body.split(/\r?\n/).find((line) => line.startsWith('# '));
  if (heading === undefined) throw new Error(`${recordFile} is missing a # heading`);
  const title = heading.slice(2).replace(new RegExp(`^${number} `), '');

  return { number, directory, status, kind, title };
}

/**
 * The units to show: those that pass the filters, highest number first, cut to the limit unless a number was given.
 * `total` is how many passed the filters, before the limit.
 *
 * @param {Unit[]} units
 * @param {UnitsArguments} parsed
 * @returns {{ units: Unit[], total: number }}
 */
export function selectUnits(units, { number, open, status, kind, limit }) {
  const passing = units
    .filter((unit) => number === undefined || unit.directory.startsWith(`${number}-`))
    .filter((unit) => !open || !END_STATUSES.includes(unit.status))
    .filter((unit) => status === undefined || unit.status === status)
    .filter((unit) => kind === undefined || unit.kind === kind)
    .sort(
      (earlier, later) =>
        later.number.localeCompare(earlier.number) || earlier.directory.localeCompare(later.directory),
    );
  const unlimited = number !== undefined || limit === 0;
  return { units: unlimited ? passing : passing.slice(0, limit), total: passing.length };
}

/**
 * What the filters and the number given are, as the line with nothing to show names them.
 *
 * @param {UnitsArguments} parsed
 * @returns {string[]}
 */
function givenFilters({ number, open, status, kind }) {
  return [
    ...(number === undefined ? [] : [number]),
    ...(open ? ['--open'] : []),
    ...(status === undefined ? [] : [`--status ${status}`]),
    ...(kind === undefined ? [] : [`--kind ${kind}`]),
  ];
}

/**
 * What `agentrite units` prints: a line a unit, and a closing line when the limit left units out.
 *
 * @param {{ units: Unit[], total: number }} selection
 * @param {UnitsArguments} parsed
 * @returns {string}
 */
export function unitsListing({ units, total }, parsed) {
  if (units.length === 0) {
    const given = givenFilters(parsed);
    return `${given.length === 0 ? 'no units' : `no units with ${given.join(', ')}`}\n`;
  }
  const widest = (column) => Math.max(...units.map((unit) => unit[column].length));
  const [statusWidth, kindWidth] = [widest('status'), widest('kind')];
  const lines = units.map(
    (unit) => `${unit.number}  ${unit.status.padEnd(statusWidth)}  ${unit.kind.padEnd(kindWidth)}  ${unit.title}`,
  );
  if (units.length < total) lines.push(`showing ${units.length} of ${total} units, --limit 0 shows them all`);
  return `${lines.join('\n')}\n`;
}

/**
 * What `agentrite units --json` prints, for a script.
 *
 * @param {{ units: Unit[], total: number }} selection
 * @returns {string}
 */
export function unitsJson({ units, total }) {
  const listed = units.map(({ number, directory, status, kind, title }) => ({
    number,
    directory,
    status,
    kind,
    title,
  }));
  return `${JSON.stringify({ units: listed, total }, null, 2)}\n`;
}
