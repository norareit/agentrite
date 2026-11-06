import { fieldFrom } from './check-changes.mjs';

/** The prefix of the commits of each kind of unit, as `process.md` gives them. */
const PREFIXES = { feature: 'feature', bug: 'bugfix', task: 'task' };

/**
 * The prefix of the commits of a kind of unit.
 *
 * @param {string} kind a kind that `recordFields` accepted
 * @returns {string}
 */
export function commitPrefix(kind) {
  return PREFIXES[kind];
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
 * The record with its `status` field set to `status`, and the lines of the entry directly after the last entry of
 * `## Log`. Nothing else of the text changes.
 *
 * @param {string} record
 * @param {string} status
 * @param {string[]} entryLines
 * @returns {string}
 */
export function loggedRecord(record, status, entryLines) {
  const ending = record.includes('\r\n') ? '\r\n' : '\n';
  const lines = record.split(/(?<=\n)/);
  const statusIndex = lines.findIndex((line) => /^status:[ \t]*\S/.test(line));
  lines[statusIndex] = lines[statusIndex].replace(/^(status:[ \t]*)\S.*?(\s*)$/, `$1${status}$2`);

  const heading = lines.findIndex((line) => /^## Log\s*$/.test(line));
  const next = lines.findIndex((line, index) => index > heading && line.startsWith('## '));
  const end = next === -1 ? lines.length : next;
  let last = heading;
  for (let index = heading + 1; index < end; index += 1) if (lines[index].trim() !== '') last = index;

  const entry = entryLines.join(ending);
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
 * @param {'approves' | 'cancels'} act what the human does, which the last line says they do to what is committed
 * @returns {string}
 */
export function uncommittedRefusal(directory, files, act) {
  return [
    `changes/${directory}/ holds files that differ from the commit checked out:`,
    ...files.map(({ path, state }) => `- ${path}: ${state}`),
    `The human ${act} what is committed, so commit these files, or discard their changes, and run the command again`,
  ].join('\n');
}

