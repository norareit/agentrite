import { parseArgs } from 'node:util';
import { optionError } from './agentrite-run.mjs';
import { fieldFrom } from './check-changes.mjs';

/** How `approve` is run, on one line. */
export const APPROVE_FORM = 'usage: agentrite approve <unit>';

/** The command takes no option, so every option given is an unknown one. */
const APPROVE_OPTIONS = /** @type {const} */ ({});

/** The prefix of the commits of each kind of unit, as `process.md` gives them. */
const PREFIXES = { feature: 'feature', bug: 'bugfix', task: 'task' };

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
 * The status and the kind of a record, refused when either is missing, when it has no `## Log` heading, or when the
 * kind is none that a commit has a prefix for.
 *
 * @param {string} record
 * @param {string} recordFile
 * @returns {{ status: string, kind: string }}
 */
export function recordFields(record, recordFile) {
  const status = fieldFrom(record, 'status', recordFile);
  const kind = fieldFrom(record, 'kind', recordFile);
  if (!record.split('\n').some((line) => /^## Log\s*$/.test(line))) {
    throw new Error(`${recordFile} is missing a ## Log heading`);
  }
  if (!Object.hasOwn(PREFIXES, kind)) {
    throw new Error(`${recordFile} gives the kind ${kind}, and a unit is a feature, a bug or a task`);
  }
  return { status, kind };
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
  return `${PREFIXES[kind]}-${directory.slice(0, 4)} Approve the ${approvedDocument(kind)}`;
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
  const ending = record.includes('\r\n') ? '\r\n' : '\n';
  const lines = record.split(/(?<=\n)/);
  const status = lines.findIndex((line) => /^status:[ \t]*\S/.test(line));
  lines[status] = lines[status].replace(/^(status:[ \t]*)\S.*?(\s*)$/, '$1approved$2');

  const heading = lines.findIndex((line) => /^## Log\s*$/.test(line));
  const next = lines.findIndex((line, index) => index > heading && line.startsWith('## '));
  const end = next === -1 ? lines.length : next;
  let last = heading;
  for (let index = heading + 1; index < end; index += 1) if (lines[index].trim() !== '') last = index;

  const entry = approvalEntry(kind, instant);
  if (last === heading) {
    if (!/\n$/.test(lines[heading])) lines[heading] += ending;
    lines.splice(heading + 1, 0, `${ending}${entry}${ending}`);
    return endedAt(lines, heading + 1, ending);
  }
  if (!/\n$/.test(lines[last])) lines[last] += ending;
  lines.splice(last + 1, 0, `${entry}${ending}`);
  return lines.join('');
}

/**
 * The lines joined, where the line at `index` was spliced in with its own ending, and a blank line is kept between
 * it and the section that follows.
 *
 * @param {string[]} lines
 * @param {number} index
 * @param {string} ending
 * @returns {string}
 */
function endedAt(lines, index, ending) {
  const following = lines[index + 1];
  if (following !== undefined && following.trim() !== '') lines[index] += ending;
  return lines.join('');
}

/**
 * The files `git status --porcelain=v1 -z --untracked-files=all --no-renames` printed, with the path from the project
 * root and how each differs from the commit checked out. `prefix` is what `git rev-parse --show-prefix` printed,
 * which the paths of status start with when the project is in a directory of a larger repository.
 *
 * @param {string} statusOutput
 * @param {string} prefix
 * @returns {{ path: string, state: string }[]}
 */
export function uncommittedFiles(statusOutput, prefix) {
  return statusOutput
    .split('\0')
    .filter((entry) => entry !== '')
    .map((entry) => {
      const path = entry.slice(3).startsWith(prefix) ? entry.slice(3 + prefix.length) : entry.slice(3);
      return { path, state: stateOf(entry.slice(0, 2)) };
    });
}

/**
 * @param {string} columns the two status columns of a file
 * @returns {string}
 */
function stateOf(columns) {
  if (columns === '??') return 'not tracked';
  const staged = columns[0] !== ' ';
  const changed = columns[1] !== ' ';
  if (staged && changed) return 'staged and changed';
  return staged ? 'staged' : 'changed';
}

/**
 * @param {string} directory
 * @param {{ path: string, state: string }[]} files
 * @returns {string}
 */
export function uncommittedRefusal(directory, files) {
  return [
    `changes/${directory}/ holds files that differ from the commit checked out:`,
    ...files.map(({ path, state }) => `- ${path}: ${state}`),
    'The human approves what is committed, so commit these files, or discard their changes, and run the command again',
  ].join('\n');
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
