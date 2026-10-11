import { lstatSync, readFileSync, realpathSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { HARNESS_NAMES } from './agentrite-roles.mjs';

/** The file at a project's root that holds its settings. */
export const SETTINGS_FILE = 'agentrite.json';

/**
 * @typedef {{ defaultBranch: string, harnesses: string[], sandbox: boolean }} Settings
 */

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
];

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
  for (const key of KEYS) {
    const value = Object.hasOwn(values, key.name) ? values[key.name] : undefined;
    if (key.holds(value)) continue;
    const found = value === undefined ? 'missing' : JSON.stringify(value);
    throw new Error(`${SETTINGS_FILE}: ${key.name} is ${found}. It must hold ${key.must}`);
  }

  const { defaultBranch, harnesses, sandbox } = /** @type {Settings} */ (parsed);
  return { defaultBranch, harnesses: [...new Set(harnesses)], sandbox };
}

/**
 * The text of an `agentrite.json` that holds `settings`: the keys in their order, the list on one line, and one line
 * break at the end. It is the form of the default file in `templates/project/`.
 *
 * @param {Settings} settings
 * @returns {string}
 */
export function settingsText({ defaultBranch, harnesses, sandbox }) {
  const list = harnesses.map((harness) => JSON.stringify(harness)).join(', ');
  return [
    '{',
    `  "defaultBranch": ${JSON.stringify(defaultBranch)},`,
    `  "harnesses": [${list}],`,
    `  "sandbox": ${JSON.stringify(sandbox)}`,
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
 * project that has none, for a file that cannot be read and for one that is not valid. No default stands in for a
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
  return parseSettings(text);
}

/**
 * True when this file is the entry point, which it is for the sandbox's wrapper: a shell script cannot import, so
 * it runs this file with `node` and reads the default branch from what is printed.
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
  if (root === undefined || rest.length > 0) {
    console.error('usage: node agentrite-settings.mjs <project root>');
    process.exit(2);
  }
  try {
    console.log(readSettings(root).defaultBranch);
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
