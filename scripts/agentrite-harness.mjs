import { claude } from './harnesses/claude.mjs';
import { opencode } from './harnesses/opencode.mjs';

/**
 * @typedef {import('./agentrite-headless.mjs').Call} Call
 * @typedef {import('./agentrite-headless.mjs').Followed} Followed
 * @typedef {import('./agentrite-instructions.mjs').ProjectFile} ProjectFile
 * @typedef {import('./agentrite-roles.mjs').Role} Role
 */

/**
 * What the kit knows of a harness, which each module of `scripts/harnesses/` implements. `HARNESS_CONTRACT` holds the
 * same members as a value, which the test that every harness implements them reads, so the two change together.
 *
 * In `start`, the prompt is the last argument. Where it is an argument of its own, a `--` stands before it, so that no
 * option before it takes it for a value.
 *
 * @typedef {{
 *   name: string,
 *   title: string,
 *   wrappers: {
 *     directory: string,
 *     render: (role: Role) => string,
 *     ownAgents: string[],
 *   },
 *   start: {
 *     command: string,
 *     skipPermissions: string,
 *     interactive: (options: string[], prompt: string) => string[],
 *     headless: (options: string[], prompt: string) => string[],
 *   },
 *   headless: {
 *     arguments: (session: string | undefined) => { args: string[], session: string | undefined },
 *     read: (stdout: string) => { response: string | undefined, session: string | undefined },
 *     follow: (line: string) => Followed[],
 *     refused: (stdout: string) => Call[],
 *   },
 *   instructions: {
 *     file: string,
 *     init: (
 *       read: ProjectFile,
 *       standards: string,
 *     ) => { content: string | undefined, line: string | undefined, notices: string[] },
 *     refresh: (read: ProjectFile, standards: string) => string[],
 *   },
 * }} Harness
 */

/**
 * The members of `Harness`, each by its path, its kind, and what it is for. A kind is `string`, `function`, or
 * `strings` for a list of strings.
 *
 * @type {{ member: string, kind: 'string' | 'function' | 'strings', purpose: string }[]}
 */
export const HARNESS_CONTRACT = [
  { member: 'name', kind: 'string', purpose: 'the name the commands and agentrite.json take the harness by' },
  { member: 'title', kind: 'string', purpose: 'the name of the harness as the kit writes it in a message' },
  { member: 'wrappers.directory', kind: 'string', purpose: 'the directory the role wrappers are written to' },
  { member: 'wrappers.render', kind: 'function', purpose: 'the text of the wrapper of a role' },
  {
    member: 'wrappers.ownAgents',
    kind: 'strings',
    purpose: 'the names of the agents the harness has of its own, which a role of the project cannot take',
  },
  { member: 'start.command', kind: 'string', purpose: 'the command that starts the harness' },
  {
    member: 'start.skipPermissions',
    kind: 'string',
    purpose: 'the flag that ends the questions of the harness about permissions',
  },
  {
    member: 'start.interactive',
    kind: 'function',
    purpose: 'the arguments of a session, from the options and the prompt',
  },
  {
    member: 'start.headless',
    kind: 'function',
    purpose: 'the arguments of a run without a session, from the options and the prompt',
  },
  {
    member: 'headless.arguments',
    kind: 'function',
    purpose: 'the arguments that make a headless run print JSON events and start or resume a session',
  },
  {
    member: 'headless.read',
    kind: 'function',
    purpose: 'the final response and the session of a headless run, read from what it printed',
  },
  { member: 'headless.follow', kind: 'function', purpose: 'what --follow shows of one line a headless run printed' },
  {
    member: 'headless.refused',
    kind: 'function',
    purpose: 'the tool calls a headless run refused for lack of permission, read from what it printed',
  },
  { member: 'instructions.file', kind: 'string', purpose: "the file the harness reads the kit's instructions from" },
  {
    member: 'instructions.init',
    kind: 'function',
    purpose: 'what init writes of that file, the line it prints of it, and the notices it prints for it',
  },
  { member: 'instructions.refresh', kind: 'function', purpose: 'the notices refresh prints for that file' },
];

/** The harnesses the kit knows, in its order, which every listing of them follows. The kit's only list of them. */
export const HARNESSES = [claude, opencode];

/** The names of the harnesses, as the commands take them. */
export const HARNESS_NAMES = HARNESSES.map((harness) => harness.name);

/**
 * The harness of the list named `name`. Throws for a name that is none.
 *
 * @param {string} name
 * @returns {Harness}
 */
export function harnessNamed(name) {
  const harness = HARNESSES.find((entry) => entry.name === name);
  if (harness === undefined) throw new Error(`unknown harness: ${name}`);
  return harness;
}

/**
 * The titles of the harnesses, in the order of `HARNESS_NAMES`, that have an agent of their own named `name`,
 * without regard to case, and an empty list when none does.
 *
 * @param {string} name
 * @returns {string[]}
 */
export function harnessesWithAgent(name) {
  const lowered = name.toLowerCase();
  const hasAgent = (/** @type {Harness} */ harness) =>
    harness.wrappers.ownAgents.some((agent) => agent.toLowerCase() === lowered);
  return HARNESSES.filter(hasAgent).map((harness) => harness.title);
}

/**
 * The directory of each harness's wrappers, in the order the harnesses are given.
 *
 * @param {string[]} harnesses
 * @returns {string[]}
 */
export function wrapperDirectories(harnesses) {
  return harnesses.map((name) => harnessNamed(name).wrappers.directory);
}

/**
 * The wrappers of each role for each harness, written from `roles`, as `readRoles` gives them: each with its role's
 * description, and a body that says to read its role's file.
 *
 * @param {string[]} harnesses
 * @param {Role[]} roles
 * @returns {{ path: string, content: string }[]}
 */
export function plannedFiles(harnesses, roles) {
  /** @type {{ path: string, content: string }[]} */ const files = [];
  for (const name of harnesses) {
    const { wrappers } = harnessNamed(name);
    for (const role of roles) {
      files.push({ path: `${wrappers.directory}/${role.name}.md`, content: wrappers.render(role) });
    }
  }
  return files;
}
