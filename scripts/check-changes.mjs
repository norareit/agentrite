import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSettings, SETTINGS_FILE } from './agentrite-settings.mjs';

/**
 * @typedef {object} ChangeDocuments
 * @property {string} status
 * @property {string} [record]
 * @property {string} [spec]
 * @property {string} [plan]
 */

/**
 * Both end statuses freeze a unit. Only an implemented one must also have a complete plan: a cancelled unit may have
 * been given up part way through.
 */
const FROZEN_STATUSES = new Set(['implemented', 'cancelled']);

/**
 * @param {Record<string, ChangeDocuments>} base
 * @param {Record<string, ChangeDocuments>} head
 * @returns {string[]}
 */
export function findFrozenViolations(base, head) {
  const violations = [];

  for (const [unit, baseDocuments] of Object.entries(base)) {
    if (!FROZEN_STATUSES.has(baseDocuments.status)) continue;

    const headDocuments = head[unit];
    if (headDocuments === undefined) {
      violations.push(`${unit}: unit deleted`);
      continue;
    }

    if (baseDocuments.spec !== headDocuments.spec) violations.push(`${unit}: spec.md`);
    if (baseDocuments.plan !== headDocuments.plan) violations.push(`${unit}: plan.md`);
  }

  return violations;
}

const UNTICKED_TASK = /^\s*- \[ \]/gm;

/**
 * A unit reaches implemented only when its plan is complete. A plan with no checkboxes at all passes: a project that
 * adopted this process later may hold plans written as prose, and inventing a task breakdown for them would be
 * fabrication.
 *
 * @param {Record<string, ChangeDocuments>} head
 * @returns {string[]}
 */
export function findIncompletePlans(head) {
  const violations = [];

  for (const [unit, documents] of Object.entries(head)) {
    if (documents.status !== 'implemented' || documents.plan === undefined) continue;

    const open = documents.plan.match(UNTICKED_TASK)?.length ?? 0;
    if (open > 0) {
      violations.push(`${unit}: plan.md has ${open} unticked task${open === 1 ? '' : 's'}`);
    }
  }

  return violations;
}

const ENTRY_SECTION = /^## (Log|Amendments)\s*$/;
const HEADING = /^#/;
const ENTRY_OPENING = /^- /;

/**
 * @typedef {object} RecordEntry
 * @property {string[]} lines
 * @property {boolean} afterBlankLine whether it stands after a blank line and is not the first of its section
 */

/**
 * The entries of `## Log` and `## Amendments`. A blank line before an indented continuation is inside an entry and
 * opens none.
 *
 * @param {string} record
 * @returns {RecordEntry[]}
 */
function entriesOf(record) {
  const entries = [];
  let inEntrySection = false;
  let currentEntry;
  let blankBefore = false;

  for (const line of record.split(/\r?\n/)) {
    if (HEADING.test(line)) {
      inEntrySection = ENTRY_SECTION.test(line);
      currentEntry = undefined;
      blankBefore = false;
      continue;
    }
    if (!inEntrySection) continue;
    if (line.trim() === '') {
      blankBefore = true;
      continue;
    }
    if (ENTRY_OPENING.test(line)) {
      currentEntry = { lines: [line], afterBlankLine: currentEntry !== undefined && blankBefore };
      entries.push(currentEntry);
    } else {
      currentEntry?.lines.push(line);
    }
    blankBefore = false;
  }

  return entries;
}

/**
 * An entry is known by its whole text, read across its lines, so that rewrapping it or changing its line endings
 * leaves it the same entry. Its timestamp and author alone would not do: two entries may share both.
 *
 * @param {RecordEntry} entry
 * @returns {string}
 */
function identityOf(entry) {
  return entry.lines.join(' ').replace(/\s+/g, ' ');
}

/**
 * Only the separations the branch adds are judged: the records at the base may hold blank lines between entries, and
 * many of them are frozen.
 *
 * @param {Record<string, ChangeDocuments>} base
 * @param {Record<string, ChangeDocuments>} head
 * @returns {string[]}
 */
export function findSplitEntries(base, head) {
  const violations = [];

  for (const [unit, documents] of Object.entries(head)) {
    if (documents.record === undefined) continue;

    const known = new Set(entriesOf(base[unit]?.record ?? '').filter(entry => entry.afterBlankLine).map(identityOf));
    for (const entry of entriesOf(documents.record)) {
      if (entry.afterBlankLine && !known.has(identityOf(entry))) {
        violations.push(`${unit}: entry after a blank line: ${entry.lines[0]}`);
      }
    }
  }

  return violations;
}

/**
 * @param {string} root
 * @param {string[]} args
 * @returns {string}
 */
function git(root, args) {
  try {
    return execFileSync('git', ['-C', root, ...args], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (error) {
    const reason = error.stderr?.trim();
    throw new Error(`git ${args.join(' ')} failed${reason ? `: ${reason}` : ''}`);
  }
}

/**
 * @param {string} root
 * @param {string} revision
 * @param {string} file
 * @returns {string | undefined}
 */
function readAtRevision(root, revision, file) {
  try {
    return git(root, ['show', `${revision}:${file}`]);
  } catch {
    return undefined;
  }
}

/**
 * @param {string} record
 * @param {string} field
 * @param {string} recordFile
 * @returns {string}
 */
export function fieldFrom(record, field, recordFile) {
  const match = record.match(new RegExp(`^${field}:\\s*(\\S+)\\s*$`, 'm'));
  if (!match) throw new Error(`${recordFile} is missing a ${field} field`);
  return match[1];
}

/**
 * @param {string} record
 * @param {string} recordFile
 * @returns {string}
 */
export function statusFrom(record, recordFile) {
  return fieldFrom(record, 'status', recordFile);
}

/**
 * @param {string} root
 * @param {string} revision
 * @returns {Record<string, ChangeDocuments>}
 */
function documentsAtRevision(root, revision) {
  const records = git(root, ['ls-tree', '-r', '--name-only', revision, '--', 'changes'])
    .split('\n')
    .filter(file => /^changes\/(?!_)[^/]+\/record\.md$/.test(file));

  return Object.fromEntries(records.map(recordFile => {
    const unit = recordFile.split('/')[1];
    const directory = `changes/${unit}`;
    const record = readAtRevision(root, revision, recordFile);
    if (record === undefined) throw new Error(`Unable to read ${recordFile}`);

    return [unit, {
      status: statusFrom(record, recordFile),
      record,
      spec: readAtRevision(root, revision, `${directory}/spec.md`),
      plan: readAtRevision(root, revision, `${directory}/plan.md`),
    }];
  }));
}

/**
 * The commit the current branch left the default branch at. The local branch is asked first, and then the one of
 * `origin`: a detached or shallow checkout, and the clone of a unit run, often have that and no local branch. Both
 * are asked by their full names, so that a name is read as a branch or not at all.
 *
 * @param {string} root
 * @param {string} defaultBranch
 * @returns {string}
 */
function mergeBaseWithDefaultBranch(root, defaultBranch) {
  for (const reference of [`refs/heads/${defaultBranch}`, `refs/remotes/origin/${defaultBranch}`]) {
    try {
      return git(root, ['merge-base', reference, 'HEAD']).trim();
    } catch {
      // The next one is tried.
    }
  }

  throw new Error(
    `No common ancestor with ${defaultBranch} or origin/${defaultBranch} to compare against. ` +
      `The name is the defaultBranch of ${SETTINGS_FILE}`,
  );
}

/**
 * @param {string} [root]
 * @returns {void}
 */
export function run(root = process.cwd()) {
  const repository = resolve(root);
  const mergeBase = mergeBaseWithDefaultBranch(repository, readSettings(repository).defaultBranch);
  const base = documentsAtRevision(repository, mergeBase);
  const head = documentsAtRevision(repository, 'HEAD');
  const violations = [
    ...findFrozenViolations(base, head),
    ...findIncompletePlans(head),
    ...findSplitEntries(base, head),
  ];

  if (violations.length > 0) {
    throw new Error(`Change documents need attention:\n${violations.map(violation => `- ${violation}`).join('\n')}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [root, ...rest] = process.argv.slice(2);
  if (rest.length > 0) {
    console.error('check-changes takes one argument, the repository root.');
    console.error('usage: node check-changes.mjs [<repository root>]');
    process.exit(2);
  }
  try {
    run(root);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
