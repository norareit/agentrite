import { randomUUID } from 'node:crypto';

/**
 * How each harness runs a step headless for the orchestrator: the arguments that make it print JSON events, one per
 * line, and that start or continue a session, with the session's id where the command chooses it, and how its final
 * response and its session's id are read from what it printed. Keyed by the harness's name, so that the code that
 * uses it names no harness.
 *
 * @type {Record<string, {
 *   arguments: (session: string | undefined) => { args: string[], session: string | undefined },
 *   read: (stdout: string) => { response: string | undefined, session: string | undefined },
 * }>}
 */
export const HEADLESS = {
  claude: {
    arguments(session) {
      // Claude Code takes `stream-json` in `--print` only beside `--verbose`.
      const stream = ['--output-format', 'stream-json', '--verbose'];
      if (session !== undefined) return { args: [...stream, '--resume', session], session };
      const id = randomUUID();
      return { args: [...stream, '--session-id', id], session: id };
    },
    // One JSON event per line, the last of them of type `result`, whose `result` is the final response.
    read(stdout) {
      const printed = stdout
        .split('\n')
        .map(jsonRecord)
        .findLast((event) => event?.type === 'result');
      return { response: stringOrNone(printed?.result), session: stringOrNone(printed?.session_id) };
    },
  },
  opencode: {
    arguments(session) {
      return { args: ['--format', 'json', ...(session === undefined ? [] : ['--session', session])], session };
    },
    read: readOpencode,
  },
};

/**
 * The fields of one event of OpenCode's that the reader uses, each a string or absent: its type, its session, and of
 * its part the message, the part's own id and its text.
 *
 * @typedef {{
 *   type: string | undefined,
 *   sessionID: string | undefined,
 *   messageID: string | undefined,
 *   id: string | undefined,
 *   text: string | undefined,
 * }} OpencodeEvent
 */

/**
 * @param {unknown} value
 * @returns {value is Record<string, unknown>}
 */
function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * @param {unknown} value
 * @returns {string | undefined}
 */
function stringOrNone(value) {
  return typeof value === 'string' ? value : undefined;
}

/**
 * The JSON object that one line holds, or `undefined` for a line that is no JSON object.
 *
 * @param {string} line
 * @returns {Record<string, unknown> | undefined}
 */
function jsonRecord(line) {
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
 * The event that one line of OpenCode's output holds, narrowed to the fields the reader uses, or `undefined` for a
 * line that is no JSON object.
 *
 * @param {string} line
 * @returns {OpencodeEvent | undefined}
 */
function opencodeEvent(line) {
  const parsed = jsonRecord(line);
  if (parsed === undefined) return undefined;
  const part = isRecord(parsed.part) ? parsed.part : {};
  return {
    type: stringOrNone(parsed.type),
    sessionID: stringOrNone(parsed.sessionID),
    messageID: stringOrNone(part.messageID),
    id: stringOrNone(part.id),
    text: stringOrNone(part.text),
  };
}

/**
 * What OpenCode printed: one JSON event per line. Every call of the model is a message of its own, ended by a
 * `step_finish`, so a step that called a tool before it answered printed more than one, and the final response is
 * the text of the message that the last `step_finish` closes.
 *
 * @param {string} stdout
 * @returns {{ response: string | undefined, session: string | undefined }}
 */
function readOpencode(stdout) {
  const events = stdout.split('\n').flatMap((line) => {
    const event = line.trim() === '' ? undefined : opencodeEvent(line);
    return event === undefined ? [] : [event];
  });
  const session = events.map((event) => event.sessionID).find((id) => id !== undefined);
  const message = events.findLast((event) => event.type === 'step_finish')?.messageID;
  if (message === undefined) return { response: undefined, session };
  // One text per part: the last event of a part counts, in the place the part first took.
  /** @type {Map<string | undefined, string>} */ const parts = new Map();
  for (const event of events) {
    if (event.type !== 'text' || event.messageID !== message || event.text === undefined) continue;
    parts.set(event.id, event.text);
  }
  return { response: parts.size === 0 ? undefined : [...parts.values()].join('\n\n'), session };
}
