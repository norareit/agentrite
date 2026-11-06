import { parseArgs } from 'node:util';
import { optionError } from './agentrite-run.mjs';
import { commitPrefix, loggedRecord } from './agentrite-record.mjs';

/** How `approve` is run, on one line. */
export const APPROVE_FORM = 'usage: agentrite approve <unit>';

/** The command takes no option, so every option given is an unknown one. */
const APPROVE_OPTIONS = /** @type {const} */ ({});

/**
 * What `approve` is given: the unit, as it was given. Throws the line that says what is wrong, a line feed and the
 * form, for the entry point to print and exit 2 with.
 *
 * @param {string[]} args
 * @returns {{ unit: string }}
 */
export function parseApproveArgs(args) {
  // Not strict, so that an option the command does not take is named in the kit's words and not in node's.
  const { positionals, tokens } = parseArgs({
    args,
    options: APPROVE_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const error = tokensError(tokens) ?? (positionals.length === 0 ? 'no unit given' : undefined);
  if (error !== undefined) throw new Error(`${error}\n${APPROVE_FORM}`);
  return { unit: positionals[0] };
}

/**
 * What is wrong with the first token of the arguments that the command does not take, or `undefined`: an option, a
 * `--`, or a word after the unit.
 *
 * @param {ReturnType<typeof parseArgs>['tokens']} tokens
 * @returns {string | undefined}
 */
function tokensError(tokens) {
  let words = 0;
  for (const token of tokens ?? []) {
    if (token.kind === 'option') return optionError(APPROVE_OPTIONS, {}, token);
    if (token.kind === 'option-terminator') return 'unexpected argument: --';
    words += 1;
    if (words > 1) return `unexpected argument: ${token.value}`;
  }
  return undefined;
}

/**
 * The document whose approval a kind of unit is: the record of a task, and the spec of a feature or a bug.
 *
 * @param {string} kind
 * @returns {'record' | 'spec'}
 */
function approvedDocument(kind) {
  return kind === 'task' ? 'record' : 'spec';
}

/**
 * @param {string} kind
 * @param {string} instant
 * @returns {string}
 */
export function approvalEntry(kind, instant) {
  return `- ${instant} [human] approved the ${approvedDocument(kind)}. The status is \`approved\``;
}

/**
 * @param {string} kind
 * @param {string} directory the name of the unit's directory in `changes/`
 * @returns {string}
 */
export function approvalMessage(kind, directory) {
  return `${commitPrefix(kind)}-${directory.slice(0, 4)} Approve the ${approvedDocument(kind)}`;
}

/**
 * The record approved: its `status` field set to `approved`, and the entry directly after the last entry of `## Log`.
 * Nothing else of the text changes.
 *
 * @param {string} record
 * @param {string} kind
 * @param {string} instant
 * @returns {string}
 */
export function approvedRecord(record, kind, instant) {
  return loggedRecord(record, 'approved', [approvalEntry(kind, instant)]);
}

/**
 * @param {string} directory
 * @param {string} hash
 * @param {string} message
 * @returns {string}
 */
export function approvedLine(directory, hash, message) {
  return `changes/${directory}/ is approved, in ${hash} ${message}`;
}
