import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HEADLESS } from '../scripts/agentrite-headless.mjs';
import { askAgainRequest, outcomeRequest, readOutcome, RESUMED, resumeWords } from '../scripts/agentrite-outcome.mjs';

// R15

const REQUEST_LIST = [
  '- "outcome": "done" when the step did its work, "needs-human" when it cannot go on without the human, or "failed" ' +
    'when it could not do its work',
  '- "summary": a string that says what the step did',
  '- "questions": a list of strings, each a thing the step needs from the human for the run to go on. It is empty ' +
    'when the step needs nothing of the human for the run to go on',
  '- "afterwards": a list of strings, each a thing the human needs to do, check or decide after the run, which the ' +
    'run can go on without. It is empty when the step leaves nothing for after the run',
  '- "findings": a list of objects, one for each finding the step made, each with "id", a string such as "S1", ' +
    '"blocking", true or false, and "summary", a string. It is empty for a step that reviewed nothing',
  '- "declines": a list of objects, one for each finding whose decline the step proposes, each with "finding", the ' +
    'id of the finding, and "reason", a string. It is empty for a step that proposed no decline',
];

const REQUEST_LISTS =
  'Give "needs-human" only when the step cannot go on without the human. A step that did its work and leaves items ' +
  'only in "afterwards" gives "done". An item belongs in "afterwards" when it is a check that only the human can ' +
  'make, as in a running application or on another operating system, an action only the human can take that the ' +
  'rest of the run does not need, or a decision for which the step built the answer it recommends. An item belongs ' +
  'in "questions", with "needs-human", when the step\'s work, or the steps after it, cannot do without it, as a spec ' +
  'that can be read in two ways, or a decision that the rest of the work depends on and that the step could not ' +
  'make. Every item of the list under the line **Needed from you** of your final response is also an item of ' +
  'exactly one of "questions" and "afterwards", and every item of these two is an item of that list.';

// R6 of unit 0088
const REQUEST_LAST =
  'Your final response is the last response of this step: end no turn after it. Before you give it, wait until ' +
  'every command you started in the background has ended, so that none of them reports its end after it.';

const REQUEST_RECORD =
  'Record a finding that the prompt of this step accepts in record.md as accepted by the definition of the ' +
  'orchestrator, and not as a decision of the human. Set the status of the unit to no status later than ' +
  'in-progress, since the human sets implemented after the run.';

function request(round) {
  return [
    `AgentRite's orchestrator runs this step${round}, and reads its outcome from your final response. Give the ` +
      'outcome there as one JSON object, in a fenced code block marked json. It is the only block marked json in ' +
      'your final response, and it stands before the line **Needed from you** when the response has one. Write no ' +
      'file for it. The object holds these keys, and no other:',
    '',
    ...REQUEST_LIST,
    '',
    REQUEST_LISTS,
    '',
    REQUEST_LAST,
    '',
    REQUEST_RECORD,
  ].join('\n');
}

test('the request of the outcome, outside a repeat, is the text of the plan', () => {
  assert.equal(outcomeRequest(undefined), request(''));
});

test('the request of the outcome, in a repeat, says the round and how many rounds the repeat has at most', () => {
  assert.equal(outcomeRequest({ at: 2, of: 3 }), request(', in round 2 of a repeat of at most 3 rounds'));
  assert.equal(outcomeRequest({ at: 1, of: 1 }), request(', in round 1 of a repeat of at most 1 rounds'));
});

// R2 of unit 0068

test('the request of the outcome, in a repeat and outside one, ends with how to record an accepted finding', () => {
  assert.ok(outcomeRequest(undefined).endsWith(`\n\n${REQUEST_RECORD}`));
  assert.ok(outcomeRequest({ at: 2, of: 3 }).endsWith(`\n\n${REQUEST_RECORD}`));
});

// R1 of unit 0088

const ASK_AGAIN =
  'Your last response held no block marked json, so AgentRite\'s orchestrator could not read the outcome of this ' +
  'step. Give the outcome of the step now, for its work as it stands.';

test('the request of an ask again is its paragraph followed by the request of the outcome, in a repeat too', () => {
  assert.equal(askAgainRequest(undefined), `${ASK_AGAIN}\n\n${request('')}`);
  const round = { at: 2, of: 3 };
  assert.equal(askAgainRequest(round), `${ASK_AGAIN}\n\n${request(', in round 2 of a repeat of at most 3 rounds')}`);
});

// Unit 0089, R3

test('the sentence of a rerun says that the human resumed the run after it stopped at this step', () => {
  assert.equal(RESUMED, "The human resumed the run of AgentRite's orchestrator after it stopped at this step.");
});

test('resumeWords gives the words of the human when they are given, and the sentence of a rerun otherwise', () => {
  assert.equal(resumeWords('Take the second reading of R2.'), 'Take the second reading of R2.');
  assert.equal(resumeWords('First line.\nSecond line.'), 'First line.\nSecond line.');
  assert.equal(resumeWords(undefined), RESUMED);
});

test('each line of the source of the outcome fits the line limit', () => {
  const source = readFileSync(new URL('../scripts/agentrite-outcome.mjs', import.meta.url), 'utf-8');
  for (const line of source.split('\n')) assert.ok(line.length <= 120, line);
});

// R15, R16

const EXAMPLE = {
  outcome: 'done',
  summary: 'Reviewed the unit against its spec and plan, and ran both suites.',
  questions: [],
  afterwards: [],
  findings: [
    { id: 'S1', blocking: true, summary: 'R25 is not met: a unit run does not mount .orchestrator' },
    { id: 'C1', blocking: false, summary: 'The usage of orchestrate does not name its exit statuses' },
  ],
  declines: [],
};

const EXAMPLE_BLOCK = `{
  "outcome": "done",
  "summary": "Reviewed the unit against its spec and plan, and ran both suites.",
  "questions": [],
  "afterwards": [],
  "findings": [
    { "id": "S1", "blocking": true, "summary": "R25 is not met: a unit run does not mount .orchestrator" },
    { "id": "C1", "blocking": false, "summary": "The usage of orchestrate does not name its exit statuses" }
  ],
  "declines": []
}`;

const FENCE = '```';

function block(text, open = `${FENCE}json`, close = FENCE) {
  return `${open}\n${text}\n${close}`;
}

const DONE = { outcome: 'done', summary: 'Did it.', questions: [], afterwards: [], findings: [], declines: [] };

test('the spec example of an outcome is read, with the text of its block', () => {
  assert.deepEqual(readOutcome(block(EXAMPLE_BLOCK)), { kind: 'outcome', outcome: EXAMPLE, text: EXAMPLE_BLOCK });
});

test('a block is found at the start, in the middle and at the end of a response', () => {
  const text = JSON.stringify(DONE);
  for (const response of [
    `${block(text)}\n\nThat is all.`,
    `I did the work.\n\n${block(text)}\n\nThat is all.`,
    `I did the work.\n\n${block(text)}`,
    `I did the work.\n\n${block(text)}\n`,
  ]) {
    assert.deepEqual(readOutcome(response), { kind: 'outcome', outcome: DONE, text }, response);
  }
});

test('a block before the list of what is needed from the human is read', () => {
  const outcome = { ...DONE, outcome: 'needs-human', questions: ['Which branch?'] };
  const text = JSON.stringify(outcome, null, 2);
  const response = `I stopped.\n\n${block(text)}\n\n**Needed from you**\n\n1. Which branch?\n`;
  assert.deepEqual(readOutcome(response), { kind: 'outcome', outcome, text });
});

test('a block among blocks marked otherwise, and unmarked ones, is read', () => {
  const text = JSON.stringify(DONE);
  const response = [
    block('npm test', `${FENCE}bash`),
    block('{"outcome": "failed"}', FENCE),
    block(text),
    block('{"a": 1}', `${FENCE}jsonc`),
    block('{"a": 1}', `${FENCE}JSON`),
  ].join('\n\n');
  assert.deepEqual(readOutcome(response), { kind: 'outcome', outcome: DONE, text });
});

test('a block opened by four backticks or by tildes, or with more after json, is read', () => {
  const text = JSON.stringify(DONE);
  for (const [open, close] of [
    ['````json', '````'],
    ['~~~json', '~~~'],
    ['~~~~ json', '~~~~~'],
    [`${FENCE}json title`, FENCE],
    [`   ${FENCE}json`, `  ${FENCE}`],
  ]) {
    assert.deepEqual(readOutcome(`Done.\n\n${block(text, open, close)}\n`), { kind: 'outcome', outcome: DONE, text });
  }
});

test('a block that is never closed runs to the end of the response', () => {
  const text = JSON.stringify(DONE);
  assert.deepEqual(readOutcome(`Done.\n\n${FENCE}json\n${text}\n`), { kind: 'outcome', outcome: DONE, text });
  assert.deepEqual(readOutcome(`Done.\n\n${FENCE}json\n${text}`), { kind: 'outcome', outcome: DONE, text });
});

test('no block is found in a response without one, with one marked JSON or jsonc, or inside another fence', () => {
  const text = JSON.stringify(DONE);
  for (const response of [
    '',
    'I did the work.',
    `Here:\n\n${text}`,
    block(text, `${FENCE}JSON`),
    block(text, `${FENCE}jsonc`),
    block(text, `${FENCE}bash`),
    `${FENCE}${FENCE.slice(1)}markdown\n${block(text)}\n${FENCE}${FENCE.slice(1)}`,
    `${FENCE}\n${block(text)}`,
    `> ${FENCE}bash\n> ${text}\n> ${FENCE}`,
    `> ${FENCE}${FENCE.slice(1)}markdown\n> ${FENCE}json\n> ${text}\n> ${FENCE}\n> ${FENCE}${FENCE.slice(1)}`,
  ]) {
    assert.deepEqual(readOutcome(response), { kind: 'none' }, response);
  }
});

// The review's finding S1: a block is read wherever it stands, in a Markdown container as well.
test('a block in a blockquote, a nested one or an indented list item is read, its text without markers', () => {
  const text = JSON.stringify(DONE, null, 2);
  const lines = [`${FENCE}json`, ...text.split('\n'), FENCE];
  for (const response of [
    lines.map((line) => `> ${line}`).join('\n'),
    `> Done.\n>\n${lines.map((line) => `> > ${line}`).join('\n')}`,
    `1.  Outcome:\n\n${lines.map((line) => `    ${line}`).join('\n')}\n`,
    `* Outcome:\n\n${lines.map((line) => `      ${line}`).join('\n')}\n\nThat is all.`,
    lines.map((line) => `    ${line}`).join('\n'),
  ]) {
    assert.deepEqual(readOutcome(response), { kind: 'outcome', outcome: DONE, text }, response);
  }
});

// The delta review's finding S2: a block left open in a blockquote ends with the blockquote.
test('a block left open in a blockquote ends with it, and the json block after it is read', () => {
  const text = JSON.stringify(DONE);
  for (const response of [
    `> ${FENCE}bash\n> npm test\n\n${FENCE}json\n${text}\n${FENCE}\n`,
    `> ${FENCE}bash\n> npm test\nNot quoted.\n\n${FENCE}json\n${text}\n${FENCE}`,
    `> > ${FENCE}bash\n> > npm test\n>\n> ${FENCE}json\n> ${text}\n> ${FENCE}`,
  ]) {
    assert.deepEqual(readOutcome(response), { kind: 'outcome', outcome: DONE, text }, response);
  }
  assert.deepEqual(readOutcome(`> ${FENCE}json\n> ${text}\n\nThat is all.`), { kind: 'outcome', outcome: DONE, text });
});

test('a block in a blockquote is closed by a fence in the blockquote, and two in containers are several', () => {
  const text = JSON.stringify(DONE);
  assert.deepEqual(readOutcome(`> ${FENCE}json\n> ${text}\n> ${FENCE}\n\nAfter.`), {
    kind: 'outcome',
    outcome: DONE,
    text,
  });
  assert.deepEqual(readOutcome(`> ${FENCE}json\n> ${text}\n> ${FENCE}\n\n    ${FENCE}json\n    {}\n    ${FENCE}`), {
    kind: 'several',
    count: 2,
  });
});

test('two or three blocks marked json are several, with their count', () => {
  const text = JSON.stringify(DONE);
  assert.deepEqual(readOutcome(`${block(text)}\n\n${block(text)}`), { kind: 'several', count: 2 });
  assert.deepEqual(readOutcome(`${block(text)}\n${block('x')}\n${block('{}', '~~~json', '~~~')}`), {
    kind: 'several',
    count: 3,
  });
});

function malformed(text, fault) {
  assert.deepEqual(readOutcome(block(text)), { kind: 'malformed', fault }, text);
}

test('a block that is not JSON is malformed, with the parser own error', () => {
  let parserMessage;
  try {
    JSON.parse('{ "outcome": ');
  } catch (error) {
    parserMessage = error.message;
  }
  malformed('{ "outcome": ', `the block is not JSON: ${parserMessage}`);
});

test('a block that is no object is malformed', () => {
  for (const value of [[], null, 5, 'done']) {
    malformed(JSON.stringify(value), `the block holds ${JSON.stringify(value)}, which is no JSON object`);
  }
});

const OUTCOME_MUST = 'It must hold "done", "needs-human" or "failed"';
const KEYS = 'An outcome holds outcome, summary, questions, afterwards, findings and declines';

test('each key that is missing is named, in the order of the keys', () => {
  for (const [key, must] of [
    ['outcome', OUTCOME_MUST],
    ['summary', 'It must hold a string'],
    ['questions', 'It must hold a list of strings'],
    ['afterwards', 'It must hold a list of strings'],
    ['findings', 'It must hold a list of objects, each with id, blocking and summary'],
    ['declines', 'It must hold a list of objects, each with finding and reason'],
  ]) {
    const { [key]: _removed, ...rest } = DONE;
    malformed(JSON.stringify(rest), `${key} is missing. ${must}`);
  }
  malformed('{}', `outcome is missing. ${OUTCOME_MUST}`);
});

test('a key of another name is named, in the outcome, a finding or a decline, before a value of a wrong form', () => {
  malformed(JSON.stringify({ ...DONE, outcome: 'ok', severity: 'high' }), `severity is no key of an outcome. ${KEYS}`);
  malformed(
    JSON.stringify({ ...DONE, findings: [{ id: 'S1', blocking: true, summary: 'x', severity: 'high' }] }),
    'findings[0].severity is no key of a finding. A finding holds id, blocking and summary',
  );
  malformed(
    JSON.stringify({ ...DONE, declines: [{ finding: 'S1', reason: 'x', why: 'y' }] }),
    'declines[0].why is no key of a decline. A decline holds finding and reason',
  );
});

test('each other value of outcome is malformed', () => {
  for (const outcome of ['ok', 'Done', '', null, true]) {
    malformed(JSON.stringify({ ...DONE, outcome }), `outcome is ${JSON.stringify(outcome)}. ${OUTCOME_MUST}`);
  }
});

test('a value of the wrong type in each key is malformed, with its whole fault', () => {
  const finding = { id: 'S1', blocking: true, summary: 'x' };
  const decline = { finding: 'S1', reason: 'x' };
  for (const [changed, fault] of [
    [{ summary: 5 }, 'summary is 5. It must hold a string'],
    [{ summary: null }, 'summary is null. It must hold a string'],
    [{ questions: 'none' }, 'questions is "none". It must hold a list of strings'],
    [{ questions: ['a', 5] }, 'questions[1] is 5. It must hold a string'],
    [{ afterwards: 'none' }, 'afterwards is "none". It must hold a list of strings'],
    [{ afterwards: ['a', 5] }, 'afterwards[1] is 5. It must hold a string'],
    [{ findings: {} }, 'findings is {}. It must hold a list of objects, each with id, blocking and summary'],
    [{ findings: [5] }, 'findings[0] is 5. It must hold a finding, as an object with id, blocking and summary'],
    [{ findings: [{ ...finding, id: 1 }] }, 'findings[0].id is 1. It must hold a string'],
    [{ findings: [{ ...finding, blocking: 'yes' }] }, 'findings[0].blocking is "yes". It must hold true or false'],
    [{ findings: [{ id: 'S1', summary: 'x' }] }, 'findings[0].blocking is missing. It must hold true or false'],
    [{ findings: [finding, { ...finding, summary: [] }] }, 'findings[1].summary is []. It must hold a string'],
    [{ declines: null }, 'declines is null. It must hold a list of objects, each with finding and reason'],
    [{ declines: ['S1'] }, 'declines[0] is "S1". It must hold a decline, as an object with finding and reason'],
    [
      { declines: [{ ...decline, finding: 1 }] },
      'declines[0].finding is 1. It must hold the id of a finding, as a string',
    ],
    [{ declines: [{ finding: 'S1' }] }, 'declines[0].reason is missing. It must hold a string'],
  ]) {
    malformed(JSON.stringify({ ...DONE, ...changed }), fault);
  }
});

// R1 of unit 0076

test('the items of afterwards are read with the outcome', () => {
  const outcome = { ...DONE, afterwards: ['Check it on macOS.'] };
  const text = JSON.stringify(outcome);
  assert.deepEqual(readOutcome(block(text)), { kind: 'outcome', outcome, text });
});

test('a decline of a finding that is not among the findings is read, since it may be of an earlier review', () => {
  const outcome = { ...DONE, declines: [{ finding: 'S4', reason: 'It holds as it is.' }] };
  const text = JSON.stringify(outcome);
  assert.deepEqual(readOutcome(block(text)), { kind: 'outcome', outcome, text });
});

// R13, R15: what each harness prints headless, read for its final response and its session.

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

test('claude: the first step is given a new session id, and a later one resumes the session given', () => {
  const first = HEADLESS.claude.arguments(undefined);
  assert.equal(first.args.length, 5);
  assert.deepEqual(first.args.slice(0, 4), ['--output-format', 'stream-json', '--verbose', '--session-id']);
  assert.match(first.args[4], UUID);
  assert.equal(first.session, first.args[4]);
  assert.notEqual(HEADLESS.claude.arguments(undefined).session, first.session);

  const later = HEADLESS.claude.arguments('4b0c6a62-0f43-4f3e-9d6c-1f6d3b1c9e2a');
  assert.deepEqual(later, {
    args: ['--output-format', 'stream-json', '--verbose', '--resume', '4b0c6a62-0f43-4f3e-9d6c-1f6d3b1c9e2a'],
    session: '4b0c6a62-0f43-4f3e-9d6c-1f6d3b1c9e2a',
  });
});

test('claude: the result and the session_id of the one object printed are read', () => {
  const printed = JSON.stringify({
    type: 'result',
    subtype: 'success',
    is_error: false,
    result: 'Done.\n\n```json\n{}\n```',
    session_id: 'abc',
  });
  assert.deepEqual(HEADLESS.claude.read(`${printed}\n`), { response: 'Done.\n\n```json\n{}\n```', session: 'abc' });
});

test('claude: of the events printed one per line, the result and the session_id of the result are read', () => {
  const printed = [
    JSON.stringify({ type: 'system', subtype: 'init', session_id: 'abc' }),
    'a warning',
    JSON.stringify({
      type: 'assistant',
      message: { content: [{ type: 'text', text: 'Not this.' }] },
      parent_tool_use_id: null,
      session_id: 'abc',
    }),
    JSON.stringify({ type: 'result', subtype: 'success', result: 'Done.', session_id: 'abc' }),
    '',
  ].join('\n');
  assert.deepEqual(HEADLESS.claude.read(printed), { response: 'Done.', session: 'abc' });
});

test('claude: no final response for output that is no JSON, without a string result, or empty', () => {
  for (const printed of ['not json', '', JSON.stringify({ type: 'result', session_id: 'abc' }), '{"result": 5}']) {
    assert.equal(HEADLESS.claude.read(printed).response, undefined, printed);
  }
  assert.equal(HEADLESS.claude.read('{"result": "x"}').session, undefined);
  assert.equal(HEADLESS.claude.read('{"result": "x", "session_id": 5}').session, undefined);
  assert.equal(HEADLESS.claude.read('[1]').response, undefined);
  assert.equal(HEADLESS.claude.read('null').response, undefined);
});

test('opencode: the arguments ask for JSON, and give the session when there is one', () => {
  assert.deepEqual(HEADLESS.opencode.arguments(undefined), { args: ['--format', 'json'], session: undefined });
  assert.deepEqual(HEADLESS.opencode.arguments('ses_1'), {
    args: ['--format', 'json', '--session', 'ses_1'],
    session: 'ses_1',
  });
});

function events(...list) {
  return list.map((event) => JSON.stringify(event)).join('\n');
}

const event = (type, part) => ({ type, timestamp: 1, sessionID: 'ses_abc', part });

test('opencode: the final response is the text of the message the last step_finish closes', () => {
  const printed = events(
    event('step_start', { id: 'prt_1', messageID: 'msg_1', type: 'step-start' }),
    event('text', { id: 'prt_2', messageID: 'msg_1', type: 'text', text: 'I will look first.' }),
    event('tool_use', { id: 'prt_3', messageID: 'msg_1', type: 'tool', tool: 'bash' }),
    event('step_finish', { id: 'prt_4', messageID: 'msg_1', type: 'step-finish', reason: 'tool-calls' }),
    event('step_start', { id: 'prt_5', messageID: 'msg_2', type: 'step-start' }),
    event('text', { id: 'prt_6', messageID: 'msg_2', type: 'text', text: 'PELICAN OSPREY' }),
    event('step_finish', { id: 'prt_7', messageID: 'msg_2', type: 'step-finish', reason: 'stop' }),
  );
  assert.deepEqual(HEADLESS.opencode.read(`${printed}\n`), { response: 'PELICAN OSPREY', session: 'ses_abc' });
});

test('opencode: two text parts of one message are joined by an empty line, a part given twice as its last', () => {
  const printed = events(
    event('text', { id: 'prt_1', messageID: 'msg_1', text: 'First, partly' }),
    event('text', { id: 'prt_2', messageID: 'msg_1', text: 'Second.' }),
    event('text', { id: 'prt_1', messageID: 'msg_1', text: 'First.' }),
    event('step_finish', { id: 'prt_3', messageID: 'msg_1', reason: 'stop' }),
  );
  assert.equal(HEADLESS.opencode.read(printed).response, 'First.\n\nSecond.');
});

test('opencode: a line that is not JSON is skipped, and the session is the first sessionID', () => {
  const printed = [
    'a warning',
    events(
      { type: 'step_start', part: { messageID: 'msg_1' } },
      event('text', { id: 'prt_1', messageID: 'msg_1', text: 'Done.' }),
      { ...event('step_finish', { id: 'prt_2', messageID: 'msg_1' }), sessionID: 'ses_other' },
    ),
    '',
    '{ broken',
  ].join('\n');
  assert.deepEqual(HEADLESS.opencode.read(printed), { response: 'Done.', session: 'ses_abc' });
});

test('opencode: no final response without a step_finish, or with none of its message text', () => {
  const text = event('text', { id: 'prt_1', messageID: 'msg_1', text: 'Done.' });
  assert.deepEqual(HEADLESS.opencode.read(events(text)), { response: undefined, session: 'ses_abc' });
  const otherMessage = events(text, event('step_finish', { id: 'prt_2', messageID: 'msg_2', reason: 'stop' }));
  assert.equal(HEADLESS.opencode.read(otherMessage).response, undefined);
  assert.deepEqual(HEADLESS.opencode.read(''), { response: undefined, session: undefined });
});

// Unit 0075, R4, R8, R9: what each harness makes known of a step as it runs, one line of its output at a time.

const NO_CALL = { description: undefined, path: undefined, pattern: undefined, command: undefined };
const AT = '2026-10-22T14:03:27.900Z';

const assistant = (content, extra = {}) =>
  JSON.stringify({ type: 'assistant', message: { content }, parent_tool_use_id: null, timestamp: AT, ...extra });
const toolUse = (name, input) => ({ type: 'tool_use', id: 'toolu_1', name, input });

test('claude: an assistant event gives its text and its tool calls, in order, at its timestamp', () => {
  const line = assistant([
    { type: 'text', text: 'I will run the tests.\n' },
    { type: 'thinking', thinking: '', signature: 'x' },
    { type: 'redacted_thinking', data: 'x' },
    toolUse('Bash', { command: 'npm test', description: 'Run the tests' }),
  ]);
  assert.deepEqual(HEADLESS.claude.follow(line), [
    { kind: 'text', time: Date.parse(AT), text: 'I will run the tests.\n' },
    {
      kind: 'call',
      time: Date.parse(AT),
      tool: 'Bash',
      ...NO_CALL,
      description: 'Run the tests',
      command: 'npm test',
    },
  ]);
});

test('claude: a call gives the path of the file it acts on and the pattern it searches for', () => {
  const calls = (block) => HEADLESS.claude.follow(assistant([block]));
  const call = (tool, fields) => [{ kind: 'call', time: Date.parse(AT), tool, ...NO_CALL, ...fields }];
  assert.deepEqual(calls(toolUse('Read', { file_path: '/work/a.mjs' })), call('Read', { path: '/work/a.mjs' }));
  assert.deepEqual(
    calls(toolUse('NotebookEdit', { notebook_path: '/work/a.ipynb' })),
    call('NotebookEdit', { path: '/work/a.ipynb' }),
  );
  assert.deepEqual(calls(toolUse('Grep', { pattern: 'follow', path: '/work' })), call('Grep', { pattern: 'follow' }));
  assert.deepEqual(calls(toolUse('Agent', { description: 'Look around', prompt: 'Look.' })), call('Agent', {}));
  assert.deepEqual(calls(toolUse('Read', { file_path: 5, command: 7 })), call('Read', {}));
});

test('claude: a subagent, system, user and result events, empty text and lines of no JSON object give nothing', () => {
  for (const line of [
    assistant([{ type: 'text', text: 'From a subagent.' }], { parent_tool_use_id: 'toolu_1' }),
    JSON.stringify({ type: 'system', subtype: 'init', session_id: 'abc' }),
    JSON.stringify({
      type: 'user',
      message: { content: [{ type: 'tool_result', tool_use_id: 'toolu_1', content: 'passed' }] },
      parent_tool_use_id: null,
    }),
    JSON.stringify({ type: 'result', subtype: 'success', result: 'Done.', session_id: 'abc' }),
    assistant([{ type: 'text', text: '' }]),
    assistant([{ type: 'text', text: '\n\n' }]),
    assistant([{ type: 'text', text: 5 }]),
    'not json',
    '[1]',
    '',
  ]) {
    assert.deepEqual(HEADLESS.claude.follow(line), [], line);
  }
});

test('claude: an event with no timestamp, or one that does not parse, gives no time', () => {
  for (const timestamp of [undefined, 'yesterday', 5]) {
    const [text] = HEADLESS.claude.follow(assistant([{ type: 'text', text: 'Hello.' }], { timestamp }));
    assert.equal(text.time, undefined, String(timestamp));
  }
});

const opencodeLine = (type, part, timestamp = 1792687180271) =>
  JSON.stringify({ type, timestamp, sessionID: 'ses_abc', part: { id: 'prt_1', messageID: 'msg_1', ...part } });
const opencodeCall = (tool, input) =>
  opencodeLine('tool_use', { type: 'tool', tool, state: { status: 'completed', input } });

test('opencode: a text event gives its text, and a tool_use event its call, at the event timestamp', () => {
  assert.deepEqual(HEADLESS.opencode.follow(opencodeLine('text', { type: 'text', text: 'Done.' })), [
    { kind: 'text', time: 1792687180271, text: 'Done.' },
  ]);
  const call = (tool, fields) => [{ kind: 'call', time: 1792687180271, tool, ...NO_CALL, ...fields }];
  assert.deepEqual(
    HEADLESS.opencode.follow(opencodeCall('bash', { command: 'npm test', description: 'Run the tests' })),
    call('bash', { description: 'Run the tests', command: 'npm test' }),
  );
  assert.deepEqual(
    HEADLESS.opencode.follow(opencodeCall('read', { filePath: '/work/a.mjs' })),
    call('read', { path: '/work/a.mjs' }),
  );
  assert.deepEqual(
    HEADLESS.opencode.follow(opencodeCall('grep', { pattern: 'follow', path: '/work' })),
    call('grep', { pattern: 'follow' }),
  );
  assert.deepEqual(HEADLESS.opencode.follow(opencodeCall('task', { description: 'Look around' })), call('task', {}));
});

test('opencode: reasoning, step events, a text event with no text and a line of no JSON object give nothing', () => {
  for (const line of [
    opencodeLine('reasoning', { type: 'reasoning', text: 'Thinking.' }),
    opencodeLine('step_start', { type: 'step-start' }),
    opencodeLine('step_finish', { type: 'step-finish', reason: 'stop' }),
    opencodeLine('text', { type: 'text' }),
    opencodeLine('text', { type: 'text', text: '\n' }),
    'not json',
    '',
  ]) {
    assert.deepEqual(HEADLESS.opencode.follow(line), [], line);
  }
});
