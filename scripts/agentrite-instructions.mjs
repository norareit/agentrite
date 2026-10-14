import { lstatSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { formattedLike } from './agentrite-json.mjs';

/** The kit's `process.md` as a project installs it, which the harness loads into every session. */
export const PROCESS_PATH = 'node_modules/agentrite/process.md';

/** The lines `CLAUDE.md` must hold for Claude Code to load the kit's instructions, in the order init writes them. */
export const CLAUDE_LINES = [`@${PROCESS_PATH}`, '@AGENTS.md'];

/** OpenCode's configuration file at the project root, whose `instructions` list loads `process.md`. */
export const OPENCODE_FILE = 'opencode.json';

const SECTION = 'See "How the kit\'s instructions reach an agent" in node_modules/agentrite/README.md.';

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
 * The lines of `CLAUDE_LINES` that a `CLAUDE.md` lacks, in their order. A line counts when it is exactly the text,
 * ending in LF or CRLF. A file that is missing or cannot be read lacks both, as Claude Code reads nothing from it.
 *
 * @param {ProjectFile} read
 * @returns {string[]}
 */
export function claudeLacks(read) {
  if (!('text' in read)) return [...CLAUDE_LINES];
  const lines = read.text.split('\n').map((line) => line.replace(/\r$/, ''));
  return CLAUDE_LINES.filter((wanted) => !lines.includes(wanted));
}

/**
 * Whether an `opencode.json` loads `process.md`, and when it does not, why, and the text that would make it, which
 * is `undefined` for a file that cannot be amended.
 *
 * @param {ProjectFile} read
 * @returns {{ loads: true } | { loads: false, problem: string, content: string | undefined }}
 */
export function opencodeVerdict(read) {
  if (!read.found) {
    const content = formattedLike('{}\n', { instructions: [PROCESS_PATH] });
    return { loads: false, problem: 'it is missing', content };
  }
  if ('error' in read) return { loads: false, problem: `it cannot be read: ${read.error}`, content: undefined };

  /** @type {unknown} */ let configuration;
  try {
    configuration = JSON.parse(read.text);
  } catch (error) {
    // OpenCode reads a file with comments in it, which JSON.parse does not, so the text is what is judged.
    if (read.text.includes(`"${PROCESS_PATH}"`)) return { loads: true };
    return { loads: false, problem: `it is not JSON: ${messageOf(error)}`, content: undefined };
  }
  if (typeof configuration !== 'object' || configuration === null || Array.isArray(configuration)) {
    return { loads: false, problem: 'it is not a JSON object', content: undefined };
  }

  const amend = (/** @type {unknown[]} */ instructions) =>
    formattedLike(read.text, { ...configuration, instructions: [...instructions, PROCESS_PATH] });
  if (!('instructions' in configuration)) {
    return { loads: false, problem: 'it has no instructions list', content: amend([]) };
  }
  const { instructions } = configuration;
  if (!Array.isArray(instructions)) {
    return { loads: false, problem: 'its instructions is not a list', content: undefined };
  }
  if (instructions.includes(PROCESS_PATH)) return { loads: true };
  return {
    loads: false,
    problem: `its instructions list does not hold ${PROCESS_PATH}`,
    content: amend(instructions),
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
 * What `init` tells a project whose `opencode.json` it cannot amend, because of `problem`.
 *
 * @param {string} problem
 * @returns {string}
 */
export function opencodeInitNotice(problem) {
  return (
    `${OPENCODE_FILE} was left as it is, because ${problem}.\n` +
    `For OpenCode to read the kit's instructions, its instructions list must hold ${PROCESS_PATH}.\n` +
    `Add it by hand. ${SECTION}\n`
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
 * What `refresh` tells a project whose `opencode.json` does not load `process.md`, because of `problem`.
 *
 * @param {string} problem
 * @returns {string}
 */
export function opencodeRefreshNotice(problem) {
  return (
    `${OPENCODE_FILE} does not load the kit's instructions,\nbecause ${problem}.\n` +
    `OpenCode does not read them without ${PROCESS_PATH} in its instructions list, and refresh\n` +
    `does not add it. ${SECTION}\n`
  );
}
