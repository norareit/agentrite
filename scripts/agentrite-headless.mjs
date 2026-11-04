// The readers that the headless run of every harness shares, and the shapes of what is followed of a step. What
// one harness prints, and how it is read, is in its module of `scripts/harnesses/`.

/**
 * What is followed of a step: a text message of its agent, or a tool call with the fields its label is taken from,
 * at the instant the harness gives for it, in milliseconds since the epoch, or `undefined` when it gives none.
 * `description` is set only for a call of the harness's shell tool, since it is the agent's own words for it.
 *
 * @typedef {{ kind: 'text', time: number | undefined, text: string }
 *   | {
 *       kind: 'call',
 *       time: number | undefined,
 *       tool: string,
 *       description: string | undefined,
 *       path: string | undefined,
 *       pattern: string | undefined,
 *       command: string | undefined,
 *     }} Followed
 */

/**
 * A tool call of what is followed of a step.
 *
 * @typedef {Extract<Followed, { kind: 'call' }>} Call
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
export function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
export function stringOrNone(value) {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The JSON object that one line holds, or `undefined` for a line that is no JSON object.
 *
 * @param {string} line
 * @returns {Record<string, unknown> | undefined}
 */
export function jsonRecord(line) {
  if (line.trim() === '') return undefined;
  /** @type {unknown} */ let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    return undefined;
  }
  return isRecord(parsed) ? parsed : undefined;
}

/**
 * A text message, or nothing for a text that is not a string or holds nothing but line breaks.
 *
 * @param {number | undefined} time
 * @param {unknown} text
 * @returns {Followed[]}
 */
export function textFollowed(time, text) {
  if (typeof text !== 'string' || text.replace(/[\r\n]+$/, '') === '') return [];
  return [{ kind: 'text', time, text }];
}

/**
 * A tool call, with its label's fields read from its input by the names the harness gives them.
 *
 * @param {number | undefined} time
 * @param {string} tool
 * @param {Record<string, unknown>} input
 * @param {{ shell: string, paths: string[] }} names the harness's shell tool, and the fields that name one file
 * @returns {Call}
 */
export function callFollowed(time, tool, input, { shell, paths }) {
  return {
    kind: 'call',
    time,
    tool,
    description: tool === shell ? stringOrNone(input.description) : undefined,
    path: paths.map((field) => stringOrNone(input[field])).find((path) => path !== undefined),
    pattern: stringOrNone(input.pattern),
    command: stringOrNone(input.command),
  };
}

/**
 * The JSON objects of the lines printed, in order, without the lines that hold none.
 *
 * @param {string} stdout
 * @returns {Record<string, unknown>[]}
 */
export function jsonRecords(stdout) {
  return stdout.split('\n').flatMap((line) => {
    const record = jsonRecord(line);
    return record === undefined ? [] : [record];
  });
}
