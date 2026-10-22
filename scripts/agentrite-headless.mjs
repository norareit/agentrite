import { randomUUID } from 'node:crypto';

/**
 * How each harness runs a step headless for the orchestrator: the arguments that make it print JSON events, one per
 * line, and that start or continue a session, with the session's id where the command chooses it, and how its final
 * response and its session's id are read from what it printed, and what is followed of the step in each line it
 * prints. Keyed by the harness's name, so that the code that uses it names no harness.
 *
 * @type {Record<string, {
 *   arguments: (session: string | undefined) => { args: string[], session: string | undefined },
 *   read: (stdout: string) => { response: string | undefined, session: string | undefined },
 *   follow: (line: string) => Followed[],
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
    follow: followClaude,
  },
  opencode: {
    arguments(session) {
      return { args: ['--format', 'json', ...(session === undefined ? [] : ['--session', session])], session };
    },
    read: readOpencode,
    follow: followOpencode,
  },
};

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

/**
 * A text message, or nothing for a text that is not a string or holds nothing but line breaks.
 *
 * @param {number | undefined} time
 * @param {unknown} text
 * @returns {Followed[]}
 */
function textFollowed(time, text) {
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
 * @returns {Followed}
 */
function callFollowed(time, tool, input, { shell, paths }) {
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

const CLAUDE_TOOLS = { shell: 'Bash', paths: ['file_path', 'notebook_path'] };

/**
 * What Claude Code makes known in one line of `stream-json`: the text blocks and tool calls of an event of the step's
 * agent's message, in their order. An event of a subagent's carries the id of the call that started it.
 *
 * @param {string} line
 * @returns {Followed[]}
 */
function followClaude(line) {
  const event = jsonRecord(line);
  if (event?.type !== 'assistant' || typeof event.parent_tool_use_id === 'string') return [];
  if (!isRecord(event.message)) return [];
  const { content } = event.message;
  if (!Array.isArray(content)) return [];
  const timestamp = typeof event.timestamp === 'string' ? Date.parse(event.timestamp) : NaN;
  const time = Number.isNaN(timestamp) ? undefined : timestamp;
  return content.filter(isRecord).flatMap((block) => {
    if (block.type === 'text') return textFollowed(time, block.text);
    if (block.type !== 'tool_use' || typeof block.name !== 'string') return [];
    return [callFollowed(time, block.name, isRecord(block.input) ? block.input : {}, CLAUDE_TOOLS)];
  });
}

const OPENCODE_TOOLS = { shell: 'bash', paths: ['filePath'] };

/**
 * What OpenCode makes known in one line of its JSON events: a text, or a tool call, which it prints once the call
 * has ended.
 *
 * @param {string} line
 * @returns {Followed[]}
 */
function followOpencode(line) {
  const event = jsonRecord(line);
  if (event === undefined || !isRecord(event.part)) return [];
  const { part } = event;
  const time = typeof event.timestamp === 'number' ? event.timestamp : undefined;
  if (event.type === 'text') return textFollowed(time, part.text);
  if (event.type !== 'tool_use' || typeof part.tool !== 'string') return [];
  const input = isRecord(part.state) && isRecord(part.state.input) ? part.state.input : {};
  return [callFollowed(time, part.tool, input, OPENCODE_TOOLS)];
}
