import { randomUUID } from 'node:crypto';

/**
 * How each harness runs a step headless for the orchestrator: the arguments that make it print JSON and that start
 * or continue a session, with the session's id where the command chooses it, and how its final response and its
 * session's id are read from what it printed. Keyed by the harness's name, so that the code that uses it names no
 * harness.
 *
 * @type {Record<string, {
 *   arguments: (session: string | undefined) => { args: string[], session: string | undefined },
 *   read: (stdout: string) => { response: string | undefined, session: string | undefined },
 * }>}
 */
export const HEADLESS = {
  claude: {
    arguments(session) {
      if (session !== undefined) return { args: ['--output-format', 'json', '--resume', session], session };
      const id = randomUUID();
      return { args: ['--output-format', 'json', '--session-id', id], session: id };
    },
    // One JSON object, whose `result` is the final response.
    read(stdout) {
      /** @type {unknown} */ let printed;
      try {
        printed = JSON.parse(stdout);
      } catch {
        return { response: undefined, session: undefined };
      }
      if (typeof printed !== 'object' || printed === null) return { response: undefined, session: undefined };
      const { result, session_id: session } = /** @type {Record<string, unknown>} */ (printed);
      return {
        response: typeof result === 'string' ? result : undefined,
        session: typeof session === 'string' ? session : undefined,
      };
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
 * What OpenCode printed: one JSON event per line. Every call of the model is a message of its own, ended by a
 * `step_finish`, so a step that called a tool before it answered printed more than one, and the final response is
 * the text of the message that the last `step_finish` closes.
 *
 * @param {string} stdout
 * @returns {{ response: string | undefined, session: string | undefined }}
 */
function readOpencode(stdout) {
  const events = stdout.split('\n').flatMap((line) => {
    if (line.trim() === '') return [];
    try {
      const event = JSON.parse(line);
      return typeof event === 'object' && event !== null ? [event] : [];
    } catch {
      return [];
    }
  });
  const session = events.map((event) => event.sessionID).find((id) => typeof id === 'string');
  const last = events.findLast((event) => event.type === 'step_finish');
  const message = last?.part?.messageID;
  if (message === undefined) return { response: undefined, session };
  // One text per part: the last event of a part counts, in the place the part first took.
  /** @type {Map<unknown, string>} */ const parts = new Map();
  for (const event of events) {
    if (event.type !== 'text' || event.part?.messageID !== message || typeof event.part.text !== 'string') continue;
    parts.set(event.part.id, event.part.text);
  }
  return { response: parts.size === 0 ? undefined : [...parts.values()].join('\n\n'), session };
}
