import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

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

const BASE_REFERENCES = ['master', 'origin/master'];

/**
 * @param {string} root
 * @returns {string}
 */
function mergeBaseWithMaster(root) {
  for (const reference of BASE_REFERENCES) {
    try {
      return git(root, ['merge-base', reference, 'HEAD']).trim();
    } catch {
      // A detached or shallow checkout often has origin/master but no local master.
    }
  }

  throw new Error(`No common ancestor with ${BASE_REFERENCES.join(' or ')} to compare against`);
}

/**
 * @param {string} [root]
 * @returns {void}
 */
export function run(root = process.cwd()) {
  const repository = resolve(root);
  const mergeBase = mergeBaseWithMaster(repository);
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
