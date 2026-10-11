import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { readSettings, SETTINGS_FILE } from './agentrite-settings.mjs';

/**
 * @typedef {object} ChangeDocuments
 * @property {string} status
 * @property {string} [spec]
 * @property {string} [plan]
 */

/**
 * @param {Record<string, ChangeDocuments>} base
 * @param {Record<string, ChangeDocuments>} head
 * @returns {string[]}
 */
export function findFrozenViolations(base, head) {
  const violations = [];

  for (const [unit, baseDocuments] of Object.entries(base)) {
    if (baseDocuments.status !== 'implemented') continue;

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
 * @param {string} recordFile
 * @returns {string}
 */
function statusFrom(record, recordFile) {
  const match = record.match(/^status:\s*(\S+)\s*$/m);
  if (!match) throw new Error(`${recordFile} is missing a status field`);
  return match[1];
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
  const head = documentsAtRevision(repository, 'HEAD');
  const violations = [
    ...findFrozenViolations(documentsAtRevision(repository, mergeBase), head),
    ...findIncompletePlans(head),
  ];

  if (violations.length > 0) {
    throw new Error(`Change documents need attention:\n${violations.map(violation => `- ${violation}`).join('\n')}`);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    run(process.argv[2]);
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
