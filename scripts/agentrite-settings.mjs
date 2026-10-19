import { lstatSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HARNESS_NAMES, harnessesWithAgent, ROLE_NAMES } from './agentrite-roles.mjs';

/** The file at a project's root that holds its settings. */
export const SETTINGS_FILE = 'agentrite.json';

/**
 * @typedef {Record<string, string>} RoleFiles The path of each role's file: the four roles in the order of
 *   `ROLE_NAMES` and then any roles of the project's own, in the order of the file.
 * @typedef {{
 *   defaultBranch: string, harnesses: string[], sandbox: boolean, bell: boolean, standards: string, roles: RoleFiles
 * }} Settings
 */

/**
 * True for a path that a committed file can name in a clone: a string that is not empty, relative to the project
 * root, and that does not lead outside the project. It is judged on the path as written, and touches no file.
 *
 * @param {unknown} value
 * @returns {value is string}
 */
function isProjectPath(value) {
  if (typeof value !== 'string' || value === '' || isAbsolute(value)) return false;
  const normalized = posix.normalize(value);
  return normalized !== '..' && !normalized.startsWith('../');
}

const PATH_MUST = 'the path of a file, relative to the project root, that does not lead outside the project';

const ROLE_LIST = `${ROLE_NAMES.slice(0, -1).join(', ')} and ${ROLE_NAMES.at(-1)}`;

/**
 * The keys of the file, in the order they are written and judged in, each with whether a value is one it may hold
 * and with what it must hold, as a message says it.
 *
 * @type {{ name: keyof Settings, holds: (value: unknown) => boolean, must: string }[]}
 */
const KEYS = [
  {
    name: 'defaultBranch',
    holds: (value) => typeof value === 'string' && value !== '',
    must: 'the name of a branch, as a string that is not empty',
  },
  {
    name: 'harnesses',
    holds: (value) =>
      Array.isArray(value) && value.length > 0 && value.every((harness) => HARNESS_NAMES.includes(harness)),
    must: `a list of one or more of ${HARNESS_NAMES.map((name) => JSON.stringify(name)).join(' and ')}`,
  },
  { name: 'sandbox', holds: (value) => typeof value === 'boolean', must: 'true or false' },
  { name: 'bell', holds: (value) => typeof value === 'boolean', must: 'true or false' },
  { name: 'standards', holds: isProjectPath, must: PATH_MUST },
  {
    name: 'roles',
    holds: (value) => typeof value === 'object' && value !== null && !Array.isArray(value),
    must:
      `an object from each of the roles ${ROLE_LIST}, and from any role of the project's own, ` +
      'to the path of its file',
  },
];

const ROLES_MUST_HOLD =
  `It must hold the roles ${ROLE_LIST}, each with the path of its file, ` +
  "and may hold roles of the project's own besides";

const ROLE_NAME_FORM = /^[a-z]+(-[a-z]+)*$/;

const MUST_HOLD_OBJECT = `The file must hold a JSON object with the keys ${KEYS.slice(0, -1)
  .map((key) => key.name)
  .join(', ')} and ${KEYS.at(-1)?.name}`;

/**
 * @param {unknown} error
 * @returns {string}
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The settings that the text of an `agentrite.json` holds. Throws, naming the file, what is wrong and what must be
 * there, for a text that is not a valid file. A file is valid whole or not at all, so the first key at fault is
 * named whichever key the caller uses. A key the kit does not know is ignored.
 *
 * @param {string} text
 * @returns {Settings}
 */
export function parseSettings(text) {
  /** @type {unknown} */ let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${SETTINGS_FILE} is not JSON: ${messageOf(error)}. ${MUST_HOLD_OBJECT}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${SETTINGS_FILE} holds ${JSON.stringify(parsed)}, which is no JSON object. ${MUST_HOLD_OBJECT}`);
  }

  const values = /** @type {Record<string, unknown>} */ (parsed);
  for (const key of KEYS) checkKey(values, key);

  const { defaultBranch, harnesses, sandbox, bell, standards } = /** @type {Settings} */ (parsed);
  const roles = parseRoles(/** @type {Record<string, unknown>} */ (values.roles));
  return { defaultBranch, harnesses: [...new Set(harnesses)], sandbox, bell, standards, roles };
}

/**
 * Throws, naming the key, what it holds or that it is missing, and what it must hold, for a key of `values` that
 * holds no value it may hold. It is the one wording of a key at fault, for the whole file and for `bell` alone.
 *
 * @param {Record<string, unknown>} values
 * @param {(typeof KEYS)[number]} key
 */
function checkKey(values, key) {
  const value = Object.hasOwn(values, key.name) ? values[key.name] : undefined;
  if (key.holds(value)) return;
  const found = value === undefined ? 'missing' : JSON.stringify(value);
  throw new Error(`${SETTINGS_FILE}: ${key.name} is ${found}. It must hold ${key.must}`);
}

const BELL_KEY = /** @type {(typeof KEYS)[number]} */ (KEYS.find((key) => key.name === 'bell'));

const BELL_MUST_HOLD = `It must hold ${BELL_KEY.must}`;

/**
 * The value of `bell` that the text of an `agentrite.json` holds, as a start of the sandbox reads it. No other key is
 * judged, so a start is refused for `bell` alone. Throws, naming the file, the key, what it holds or that it is
 * missing, and what it must hold.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function parseBell(text) {
  /** @type {unknown} */ let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${SETTINGS_FILE} is not JSON: ${messageOf(error)}, so bell cannot be read. ${BELL_MUST_HOLD}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    const found = JSON.stringify(parsed);
    throw new Error(`${SETTINGS_FILE} holds ${found}, which is no JSON object, so bell is missing. ${BELL_MUST_HOLD}`);
  }
  const values = /** @type {Record<string, unknown>} */ (parsed);
  checkKey(values, BELL_KEY);
  return /** @type {boolean} */ (values.bell);
}

/**
 * The role files that the object `roles` of the file holds: the four of `ROLE_NAMES` in their order and then the
 * roles of the project's own in the order of the text. Throws, as `parseSettings` does, for one that lacks one of
 * the four, holds a name that is not a role's name, or holds a path that does not hold.
 *
 * @param {Record<string, unknown>} roles
 * @returns {RoleFiles}
 */
function parseRoles(roles) {
  const lacking = ROLE_NAMES.find((name) => !Object.hasOwn(roles, name));
  if (lacking !== undefined) throw new Error(`${SETTINGS_FILE}: roles lacks ${lacking}. ${ROLES_MUST_HOLD}`);
  const extraNames = Object.keys(roles).filter((name) => !ROLE_NAMES.includes(name));
  for (const name of extraNames) checkRoleName(name);
  const names = [...ROLE_NAMES, ...extraNames];
  for (const name of names) {
    if (isProjectPath(roles[name])) continue;
    throw new Error(`${SETTINGS_FILE}: roles.${name} is ${JSON.stringify(roles[name])}. It must hold ${PATH_MUST}`);
  }
  return /** @type {RoleFiles} */ (Object.fromEntries(names.map((name) => [name, roles[name]])));
}

/**
 * Throws for a name that is not the name of an extra role: one of the wrong form, or one that a harness has for an
 * agent of its own.
 *
 * @param {string} name
 */
function checkRoleName(name) {
  if (!ROLE_NAME_FORM.test(name)) {
    throw new Error(
      `${SETTINGS_FILE}: roles holds ${JSON.stringify(name)}, which is not the name of a role. A role's name is one ` +
        'or more words of the lowercase letters a to z, joined by single hyphens, as security-reviewer',
    );
  }
  const titles = harnessesWithAgent(name);
  if (titles.length === 0) return;
  const verb = titles.length === 1 ? 'has' : 'have';
  throw new Error(
    `${SETTINGS_FILE}: roles holds ${JSON.stringify(name)}, which is the name of an agent that ` +
      `${titles.join(' and ')} ${verb} of its own. ` +
      'A role cannot have the name of an agent of a harness the kit writes wrappers for',
  );
}

/**
 * Throws, naming the key and the path, for the first path of `settings` that names no regular file under `root`,
 * `standards` first and then each role in its order. Symbolic links are followed, so that a kit linked into
 * `node_modules` is taken.
 *
 * @param {string} root
 * @param {Settings} settings
 */
export function checkSettingsFiles(root, settings) {
  const paths = [
    ['standards', settings.standards],
    ...Object.entries(settings.roles).map(([name, path]) => [`roles.${name}`, path]),
  ];
  for (const [key, path] of paths) {
    if (isRegularFile(resolve(root, path))) continue;
    throw new Error(
      `${SETTINGS_FILE}: ${key} is ${JSON.stringify(path)}, and there is no file at it. ` +
        "It must name a file in the project's working tree",
    );
  }
}

/**
 * @param {string} path
 * @returns {boolean}
 */
function isRegularFile(path) {
  try {
    return statSync(path).isFile();
  } catch {
    return false;
  }
}

/**
 * The text of an `agentrite.json` that holds `settings`: the keys in their order, the list on one line, and one line
 * break at the end. It is the form of the default file in `templates/project/`.
 *
 * @param {Settings} settings
 * @returns {string}
 */
export function settingsText({ defaultBranch, harnesses, sandbox, bell, standards, roles }) {
  const list = harnesses.map((harness) => JSON.stringify(harness)).join(', ');
  const roleLines = Object.entries(roles).map(([name, path]) => `    ${JSON.stringify(name)}: ${JSON.stringify(path)}`);
  return [
    '{',
    `  "defaultBranch": ${JSON.stringify(defaultBranch)},`,
    `  "harnesses": [${list}],`,
    `  "sandbox": ${JSON.stringify(sandbox)},`,
    `  "bell": ${JSON.stringify(bell)},`,
    `  "standards": ${JSON.stringify(standards)},`,
    '  "roles": {',
    roleLines.join(',\n'),
    '  }',
    '}',
    '',
  ].join('\n');
}

/**
 * @param {string} path
 * @returns {boolean}
 */
function isMissing(path) {
  try {
    lstatSync(path);
    return false;
  } catch {
    return true;
  }
}

/**
 * The settings of the project at `root`, from the `agentrite.json` in its working tree. Throws what to print for a
 * project that has none, for a file that cannot be read and for one that is not valid, a path that names no file
 * included. No default stands in for a
 * missing file or a missing key.
 *
 * @param {string} root
 * @returns {Settings}
 */
export function readSettings(root) {
  const path = resolve(root, SETTINGS_FILE);
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    if (isMissing(path)) {
      throw new Error(`the project has no ${SETTINGS_FILE}. Run: npx agentrite config, which writes one`);
    }
    throw new Error(`cannot read ${SETTINGS_FILE}: ${messageOf(error)}. ${MUST_HOLD_OBJECT}`);
  }
  const settings = parseSettings(text);
  checkSettingsFiles(root, settings);
  return settings;
}

/**
 * The value of `bell` in the `agentrite.json` in the working tree of the project at `root`, read as `parseBell`
 * reads it. Throws what to print for a project that has none and for a file that cannot be read.
 *
 * @param {string} root
 * @returns {boolean}
 */
export function readBell(root) {
  const path = resolve(root, SETTINGS_FILE);
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    if (isMissing(path)) {
      throw new Error(
        `the project has no ${SETTINGS_FILE}, so bell is missing. ${BELL_MUST_HOLD}. ` +
          'Run: npx agentrite config, which writes one',
      );
    }
    throw new Error(`cannot read ${SETTINGS_FILE}: ${messageOf(error)}, so bell cannot be read. ${BELL_MUST_HOLD}`);
  }
  return parseBell(text);
}

/**
 * True when this file is the entry point, which it is for the sandbox's wrapper: a shell script cannot import, so
 * it runs this file with `node` and reads the default branch, or with `bell` the value of `bell`, from what is
 * printed.
 *
 * @returns {boolean}
 */
function isMain() {
  if (process.argv[1] === undefined) return false;
  const self = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  const invoked = pathToFileURL(realpathSync(process.argv[1])).href;
  return self === invoked;
}

if (isMain()) {
  const [root, ...rest] = process.argv.slice(2);
  const wantsBell = rest.length === 1 && rest[0] === 'bell';
  if (root === undefined || (rest.length > 0 && !wantsBell)) {
    console.error('usage: node agentrite-settings.mjs <project root> [bell]');
    process.exit(2);
  }
  try {
    // As text, since console.log gives a boolean colour where the environment asks for it, and container/sandbox.sh
    // takes nothing but the bare word for true.
    console.log(wantsBell ? String(readBell(root)) : readSettings(root).defaultBranch);
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
