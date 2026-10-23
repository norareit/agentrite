import { isObject, jsonFault, jsonKeyFault, jsonPath } from './agentrite-json.mjs';

/**
 * @typedef {{ id: string, blocking: boolean, summary: string }} Finding
 * @typedef {{ finding: string, reason: string }} Decline
 * @typedef {{
 *   outcome: 'done' | 'needs-human' | 'failed',
 *   summary: string,
 *   questions: string[],
 *   afterwards: string[],
 *   findings: Finding[],
 *   declines: Decline[],
 * }} Outcome
 * @typedef {{ kind: 'outcome', outcome: Outcome, text: string }
 *   | { kind: 'none' }
 *   | { kind: 'several', count: number }
 *   | { kind: 'malformed', fault: string }} Reading
 */

/**
 * What the command adds to the prompt of every step, after the step's own, so that the step gives its outcome in a
 * form the command reads. A step in a repeat is told its round, and how many rounds the repeat has at most. The request
 * also says which of its lists an item for the human belongs in, how the step records a finding its prompt accepts,
 * and the latest status it may set.
 *
 * @param {{ at: number, of: number } | undefined} round
 * @returns {string}
 */
export function outcomeRequest(round) {
  const where = round === undefined ? '' : `, in round ${round.at} of a repeat of at most ${round.of} rounds`;
  return [
    `AgentRite's orchestrator runs this step${where}, and reads its outcome from your final response. ` +
      'Give the outcome there as one JSON object, in a fenced code block marked json. ' +
      'It is the only block marked json in your final response, ' +
      'and it stands before the line **Needed from you** when the response has one. ' +
      'Write no file for it. The object holds these keys, and no other:',
    '',
    '- "outcome": "done" when the step did its work, "needs-human" when it cannot go on without the human, ' +
      'or "failed" when it could not do its work',
    '- "summary": a string that says what the step did',
    '- "questions": a list of strings, each a thing the step needs from the human for the run to go on. ' +
      'It is empty when the step needs nothing of the human for the run to go on',
    '- "afterwards": a list of strings, each a thing the human needs to do, check or decide after the run, ' +
      'which the run can go on without. It is empty when the step leaves nothing for after the run',
    '- "findings": a list of objects, one for each finding the step made, ' +
      'each with "id", a string such as "S1", "blocking", true or false, and "summary", a string. ' +
      'It is empty for a step that reviewed nothing',
    '- "declines": a list of objects, one for each finding whose decline the step proposes, ' +
      'each with "finding", the id of the finding, and "reason", a string. ' +
      'It is empty for a step that proposed no decline',
    '',
    'Give "needs-human" only when the step cannot go on without the human. ' +
      'A step that did its work and leaves items only in "afterwards" gives "done". ' +
      'An item belongs in "afterwards" when it is a check that only the human can make, ' +
      'as in a running application or on another operating system, ' +
      'an action only the human can take that the rest of the run does not need, ' +
      'or a decision for which the step built the answer it recommends. ' +
      'An item belongs in "questions", with "needs-human", when the step\'s work, or the steps after it, ' +
      'cannot do without it, as a spec that can be read in two ways, ' +
      'or a decision that the rest of the work depends on and that the step could not make. ' +
      'Every item of the list under the line **Needed from you** of your final response ' +
      'is also an item of exactly one of "questions" and "afterwards", ' +
      'and every item of these two is an item of that list.',
    '',
    'Record a finding that the prompt of this step accepts in record.md as accepted by the definition of the ' +
      'orchestrator, and not as a decision of the human. ' +
      'Set the status of the unit to no status later than in-progress, ' +
      'since the human sets implemented after the run.',
  ].join('\n');
}

// A line that opens a fenced code block, once its blockquote markers are taken off: any indentation, three or more of
// one fence character, and the info string. A backtick fence's info string holds no backtick. Any indentation, and
// not CommonMark's three spaces at most, so that a fence in a list item indented four spaces is found.
const OPENING = /^([ \t]*)(`{3,}|~{3,})(.*)$/;

// One blockquote marker, as CommonMark has it: at most three spaces, `>` and an optional space.
const QUOTE_MARKER = /^ {0,3}> ?/;

/**
 * `line` without up to `most` blockquote markers at its start, and how many it had.
 *
 * @param {string} line
 * @param {number} most
 * @returns {{ depth: number, rest: string }}
 */
function unquoted(line, most) {
  let depth = 0;
  let rest = line;
  for (let match = QUOTE_MARKER.exec(rest); match !== null && depth < most; match = QUOTE_MARKER.exec(rest)) {
    depth += 1;
    rest = rest.slice(match[0].length);
  }
  return { depth, rest };
}

/**
 * The fenced code blocks of `text`, in order, each with its info string and the text between its fences, also in a
 * blockquote or a list item. A content line loses the blockquote markers of the opening line and up to as many
 * spaces of indentation. A block that is never closed runs to the end of its blockquote, or of the text.
 *
 * @param {string} text
 * @returns {{ info: string, content: string }[]}
 */
function fencedBlocks(text) {
  const lines = text.split(/\r?\n/);
  // The line break that ends the text opens no line.
  if (lines.at(-1) === '') lines.pop();
  /** @type {{ info: string, content: string }[]} */ const blocks = [];
  /** @type {{ fence: string, info: string, depth: number, indent: RegExp, lines: string[] } | undefined} */ let open;
  for (const line of lines) {
    if (open !== undefined) {
      const { depth, rest } = unquoted(line, open.depth);
      if (depth < open.depth) {
        // The blockquote ended, and the block with it, so the line is one outside any block.
        blocks.push({ info: open.info, content: open.lines.join('\n') });
        open = undefined;
      } else if (closes(rest, open.fence)) {
        blocks.push({ info: open.info, content: open.lines.join('\n') });
        open = undefined;
        continue;
      } else {
        open.lines.push(rest.replace(open.indent, ''));
        continue;
      }
    }
    const { depth, rest } = unquoted(line, Infinity);
    const match = OPENING.exec(rest);
    if (match === null || (match[2].startsWith('`') && match[3].includes('`'))) continue;
    const indent = new RegExp(`^ {0,${match[1].length}}`);
    open = { fence: match[2], info: match[3].trim(), depth, indent, lines: [] };
  }
  if (open !== undefined) blocks.push({ info: open.info, content: open.lines.join('\n') });
  return blocks;
}

/**
 * True for a line, without its blockquote markers, that closes a block opened by `fence`: any indentation, at least
 * as many of its character, and nothing after them but spaces.
 *
 * @param {string} line
 * @param {string} fence
 * @returns {boolean}
 */
function closes(line, fence) {
  const match = /^[ \t]*(`{3,}|~{3,}) *$/.exec(line);
  return match !== null && match[1][0] === fence[0] && match[1].length >= fence.length;
}

/**
 * How the outcome of a step reads from its final response: the one block whose info string opens with the word
 * `json`, wherever it stands, judged by requirement 16 of unit 0065. Several such blocks, or none, are said so, and
 * so is a block that is not of the form, with its fault.
 *
 * @param {string} response
 * @returns {Reading}
 */
export function readOutcome(response) {
  const marked = fencedBlocks(response).filter((block) => block.info.split(/\s/)[0] === 'json');
  if (marked.length === 0) return { kind: 'none' };
  if (marked.length > 1) return { kind: 'several', count: marked.length };
  const text = marked[0].content;
  /** @type {unknown} */ let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return { kind: 'malformed', fault: `the block is not JSON: ${error instanceof Error ? error.message : error}` };
  }
  const fault = outcomeFault(value);
  if (fault !== undefined) return { kind: 'malformed', fault };
  return { kind: 'outcome', outcome: /** @type {Outcome} */ (value), text };
}

const PLACES = {
  outcome: {
    name: 'an outcome',
    keys: ['outcome', 'summary', 'questions', 'afterwards', 'findings', 'declines'],
    holds: 'An outcome holds outcome, summary, questions, afterwards, findings and declines',
  },
  finding: {
    name: 'a finding',
    keys: ['id', 'blocking', 'summary'],
    holds: 'A finding holds id, blocking and summary',
  },
  decline: { name: 'a decline', keys: ['finding', 'reason'], holds: 'A decline holds finding and reason' },
};

/** @type {(value: unknown) => boolean} */
const isString = (value) => typeof value === 'string';

/**
 * The first fault of the object at `path` against `checks`: a key its place does not take, then each key of
 * `checks` in order, a list item by item.
 *
 * @param {Record<string, unknown>} object
 * @param {string} path
 * @param {{ name: string, keys: string[], holds: string }} place
 * @param {[string, (value: unknown, path: string) => string | undefined][]} checks
 * @returns {string | undefined}
 */
function objectFault(object, path, place, checks) {
  const extra = jsonKeyFault(object, path, place);
  if (extra !== undefined) return extra;
  for (const [key, check] of checks) {
    const fault = check(Object.hasOwn(object, key) ? object[key] : undefined, jsonPath(path, key));
    if (fault !== undefined) return fault;
  }
  return undefined;
}

/**
 * A check of a value that holds or gives its fault.
 *
 * @param {(value: unknown) => boolean} holds
 * @param {string} must
 * @returns {(value: unknown, path: string) => string | undefined}
 */
function plain(holds, must) {
  return (value, path) => (holds(value) ? undefined : jsonFault(path, value, must));
}

/**
 * A check of a list, and of each of its items by `item`.
 *
 * @param {string} must
 * @param {(value: unknown, path: string) => string | undefined} item
 * @returns {(value: unknown, path: string) => string | undefined}
 */
function list(must, item) {
  return (value, path) => {
    if (!Array.isArray(value)) return jsonFault(path, value, must);
    for (const [index, entry] of value.entries()) {
      const fault = item(entry, jsonPath(path, index));
      if (fault !== undefined) return fault;
    }
    return undefined;
  };
}

/**
 * A check of an object at a place, by `checks`.
 *
 * @param {string} must
 * @param {{ name: string, keys: string[], holds: string }} place
 * @param {[string, (value: unknown, path: string) => string | undefined][]} checks
 * @returns {(value: unknown, path: string) => string | undefined}
 */
function object(must, place, checks) {
  return (value, path) => (isObject(value) ? objectFault(value, path, place, checks) : jsonFault(path, value, must));
}

const STRING_MUST = 'a string';

/** @type {unknown[]} */
const OUTCOMES = ['done', 'needs-human', 'failed'];

/** @type {[string, (value: unknown, path: string) => string | undefined][]} */
const OUTCOME_CHECKS = [
  ['outcome', plain((value) => isString(value) && OUTCOMES.includes(value), '"done", "needs-human" or "failed"')],
  ['summary', plain(isString, STRING_MUST)],
  ['questions', list('a list of strings', plain(isString, STRING_MUST))],
  ['afterwards', list('a list of strings', plain(isString, STRING_MUST))],
  [
    'findings',
    list(
      'a list of objects, each with id, blocking and summary',
      object('a finding, as an object with id, blocking and summary', PLACES.finding, [
        ['id', plain(isString, STRING_MUST)],
        ['blocking', plain((value) => typeof value === 'boolean', 'true or false')],
        ['summary', plain(isString, STRING_MUST)],
      ]),
    ),
  ],
  [
    'declines',
    list(
      'a list of objects, each with finding and reason',
      object('a decline, as an object with finding and reason', PLACES.decline, [
        ['finding', plain(isString, 'the id of a finding, as a string')],
        ['reason', plain(isString, STRING_MUST)],
      ]),
    ),
  ],
];

/**
 * The first fault of `value` as an outcome, or `undefined` when it is one. The finding a decline names is not looked
 * up among the findings, since an implementer declines the findings of an earlier review.
 *
 * @param {unknown} value
 * @returns {string | undefined}
 */
function outcomeFault(value) {
  if (!isObject(value)) return `the block holds ${JSON.stringify(value)}, which is no JSON object`;
  return objectFault(value, '', PLACES.outcome, OUTCOME_CHECKS);
}
