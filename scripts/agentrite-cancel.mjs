import { parseArgs } from 'node:util';
import { commitPrefix, loggedRecord } from './agentrite-record.mjs';
import { optionError } from './agentrite-run.mjs';

/** How `cancel` is run, on one line. */
export const CANCEL_FORM = 'usage: agentrite cancel <unit> --reason <text> [--by <unit>]';

const CANCEL_OPTIONS = /** @type {const} */ ({ reason: { type: 'string' }, by: { type: 'string' } });

/** What each option takes, as the line that says none was given names it. */
const CANCEL_VALUES = { reason: 'a reason', by: 'a unit' };

/** The width an entry of a record is wrapped at, as the line limit of this repository's documents. */
const LINE_WIDTH = 120;

/**
 * What `cancel` is given: the unit as it was given, the reason as `reasonText` makes it, and the unit by, or
 * `undefined` without `--by`. Throws the line that says what is wrong, a line feed and the form, for the entry point
 * to print and exit 2 with.
 *
 * @param {string[]} args
 * @returns {{ unit: string, reason: string, by: string | undefined }}
 */
export function parseCancelArgs(args) {
  // Not strict, so that an option the command does not take is named in the kit's words and not in node's.
  const { positionals, tokens } = parseArgs({
    args,
    options: CANCEL_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const given = (tokens ?? []).filter((token) => token.kind === 'option');
  const value = (name) => given.find((token) => token.name === name)?.value;
  const error = tokensError(tokens) ?? afterTokensError(positionals, value('reason'));
  if (error !== undefined) throw new Error(`${error}\n${CANCEL_FORM}`);
  return { unit: positionals[0], reason: reasonText(/** @type {string} */ (value('reason'))), by: value('by') };
}

/**
 * What is wrong with the first token of the arguments, or `undefined`: an option the command does not take, or one
 * without its value or given twice, a `--`, or a word after the unit.
 *
 * @param {ReturnType<typeof parseArgs>['tokens']} tokens
 * @returns {string | undefined}
 */
function tokensError(tokens) {
  const seen = new Set();
  let words = 0;
  for (const token of tokens ?? []) {
    if (token.kind === 'option') {
      const error = optionError(CANCEL_OPTIONS, CANCEL_VALUES, token);
      if (error !== undefined) return error;
      if (seen.has(token.name)) return `${token.rawName} was given twice`;
      seen.add(token.name);
    } else if (token.kind === 'option-terminator') {
      return 'unexpected argument: --';
    } else {
      words += 1;
      if (words > 1) return `unexpected argument: ${token.value}`;
    }
  }
  return undefined;
}

/**
 * What is wrong with the arguments once their tokens are read, or `undefined`: no unit, no reason, or a reason that
 * is not one line of words.
 *
 * @param {string[]} positionals
 * @param {string | undefined} reason the value of `--reason` as it was given
 * @returns {string | undefined}
 */
function afterTokensError(positionals, reason) {
  if (positionals.length === 0) return 'no unit given';
  if (reason === undefined) return '--reason is required, and gives the reason in words';
  if (/[\r\n]/.test(reason)) return '--reason holds a line break, and the reason is one line';
  if (reasonText(reason) === '') {
    return '--reason gives no reason once its white space and final full stop are removed';
  }
  return undefined;
}

/**
 * The reason without its surrounding white space and one final full stop, since the entry adds its own.
 *
 * @param {string} value
 * @returns {string}
 */
export function reasonText(value) {
  const trimmed = value.trim();
  return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;
}

/**
 * @param {string} instant
 * @param {string} reason
 * @param {string | undefined} byDirectory the directory of the unit that did the work or made this one moot
 * @returns {string} the entry, on one line
 */
export function cancellationEntry(instant, reason, byDirectory) {
  const by = byDirectory === undefined ? '' : ` The unit \`${byDirectory}\` did the work or made it moot.`;
  return `- ${instant} [human] cancelled the unit: ${reason}.${by} The status is \`cancelled\``;
}

/**
 * The entry wrapped at 120 characters, at spaces, with each line after the first indented by two spaces. A word
 * longer than a line stands alone on its line, unbroken.
 *
 * @param {string} entry
 * @returns {string[]}
 */
export function wrappedEntry(entry) {
  /** @type {string[]} */
  const lines = [];
  let line = '';
  for (const word of entry.split(' ')) {
    if (line === '') {
      line = lines.length === 0 ? word : `  ${word}`;
    } else if (line.length + 1 + word.length <= LINE_WIDTH) {
      line += ` ${word}`;
    } else {
      lines.push(line);
      line = `  ${word}`;
    }
  }
  lines.push(line);
  return lines;
}

/**
 * @param {string} directory
 * @param {string} status
 * @returns {string | undefined} why a unit with this status is not cancelled, or `undefined` when it is
 */
export function cancellationRefusal(directory, status) {
  const unit = `the unit changes/${directory}/`;
  if (['draft', 'approved', 'in-progress'].includes(status)) return undefined;
  if (status === 'implemented') {
    return (
      `${unit} is implemented, and an implemented unit is never cancelled: ` +
      'undoing its work is a new unit that names it in supersedes'
    );
  }
  if (status === 'cancelled') return `${unit} is cancelled already on the branch checked out`;
  return `${unit} is ${status}, and a unit is cancelled from draft, approved or in-progress`;
}

/**
 * @param {string} record
 * @param {string[]} entryLines
 * @returns {string} the record with its status set to `cancelled` and the entry after the last one of `## Log`
 */
export function cancelledRecord(record, entryLines) {
  return loggedRecord(record, 'cancelled', entryLines);
}

/**
 * @param {string} kind
 * @param {string} directory the name of the unit's directory in `changes/`
 * @returns {string}
 */
export function cancellationMessage(kind, directory) {
  return `${commitPrefix(kind)}-${directory.slice(0, 4)} Cancel the unit`;
}

/**
 * @param {string} directory
 * @param {string} branch
 * @param {string} hash
 * @param {string} message
 * @returns {string}
 */
export function cancelledLine(directory, branch, hash, message) {
  return `changes/${directory}/ is cancelled on ${branch}, in ${hash} ${message}`;
}
