import { lstatSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { wrapWords } from './agentrite-roles.mjs';

/** The kit's `process.md` as a project installs it, which the harness loads into every session. */
export const PROCESS_PATH = 'node_modules/agentrite/process.md';

/** The kit's `standards.md` as a project installs it, the standards of a project that replaced none. */
export const STANDARDS_PATH = 'node_modules/agentrite/standards.md';

/**
 * The instruction files the harness loads into every session, in the order it is given them: the kit's
 * `process.md` and the project's standards.
 *
 * @param {string} standards
 * @returns {string[]}
 */
export function instructionPaths(standards) {
  return [PROCESS_PATH, standards];
}

/** The line every notice of the kit's instructions ends with, naming the section that explains them. */
export const INSTRUCTIONS_SECTION =
  'See "How the kit\'s instructions reach an agent" in node_modules/agentrite/SETUP.md.';

// The longest line of a notice whose words are wrapped by the kit rather than by hand.
const NOTICE_WIDTH = 120;

/**
 * What is at `path` in the project: nothing, the text of a file, or the message of what kept something there from
 * being read, such as a directory or a dangling symbolic link.
 *
 * @typedef {{ found: false } | { found: true, text: string } | { found: true, error: string }} ProjectFile
 */

/**
 * @param {unknown} error
 * @returns {string}
 */
export function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * @param {string} root
 * @param {string} path
 * @returns {ProjectFile}
 */
export function readProjectFile(root, path) {
  const absolute = resolve(root, path);
  try {
    lstatSync(absolute);
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return { found: false };
    return { found: true, error: messageOf(error) };
  }
  try {
    return { found: true, text: readFileSync(absolute, 'utf-8') };
  } catch (error) {
    return { found: true, error: messageOf(error) };
  }
}

/**
 * True when `standards` is another file than the kit's `standards.md`, so that a harness that loads the kit's as
 * well loads two sets of rules.
 *
 * @param {string} standards
 * @returns {boolean}
 */
export function isOwnStandards(standards) {
  return posix.normalize(standards) !== STANDARDS_PATH;
}

/** The list of the instruction files a project uses, which the kit writes from `agentrite.json`. */
export const INSTRUCTIONS_LIST = '.agentrite/instructions.md';

/**
 * True when an `AGENTS.md` has text and the text holds the path of the list. Whether it says anything right of it is
 * not judged, as that would take reading prose.
 *
 * @param {ProjectFile} read
 * @returns {boolean}
 */
export function agentsNamesList(read) {
  return 'text' in read && read.text.includes(INSTRUCTIONS_LIST);
}

/**
 * What `init` and `refresh` tell a project whose `AGENTS.md` is missing, or does not name the list.
 *
 * @param {boolean} missing
 * @returns {string}
 */
export function agentsListNotice(missing) {
  const problem = missing ? 'is missing' : `does not name ${INSTRUCTIONS_LIST}`;
  const text =
    `AGENTS.md ${problem}, so agents do not learn from it which role and standards files the project uses, ` +
    `which ${INSTRUCTIONS_LIST} names. refresh does not change AGENTS.md. ${INSTRUCTIONS_SECTION}`;
  return `${wrapWords(text, NOTICE_WIDTH, '').join('\n')}\n`;
}

/**
 * An item of the list: what the file is, and its path as the settings write it, linked from the list's directory.
 *
 * @param {string} label
 * @param {string} path
 * @returns {string}
 */
function listItem(label, path) {
  const relative = posix.relative(posix.dirname(INSTRUCTIONS_LIST), posix.normalize(path));
  return `* ${label}: [\`${path}\`](${relative.split('/').map(linkSegment).join('/')})`;
}

/**
 * A segment of a link's path, encoded so that a `#` or a `?` in a file's name is not read as the start of a fragment
 * or a query, and a parenthesis does not close the Markdown link.
 *
 * @param {string} segment
 * @returns {string}
 */
function linkSegment(segment) {
  return encodeURIComponent(segment).replaceAll('(', '%28').replaceAll(')', '%29');
}

/**
 * The text of the list of the instruction files in use, which follows from the settings alone: the kit's
 * `process.md`, the standards, and the file of each role, in the order of `roles`.
 *
 * @param {{ standards: string, roles: Record<string, string> }} settings
 * @returns {string}
 */
export function instructionsList({ standards, roles }) {
  return [
    '# Instructions in use',
    '',
    'These are the files whose instructions hold in this project. The standards are its whole set of rules on how ' +
      'text,',
    'documentation, commits, code and tests are written.',
    '',
    'The kit writes this list from `agentrite.json`, with `npx agentrite init` and `npx agentrite refresh`, ' +
      'and it is not',
    'edited by hand. To use another file, change `agentrite.json` and run `npx agentrite refresh`.',
    '',
    listItem('Process', PROCESS_PATH),
    listItem('Standards', standards),
    '',
    '## Roles',
    '',
    ...Object.entries(roles).map(([name, path]) => listItem(name, path)),
    '',
  ].join('\n');
}
