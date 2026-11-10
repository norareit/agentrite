import { createHash } from 'node:crypto';
import { join } from 'node:path';

/**
 * The directory that holds the records of the runs of the orchestrator: `agentrite/.orchestrator-runs` in
 * `$XDG_STATE_HOME` when that is set and not empty, and in `~/.local/state` of `home` when it is not. It is outside
 * `.orchestrator`, which a unit run can write, and its name opens with a dot, which no Compose project's does, so no
 * clone's directory in `agentrite` can be it.
 *
 * @param {{ XDG_STATE_HOME?: string }} environment
 * @param {string} home
 * @returns {string}
 */
export function recordDirectory(environment, home) {
  const state = environment.XDG_STATE_HOME ? environment.XDG_STATE_HOME : join(home, '.local', 'state');
  return join(state, 'agentrite', '.orchestrator-runs');
}

/**
 * The SHA-256 of `bytes`, in hexadecimal.
 *
 * @param {Buffer} bytes
 * @returns {string}
 */
export function digestOf(bytes) {
  return createHash('sha256').update(bytes).digest('hex');
}

/**
 * The name of the record of the run whose directory, with every link resolved, is at the absolute path `runPath`.
 *
 * @param {string} runPath
 * @returns {string}
 */
export function recordName(runPath) {
  return `${digestOf(Buffer.from(runPath))}.json`;
}

/**
 * The text of the record of a run whose `definition.json` and `state.json` hold the bytes given.
 *
 * @param {Buffer} definition
 * @param {Buffer} state
 * @returns {string}
 */
export function recordText(definition, state) {
  return `${JSON.stringify({ definition: digestOf(definition), state: digestOf(state) })}\n`;
}

const DIGEST_FORM = /^[0-9a-f]{64}$/;

/**
 * The digests the text of a record holds, or `undefined` when it is not of the form `recordText` writes.
 *
 * @param {string} text
 * @returns {{ definition: string, state: string } | undefined}
 */
function digestsOf(text) {
  /** @type {unknown} */ let held;
  try {
    held = JSON.parse(text);
  } catch {
    return undefined;
  }
  if (typeof held !== 'object' || held === null || Array.isArray(held)) return undefined;
  const keys = Object.keys(held).sort();
  if (keys.length !== 2 || keys[0] !== 'definition' || keys[1] !== 'state') return undefined;
  const { definition, state } = /** @type {Record<string, unknown>} */ (held);
  if (typeof definition !== 'string' || typeof state !== 'string') return undefined;
  if (!DIGEST_FORM.test(definition) || !DIGEST_FORM.test(state)) return undefined;
  return { definition, state };
}

/**
 * What keeps a resume from taking a run, by the text of its record, `undefined` when it has none, and the bytes of
 * its `definition.json` and `state.json` as the resume read them: a clause that says what is wrong, or `undefined`
 * when the record holds the digests of both.
 *
 * @param {string | undefined} text
 * @param {Buffer} definition
 * @param {Buffer} state
 * @returns {string | undefined}
 */
export function judgeRecord(text, definition, state) {
  if (text === undefined) return 'has no record where it is resumed';
  const digests = digestsOf(text);
  if (digests === undefined) return 'has a record that is not of the form the command writes';
  if (digests.definition !== digestOf(definition)) return 'has a definition.json that is not as the run left it';
  if (digests.state !== digestOf(state)) return 'has a state.json that is not as the run left it';
  return undefined;
}
