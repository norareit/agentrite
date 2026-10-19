import { parseArgs } from 'node:util';
import { HARNESS_NAMES, wrapWords } from './agentrite-roles.mjs';

// The longest line the commands print, which is the width the kit wraps its own text at.
const LINE_WIDTH = 120;

/**
 * What `agentrite roles` prints: each role's name on a line of its own, its description under it, indented and
 * wrapped, and an empty line between two roles.
 *
 * @param {{ name: string, description: string }[]} roles
 * @returns {string}
 */
export function rolesListing(roles) {
  const blocks = roles.map((role) => [role.name, ...wrapWords(role.description, LINE_WIDTH, '  ')].join('\n'));
  return `${blocks.join('\n\n')}\n`;
}

/**
 * What `agentrite roles --json` prints, for a script: an object, so that it can get a key beside `roles` later,
 * with each description on one line and the path of each role's file as the project gives it.
 *
 * @param {{ name: string, description: string, path: string }[]} roles
 * @returns {string}
 */
export function rolesJson(roles) {
  const document = { roles: roles.map(({ name, description, path }) => ({ name, description, path })) };
  return `${JSON.stringify(document, null, 2)}\n`;
}

/** How `run` is run, the second line starting under the first argument. */
export const RUN_FORM =
  'usage: agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] ' +
  '[--skip-permissions]\n' +
  '                     [-- <harness arguments...>]';

/**
 * @returns {string}
 */
export function runUsage() {
  return [
    RUN_FORM,
    '',
    '  <role>              a role that agentrite.json names, as agentrite roles lists them',
    `  <harness>           ${HARNESS_NAMES.join(' | ')}`,
    '  <unit>              a directory of changes/, by its name or by the four digits its name opens with',
    '  --prompt <text>     added to the prompt, after the unit, as it is written',
    "  --model <id>        the harness's own id of a model, such as claude-sonnet-5-5 or openai/gpt-6.1-sol.",
    "                      Without it the harness decides: the role's wrapper may pin one",
    '  --headless          run without a session: the harness works on the prompt and ends',
    '  --skip-permissions  the harness asks no permission: --dangerously-skip-permissions for claude, which',
    '                      bypasses every check, and --auto for opencode, which approves what is not denied.',
    '                      Meant for the sandbox',
    '  -- <harness arguments...>',
    '                      given to the harness as written, before the prompt. The command reads none of',
    '                      them',
  ].join('\n');
}

const RUN_OPTIONS = /** @type {const} */ ({
  prompt: { type: 'string' },
  model: { type: 'string' },
  headless: { type: 'boolean' },
  'skip-permissions': { type: 'boolean' },
});

/** What each option that takes a value takes, as the line that says none was given names it. */
const OPTION_VALUES = { prompt: 'a text', model: 'an id' };

/**
 * What is wrong with an option as it was given, or `undefined` when `run` takes it.
 *
 * @param {{ name: string, rawName: string, value: string | undefined, inlineValue: boolean | undefined }} option
 * @returns {string | undefined}
 */
function optionError({ name, rawName, value, inlineValue }) {
  if (!Object.hasOwn(RUN_OPTIONS, name)) return `unknown option: ${rawName}`;
  if (RUN_OPTIONS[name].type === 'boolean') return value === undefined ? undefined : `${rawName} takes no value`;
  // What stands apart after the option and opens with a dash is taken for the next option, and the value for left
  // out. A value that does open with a dash is written onto the option, as `--prompt=<text>`.
  const missing = value === undefined || value === '' || (inlineValue === false && value.startsWith('-'));
  return missing ? `${rawName} takes ${OPTION_VALUES[name]}, and none was given` : undefined;
}

/**
 * What is wrong with the role, the harness and the unit as they were given, or with a word after them, or
 * `undefined` when nothing is.
 *
 * @param {string[]} positionals
 * @returns {string | undefined}
 */
function positionError([role, harness, unit, beyond]) {
  if (role === undefined) return 'no role given';
  if (harness === undefined) return 'no harness given';
  if (!HARNESS_NAMES.includes(harness)) return `unknown harness: ${harness}`;
  if (unit === undefined) return 'no unit given';
  if (beyond !== undefined) return `unexpected argument: ${beyond}`;
  return undefined;
}

/**
 * The arguments of `run`. The first `--` ends the command's own: what follows it is the harness's, and is returned
 * as written, unread. What it throws holds the usage of `run`: alone when there is no argument at all, and
 * otherwise after a line that names the first argument `run` does not take.
 *
 * @param {string[]} args
 * @returns {{
 *   role: string,
 *   harness: string,
 *   unit: string,
 *   text: string | undefined,
 *   model: string | undefined,
 *   headless: boolean,
 *   skipPermissions: boolean,
 *   harnessArguments: string[],
 * }}
 */
export function parseRunArgs(args) {
  if (args.length === 0) throw new Error(runUsage());

  // Taken off before the rest is read, so that no word of the harness's is taken for an option or a position of
  // the command.
  const end = args.indexOf('--');
  const own = end === -1 ? args : args.slice(0, end);
  const harnessArguments = end === -1 ? [] : args.slice(end + 1);

  // Not strict, so that an option `run` does not take is named in the kit's words and not in node's.
  const { values, positionals, tokens } = parseArgs({
    args: own,
    options: RUN_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const error =
    tokens.flatMap((token) => (token.kind === 'option' ? [optionError(token)] : [])).find(Boolean) ??
    positionError(positionals);
  if (error !== undefined) throw new Error(`${error}\n${runUsage()}`);

  const [role, harness, unit] = positionals;
  return {
    role,
    harness,
    unit,
    text: values.prompt,
    model: values.model,
    headless: values.headless === true,
    skipPermissions: values['skip-permissions'] === true,
    harnessArguments,
  };
}

/**
 * The directory of `changes/` that `given` names: by its name, with or without `changes/` before it and a slash
 * after it, or by the four digits its name opens with.
 *
 * @param {string} given the unit as it was given to the command
 * @param {string[]} directories the names of the directories in `changes/`
 * @returns {string}
 */
export function resolveUnit(given, directories) {
  const name = given.replace(/^changes\//, '').replace(/\/$/, '');
  if (directories.includes(name)) return name;

  const opened = /^\d{4}$/.test(name) ? directories.filter((directory) => directory.startsWith(`${name}-`)) : [];
  if (opened.length === 1) return opened[0];
  if (opened.length === 0) throw new Error(`changes/ holds no directory for the unit ${given}`);
  throw new Error(
    `the digits ${name} open more than one directory of changes/, so give the unit by its name:\n` +
      opened.map((directory) => `- changes/${directory}`).join('\n'),
  );
}

/**
 * The one prompt a harness gets: the unit's directory and, when text is given, the text after an empty line.
 *
 * @param {string} directory the name of the unit's directory in `changes/`
 * @param {string | undefined} text
 * @returns {string}
 */
export function unitPrompt(directory, text) {
  const unit = `The unit is changes/${directory}/.`;
  return text === undefined ? unit : `${unit}\n\n${text}`;
}

/**
 * How each harness is started as an agent: its command, the flag that ends its questions about permissions, and
 * how the prompt follows the options with a session and without one. The prompt is last. Where it is an argument
 * of its own, a `--` stands before it, so that no option before it takes it for a value.
 *
 * @type {Record<string, {
 *   command: string,
 *   skipPermissions: string,
 *   interactive: (options: string[], prompt: string) => string[],
 *   headless: (options: string[], prompt: string) => string[],
 * }>}
 */
const STARTS = {
  claude: {
    command: 'claude',
    skipPermissions: '--dangerously-skip-permissions',
    interactive: (options, prompt) => [...options, '--', prompt],
    headless: (options, prompt) => ['--print', ...options, '--', prompt],
  },
  opencode: {
    command: 'opencode',
    skipPermissions: '--auto',
    interactive: (options, prompt) => [...options, '--prompt', prompt],
    headless: (options, prompt) => ['run', ...options, '--', prompt],
  },
};

/**
 * The command that starts `harness` as `role` on `prompt`, and its arguments. The caller's own arguments for the
 * harness stand after the command's and before the prompt.
 *
 * @param {{
 *   harness: string,
 *   role: string,
 *   model: string | undefined,
 *   headless: boolean,
 *   skipPermissions: boolean,
 *   prompt: string,
 *   harnessArguments: string[],
 * }} run
 * @returns {{ command: string, args: string[] }}
 */
export function harnessCommand({ harness, role, model, headless, skipPermissions, prompt, harnessArguments }) {
  const start = STARTS[harness];
  const options = [
    '--agent',
    role,
    ...(model === undefined ? [] : ['--model', model]),
    ...(skipPermissions ? [start.skipPermissions] : []),
    ...harnessArguments,
  ];
  return { command: start.command, args: (headless ? start.headless : start.interactive)(options, prompt) };
}
