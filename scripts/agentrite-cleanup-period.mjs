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
