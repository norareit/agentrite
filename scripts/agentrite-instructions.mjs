import { lstatSync, readFileSync } from 'node:fs';
import { posix, resolve } from 'node:path';
import { formattedLike } from './agentrite-json.mjs';
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

/**
 * The lines `CLAUDE.md` must hold for Claude Code to load the kit's instructions, in the order init writes them.
 *
 * @param {string} standards
 * @returns {string[]}
 */
export function claudeLines(standards) {
  return [...instructionPaths(standards).map((path) => `@${path}`), '@AGENTS.md'];
}

/** OpenCode's configuration file at the project root, whose `instructions` list loads the kit's instructions. */
export const OPENCODE_FILE = 'opencode.json';

const SECTION = 'See "How the kit\'s instructions reach an agent" in node_modules/agentrite/README.md.';

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
function messageOf(error) {
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
 * The lines of a `CLAUDE.md`, each without its LF or CRLF.
 *
 * @param {string} text
 * @returns {string[]}
 */
function linesOf(text) {
  return text.split('\n').map((line) => line.replace(/\r$/, ''));
}

/**
 * The lines of `claudeLines(standards)` that a `CLAUDE.md` lacks, in their order. A line counts when it is exactly
 * the text, ending in LF or CRLF. A file that is missing or cannot be read lacks them all, as Claude Code reads
 * nothing from it.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {string[]}
 */
export function claudeLacks(read, standards) {
  const wanted = claudeLines(standards);
  if (!('text' in read)) return wanted;
  const lines = linesOf(read.text);
  return wanted.filter((line) => !lines.includes(line));
}

/**
 * The verdict on an `opencode.json` that does not load the kit's instructions: why, the paths of
 * `instructionPaths` it lacks, in their order, and the text that would make it load them, which is `undefined` for
 * a file that cannot be amended.
 *
 * @typedef {{ loads: false, problem: string, lacks: string[], content: string | undefined }} OpencodeFailure
 */

/**
 * Whether an `opencode.json` loads the kit's instructions, every path of `instructionPaths(standards)`, and when it
 * does not, the verdict on it.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {{ loads: true } | OpencodeFailure}
 */
export function opencodeVerdict(read, standards) {
  const all = instructionPaths(standards);
  if (!read.found) {
    const content = formattedLike('{}\n', { instructions: all });
    return { loads: false, problem: 'it is missing', lacks: all, content };
  }
  if ('error' in read) {
    return { loads: false, problem: `it cannot be read: ${read.error}`, lacks: all, content: undefined };
  }

  /** @type {unknown} */ let configuration;
  try {
    configuration = JSON.parse(read.text);
  } catch (error) {
    // OpenCode reads a file with comments in it, which JSON.parse does not, so the text is what is judged.
    const lacks = all.filter((path) => !read.text.includes(`"${path}"`));
    if (lacks.length === 0) return { loads: true };
    return { loads: false, problem: `it is not JSON: ${messageOf(error)}`, lacks, content: undefined };
  }
  if (typeof configuration !== 'object' || configuration === null || Array.isArray(configuration)) {
    return { loads: false, problem: 'it is not a JSON object', lacks: all, content: undefined };
  }

  const amend = (/** @type {unknown[]} */ instructions, /** @type {string[]} */ lacks) =>
    formattedLike(read.text, { ...configuration, instructions: [...instructions, ...lacks] });
  if (!('instructions' in configuration)) {
    return { loads: false, problem: 'it has no instructions list', lacks: all, content: amend([], all) };
  }
  const { instructions } = configuration;
  if (!Array.isArray(instructions)) {
    return { loads: false, problem: 'its instructions is not a list', lacks: all, content: undefined };
  }
  const lacks = all.filter((path) => !instructions.includes(path));
  if (lacks.length === 0) return { loads: true };
  return {
    loads: false,
    problem: `its instructions list does not hold ${lacks.join(' or ')}`,
    lacks,
    content: amend(instructions, lacks),
  };
}

/**
 * What `init` tells a project whose `CLAUDE.md` exists and lacks `lines`.
 *
 * @param {string[]} lines
 * @returns {string}
 */
export function claudeInitNotice(lines) {
  return (
    "CLAUDE.md exists and was left as it is. It lacks the lines below, and Claude Code does not read the kit's\n" +
    'instructions without them. Add each on a line of its own, outside a code span or a fenced block:\n\n' +
    `${lines.join('\n')}\n\n${SECTION}\n`
  );
}

/**
 * What `init` tells a project whose `opencode.json` it cannot amend, because of `problem`, and which lacks the paths
 * `lacks`.
 *
 * @param {string} problem
 * @param {string[]} lacks
 * @returns {string}
 */
export function opencodeInitNotice(problem, lacks) {
  return (
    `${OPENCODE_FILE} was left as it is, because ${problem}.\n` +
    "For OpenCode to read the kit's instructions, its instructions list must hold the paths below.\n" +
    `Add them by hand:\n\n${lacks.join('\n')}\n\n${SECTION}\n`
  );
}

/**
 * What `refresh` tells a project whose `CLAUDE.md` is missing, or lacks `lines`.
 *
 * @param {boolean} missing
 * @param {string[]} lines
 * @returns {string}
 */
export function claudeRefreshNotice(missing, lines) {
  const problem = missing ? 'it is missing' : 'it lacks the lines below';
  return (
    `CLAUDE.md does not load the kit's instructions, because ${problem}. Claude Code does not read\n` +
    'them without these lines, each on a line of its own and outside a code span or a fenced block, ' +
    'and refresh does\n' +
    'not add them:\n\n' +
    `${lines.join('\n')}\n\n${SECTION}\n`
  );
}

/**
 * What `refresh` tells a project whose `opencode.json` does not load the kit's instructions, because of `problem`,
 * and lacks the paths `lacks`.
 *
 * @param {string} problem
 * @param {string[]} lacks
 * @returns {string}
 */
export function opencodeRefreshNotice(problem, lacks) {
  return (
    `${OPENCODE_FILE} does not load the kit's instructions,\nbecause ${problem}.\n` +
    'OpenCode does not read them without the paths below in its instructions list, and refresh\n' +
    `does not add them:\n\n${lacks.join('\n')}\n\n${SECTION}\n`
  );
}

/**
 * True when `standards` is another file than the kit's `standards.md`, so that a harness that loads the kit's as
 * well loads two sets of rules.
 *
 * @param {string} standards
 * @returns {boolean}
 */
function isOwnStandards(standards) {
  return posix.normalize(standards) !== STANDARDS_PATH;
}

/**
 * True when the project's standards are another file than the kit's and a `CLAUDE.md` still imports the kit's, on
 * a line that is exactly the import, as `claudeLacks` judges a line. False for a file that is missing or cannot be
 * read.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {boolean}
 */
export function claudeLoadsKitStandards(read, standards) {
  if (!isOwnStandards(standards) || !('text' in read)) return false;
  return linesOf(read.text).includes(`@${STANDARDS_PATH}`);
}

/**
 * True when the project's standards are another file than the kit's and an `opencode.json` still lists the kit's:
 * in its `instructions` list, or, for a file that is not JSON, in quotes anywhere in its text, as `opencodeVerdict`
 * judges one. False for a file that is missing or cannot be read.
 *
 * @param {ProjectFile} read
 * @param {string} standards
 * @returns {boolean}
 */
export function opencodeLoadsKitStandards(read, standards) {
  if (!isOwnStandards(standards) || !('text' in read)) return false;
  /** @type {unknown} */ let configuration;
  try {
    configuration = JSON.parse(read.text);
  } catch {
    return read.text.includes(`"${STANDARDS_PATH}"`);
  }
  if (typeof configuration !== 'object' || configuration === null || !('instructions' in configuration)) return false;
  const { instructions } = configuration;
  return Array.isArray(instructions) && instructions.includes(STANDARDS_PATH);
}

/**
 * What `init` and `refresh` tell a project whose `CLAUDE.md` imports the kit's standards beside its own.
 *
 * @param {string} standards
 * @returns {string}
 */
export function claudeKitStandardsNotice(standards) {
  return (
    `CLAUDE.md imports the kit's standards.md, and the project's standards are ${standards}. Claude Code then loads\n` +
    'both sets of rules. Remove this line, which init and refresh do not remove:\n\n' +
    `@${STANDARDS_PATH}\n\n${SECTION}\n`
  );
}

/**
 * What `init` and `refresh` tell a project whose `opencode.json` lists the kit's standards beside its own.
 *
 * @param {string} standards
 * @returns {string}
 */
export function opencodeKitStandardsNotice(standards) {
  return (
    `${OPENCODE_FILE} lists the kit's standards.md, and the project's standards are ${standards}. ` +
    'OpenCode then loads\n' +
    'both sets of rules. Remove this entry from its instructions list, which init and refresh do not remove:\n\n' +
    `${STANDARDS_PATH}\n\n${SECTION}\n`
  );
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
    `which ${INSTRUCTIONS_LIST} names. refresh does not change AGENTS.md. ${SECTION}`;
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
