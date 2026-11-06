import { readFileSync, realpathSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** @typedef {import('./agentrite-instructions.mjs').ProjectFile} ProjectFile */

const KEY = 'cleanupPeriodDays';

const CORRECT = `Correct the file, or remove the key ${KEY} from it`;

/**
 * @param {unknown} error
 * @returns {string}
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The `cleanupPeriodDays` that the text of the host's Claude Code user settings holds, or `undefined` for a text
 * without the key. Nothing else of the text is given, since the file can hold secrets that stay on the host. Throws,
 * naming the file at `path`, what is wrong and what to do, for a text that is no JSON object and for a value that
 * Claude Code would refuse.
 *
 * @param {string} text
 * @param {string} path
 * @returns {number | undefined}
 */
export function parseCleanupPeriod(text, path) {
  /** @type {unknown} */ let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not a JSON object: ${messageOf(error)}, so ${KEY} cannot be read. ${CORRECT}`);
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`${path} is not a JSON object: it holds ${JSON.stringify(parsed)}. ${CORRECT}`);
  }
  const values = /** @type {Record<string, unknown>} */ (parsed);
  if (!Object.hasOwn(values, KEY)) return undefined;
  const value = values[KEY];
  if (typeof value === 'number' && Number.isInteger(value) && value >= 1) return value;
  throw new Error(`${path}: ${KEY} is ${JSON.stringify(value)}. It must be a whole number of 1 or more. ${CORRECT}`);
}

/**
 * The `cleanupPeriodDays` of the host's Claude Code user settings as `read` gives them, read as `parseCleanupPeriod`
 * reads it, or `undefined` when there is no such file. Throws, naming the file at `path`, what to print for a file
 * that could not be read.
 *
 * @param {ProjectFile} read
 * @param {string} path
 * @returns {number | undefined}
 */
export function cleanupPeriodOf(read, path) {
  if (!read.found) return undefined;
  if ('error' in read) throw new Error(`cannot read ${path}: ${read.error}. ${CORRECT}`);
  return parseCleanupPeriod(read.text, path);
}

/**
 * The `cleanupPeriodDays` of `.claude/settings.json` under `home`, read as `parseCleanupPeriod` reads it, or
 * `undefined` when there is no such file. Throws what to print for a file that cannot be read.
 *
 * @param {string} home
 * @returns {number | undefined}
 */
export function readCleanupPeriod(home) {
  const path = join(home, '.claude', 'settings.json');
  let text;
  try {
    text = readFileSync(path, 'utf-8');
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return undefined;
    throw new Error(`cannot read ${path}: ${messageOf(error)}. ${CORRECT}`);
  }
  return parseCleanupPeriod(text, path);
}

/**
 * True when this file is the entry point, which it is for the sandbox's wrapper: a shell script cannot import, so
 * it runs this file with `node` and reads the number from what is printed.
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
  const args = process.argv.slice(2);
  if (args.length !== 1) {
    console.error('usage: node agentrite-cleanup-period.mjs <home>');
    process.exit(2);
  }
  try {
    // An empty line for a home without the number, which container/sandbox.sh reads as giving nothing.
    console.log(String(readCleanupPeriod(args[0]) ?? ''));
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
