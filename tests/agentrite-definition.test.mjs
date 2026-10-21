import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { parseDefinition } from '../scripts/agentrite-definition.mjs';
import { parseSettings } from '../scripts/agentrite-settings.mjs';

const TEMPLATE = parseSettings(
  readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8'),
);
const DEFAULT = readFileSync(new URL('../orchestrator.json', import.meta.url), 'utf-8');
const PATH = 'rules/orchestrator.json';
const CONTEXT = { path: PATH, roles: Object.keys(TEMPLATE.roles), harnesses: TEMPLATE.harnesses };

const ROLES_MUST = 'a role that roles in agentrite.json names: specifier, planner, implementer and reviewer';
const HARNESS_MUST = 'a harness that harnesses in agentrite.json names: claude and opencode';
const MODEL_MUST = "the harness's own id of a model, as a string that is not empty";
const OBJECT_MUST = 'It must hold a JSON object with one key, steps';
const STEP_KEYS = 'A step holds role, harness and model, and may hold prompt, stopWhen and timeoutMinutes';

function parse(definition, context = CONTEXT) {
  return parseDefinition(typeof definition === 'string' ? definition : JSON.stringify(definition), context);
}

function refuses(definition, message, context = CONTEXT) {
  assert.throws(() => parse(definition, context), { message: `${context.path}: ${message}` }, message);
}

const step = (overrides = {}) => ({ role: 'implementer', harness: 'claude', model: 'claude-sonnet-5-5', ...overrides });
const repeat = (overrides = {}) => ({ repeat: { times: 2, steps: [step()], ...overrides } });

// R4

test('the default definition is taken with the roles and harnesses of the default file, as typed', () => {
  assert.deepEqual(parse(DEFAULT), {
    steps: [
      { role: 'planner', harness: 'claude', model: 'claude-opus-5-5' },
      {
        repeat: {
          times: 3,
          until: 'no-blocking-findings',
          steps: [
            {
              role: 'implementer',
              harness: 'claude',
              model: 'claude-sonnet-5-5',
              prompt:
                "From round 2, this definition accepts review findings you agree with. Propose declining others.",
            },
            { role: 'reviewer', harness: 'opencode', model: 'openai/gpt-6.1-sol' },
          ],
        },
      },
    ],
  });
});

// R5 to R8

test('a step with prompt and stopWhen is taken, inside a repeat and outside one', () => {
  const full = step({ prompt: 'Look closely.', stopWhen: 'blocking-findings' });
  assert.deepEqual(parse({ steps: [full, repeat({ steps: [full] })] }), {
    steps: [full, { repeat: { times: 2, steps: [full] } }],
  });
});

test('a repeat without until is taken, and times of 1 and of 3.0', () => {
  assert.deepEqual(parse({ steps: [repeat({ times: 1 })] }), { steps: [{ repeat: { times: 1, steps: [step()] } }] });
  const text = `{"steps": [{"repeat": {"times": 3.0, "steps": [${JSON.stringify(step())}]}}]}`;
  assert.equal(parse(text).steps[0].repeat.times, 3);
});

test('a role of the project own and a harness the project names alone are taken', () => {
  const context = { path: PATH, roles: ['planner', 'security-reviewer'], harnesses: ['opencode'] };
  const own = { role: 'security-reviewer', harness: 'opencode', model: 'x' };
  assert.deepEqual(parse({ steps: [own] }, context), { steps: [own] });
});

// R9: the faults, each with its whole message.

test('a text that is not JSON is refused with the parser own error', () => {
  let parserMessage;
  try {
    JSON.parse('{ "steps": ');
  } catch (error) {
    parserMessage = error.message;
  }
  assert.throws(() => parse('{ "steps": '), { message: `${PATH} is not JSON: ${parserMessage}. ${OBJECT_MUST}` });
});

test('JSON that is no object is refused, with what it holds', () => {
  for (const value of [[], null, 5, '"steps"', true]) {
    const text = typeof value === 'string' ? value : JSON.stringify(value);
    assert.throws(() => parse(text), {
      message: `${PATH} holds ${JSON.stringify(JSON.parse(text))}, which is no JSON object. ${OBJECT_MUST}`,
    });
  }
});

test('steps that is missing, empty or not a list is refused', () => {
  const must = 'It must hold a list of one or more items, each a step or a repeat';
  refuses({}, `steps is missing. ${must}`);
  refuses({ steps: [] }, `steps is []. ${must}`);
  refuses({ steps: step() }, `steps is ${JSON.stringify(step())}. ${must}`);
  refuses({ steps: null }, `steps is null. ${must}`);
});

test('an item that is no object is refused', () => {
  for (const value of [5, 'planner', null, [step()]]) {
    const must = 'It must hold a step or a repeat, as an object';
    refuses({ steps: [step(), value] }, `steps[1] is ${JSON.stringify(value)}. ${must}`);
  }
});

test('a role and a harness that the settings do not name are refused, toString among the roles', () => {
  for (const role of ['architect', 'toString', '', 5]) {
    refuses({ steps: [step({ role })] }, `steps[0].role is ${JSON.stringify(role)}. It must hold ${ROLES_MUST}`);
  }
  refuses({ steps: [step({ role: undefined })] }, `steps[0].role is missing. It must hold ${ROLES_MUST}`);
  for (const harness of ['codex', 'toString', '', null]) {
    refuses(
      { steps: [step({ harness })] },
      `steps[0].harness is ${JSON.stringify(harness)}. It must hold ${HARNESS_MUST}`,
    );
  }
  const context = { path: PATH, roles: ['planner'], harnesses: ['opencode'] };
  refuses(
    { steps: [step({ role: 'planner' })] },
    'steps[0].harness is "claude". It must hold a harness that harnesses in agentrite.json names: opencode',
    context,
  );
  refuses(
    { steps: [step({ harness: 'opencode' })] },
    'steps[0].role is "implementer". It must hold a role that roles in agentrite.json names: planner',
    context,
  );
});

test('a model that is missing, empty or no string, and a prompt that is empty or no string, are refused', () => {
  for (const model of ['', 5, null]) {
    refuses(
      { steps: [repeat({ steps: [step({ model })] })] },
      `steps[0].repeat.steps[0].model is ${JSON.stringify(model)}. It must hold ${MODEL_MUST}`,
    );
  }
  refuses({ steps: [step({ model: undefined })] }, `steps[0].model is missing. It must hold ${MODEL_MUST}`);
  for (const prompt of ['', 5, null, ['a']]) {
    refuses(
      { steps: [step({ prompt })] },
      `steps[0].prompt is ${JSON.stringify(prompt)}. It must hold a string that is not empty`,
    );
  }
});

test('stopWhen and until of any other value are refused', () => {
  for (const stopWhen of ['blocking-finding', 'no-blocking-findings', true, null, '']) {
    refuses(
      { steps: [step({ stopWhen })] },
      `steps[0].stopWhen is ${JSON.stringify(stopWhen)}. It must hold "blocking-findings"`,
    );
  }
  for (const until of ['blocking-findings', 'no-findings', false, null]) {
    refuses(
      { steps: [repeat({ until })] },
      `steps[0].repeat.until is ${JSON.stringify(until)}. It must hold "no-blocking-findings"`,
    );
  }
});

// R1, R2 and R11 of unit 0069

test('a step with timeoutMinutes from 0.05 to 1440 is taken with the value, inside a repeat and outside one', () => {
  for (const timeoutMinutes of [0.05, 1, 30, 1440]) {
    const limited = step({ timeoutMinutes });
    assert.deepEqual(parse({ steps: [limited, repeat({ steps: [limited] })] }), {
      steps: [limited, { repeat: { times: 2, steps: [limited] } }],
    });
  }
  assert.ok(!Object.hasOwn(parse({ steps: [step()] }).steps[0], 'timeoutMinutes'));
});

test('timeoutMinutes that is no number greater than 0 and at most 1440 is refused, inside a repeat and outside', () => {
  const must = 'It must hold a number greater than 0 and at most 1440';
  for (const timeoutMinutes of [0, -1, 1440.5, 1441, '30', true, null, [], {}]) {
    const value = JSON.stringify(timeoutMinutes);
    refuses({ steps: [step({ timeoutMinutes })] }, `steps[0].timeoutMinutes is ${value}. ${must}`);
    refuses(
      { steps: [repeat({ steps: [step({ timeoutMinutes })] })] },
      `steps[0].repeat.steps[0].timeoutMinutes is ${value}. ${must}`,
    );
  }
});

test('times that is no whole number of one or more is refused', () => {
  const must = 'It must hold a whole number of one or more';
  for (const times of [0, -1, 1.5, '3', null]) {
    refuses({ steps: [repeat({ times })] }, `steps[0].repeat.times is ${JSON.stringify(times)}. ${must}`);
  }
  refuses({ steps: [{ repeat: { steps: [step()] } }] }, `steps[0].repeat.times is missing. ${must}`);
});

test('a repeat whose object or steps is not of the form is refused', () => {
  const objectMust = 'It must hold an object with times and steps, and optionally until';
  for (const value of [5, [], null, 'twice']) {
    refuses({ steps: [{ repeat: value }] }, `steps[0].repeat is ${JSON.stringify(value)}. ${objectMust}`);
  }
  const stepsMust = 'It must hold a list of one or more steps';
  refuses({ steps: [repeat({ steps: [] })] }, `steps[0].repeat.steps is []. ${stepsMust}`);
  refuses({ steps: [repeat({ steps: undefined })] }, `steps[0].repeat.steps is missing. ${stepsMust}`);
  refuses({ steps: [repeat({ steps: 'all' })] }, `steps[0].repeat.steps is "all". ${stepsMust}`);
  refuses({ steps: [repeat({ steps: [5] })] }, 'steps[0].repeat.steps[0] is 5. It must hold a step');
});

test('a repeat inside a repeat is refused, saying that a repeat holds no repeat', () => {
  const inner = repeat();
  refuses(
    { steps: [repeat({ steps: [step(), inner] })] },
    `steps[0].repeat.steps[1] is ${JSON.stringify(inner)}. It must hold a step. A repeat holds no repeat`,
  );
});

test('a key that a place does not take is refused, at the root, in a step, in a repeat and in its object', () => {
  refuses({ steps: [step()], name: 'x' }, 'name is no key of a definition. A definition holds one key, steps');
  refuses({ steps: [step({ modle: 'x' })] }, `steps[0].modle is no key of a step. ${STEP_KEYS}`);
  refuses(
    { steps: [repeat({ steps: [step({ until: 'no-blocking-findings' })] })] },
    `steps[0].repeat.steps[0].until is no key of a step. ${STEP_KEYS}`,
  );
  refuses(
    { steps: [{ ...repeat(), stopWhen: 'blocking-findings' }] },
    'steps[0].stopWhen is no key of a repeat. A repeat holds one key, repeat',
  );
  refuses(
    { steps: [repeat({ stopWhen: 'blocking-findings' })] },
    'steps[0].repeat.stopWhen is no key of the object of repeat. ' +
      'The object of repeat holds times and steps, and may hold until',
  );
});

// R9: the order in which faults are found.

test('of two faults, the first in the text is named', () => {
  refuses({ steps: [step({ model: '' }), step({ role: 'x' })] }, `steps[0].model is "". It must hold ${MODEL_MUST}`);
  refuses({ steps: [step({ role: 'x' }), step({ model: '' })] }, `steps[0].role is "x". It must hold ${ROLES_MUST}`);
  refuses({ name: 'x', steps: [] }, 'name is no key of a definition. A definition holds one key, steps');
});

test('in one object, a key it does not take is named before a value of the wrong form', () => {
  refuses({ steps: [{ model: '', role: 'x', extra: 1 }] }, `steps[0].extra is no key of a step. ${STEP_KEYS}`);
  refuses({ steps: [step({ model: '', role: 'x' })] }, `steps[0].role is "x". It must hold ${ROLES_MUST}`);
});
