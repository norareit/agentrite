import { parseArgs } from 'node:util';
import { HARNESS_NAMES, ROLES, wrapWords } from './agentrite-roles.mjs';

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

/** The one line that says how `run` is run. */
export const RUN_FORM =
  'usage: agentrite run <role> <harness> [--model <id>] [--headless] [--skip-permissions] <unit> [text...]';

/**
 * @returns {string}
 */
export function runUsage() {
  return [
    RUN_FORM,
    '',
    `  <role>              ${ROLES.map((role) => role.name).join(' | ')}`,
    `  <harness>           ${HARNESS_NAMES.join(' | ')}`,
    '  <unit>              a directory of changes/, by its name or by the four digits its name opens with',
    '  [text...]           added to the prompt, after the unit',
    "  --model <id>        the harness's own id of a model, such as claude-sonnet-5-5 or openai/gpt-6.1-sol.",
    "                      Without it the harness decides: the role's wrapper may pin one",
    '  --headless          run without a session: the harness works on the prompt and ends',
    '  --skip-permissions  the harness asks no permission: --dangerously-skip-permissions for claude, which',
    '                      bypasses every check, and --auto for opencode, which approves what is not denied.',
    '                      Meant for the sandbox',
  ].join('\n');
}

const RUN_OPTIONS = /** @type {const} */ ({
  model: { type: 'string' },
  headless: { type: 'boolean' },
  'skip-permissions': { type: 'boolean' },
});

/**
 * What is wrong with an option as it was given, or `undefined` when `run` takes it.
 *
 * @param {{ name: string, rawName: string, value: string | undefined, inlineValue: boolean | undefined }} option
 * @returns {string | undefined}
 */
function optionError({ name, rawName, value, inlineValue }) {
  if (!Object.hasOwn(RUN_OPTIONS, name)) return `unknown option: ${rawName}`;
  if (RUN_OPTIONS[name].type === 'boolean') return value === undefined ? undefined : `${rawName} takes no value`;
  // An id written apart from the option never opens with a dash: what follows is then the next option, and the id
  // was left out.
  const missing = value === undefined || value === '' || (inlineValue === false && value.startsWith('-'));
  return missing ? `${rawName} takes an id, and none was given` : undefined;
}

/**
 * What is wrong with the role, the harness and the unit as they were given, or `undefined` when nothing is.
 *
 * @param {string | undefined} role
 * @param {string | undefined} harness
 * @param {string | undefined} unit
 * @returns {string | undefined}
 */
function positionError(role, harness, unit) {
  if (role === undefined) return 'no role given';
  if (!ROLES.some((known) => known.name === role)) return `unknown role: ${role}`;
  if (harness === undefined) return 'no harness given';
  if (!HARNESS_NAMES.includes(harness)) return `unknown harness: ${harness}`;
  if (unit === undefined) return 'no unit given';
  return undefined;
}

/**
 * The arguments of `run`. What it throws holds the usage of `run`: alone when there is no argument at all, and
 * otherwise after a line that names the first argument `run` does not take.
 *
 * @param {string[]} args
 * @returns {{
 *   role: string,
 *   harness: string,
 *   unit: string,
 *   text: string[],
 *   model: string | undefined,
 *   headless: boolean,
 *   skipPermissions: boolean,
 * }}
 */
export function parseRunArgs(args) {
  if (args.length === 0) throw new Error(runUsage());

  // Not strict, so that an option `run` does not take is named in the kit's words and not in node's.
  const { values, positionals, tokens } = parseArgs({
    args,
    options: RUN_OPTIONS,
    allowPositionals: true,
    strict: false,
    tokens: true,
  });
  const [role, harness, unit, ...text] = positionals;
  const error =
    tokens.flatMap((token) => (token.kind === 'option' ? [optionError(token)] : [])).find(Boolean) ??
    positionError(role, harness, unit);
  if (error !== undefined) throw new Error(`${error}\n${runUsage()}`);

  return {
    role,
    harness,
    unit,
    text,
    model: values.model,
    headless: values.headless === true,
    skipPermissions: values['skip-permissions'] === true,
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
 * @param {string[]} text
 * @returns {string}
 */
export function unitPrompt(directory, text) {
  const unit = `The unit is changes/${directory}/.`;
  return text.length === 0 ? unit : `${unit}\n\n${text.join(' ')}`;
}

/**
 * How each harness is started as an agent: its command, the flag that ends its questions about permissions, and
 * where the options and the prompt stand with a session and without one.
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
    interactive: (options, prompt) => [...options, prompt],
    headless: (options, prompt) => ['--print', ...options, prompt],
  },
  opencode: {
    command: 'opencode',
    skipPermissions: '--auto',
    interactive: (options, prompt) => [...options, '--prompt', prompt],
    headless: (options, prompt) => ['run', ...options, prompt],
  },
};

/**
 * The command that starts `harness` as `role` on `prompt`, and its arguments.
 *
 * @param {{
 *   harness: string,
 *   role: string,
 *   model: string | undefined,
 *   headless: boolean,
 *   skipPermissions: boolean,
 *   prompt: string,
 * }} run
 * @returns {{ command: string, args: string[] }}
 */
export function harnessCommand({ harness, role, model, headless, skipPermissions, prompt }) {
  const start = STARTS[harness];
  const options = [
    '--agent',
    role,
    ...(model === undefined ? [] : ['--model', model]),
    ...(skipPermissions ? [start.skipPermissions] : []),
  ];
  return { command: start.command, args: (headless ? start.headless : start.interactive)(options, prompt) };
}
