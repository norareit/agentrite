import { claude } from './harnesses/claude.mjs';
import { codex } from './harnesses/codex.mjs';
import { opencode } from './harnesses/opencode.mjs';

/**
 * @typedef {import('./agentrite-headless.mjs').Call} Call
 * @typedef {import('./agentrite-headless.mjs').Followed} Followed
 * @typedef {import('./agentrite-instructions.mjs').ProjectFile} ProjectFile
 * @typedef {import('./agentrite-roles.mjs').Role} Role
 */

/**
 * A file the sandbox mounts read-only in the container: `from` is `kit` for a file of the harness's own directory
 * `container/harnesses/<name>/`, whose `path` is relative to that directory, or `host` for a file of the host, whose
 * `path` is absolute. `target` is the absolute path in the container.
 *
 * @typedef {{ from: 'kit' | 'host', path: string, target: string }} Mount
 */

/**
 * A file the wrapper writes into the project's log directory under `name`, with `content` and a line break, and
 * mounts read-only at `target`.
 *
 * @typedef {{ name: string, content: string, target: string }} SandboxFile
 */

/**
 * What a run of the sandbox gives a harness: entries `NAME=value` of the command's environment, mounts and files, and
 * the lines a start prints of what it gave.
 *
 * @typedef {{ environment: string[], mounts: Mount[], files: SandboxFile[], notes: string[] }} Given
 */

/**
 * What a start tells a harness's `host` member besides the home: whether the project admits the local model server,
 * and a reader of the harness's own files in `container/harnesses/<name>/`, by a path relative to that directory.
 *
 * @typedef {{ modelServer: boolean, readKit: (path: string) => ProjectFile }} Start
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
 *     extension: string,
 *     isKit: (text: string) => boolean,
 *     refreshed: (existing: string, rendered: string) => string,
 *   },
 *   start: {
 *     command: string,
 *     skipPermissions: string,
 *     interactive: (options: string[], prompt: string) => string[],
 *     headless: (options: string[], prompt: string) => string[],
 *     role: (role: string, file: string) => { options: string[], opening: string | undefined },
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
 *   sandbox: {
 *     package: string,
 *     versionArgument: string,
 *     readVersion: (printed: string) => string | undefined,
 *     updates: { environment: string[], mounts: Mount[] },
 *     logDirectories: string[],
 *     hosts: { host: string, reason: string }[],
 *     bell: { environment: string[], mounts: Mount[] },
 *     host: (home: string, read: (path: string) => ProjectFile, start: Start) => Given,
 *   },
 * }} Harness
 */

const MOUNT_FIELDS = ['from', 'path', 'target'];

/**
 * The members of `Harness`, each by its path, its kind, and what it is for. A kind is `string`, `function`,
 * `strings` for a list of strings, or `records` for a list of objects that each hold exactly the string fields
 * `fields`.
 *
 * @type {{ member: string, kind: 'string' | 'function' | 'strings' | 'records', purpose: string, fields?: string[] }[]}
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
  {
    member: 'wrappers.extension',
    kind: 'string',
    purpose: "what the name of a role's wrapper in its directory ends with, after the role's name",
  },
  {
    member: 'wrappers.isKit',
    kind: 'function',
    purpose: "whether a file's text is a wrapper the kit wrote, whatever role, path or pinned model it holds",
  },
  {
    member: 'wrappers.refreshed',
    kind: 'function',
    purpose: 'what refresh writes over an existing wrapper: the rendered one, with the model pinned in it kept',
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
    member: 'start.role',
    kind: 'function',
    purpose: "the options and the opening words that start a run in a role, from the role's name and its file",
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
  {
    member: 'sandbox.package',
    kind: 'string',
    purpose: 'the npm package the image installs, and that the registry is asked the latest version of',
  },
  {
    member: 'sandbox.versionArgument',
    kind: 'string',
    purpose: "the build argument by which a project's compose file gives the version the image holds",
  },
  {
    member: 'sandbox.readVersion',
    kind: 'function',
    purpose: "the version read from what the host's command printed for --version, or none",
  },
  {
    member: 'sandbox.updates.environment',
    kind: 'strings',
    purpose: 'the entries NAME=value of the environment of a run that turn off the harness updating itself',
  },
  {
    member: 'sandbox.updates.mounts',
    kind: 'records',
    fields: MOUNT_FIELDS,
    purpose: 'the files mounted in a run that turn off the harness updating itself',
  },
  {
    member: 'sandbox.logDirectories',
    kind: 'strings',
    purpose: "the directories of its logs and its state, relative to the agent's home, mounted from the host",
  },
  {
    member: 'sandbox.hosts',
    kind: 'records',
    fields: ['host', 'reason'],
    purpose: 'the hosts the egress allowlist admits for the harness, each with why it is needed',
  },
  {
    member: 'sandbox.bell.environment',
    kind: 'strings',
    purpose: 'the entries NAME=value of the environment of a run that ring the bell, with "bell": true',
  },
  {
    member: 'sandbox.bell.mounts',
    kind: 'records',
    fields: MOUNT_FIELDS,
    purpose: 'the files mounted in a run that ring the bell, with "bell": true',
  },
  {
    member: 'sandbox.host',
    kind: 'function',
    purpose:
      "what a run gives the harness besides from the host's files, and the lines a start prints of it, from the " +
      "host's home, a reader of them, and the start",
  },
];

/** The harnesses the kit knows, in its order, which every listing of them follows. The kit's only list of them. */
export const HARNESSES = [claude, opencode, codex];

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
 * description, a body that says to read its role's file, and what refresh writes over an existing one, which is the
 * harness's own.
 *
 * @param {string[]} harnesses
 * @param {Role[]} roles
 * @returns {{ path: string, content: string, refreshed: (existing: string, rendered: string) => string }[]}
 */
export function plannedFiles(harnesses, roles) {
  return harnesses.flatMap((name) => {
    const { wrappers } = harnessNamed(name);
    return roles.map((role) => ({
      path: `${wrappers.directory}/${role.name}${wrappers.extension}`,
      content: wrappers.render(role),
      refreshed: wrappers.refreshed,
    }));
  });
}
