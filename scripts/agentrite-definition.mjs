import { SETTINGS_FILE } from './agentrite-settings.mjs';
import { isObject, jsonFault, jsonKeyFault, jsonPath } from './agentrite-json.mjs';

/**
 * @typedef {{
 *   role: string,
 *   harness: string,
 *   model: string,
 *   prompt?: string,
 *   stopWhen?: 'blocking-findings',
 *   timeoutMinutes?: number,
 * }} Step
 * @typedef {{ times: number, until?: 'no-blocking-findings' | 'no-findings', steps: Step[] }} Repeat
 * @typedef {{ steps: (Step | { repeat: Repeat })[] }} Definition
 * @typedef {{ roles?: string[], harnesses?: string[] }} Names What `agentrite.json` names, which a step must name. A
 * definition read without them, as one a run kept, takes any role and harness that is a string that is not empty
 */

const OBJECT_MUST = 'It must hold a JSON object with one key, steps';

/** The values `until` of a repeat takes. */
const UNTIL_VALUES = ['no-blocking-findings', 'no-findings'];

/**
 * The keys each kind of object takes, in the order they are judged in, and the sentence that says so.
 *
 * @type {Record<'definition' | 'step' | 'item' | 'repeat', { name: string, keys: string[], holds: string }>}
 */
const PLACES = {
  definition: { name: 'a definition', keys: ['steps'], holds: 'A definition holds one key, steps' },
  step: {
    name: 'a step',
    keys: ['role', 'harness', 'model', 'prompt', 'stopWhen', 'timeoutMinutes'],
    holds: 'A step holds role, harness and model, and may hold prompt, stopWhen and timeoutMinutes',
  },
  item: { name: 'a repeat', keys: ['repeat'], holds: 'A repeat holds one key, repeat' },
  repeat: {
    name: 'the object of repeat',
    keys: ['times', 'steps', 'until'],
    holds: 'The object of repeat holds times and steps, and may hold until',
  },
};

/**
 * @param {unknown} value
 * @returns {value is string}
 */
function isFilledString(value) {
  return typeof value === 'string' && value !== '';
}

/**
 * True for a string that `names` holds.
 *
 * @param {unknown} value
 * @param {string[]} names
 * @returns {boolean}
 */
function isNamed(value, names) {
  return typeof value === 'string' && names.includes(value);
}

/**
 * @param {string[]} names
 * @returns {string}
 */
function inWords(names) {
  return names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
}

/**
 * Throws, naming where, for the first key of `object` that its kind of place does not take, in the order of the text.
 *
 * @param {Record<string, unknown>} object
 * @param {string} path
 * @param {(typeof PLACES)[keyof typeof PLACES]} place
 */
function checkKeys(object, path, place) {
  const fault = jsonKeyFault(object, path, place);
  if (fault !== undefined) throw new Error(fault);
}

/**
 * The value at `key` of `object`, or a throw of its fault when `holds` is false for it.
 *
 * @param {Record<string, unknown>} object
 * @param {string} path
 * @param {string} key
 * @param {(value: unknown) => boolean} holds
 * @param {string} must
 * @returns {unknown}
 */
function valueAt(object, path, key, holds, must) {
  const value = Object.hasOwn(object, key) ? object[key] : undefined;
  if (!holds(value)) throw new Error(jsonFault(jsonPath(path, key), value, must));
  return value;
}

/**
 * The step `value` at `path` holds, with only the keys it was given.
 *
 * @param {Record<string, unknown>} value
 * @param {string} path
 * @param {Names} names
 * @returns {Step}
 */
function parseStep(value, path, { roles, harnesses }) {
  checkKeys(value, path, PLACES.step);
  const named = (/** @type {string[] | undefined} */ names, /** @type {string} */ key, /** @type {string} */ list) =>
    names === undefined
      ? { holds: isFilledString, must: 'a string that is not empty' }
      : {
          holds: (/** @type {unknown} */ given) => isNamed(given, names),
          must: `a ${key} that ${list} in ${SETTINGS_FILE} names: ${inWords(names)}`,
        };
  const [roleCheck, harnessCheck] = [named(roles, 'role', 'roles'), named(harnesses, 'harness', 'harnesses')];
  const modelMust = "the harness's own id of a model, as a string that is not empty";
  /** @type {Step} */ const step = {
    role: /** @type {string} */ (valueAt(value, path, 'role', roleCheck.holds, roleCheck.must)),
    harness: /** @type {string} */ (valueAt(value, path, 'harness', harnessCheck.holds, harnessCheck.must)),
    model: /** @type {string} */ (valueAt(value, path, 'model', isFilledString, modelMust)),
  };
  if (Object.hasOwn(value, 'prompt')) {
    step.prompt = /** @type {string} */ (valueAt(value, path, 'prompt', isFilledString, 'a string that is not empty'));
  }
  if (Object.hasOwn(value, 'stopWhen')) {
    valueAt(value, path, 'stopWhen', (stop) => stop === 'blocking-findings', '"blocking-findings"');
    step.stopWhen = 'blocking-findings';
  }
  if (Object.hasOwn(value, 'timeoutMinutes')) {
    // At most a day, far below the longest delay a timer of Node.js takes, past which it fires at once.
    const isLimit = (/** @type {unknown} */ minutes) => typeof minutes === 'number' && minutes > 0 && minutes <= 1440;
    const must = 'a number greater than 0 and at most 1440';
    step.timeoutMinutes = /** @type {number} */ (valueAt(value, path, 'timeoutMinutes', isLimit, must));
  }
  return step;
}

/**
 * The repeat that the object of `repeat` at `path` holds.
 *
 * @param {Record<string, unknown>} item
 * @param {string} itemPath
 * @param {Names} names
 * @returns {Repeat}
 */
function parseRepeat(item, itemPath, names) {
  const object = valueAt(item, itemPath, 'repeat', isObject, 'an object with times and steps, and optionally until');
  const value = /** @type {Record<string, unknown>} */ (object);
  const path = jsonPath(itemPath, 'repeat');
  checkKeys(value, path, PLACES.repeat);
  const isCount = (/** @type {unknown} */ count) => Number.isInteger(count) && Number(count) >= 1;
  const times = /** @type {number} */ (valueAt(value, path, 'times', isCount, 'a whole number of one or more'));
  const list = /** @type {unknown[]} */ (
    valueAt(value, path, 'steps', (steps) => Array.isArray(steps) && steps.length > 0, 'a list of one or more steps')
  );
  const steps = list.map((entry, index) => {
    const entryPath = jsonPath(jsonPath(path, 'steps'), index);
    if (!isObject(entry)) throw new Error(jsonFault(entryPath, entry, 'a step'));
    if (Object.hasOwn(entry, 'repeat')) {
      throw new Error(jsonFault(entryPath, entry, 'a step. A repeat holds no repeat'));
    }
    return parseStep(entry, entryPath, names);
  });
  /** @type {Repeat} */ const repeat = { times, steps };
  if (Object.hasOwn(value, 'until')) {
    const must = '"no-blocking-findings" or "no-findings"';
    repeat.until = /** @type {Repeat['until']} */ (
      valueAt(value, path, 'until', (until) => isNamed(until, UNTIL_VALUES), must)
    );
  }
  return repeat;
}

/**
 * The definition of an orchestrator that `text` holds, judged against the roles and harnesses that `agentrite.json`
 * names. Throws, opening with `path` and naming where in the definition the first fault is, what is wrong and what
 * must be there. The faults are judged in the order of the text, and in one object the keys it does not take first.
 *
 * @param {string} text
 * @param {{ path: string } & Names} context
 * @returns {Definition}
 */
export function parseDefinition(text, { path, ...names }) {
  /** @type {unknown} */ let parsed;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(`${path} is not JSON: ${error instanceof Error ? error.message : String(error)}. ${OBJECT_MUST}`);
  }
  if (!isObject(parsed)) {
    throw new Error(`${path} holds ${JSON.stringify(parsed)}, which is no JSON object. ${OBJECT_MUST}`);
  }
  try {
    return parseItems(parsed, names);
  } catch (error) {
    throw new Error(`${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * @param {Record<string, unknown>} definition
 * @param {Names} names
 * @returns {Definition}
 */
function parseItems(definition, names) {
  checkKeys(definition, '', PLACES.definition);
  const list = /** @type {unknown[]} */ (
    valueAt(
      definition,
      '',
      'steps',
      (steps) => Array.isArray(steps) && steps.length > 0,
      'a list of one or more items, each a step or a repeat',
    )
  );
  const steps = list.map((item, index) => {
    const path = jsonPath('steps', index);
    if (!isObject(item)) throw new Error(jsonFault(path, item, 'a step or a repeat, as an object'));
    if (!Object.hasOwn(item, 'repeat')) return parseStep(item, path, names);
    checkKeys(item, path, PLACES.item);
    return { repeat: parseRepeat(item, path, names) };
  });
  return { steps };
}
