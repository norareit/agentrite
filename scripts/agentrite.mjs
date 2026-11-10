#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import {
  chmodSync,
  closeSync,
  constants,
  ftruncateSync,
  lstatSync,
  mkdirSync,
  openSync,
  readdirSync,
  readFileSync,
  realpathSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
  writeSync,
} from 'node:fs';
import { basename, dirname, join, posix, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  agentsListNotice,
  agentsNamesList,
  INSTRUCTIONS_LIST,
  instructionsList,
  readProjectFile,
} from './agentrite-instructions.mjs';
import {
  APPROVE_FORM,
  approvalMessage,
  approvedLine,
  approvedRecord,
  parseApproveArgs,
} from './agentrite-approve.mjs';
import {
  CANCEL_FORM,
  cancelledLine,
  cancelledRecord,
  cancellationEntry,
  cancellationMessage,
  cancellationRefusal,
  parseCancelArgs,
  wrappedEntry,
} from './agentrite-cancel.mjs';
import { recordFields, uncommittedFiles, uncommittedRefusal } from './agentrite-record.mjs';
import { parseDefinition } from './agentrite-definition.mjs';
import { HARNESS_NAMES, HARNESSES, harnessNamed, plannedFiles, wrapperDirectories } from './agentrite-harness.mjs';
import { foreignHookNotice, isKitHook, noRepositoryNotice, printedHookPath } from './agentrite-hook.mjs';
import { formattedLike } from './agentrite-json.mjs';
import {
  endLine,
  endReport,
  exitStatus,
  followedLine,
  framedOutput,
  openingLine,
  plainOutput,
  timedItems,
  orchestrate,
  ORCHESTRATE_FORM,
  parseOrchestrateArgs,
  resumePosition,
  runName,
  stepFileName,
  stepLine,
  variantOf,
} from './agentrite-orchestrate.mjs';
import { askAgainRequest, outcomeRequest, resumeWords } from './agentrite-outcome.mjs';
import {
  detailOf,
  isAskAgain,
  isRunDirectory,
  parseRun,
  parseRunsArgs,
  runFrom,
  runsJson,
  runsListing,
  RUNS_FORM,
  runStateOf,
  selectRuns,
  variantOfRun,
} from './agentrite-runs.mjs';
import { readRoles } from './agentrite-roles.mjs';
import {
  harnessCommand,
  parseRunArgs,
  resolveUnit,
  rolesJson,
  rolesListing,
  RUN_FORM,
  unitPrompt,
} from './agentrite-run.mjs';
import {
  checkSettingsFiles,
  isRegularFile,
  parseSettings,
  readSettings,
  SETTINGS_FILE,
  settingsText,
} from './agentrite-settings.mjs';
import {
  isUnitDirectory,
  parseUnitsArgs,
  selectUnits,
  unitFrom,
  unitsJson,
  unitsListing,
  UNITS_FORM,
} from './agentrite-units.mjs';
import { statusFrom } from './check-changes.mjs';

const CHECK_CHANGES = 'node node_modules/agentrite/scripts/check-changes.mjs';
// The kit's container/ directory as a project installs it, from which the image build copies its files.
const KIT_CONTAINER = 'node_modules/agentrite/container';
// Names the files, not only the directory: BuildKit would not let a directory's exception reach a file that a
// pattern excluded by name.
const KIT_CONTAINER_EXCEPTION = `!${KIT_CONTAINER}/**`;
const COMPOSE_FILE = 'sandbox/compose.project.yml';

const DOCKERIGNORE =
  "# Keeps node_modules out of the image build context, except AgentRite's container/\n" +
  '# directory, from which the image build copies the entrypoint and the egress proxy.\n' +
  `node_modules\n${KIT_CONTAINER_EXCEPTION}\n`;

/** The headings of the sections of `AGENTS.md` that make the kit's instructions reach an agent. */
export const AGENTS_SECTIONS = ['# Development Guidelines', '## Roles', '## Changes in this project'];

export const CONFIG_NOTICE =
  "These are the kit's defaults, and nothing of the project was looked at to find them. Check each against the\n" +
  `project, edit ${SETTINGS_FILE} by hand where one is wrong, and commit the file.\n`;

/**
 * What to tell a project whose `agentrite.json` got the default branch that is written when none is named.
 *
 * @param {string} branch
 * @returns {string}
 */
export function defaultBranchNotice(branch) {
  return (
    `${branch} was written as the default branch, because none was named. A project whose default branch is\n` +
    `another changes defaultBranch in ${SETTINGS_FILE}.\n`
  );
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * The usage of every command, one to a line, the lines after the first indented to start under the command's name.
 *
 * @returns {string}
 */
function usage() {
  const lines = Object.values(COMMANDS).map((command) => command.form);
  return lines.join('\n').replaceAll('\nusage: ', '\n       ');
}

const SANDBOX_ONLY = '--sandbox-only';
const NO_SANDBOX = '--no-sandbox';
const NO_ORCHESTRATOR = '--no-orchestrator';
const DEFAULT_BRANCH = '--default-branch';

// Its two forms: the one a project with no settings file is set up with, and the one that reads the file. The
// harnesses stand on a line of their own, under the first option, so that no line is over 120 characters.
const INIT_FORM =
  `usage: agentrite init [${SANDBOX_ONLY}] [${NO_SANDBOX}] [${NO_ORCHESTRATOR}] [${DEFAULT_BRANCH} <name>]\n` +
  `                      ${HARNESS_NAMES.join(' | ')}\n` +
  '       agentrite init';

/**
 * What `init` is given: the harnesses, each once, in the order they were given, whether the project uses the sandbox
 * alone, whether the sandbox and the orchestrator are wanted, the default branch when one was named, and whether any
 * argument was given at all. The options stand at any place among the harnesses and are told apart from one by an
 * exact match, so `--no-sandbox=1` is an unknown harness. The word after `--default-branch` is the name whatever it
 * is, and the last name given counts. A sandbox-only project has the sandbox, so `--sandbox-only` with
 * `--no-sandbox` is refused.
 *
 * @param {string[]} args
 * @returns {{
 *   harnesses: string[],
 *   sandboxOnly: boolean,
 *   sandbox: boolean,
 *   orchestrator: boolean,
 *   defaultBranch: string | undefined,
 *   given: boolean,
 * }}
 */
function parseInit(args) {
  /** @type {string[]} */ const harnesses = [];
  let sandboxOnly = false;
  let sandbox = true;
  let orchestrator = true;
  /** @type {string | undefined} */ let defaultBranch;

  for (let index = 0; index < args.length; index += 1) {
    const word = args[index];
    if (word === SANDBOX_ONLY) {
      sandboxOnly = true;
    } else if (word === NO_SANDBOX) {
      sandbox = false;
    } else if (word === NO_ORCHESTRATOR) {
      orchestrator = false;
    } else if (word === DEFAULT_BRANCH) {
      index += 1;
      defaultBranch = args[index];
      if (defaultBranch === undefined || defaultBranch === '') {
        throw new Error(`${DEFAULT_BRANCH} needs the name of a branch\n${INIT_FORM}`);
      }
    } else {
      harnesses.push(word);
    }
  }

  const unknown = harnesses.filter((name) => !HARNESS_NAMES.includes(name));
  if (unknown.length > 0) {
    throw new Error(`${unknown.map((name) => `unknown harness: ${name}`).join(', ')}\n${INIT_FORM}`);
  }
  if (sandboxOnly && !sandbox) {
    throw new Error(
      `${SANDBOX_ONLY} cannot be given together with ${NO_SANDBOX}: a sandbox-only project has the sandbox\n` +
        INIT_FORM,
    );
  }

  return {
    harnesses: [...new Set(harnesses)],
    sandboxOnly,
    sandbox,
    orchestrator,
    defaultBranch,
    given: args.length > 0,
  };
}

/**
 * The parser of a command that takes no argument, which throws `refusal` for any.
 *
 * @param {string} refusal
 * @returns {(args: string[]) => {}}
 */
function noArgument(refusal) {
  return (args) => {
    if (args.length > 0) throw new Error(refusal);
    return {};
  };
}

const CONFIG_FORM = 'usage: agentrite config';
const REFRESH_FORM = 'usage: agentrite refresh';

const ROLES_FORM = 'usage: agentrite roles [--json]';

/**
 * `roles` takes no argument but `--json`, once.
 *
 * @param {string[]} args
 * @returns {{ json: boolean }}
 */
function parseRoles(args) {
  const json = args.length === 1 && args[0] === '--json';
  if (args.length > 0 && !json) throw new Error(ROLES_FORM);
  return { json };
}

/**
 * The command, and what that command's own parser reads from the arguments after its name.
 *
 * @param {string[]} args
 * @returns {{ command: string } & Record<string, unknown>}
 */
export function parseArgs(args) {
  const [command, ...rest] = args;
  if (command === undefined) throw new Error(usage());
  if (!Object.hasOwn(COMMANDS, command)) throw new Error(`unknown command: ${command}\n${usage()}`);
  return { command, ...COMMANDS[command].parse(rest) };
}

/**
 * @param {Record<string, string>} values
 * @param {string} name
 * @returns {string}
 */
function valueOf(values, name) {
  if (!Object.hasOwn(values, name)) throw new Error(`no value for the template placeholder {{${name}}}`);
  return values[name];
}

/**
 * Replaces each `{{name}}` in `template` with its value. A placeholder alone on its line stands for lines: each
 * line of the value takes the placeholder's indentation, and an empty value removes the line.
 *
 * @param {string} template
 * @param {Record<string, string>} values
 * @returns {string}
 */
export function fillTemplate(template, values) {
  return template
    .split('\n')
    .flatMap((line) => {
      const alone = line.match(/^(\s*)\{\{(\w+)\}\}$/);
      if (alone === null) return [line.replace(/\{\{(\w+)\}\}/g, (_placeholder, name) => valueOf(values, name))];
      const value = valueOf(values, alone[2]);
      return value === '' ? [] : value.split('\n').map((valueLine) => alone[1] + valueLine);
    })
    .join('\n');
}

/**
 * The Compose project name and image name for a package, reduced to the characters a Compose project name accepts.
 *
 * @param {string} packageName
 * @returns {string}
 */
export function sandboxName(packageName) {
  const reduced = packageName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return `${reduced}-sandbox`;
}

/**
 * The version of `playwright` a lockfile resolves, directly or as a dependency of another package such as
 * `@playwright/test`.
 *
 * @param {{ packages?: Record<string, { version?: string }> } | undefined} lockfile
 * @returns {string | undefined}
 */
export function playwrightVersion(lockfile) {
  const packages = lockfile?.packages ?? {};
  const paths = Object.keys(packages);
  const path =
    paths.find((candidate) => candidate === 'node_modules/playwright') ??
    paths.find((candidate) => candidate.endsWith('/node_modules/playwright'));
  return path === undefined ? undefined : packages[path].version;
}

/**
 * @param {string[]} harnesses
 * @returns {string}
 */
function roleWrapperDirectories(harnesses) {
  return wrapperDirectories(harnesses)
    .map((directory) => `* \`${directory}/\``)
    .join('\n');
}

/**
 * The list of the instruction files in use, written from the standards and the role files the settings give.
 *
 * @param {string} standards
 * @param {import('./agentrite-roles.mjs').Role[]} roles
 * @returns {{ path: string, content: string }}
 */
function listFile(standards, roles) {
  const files = Object.fromEntries(roles.map((role) => [role.name, role.path]));
  return { path: INSTRUCTIONS_LIST, content: instructionsList({ standards, roles: files }) };
}

// What the shim passes the kit's wrapper before the project root, with the comment that says what it is for: nothing
// in a project with the process, which keeps the shim every release before the mode wrote, and the mode in a
// sandbox-only project.
const SHIM_MODES = {
  process: { mode: '', mode_comment: '' },
  sandboxOnly: {
    mode: '--sandbox-only ',
    mode_comment:
      '# Before it comes --sandbox-only, which tells the wrapper that this project uses the\n' +
      '# sandbox without the change process.',
  },
};

/**
 * The shim that runs the kit's sandbox from the project root, in the mode of a sandbox-only project when
 * `sandboxOnly` is true.
 *
 * @param {Record<string, string>} templates
 * @param {boolean} sandboxOnly
 * @returns {{ path: string, content: string, executable: boolean }}
 */
function shimFile(templates, sandboxOnly) {
  const mode = sandboxOnly ? SHIM_MODES.sandboxOnly : SHIM_MODES.process;
  return { path: 'sandbox.sh', content: fillTemplate(templates['sandbox.sh'], mode), executable: true };
}

/**
 * The generated files of a project with the process that hold nothing but what the kit put there, which refresh
 * keeps as the release writes them: the role wrappers, in which a project may have pinned a model, the list of the
 * instruction files in use, and the shim of a project with the process when the project has the sandbox.
 *
 * @param {{
 *   templates: Record<string, string>,
 *   harnesses: string[],
 *   sandbox: boolean,
 *   standards: string,
 *   roles: import('./agentrite-roles.mjs').Role[],
 * }} project
 * @returns {{
 *   path: string,
 *   content: string,
 *   executable?: boolean,
 *   refreshed?: (existing: string, rendered: string) => string,
 * }[]}
 */
function kitOwnedFiles({ templates, harnesses, sandbox, standards, roles }) {
  const files = [...plannedFiles(harnesses, roles), listFile(standards, roles)];
  return sandbox ? [...files, shimFile(templates, false)] : files;
}

/**
 * The `build:` block of the compose file that gives the image the browser at `version`.
 *
 * @param {string} version
 * @returns {string}
 */
function playwrightBuildBlock(version) {
  return [
    'build:',
    '  args:',
    '    # Must match the playwright version resolved in package-lock.json, so that',
    '    # screenshots taken in the sandbox compare with the committed ones.',
    `    PLAYWRIGHT_VERSION: ${version}`,
  ].join('\n');
}

/**
 * The process of a project as the settings give it: its harnesses, its standards and its roles, as `readRoles`
 * gives them.
 *
 * @typedef {{
 *   templates: Record<string, string>,
 *   harnesses: string[],
 *   standards: string,
 *   roles: import('./agentrite-roles.mjs').Role[],
 * }} ProcessProject
 */

/**
 * The files init creates that carry the process: the role wrappers, the list of the instruction files in use,
 * `AGENTS.md` and `CLAUDE.md`.
 *
 * @param {ProcessProject} project
 * @returns {{ path: string, content: string }[]}
 */
export function processFiles({ templates, harnesses, standards, roles }) {
  return [
    ...plannedFiles(harnesses, roles),
    listFile(standards, roles),
    {
      path: 'AGENTS.md',
      content: fillTemplate(templates['AGENTS.md'], { role_wrapper_directories: roleWrapperDirectories(harnesses) }),
    },
    { path: 'CLAUDE.md', content: fillTemplate(templates['CLAUDE.md'], { standards }) },
  ];
}

/**
 * The files init creates that carry the sandbox, apart from `.dockerignore`: the shim, in the mode of a sandbox-only
 * project when `sandboxOnly` is true, and the compose file, which names the Playwright version only when the project
 * has one.
 *
 * @param {{
 *   templates: Record<string, string>,
 *   packageName: string,
 *   playwrightVersion: string | undefined,
 *   sandboxOnly: boolean,
 * }} project
 * @returns {{ path: string, content: string, executable?: boolean }[]}
 */
function sandboxFiles({ templates, packageName, playwrightVersion, sandboxOnly }) {
  const compose = fillTemplate(templates[COMPOSE_FILE], {
    sandbox_name: sandboxName(packageName),
    playwright_build: playwrightVersion === undefined ? '' : playwrightBuildBlock(playwrightVersion),
  });
  return [shimFile(templates, sandboxOnly), { path: COMPOSE_FILE, content: compose }];
}

/**
 * The files init creates in a project with the process and the sandbox, filled from the templates.
 *
 * @param {ProcessProject & { packageName: string, playwrightVersion: string | undefined }} project
 * @returns {{ path: string, content: string, executable?: boolean }[]}
 */
export function projectFiles({ packageName, playwrightVersion, ...process }) {
  const sandbox = { templates: process.templates, packageName, playwrightVersion, sandboxOnly: false };
  return [...processFiles(process), ...sandboxFiles(sandbox)];
}

/**
 * The section of `markdown` under `heading`, up to the next heading of level one or two.
 *
 * @param {string} markdown
 * @param {string} heading
 * @returns {string}
 */
function sectionOf(markdown, heading) {
  const lines = markdown.split('\n');
  const start = lines.indexOf(heading);
  if (start === -1) throw new Error(`the AGENTS.md template has no ${heading} section`);
  const next = lines.findIndex((line, index) => index > start && /^#{1,2} /.test(line));
  return lines
    .slice(start, next === -1 ? undefined : next)
    .join('\n')
    .trimEnd();
}

/**
 * What to tell a project whose `AGENTS.md` exists, given the `AGENTS.md` init would have written.
 *
 * @param {string} agents
 * @returns {string}
 */
export function agentsNotice(agents) {
  const names = AGENTS_SECTIONS.map((heading) => heading.replace(/^#+ /, ''));
  const sections = AGENTS_SECTIONS.map((heading) => sectionOf(agents, heading));
  return (
    'AGENTS.md exists and was left as it is. For the kit\'s instructions to reach an agent, it must hold the\n' +
    `sections ${names.slice(0, -1).join(', ')} and ${names.at(-1)}, as below. Paste in any it lacks:\n\n` +
    `${sections.join('\n\n')}\n`
  );
}

/**
 * `package.json` with the `check-changes` script added, keeping every other key, their order and the indentation,
 * or `undefined` when it has that script already.
 *
 * @param {string} packageJson
 * @returns {string | undefined}
 */
export function withCheckChangesScript(packageJson) {
  const manifest = JSON.parse(packageJson);
  if (manifest.scripts?.['check-changes'] !== undefined) return undefined;
  const amended = { ...manifest, scripts: { ...manifest.scripts, 'check-changes': CHECK_CHANGES } };
  return formattedLike(packageJson, amended);
}

/**
 * The patterns of a `.dockerignore`, in order, each cleaned as a path the way Docker cleans it, and marked when it
 * starts with `!` and so lets back in what it matches.
 *
 * @param {string} ignore
 * @returns {{ pattern: string, negated: boolean }[]}
 */
function dockerignorePatterns(ignore) {
  return ignore
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '' && !line.startsWith('#'))
    .map((line) => {
      const negated = line.startsWith('!');
      const pattern = posix.normalize(negated ? line.slice(1).trim() : line).replace(/^\/+|\/+$/g, '');
      return { pattern, negated };
    });
}

/**
 * A cleaned `.dockerignore` pattern as a regular expression, following Docker's rules: `*` and `?` stay within one
 * path segment, and `**` spans any number of segments, including none.
 *
 * @param {string} cleaned
 * @returns {RegExp}
 */
function dockerignoreRegex(cleaned) {
  let source = '';
  for (let index = 0; index < cleaned.length; index += 1) {
    const character = cleaned[index];
    if (cleaned.startsWith('**/', index)) {
      source += '(.*/)?';
      index += 2;
    } else if (cleaned.startsWith('**', index)) {
      source += '.*';
      index += 1;
    } else if (character === '*') {
      source += '[^/]*';
    } else if (character === '?') {
      source += '[^/]';
    } else if (character === '\\' && index + 1 < cleaned.length) {
      index += 1;
      source += cleaned[index].replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
    } else {
      source += /[.+^${}()|/]/.test(character) ? `\\${character}` : character;
    }
  }
  return new RegExp(`^${source}$`);
}

/**
 * Whether `path` is excluded, and which patterns matched it, given which matched its parent directory. As in
 * BuildKit, a pattern matches a path it matches itself or whose parent it matched, the last match decides, and a
 * pattern is tried only when it could change the outcome so far: an exclusion while the path is still included, an
 * exception once it is excluded. So an exception reaches into a directory only when the directory was excluded.
 *
 * @param {{ regex: RegExp, negated: boolean }[]} patterns
 * @param {string} path
 * @param {boolean[]} parentMatched
 * @returns {{ excluded: boolean, matched: boolean[] }}
 */
function dockerignoreMatch(patterns, path, parentMatched) {
  let excluded = false;
  const matched = patterns.map(() => false);
  patterns.forEach(({ regex, negated }, index) => {
    if (negated !== excluded) return;
    matched[index] = regex.test(path) || parentMatched[index];
    if (matched[index]) excluded = !negated;
  });
  return { excluded, matched };
}

/**
 * True when the `.dockerignore` text keeps `path` out of the build context, deciding each directory on the way down
 * to it in turn, as BuildKit walks the context.
 *
 * @param {string} ignore
 * @param {string} path
 * @returns {boolean}
 */
function dockerignoreExcludes(ignore, path) {
  const patterns = dockerignorePatterns(ignore).map(({ pattern, negated }) => ({
    regex: dockerignoreRegex(pattern),
    negated,
  }));
  const segments = path.split('/');
  let result = { excluded: false, matched: patterns.map(() => false) };
  for (let depth = 1; depth <= segments.length; depth += 1) {
    result = dockerignoreMatch(patterns, segments.slice(0, depth).join('/'), result.matched);
  }
  return result.excluded;
}

/**
 * The `.dockerignore` to write: a new one when there is none, the existing one with the kit's exception appended
 * when, by Docker's rules, it keeps any of the kit's `container/` files out of the build context, and otherwise
 * `undefined`, for no change. Every container file is checked, not one, because an exception may let a single file
 * back in.
 *
 * @param {string | undefined} existing
 * @param {string[]} containerFiles the names of the files in the kit's `container/` directory
 * @returns {string | undefined}
 */
export function dockerignore(existing, containerFiles) {
  if (existing === undefined) return DOCKERIGNORE;
  const keepsKitOut = containerFiles.some((name) => dockerignoreExcludes(existing, `${KIT_CONTAINER}/${name}`));
  if (!keepsKitOut) return undefined;
  const separator = existing === '' || existing.endsWith('\n') ? '' : '\n';
  return `${existing}${separator}${KIT_CONTAINER_EXCEPTION}\n`;
}

/**
 * @param {string} path
 * @returns {boolean}
 */
function exists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * @param {string} path
 * @returns {string | undefined}
 */
function readIfPresent(path) {
  return exists(path) ? readFileSync(path, 'utf-8') : undefined;
}

/**
 * The project's `package.json`, which is refused when it cannot be read.
 *
 * @param {string} root
 * @returns {{ path: string, text: string, name: unknown }}
 */
function readPackageJson(root) {
  const path = resolve(root, 'package.json');
  /** @type {unknown} */ let manifest;
  let text;
  try {
    text = readFileSync(path, 'utf-8');
    manifest = JSON.parse(text);
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
  const name = typeof manifest === 'object' && manifest !== null && 'name' in manifest ? manifest.name : undefined;
  return { path, text, name };
}

/**
 * The name of the package, which the sandbox's Compose project and image names are derived from.
 *
 * @param {{ path: string, name: unknown }} manifest
 * @returns {string}
 */
function packageNameOf({ path, name }) {
  if (typeof name !== 'string' || name === '') {
    throw new Error(`${path} has no name, from which the sandbox's Compose project and image names are derived`);
  }
  return name;
}

/**
 * @param {string} root
 * @returns {{ packages?: Record<string, { version?: string }> } | undefined}
 */
function readLockfile(root) {
  const path = resolve(root, 'package-lock.json');
  const text = readIfPresent(path);
  if (text === undefined) return undefined;
  try {
    return JSON.parse(text);
  } catch (error) {
    throw new Error(`cannot read ${path}: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * The default `agentrite.json`, which `config` writes as it is.
 *
 * @returns {string}
 */
function readSettingsTemplate() {
  return readFileSync(new URL(`../templates/project/${SETTINGS_FILE}`, import.meta.url), 'utf-8');
}

/**
 * @returns {Record<string, string>}
 */
function readTemplates() {
  const paths = ['AGENTS.md', 'CLAUDE.md', 'sandbox.sh', COMPOSE_FILE];
  return Object.fromEntries(
    paths.map((path) => [path, readFileSync(new URL(`../templates/project/${path}`, import.meta.url), 'utf-8')]),
  );
}

/**
 * The files init creates in the project at `root`: those of the process when it has the process, and with the
 * sandbox those of the sandbox. A sandbox-only project, which `process` is undefined for, has the sandbox.
 *
 * @param {string} root
 * @param {{ path: string, text: string, name: unknown }} manifest
 * @param {Omit<ProcessProject, 'templates'> | undefined} process
 * @param {boolean} sandbox
 * @returns {{ path: string, content: string, executable?: boolean }[]}
 */
function plannedProjectFiles(root, manifest, process, sandbox) {
  const templates = readTemplates();
  if (process === undefined) return sandboxFiles({ templates, ...sandboxProject(root, manifest), sandboxOnly: true });
  if (!sandbox) return processFiles({ templates, ...process });
  return projectFiles({ templates, ...process, ...sandboxProject(root, manifest) });
}

/**
 * What the sandbox's files are filled from that the project at `root` gives: its package's name and the Playwright
 * version of its lockfile.
 *
 * @param {string} root
 * @param {{ path: string, text: string, name: unknown }} manifest
 * @returns {{ packageName: string, playwrightVersion: string | undefined }}
 */
function sandboxProject(root, manifest) {
  return { packageName: packageNameOf(manifest), playwrightVersion: playwrightVersion(readLockfile(root)) };
}

/**
 * What becomes of the project's `.dockerignore`, which the sandbox's image build needs: the content to write, or
 * `undefined` for one that is left as it is. Reading it is what init can refuse on.
 *
 * @param {string} root
 * @returns {{ path: string, isNew: boolean, content: string | undefined }}
 */
function plannedDockerignore(root) {
  const path = resolve(root, '.dockerignore');
  const existing = readIfPresent(path);
  const content = dockerignore(existing, readdirSync(new URL('../container/', import.meta.url)));
  return { path, isNew: existing === undefined, content };
}

/**
 * Writes the planned `.dockerignore`, or leaves the project's, and prints what it did.
 *
 * @param {ReturnType<typeof plannedDockerignore>} planned
 */
function writeDockerignore({ path, isNew, content }) {
  if (content === undefined) {
    console.log('skipped .dockerignore, which lets the kit into the build context or does not exclude node_modules');
    return;
  }
  writeFileSync(path, content);
  console.log(`${isNew ? 'wrote' : 'changed'} .dockerignore`);
}

/**
 * The path of the `commit-msg` hook in the hooks directory that git uses for the project at `root`, which honors
 * `core.hooksPath` and a linked worktree, or the reason there is none.
 *
 * @param {string} root
 * @returns {{ path: string } | { reason: string }}
 */
function hookPath(root) {
  const result = spawnSync('git', ['rev-parse', '--path-format=absolute', '--git-path', 'hooks'], {
    cwd: root,
    encoding: 'utf-8',
  });
  if (result.error !== undefined) return { reason: `git could not be run: ${result.error.message}` };
  if (result.status === 0) return { path: join(result.stdout.trimEnd(), 'commit-msg') };
  if (/not a git repository/i.test(result.stderr)) return { reason: 'the project is not inside a git repository' };
  return { reason: `git could not be run: ${result.stderr.trim()}` };
}

/**
 * @returns {string}
 */
function readHookTemplate() {
  return readFileSync(new URL('../templates/project/commit-msg', import.meta.url), 'utf-8');
}

/**
 * Writes the kit's hook at the planned path unless a file is there, prints what it did, and returns the notices to
 * print: the one for a project with no hooks directory.
 *
 * @param {string} root
 * @param {ReturnType<typeof hookPath>} planned
 * @returns {string[]}
 */
function writeHook(root, planned) {
  if ('reason' in planned) return [noRepositoryNotice(planned.reason)];
  const printed = printedHookPath(root, planned.path);
  if (exists(planned.path)) {
    console.log(`skipped ${printed}, which exists`);
    return [];
  }
  mkdirSync(dirname(planned.path), { recursive: true });
  writeFileSync(planned.path, readHookTemplate(), { flag: 'wx' });
  chmodSync(planned.path, 0o755);
  console.log(`wrote ${printed}`);
  return [];
}

/**
 * Writes, amends or leaves the instruction file of each harness of `harnesses`, in the kit's order, as its module
 * says, prints the line it gives of the file, and returns the notices to print for it.
 *
 * @param {string} root
 * @param {string[]} harnesses
 * @param {string} standards
 * @returns {string[]}
 */
function writeInstructionFiles(root, harnesses, standards) {
  return HARNESSES.filter((harness) => harnesses.includes(harness.name)).flatMap(({ instructions }) => {
    const read = readProjectFile(root, instructions.file);
    const { content, line, notices } = instructions.init(read, standards);
    if (content !== undefined) {
      const absolute = resolve(root, instructions.file);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content, read.found ? {} : { flag: 'wx' });
    }
    if (line !== undefined) console.log(line);
    return notices;
  });
}

/**
 * Prints the content of an `agentrite.json` that was just written, after an empty line.
 *
 * @param {string} content
 */
function printSettings(content) {
  process.stdout.write(`\n${content}`);
}

const INIT_WITH_SETTINGS =
  `the project has an ${SETTINGS_FILE}, and the settings are read from it, not from the arguments.\n` +
  'To change a setting, edit the file. Then run: npx agentrite init, with no argument, which writes what is missing';

/**
 * The settings `init` writes into a project that has none: the harnesses in the kit's order, so that one set of
 * harnesses gives one file however it was typed, the template's own branch when none was named, and the template's
 * bell, standards, orchestrator and roles, which name the kit's own files and ring in the sandbox. Without the
 * orchestrator, `orchestrator` is false. A sandbox-only project has no process, has the sandbox and does not use the
 * orchestrator.
 *
 * @param {{
 *   harnesses: string[],
 *   sandboxOnly: boolean,
 *   sandbox: boolean,
 *   orchestrator: boolean,
 *   defaultBranch: string | undefined,
 * }} given
 * @param {import('./agentrite-settings.mjs').Settings} template
 * @returns {import('./agentrite-settings.mjs').Settings}
 */
function settingsToWrite({ harnesses, sandboxOnly, sandbox, orchestrator, defaultBranch }, template) {
  return {
    defaultBranch: defaultBranch ?? template.defaultBranch,
    harnesses: HARNESS_NAMES.filter((name) => harnesses.includes(name)),
    process: !sandboxOnly,
    sandbox: sandboxOnly || sandbox,
    bell: template.bell,
    standards: template.standards,
    orchestrator: orchestrator && !sandboxOnly ? template.orchestrator : false,
    roles: template.roles,
  };
}

/**
 * The settings `init` works by: those of the project's file, or those it is about to write, whose paths it checks
 * before anything is written, as reading the file would.
 *
 * @param {string} root
 * @param {boolean} hasSettings
 * @param {ReturnType<typeof parseInit>} given
 * @param {import('./agentrite-settings.mjs').Settings} template
 * @returns {import('./agentrite-settings.mjs').Settings}
 */
function initSettings(root, hasSettings, given, template) {
  if (hasSettings) return readSettings(root);
  const settings = settingsToWrite(given, template);
  checkSettingsFiles(root, settings);
  return settings;
}

/**
 * Writes what is missing in the project at `root`, prints what it did, and returns the exit status. A project with
 * an `agentrite.json` gives the harnesses and the sandbox setting in it, and no argument. One without is given them
 * as arguments, and gets the file. Without the sandbox the files of the sandbox are left out and nothing is said of
 * them. A sandbox-only project gets the file, the files of the sandbox and `.dockerignore` alone: nothing of the
 * process is read, written or said, no role file, no wrapper, no list, no `AGENTS.md`, `CLAUDE.md` or instruction
 * file of a harness, no script in `package.json` and no hook.
 *
 * @param {string} root
 * @param {ReturnType<typeof parseInit>} given
 * @returns {number}
 */
function init(root, given) {
  const hasSettings = exists(resolve(root, SETTINGS_FILE));
  if (hasSettings && given.given) throw new Error(INIT_WITH_SETTINGS);
  if (!hasSettings && given.harnesses.length === 0) {
    console.error(INIT_FORM);
    return 2;
  }

  const template = parseSettings(readSettingsTemplate());
  const settings = initSettings(root, hasSettings, given, template);
  // Every file but agentrite.json follows the order the harnesses were given in.
  const harnesses = hasSettings ? settings.harnesses : given.harnesses;
  const { standards } = settings;
  const processProject = settings.process
    ? { harnesses, standards, roles: readRoles(root, settings.roles) }
    : undefined;
  const manifest = readPackageJson(root);
  // Planned before anything is written, the settings file among it: what init refuses on is read here.
  const files = [
    { path: SETTINGS_FILE, content: settingsText(settings) },
    ...plannedProjectFiles(root, manifest, processProject, settings.sandbox),
  ];
  const ignore = settings.sandbox ? plannedDockerignore(root) : undefined;
  const hook = settings.process ? hookPath(root) : undefined;
  /** @type {string[]} */ const notices = [];

  for (const file of files) {
    const absolute = resolve(root, file.path);
    if (exists(absolute)) {
      console.log(`skipped ${file.path}, which exists`);
      if (file.path === 'AGENTS.md') {
        notices.push(agentsNotice(file.content));
        if (!agentsNamesList(readProjectFile(root, file.path))) notices.push(agentsListNotice(false));
      }
      continue;
    }
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.content, { flag: 'wx' });
    if (file.executable) chmodSync(absolute, 0o755);
    console.log(`wrote ${file.path}`);
  }

  if (settings.process) {
    const amendedManifest = withCheckChangesScript(manifest.text);
    if (amendedManifest === undefined) {
      console.log('skipped package.json, which has a check-changes script');
    } else {
      writeFileSync(manifest.path, amendedManifest);
      console.log('changed package.json');
    }
  }

  if (settings.process) notices.push(...writeInstructionFiles(root, harnesses, standards));

  if (ignore !== undefined) writeDockerignore(ignore);

  if (hook !== undefined) notices.push(...writeHook(root, hook));

  for (const notice of notices) console.log(`\n${notice}`);

  if (!hasSettings) {
    printSettings(files[0].content);
    if (given.defaultBranch === undefined) process.stdout.write(`\n${defaultBranchNotice(template.defaultBranch)}`);
  }

  return 0;
}

/**
 * Writes the default `agentrite.json` into the project at `root` when nothing is at its path, prints what it did,
 * and returns the exit status. It reads nothing of the project but whether the path is taken.
 *
 * @param {string} root
 * @returns {number}
 */
function config(root) {
  const path = resolve(root, SETTINGS_FILE);
  if (exists(path)) {
    console.log(`skipped ${SETTINGS_FILE}, which exists`);
    return 0;
  }
  const content = readSettingsTemplate();
  writeFileSync(path, content, { flag: 'wx' });
  console.log(`wrote ${SETTINGS_FILE}`);
  printSettings(content);
  process.stdout.write(`\n${CONFIG_NOTICE}`);
  return 0;
}

/**
 * What is at `path`: nothing, a regular file, or something a file must not be written over, such as a symbolic
 * link, which could lead outside the project, or a directory.
 *
 * @param {string} path
 * @returns {'missing' | 'file' | 'other'}
 */
function kindOf(path) {
  if (!exists(path)) return 'missing';
  return lstatSync(path).isFile() ? 'file' : 'other';
}

/**
 * What to tell a project, with `harnesses` and `standards`, about the files `refresh` reads and never writes: the
 * instruction file of a harness given that does not load the kit's instructions, or that loads the kit's standards
 * beside the project's own, and, whatever the harnesses, an `AGENTS.md` that does not name the list.
 *
 * @param {string} root
 * @param {string[]} harnesses
 * @param {string} standards
 * @returns {string[]}
 */
function instructionNotices(root, harnesses, standards) {
  /** @type {string[]} */ const notices = [];
  for (const { name, instructions } of HARNESSES) {
    if (!harnesses.includes(name)) continue;
    notices.push(...instructions.refresh(readProjectFile(root, instructions.file), standards));
  }
  const agents = readProjectFile(root, 'AGENTS.md');
  if (!agentsNamesList(agents)) notices.push(agentsListNotice(!agents.found));
  return notices;
}

/**
 * Makes the kit's own files in the project at `root` what this release writes, prints what it did to each, and
 * returns the exit status. The harnesses and the sandbox setting are those of the project's `agentrite.json`, which
 * is read and never written. With the sandbox setting false the shim is left out, so that nothing is read or
 * printed of it. After the files come the notices of `instructionNotices`, which change neither what is written
 * nor the status. A sandbox-only project gets the shim of its mode alone: no role file is read, and no wrapper,
 * list or hook is written, removed or noticed.
 *
 * @param {string} root
 * @returns {number}
 */
function refresh(root) {
  const { harnesses, process: hasProcess, sandbox, standards, roles: roleFiles } = readSettings(root);
  const templates = readTemplates();
  const roles = hasProcess ? readRoles(root, roleFiles) : [];
  const files = hasProcess
    ? kitOwnedFiles({ templates, harnesses, sandbox, standards, roles })
    : [shimFile(templates, true)];
  let status = 0;
  for (const file of files) {
    const absolute = resolve(root, file.path);
    const kind = kindOf(absolute);
    if (kind === 'other') {
      console.error(`agentrite: left ${file.path}, which is not a regular file`);
      status = 1;
      continue;
    }

    const existing = kind === 'file' ? readFileSync(absolute, 'utf-8') : undefined;
    const content =
      existing !== undefined && file.refreshed !== undefined ? file.refreshed(existing, file.content) : file.content;
    // The owner's bit, which is the one that lets the project run its own shim and the one git records.
    const executable = !file.executable || (kind === 'file' && (lstatSync(absolute).mode & 0o100) !== 0);
    if (existing === content && executable) {
      console.log(`up to date ${file.path}`);
      continue;
    }

    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, content);
    if (file.executable) chmodSync(absolute, 0o755);
    console.log(`${kind === 'missing' ? 'wrote' : 'refreshed'} ${file.path}`);
  }
  if (!hasProcess) return status;
  const hookNotices = refreshHook(root);
  removeStaleWrappers(root, harnesses, roles.map((role) => role.name));
  for (const notice of [...instructionNotices(root, harnesses, standards), ...hookNotices]) {
    console.log(`\n${notice}`);
  }
  return status;
}

/**
 * Makes the hook at the path git uses for the project at `root` the kit's, when nothing is there or what is there
 * carries the kit's mark, prints what it did, and returns the notices to print. Anything else at the path is the
 * project's own and is left as it is. Neither case changes the status of `refresh`.
 *
 * @param {string} root
 * @returns {string[]}
 */
function refreshHook(root) {
  const planned = hookPath(root);
  if ('reason' in planned) return [noRepositoryNotice(planned.reason)];
  const printed = printedHookPath(root, planned.path);
  const kind = kindOf(planned.path);
  const existing = kind === 'file' ? readFileSync(planned.path, 'utf-8') : undefined;
  if (kind === 'other' || (existing !== undefined && !isKitHook(existing))) return [foreignHookNotice(printed)];

  const content = readHookTemplate();
  if (existing === content && (lstatSync(planned.path).mode & 0o100) !== 0) {
    console.log(`up to date ${printed}`);
    return [];
  }
  mkdirSync(dirname(planned.path), { recursive: true });
  writeFileSync(planned.path, content);
  chmodSync(planned.path, 0o755);
  console.log(`${kind === 'missing' ? 'wrote' : 'refreshed'} ${printed}`);
  return [];
}

/**
 * Removes, from the wrapper directory of each of `harnesses`, the regular file `<name><extension>`, with the
 * harness's extension, that its harness takes for a wrapper the kit wrote, for a `<name>` that is not in
 * `roleNames`, and prints `removed <path>` for each. A symbolic link, a directory and a file the harness does not take
 * for the kit's, such as an agent of the project's own, are left and not mentioned.
 *
 * @param {string} root
 * @param {string[]} harnesses
 * @param {string[]} roleNames
 */
function removeStaleWrappers(root, harnesses, roleNames) {
  for (const { wrappers } of harnesses.map((name) => harnessNamed(name))) {
    const absoluteDirectory = resolve(root, wrappers.directory);
    if (!exists(absoluteDirectory)) continue;
    for (const entry of readdirSync(absoluteDirectory).sort()) {
      if (!entry.endsWith(wrappers.extension)) continue;
      if (roleNames.includes(entry.slice(0, -wrappers.extension.length))) continue;
      const absolute = resolve(absoluteDirectory, entry);
      if (kindOf(absolute) !== 'file' || !wrappers.isKit(readFileSync(absolute, 'utf-8'))) continue;
      rmSync(absolute);
      console.log(`removed ${wrappers.directory}/${entry}`);
    }
  }
}

/**
 * The roles of the project at `root`: each with the file the settings give and the description that file holds.
 * Throws what to print for settings that are not valid and for a role file that cannot be read.
 *
 * @param {string} root
 * @returns {import('./agentrite-roles.mjs').Role[]}
 */
function projectRoles(root) {
  return readRoles(root, readSettings(root).roles);
}

/**
 * Prints the roles of the project, for a reader or as JSON, and returns the exit status.
 *
 * @param {string} root
 * @param {{ json: boolean }} parsed
 * @returns {number}
 */
function roles(root, { json }) {
  const listed = projectRoles(root);
  process.stdout.write(json ? rolesJson(listed) : rolesListing(listed));
  return 0;
}

/**
 * The names of the directories in the project's `changes/`, which are none when it has no `changes/`.
 *
 * @param {string} root
 * @returns {string[]}
 */
function changeDirectories(root) {
  const changes = resolve(root, 'changes');
  if (!exists(changes)) return [];
  return readdirSync(changes, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * The unit the `record.md` of a directory of `changes/` describes, refused when the record is missing.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {import('./agentrite-units.mjs').Unit}
 */
function readUnit(root, directory) {
  const recordFile = join(root, 'changes', directory, 'record.md');
  if (!exists(recordFile)) throw new Error(`changes/${directory}/record.md does not exist`);
  return unitFrom(directory, readFileSync(recordFile, 'utf-8'));
}

/**
 * Prints the units of the project, for a reader or as JSON, and returns the exit status. It reads the working
 * tree's `changes/` and nothing else, and prints nothing until every record it needs has been read.
 *
 * @param {string} root
 * @param {import('./agentrite-units.mjs').UnitsArguments} parsed
 * @returns {number}
 */
function units(root, parsed) {
  if (!exists(resolve(root, 'changes'))) throw new Error(`${root} holds no changes/ directory`);
  const directories = changeDirectories(root).filter(isUnitDirectory);
  const named =
    parsed.number === undefined ? directories : directories.filter((name) => name.startsWith(`${parsed.number}-`));
  if (parsed.number !== undefined && named.length === 0) throw new Error(`changes/ holds no unit ${parsed.number}`);

  const selection = selectUnits(named.map((directory) => readUnit(root, directory)), parsed);
  process.stdout.write(parsed.json ? unitsJson(selection) : unitsListing(selection, parsed));
  return 0;
}

/**
 * What `git rev-parse --show-prefix` prints in `root`: the path from the top of the repository to `root`, which is
 * empty at the top. `null` when `root` is in no git repository. A git that cannot be run, or that fails otherwise, is
 * an error.
 *
 * @param {string} root
 * @returns {string | null}
 */
function repositoryPrefix(root) {
  const result = spawnSync('git', ['rev-parse', '--show-prefix'], { cwd: root, encoding: 'utf-8' });
  if (result.error !== undefined) throw new Error(`git could not be run: ${result.error.message}`);
  if (result.status === 0) return result.stdout.replace(/\n$/, '');
  if (/not a git repository/.test(result.stderr)) return null;
  throw new Error(`git could not be run: ${result.stderr.trim()}`);
}

/**
 * Throws unless `root` is in a git repository with the default branch checked out, and returns the prefix of `root`.
 *
 * @param {string} root
 * @param {string} defaultBranch
 * @returns {string}
 */
function approvalPrefix(root, defaultBranch) {
  const prefix = repositoryPrefix(root);
  const committedOn = `an approval is committed on the default branch ${defaultBranch}`;
  if (prefix === null) throw new Error(`${root} is in no git repository, and ${committedOn}`);
  const branch = checkedOutBranch(root);
  if (branch === null) throw new Error(`no branch is checked out, and ${committedOn}`);
  if (branch !== defaultBranch) throw new Error(`the branch checked out is ${branch}, and ${committedOn}`);
  return prefix;
}

/**
 * Throws unless the unit's record can be approved, and returns its text and kind.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {{ text: string, kind: string }}
 */
function approvableRecord(root, directory) {
  const recordFile = `changes/${directory}/record.md`;
  const path = resolve(root, recordFile);
  if (!isRegularFile(path)) throw new Error(`${recordFile} does not exist`);
  const text = readFileSync(path, 'utf-8');
  const { status, kind } = recordFields(text, recordFile);
  if (status !== 'draft') {
    throw new Error(`the unit changes/${directory}/ is ${status}, and an approval moves a unit from draft`);
  }
  const specFile = `changes/${directory}/spec.md`;
  if (kind !== 'task' && !isRegularFile(resolve(root, specFile))) {
    throw new Error(`${specFile} does not exist, and the approval of a feature or a bug is that of its spec`);
  }
  return { text, kind };
}

/**
 * Throws unless every file of the unit's directory is as the commit checked out has it.
 *
 * @param {string} root
 * @param {string} directory
 * @param {string} prefix
 * @param {'approves' | 'cancels'} act
 */
function checkCommitted(root, directory, prefix, act) {
  const status = spawnSync(
    'git',
    ['status', '--porcelain=v1', '-z', '--untracked-files=all', '--no-renames', '--', `changes/${directory}/`],
    { cwd: root, encoding: 'utf-8' },
  );
  if (status.error !== undefined) throw new Error(`git could not be run: ${status.error.message}`);
  if (status.status !== 0) throw new Error(`git could not be run: ${status.stderr.trim()}`);
  const files = uncommittedFiles(status.stdout, prefix);
  if (files.length > 0) throw new Error(uncommittedRefusal(directory, files, act));
}

/**
 * Writes `changed` to the record and commits the record alone, and returns the short hash of the commit. When the
 * commit fails, the record is put back as `original`, what git printed is written to standard error, and it throws.
 *
 * @param {string} root
 * @param {string} recordFile
 * @param {string} original
 * @param {string} changed
 * @param {string} message
 * @returns {string}
 */
function commitRecordAlone(root, recordFile, original, changed, message) {
  writeFileSync(resolve(root, recordFile), changed);
  // The path after `--` makes git commit that file alone, and leave the index of every other file as it was.
  const commit = spawnSync('git', ['commit', '--quiet', '--message', message, '--', recordFile], {
    cwd: root,
    encoding: 'utf-8',
  });
  if (commit.error !== undefined || commit.status !== 0) {
    writeFileSync(resolve(root, recordFile), original);
    process.stderr.write(commit.error === undefined ? `${commit.stdout}${commit.stderr}` : `${commit.error.message}\n`);
    throw new Error(`the commit failed, and ${recordFile} is as it was`);
  }
  const hash = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf-8' });
  return hash.stdout.trim();
}

/**
 * Approves a unit: sets its status to `approved`, logs the approval, and commits the record alone on the default
 * branch. When the commit fails, the record is put back as it was.
 *
 * @param {string} root
 * @param {{ unit: string }} parsed
 * @returns {number}
 */
function approve(root, { unit }) {
  const { defaultBranch } = readSettings(root);
  const prefix = approvalPrefix(root, defaultBranch);
  const directory = resolveUnit(unit, changeDirectories(root));
  const { text, kind } = approvableRecord(root, directory);
  checkCommitted(root, directory, prefix, 'approves');

  const recordFile = `changes/${directory}/record.md`;
  const message = approvalMessage(kind, directory);
  const hash = commitRecordAlone(
    root,
    recordFile,
    text,
    approvedRecord(text, kind, instantOf(Date.now())),
    message,
  );
  console.log(approvedLine(directory, hash, message));
  return 0;
}

/**
 * Throws unless `root` is in a git repository with a branch checked out, and returns the prefix of `root` and the
 * branch. No other branch is read.
 *
 * @param {string} root
 * @returns {{ prefix: string, branch: string }}
 */
function cancellationBranch(root) {
  const prefix = repositoryPrefix(root);
  const committedOn = 'a cancellation is committed on a branch';
  if (prefix === null) throw new Error(`${root} is in no git repository, and ${committedOn}`);
  const branch = checkedOutBranch(root);
  if (branch === null) throw new Error(`no branch is checked out, and ${committedOn}`);
  return { prefix, branch };
}

/**
 * Throws unless the unit's record can be cancelled, and returns its text and kind.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {{ text: string, kind: string }}
 */
function cancellableRecord(root, directory) {
  const recordFile = `changes/${directory}/record.md`;
  const path = resolve(root, recordFile);
  if (!isRegularFile(path)) throw new Error(`${recordFile} does not exist`);
  const text = readFileSync(path, 'utf-8');
  const { status, kind } = recordFields(text, recordFile);
  const refusal = cancellationRefusal(directory, status);
  if (refusal !== undefined) throw new Error(refusal);
  return { text, kind };
}

/**
 * The directory of the unit `--by` names, refused when it names none, more than one, or the unit being cancelled.
 *
 * @param {string} by
 * @param {string[]} directories the names of the directories in `changes/`
 * @param {string} directory the unit being cancelled
 * @returns {string}
 */
function byDirectory(by, directories, directory) {
  let named;
  try {
    named = resolveUnit(by, directories);
  } catch (error) {
    throw new Error(`--by was given ${by}, and ${/** @type {Error} */ (error).message}`);
  }
  if (named === directory) {
    throw new Error(`--by was given ${by}, which names the unit being cancelled, changes/${directory}/`);
  }
  return named;
}

/**
 * Cancels a unit: sets its status to `cancelled`, logs the cancellation with its reason, and commits the record
 * alone on the branch checked out. When the commit fails, the record is put back as it was.
 *
 * @param {string} root
 * @param {{ unit: string, reason: string, by: string | undefined }} parsed
 * @returns {number}
 */
function cancel(root, { unit, reason, by }) {
  readSettings(root);
  const { prefix, branch } = cancellationBranch(root);
  const directories = changeDirectories(root);
  const directory = resolveUnit(unit, directories);
  const { text, kind } = cancellableRecord(root, directory);
  const named = by === undefined ? undefined : byDirectory(by, directories, directory);
  checkCommitted(root, directory, prefix, 'cancels');

  const recordFile = `changes/${directory}/record.md`;
  const message = cancellationMessage(kind, directory);
  const entry = wrappedEntry(cancellationEntry(instantOf(Date.now()), reason, named));
  const hash = commitRecordAlone(root, recordFile, text, cancelledRecord(text, entry), message);
  console.log(cancelledLine(directory, branch, hash, message));
  return 0;
}

/**
 * Throws unless the wrapper of `role` for `harness` is in the project at `root` as refresh would leave it, given
 * the project's `roles`. A harness that is given another wrapper may go on as its default agent, which never reads
 * the role's file, and say so in one line that is easy to miss.
 *
 * @param {string} root
 * @param {import('./agentrite-roles.mjs').Role[]} roles
 * @param {string} harness
 * @param {string} role
 */
function checkWrapper(root, roles, harness, role) {
  const { extension } = harnessNamed(harness).wrappers;
  const wrapper = plannedFiles([harness], roles).find((file) => basename(file.path) === `${role}${extension}`);
  if (wrapper === undefined) throw new Error(`the kit writes no wrapper of ${role} for ${harness}`);
  const absolute = resolve(root, wrapper.path);
  const remedy =
    `Run: npx agentrite refresh, which writes the wrappers of the harnesses that ${SETTINGS_FILE} names`;
  if (kindOf(absolute) !== 'file') throw new Error(`the project has no file ${wrapper.path}. ${remedy}`);
  const existing = readFileSync(absolute, 'utf-8');
  if (existing !== wrapper.refreshed(existing, wrapper.content)) {
    throw new Error(`${wrapper.path} is not the file refresh would leave there. ${remedy}`);
  }
}

/**
 * The one of `roles` named `role`, and throws when none is. The comparison is with the names of the list, so that a
 * word such as `toString` is refused.
 *
 * @param {import('./agentrite-roles.mjs').Role[]} roles
 * @param {string} role
 * @returns {import('./agentrite-roles.mjs').Role}
 */
function checkRoleNamed(roles, role) {
  const named = roles.find((listed) => listed.name === role);
  if (named !== undefined) return named;
  const names = roles.map((listed) => listed.name);
  const list = `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`;
  throw new Error(`the project has no role ${role}. The roles ${SETTINGS_FILE} names are ${list}`);
}

/**
 * Starts the harness as the role, on the unit, in the project at `root`, waits for it, and returns the exit
 * status, which is the harness's own.
 *
 * @param {string} root
 * @param {ReturnType<typeof parseRunArgs>} parsed
 * @returns {number}
 */
function run(root, { role, harness, unit, text, ...start }) {
  const roles = projectRoles(root);
  const { path: roleFile } = checkRoleNamed(roles, role);
  const directory = resolveUnit(unit, changeDirectories(root));
  checkWrapper(root, roles, harness, role);
  const prompt = unitPrompt(directory, text);
  const { command, args } = harnessCommand({ ...start, harness, role, roleFile, prompt });

  // The arguments go to the harness as they are, with no shell in between to read the prompt.
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error !== undefined) {
    const notFound = 'code' in result.error && result.error.code === 'ENOENT';
    throw notFound ? new Error(`the command ${command} was not found on the PATH`) : result.error;
  }
  // A harness that a signal ended has no status of its own to hand on.
  return result.status ?? 1;
}

/** The directory of the project root that holds the orchestrator's runs, and nothing else. */
const ORCHESTRATOR_DIRECTORY = '.orchestrator';

const OPTED_OUT =
  `the project opted out of the orchestrator: orchestrator in ${SETTINGS_FILE} is false. ` +
  'To use it, set orchestrator to the path of a definition, as node_modules/agentrite/orchestrator.json';

/**
 * The definition a run runs: the one `--definition` names, or else the one `orchestrator` names, with the path as
 * it was given, its text as it was read, and what it holds.
 *
 * @param {string} root
 * @param {string | undefined} given
 * @param {import('./agentrite-settings.mjs').Settings} settings
 * @returns {{ path: string, text: string, definition: import('./agentrite-definition.mjs').Definition }}
 */
function readDefinition(root, given, settings) {
  if (settings.orchestrator === false) throw new Error(OPTED_OUT);
  const path = given ?? settings.orchestrator;
  if (given !== undefined && !isRegularFile(resolve(root, given))) {
    throw new Error(`--definition names ${given}, and there is no file at it`);
  }
  const text = readFileSync(resolve(root, path), 'utf-8');
  const names = { roles: Object.keys(settings.roles), harnesses: settings.harnesses };
  return { path, text, definition: parseDefinition(text, { path, ...names }) };
}

/**
 * The status the unit's record holds. A record that is missing is refused as one that holds no status.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {string}
 */
function unitStatus(root, directory) {
  const recordFile = `changes/${directory}/record.md`;
  const path = resolve(root, recordFile);
  return statusFrom(isRegularFile(path) ? readFileSync(path, 'utf-8') : '', recordFile);
}

/**
 * Throws unless the unit's record says that it is approved.
 *
 * @param {string} root
 * @param {string} directory
 */
function checkApproved(root, directory) {
  const status = unitStatus(root, directory);
  if (status === 'approved') return;
  throw new Error(`the unit changes/${directory}/ is ${status}, and a run starts the work of an approved unit`);
}

/**
 * Throws unless the unit's record says that it is approved or in progress, the statuses a unit has while a run of it
 * is stopped for the human.
 *
 * @param {string} root
 * @param {string} directory
 */
function checkResumable(root, directory) {
  const status = unitStatus(root, directory);
  if (status === 'approved' || status === 'in-progress') return;
  throw new Error(
    `the unit changes/${directory}/ is ${status}, and a resume takes a unit that is approved or in progress`,
  );
}

/**
 * The instant of `time`, milliseconds since the epoch, in UTC to the second, as `2026-10-23T10:00:05Z`.
 *
 * @param {number} time
 * @returns {string}
 */
export function instantOf(time) {
  return new Date(time).toISOString().replace(/\.\d+Z$/, 'Z');
}

/** The flags a file under `.orchestrator` is created with: anew, and never through a symbolic link at its name. */
const CREATE_FLAGS = constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | constants.O_NOFOLLOW;

/**
 * Creates the file at `path` anew and returns its descriptor, open to write. When anything stands at `path`, a
 * symbolic link among it, that entry is removed, never what a link names, and the file is created once more; when
 * that fails too, the error is thrown. `files` holds the functions of `node:fs` it calls, so that a test can make one
 * of them fail.
 *
 * @param {string} path
 * @param {Pick<typeof import('node:fs'), 'openSync' | 'rmSync'>} files
 * @returns {number}
 */
export function createFile(path, files) {
  try {
    return files.openSync(path, CREATE_FLAGS, 0o666);
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (code !== 'EEXIST' && code !== 'ELOOP') throw error;
  }
  // `rmSync` takes a symbolic link away itself, and leaves what it names.
  files.rmSync(path, { recursive: true, force: true });
  return files.openSync(path, CREATE_FLAGS, 0o666);
}

/**
 * Writes `content` to `path` whole: a reader of `path` at any time reads what it held before or `content`, and never
 * part of either. The content goes to a file in the same directory whose name opens with `.`, created anew by
 * `createFile`, which then replaces `path` in one rename. A rename onto a directory removes that directory and is made
 * once more, and a rename onto a symbolic link replaces the link and not what it names. When a step fails, the
 * temporary file is removed and the error thrown. `files` holds the functions of `node:fs` it calls, so that a test
 * can record their order and make one of them fail.
 *
 * @param {string} path
 * @param {string} content
 * @param {Pick<typeof import('node:fs'), 'openSync' | 'writeFileSync' | 'closeSync' | 'renameSync' | 'rmSync'>} files
 */
export function writeWhole(path, content, files) {
  const temporary = join(dirname(path), `.${basename(path)}`);
  try {
    const descriptor = createFile(temporary, files);
    try {
      files.writeFileSync(descriptor, content);
    } finally {
      files.closeSync(descriptor);
    }
    renameOnto(temporary, path, files);
  } catch (error) {
    try {
      files.rmSync(temporary, { force: true });
    } catch {
      // The error of the write is the one to report.
    }
    throw error;
  }
}

/**
 * Renames `from` onto `to`, removing a directory that stands at `to` and renaming once more.
 *
 * @param {string} from
 * @param {string} to
 * @param {Pick<typeof import('node:fs'), 'renameSync' | 'rmSync'>} files
 */
function renameOnto(from, to, files) {
  try {
    files.renameSync(from, to);
    return;
  } catch (error) {
    const code = /** @type {NodeJS.ErrnoException} */ (error).code;
    if (code !== 'EISDIR' && code !== 'ENOTEMPTY') throw error;
  }
  files.rmSync(to, { recursive: true, force: true });
  files.renameSync(from, to);
}

/**
 * Makes the followed file of a step at `path`, empty and created anew by `createFile`, and returns the function that
 * adds a line to its end and the one that closes it. Every line is written through the descriptor the file was
 * created with, and the file is never opened again by its path. A line is added whole or not at all: when a write
 * throws or writes part of the line, the file is cut back to the lines added before it, and a cut back that fails is
 * tried again before the next line is added, which is lost if it still fails. A failure of any call is dropped, since
 * the file is for readers and not a part of the run, as the heartbeat is, and the lines after it are added as if it
 * had not failed. When the file cannot be created, no line is added. `files` holds the functions of `node:fs` it
 * calls, so that a test can make one of them fail.
 *
 * @param {string} path
 * @param {Pick<typeof import('node:fs'), 'openSync' | 'writeSync' | 'ftruncateSync' | 'closeSync' | 'rmSync'>} files
 * @returns {{ add: (line: string) => void, close: () => void }}
 */
export function followedFile(path, files) {
  /** @type {number} */ let descriptor;
  try {
    descriptor = createFile(path, files);
  } catch {
    // The file is for readers, and the run goes on without it.
    return { add: () => {}, close: () => {} };
  }
  let length = 0;
  let cutBackPending = false;
  const cutBack = () => {
    try {
      files.ftruncateSync(descriptor, length);
      cutBackPending = false;
    } catch {
      // The file is for readers, and the cut back is tried again before the next line.
      cutBackPending = true;
    }
  };
  const add = (/** @type {string} */ line) => {
    // A part of an earlier line may still stand at the end, and writing behind it would corrupt this line too.
    if (cutBackPending) cutBack();
    if (cutBackPending) return;
    const bytes = Buffer.byteLength(line);
    try {
      if (files.writeSync(descriptor, line, length) !== bytes) throw new Error('a part of the line was written');
      length += bytes;
    } catch {
      // The file is for readers, and what could not be written is lost.
      cutBack();
    }
  };
  const close = () => {
    try {
      files.closeSync(descriptor);
    } catch {
      // The file is for readers, and the run goes on without it.
    }
  };
  return { add, close };
}

/**
 * How often a run writes its heartbeat. A reader calls a run without an end stale once its heartbeat is more than 60
 * seconds old, which is six missed beats.
 */
const HEARTBEAT_MILLISECONDS = 10_000;

/**
 * The content of a run's `heartbeat`: the instant of `time` and a line break.
 *
 * @param {number} time
 * @returns {string}
 */
export function heartbeatText(time) {
  return `${instantOf(time)}\n`;
}

/**
 * Calls `write` with the heartbeat at once and then every `HEARTBEAT_MILLISECONDS`, and returns the function that
 * stops the beats.
 *
 * @param {(text: string) => void} write
 * @returns {() => void}
 */
export function startHeartbeat(write) {
  const beat = () => {
    try {
      write(heartbeatText(Date.now()));
    } catch {
      // The heartbeat is a sign for readers and not a part of the run, so a beat that fails is dropped.
    }
  };
  beat();
  const interval = setInterval(beat, HEARTBEAT_MILLISECONDS);
  return () => clearInterval(interval);
}

/**
 * The name of the branch checked out in `root`, or `null` when none is: on a detached `HEAD`, and in a directory that
 * is in no git repository. A git that cannot be run, or that fails otherwise, is an error.
 *
 * @param {string} root
 * @returns {string | null}
 */
function checkedOutBranch(root) {
  const result = spawnSync('git', ['symbolic-ref', '--quiet', 'HEAD'], { cwd: root, encoding: 'utf-8' });
  if (result.error !== undefined) throw new Error(`git could not be run: ${result.error.message}`);
  if (result.status === 0) {
    const reference = result.stdout.trim();
    return reference.startsWith('refs/heads/') ? reference.slice('refs/heads/'.length) : null;
  }
  // `--quiet` makes a detached HEAD exit 1 and say nothing.
  if (result.status === 1 || /not a git repository/.test(result.stderr)) return null;
  throw new Error(`git could not be run: ${result.stderr.trim()}`);
}

/** The functions of `node:fs` that `writeWhole` calls. */
const WRITE_FILES = { openSync, writeFileSync, closeSync, renameSync, rmSync };

/** The functions of `node:fs` that `followedFile` calls. */
const FOLLOWED_FILES = { openSync, writeSync, ftruncateSync, closeSync, rmSync };

/**
 * Throws, naming the path, unless `.orchestrator` and `.orchestrator/<directory>` are each a directory or missing,
 * and `.orchestrator/.gitignore` a regular file or missing. None of them may be a symbolic link, since the command
 * makes none there. The paths are taken in that order, so that each is examined only below a directory.
 *
 * @param {string} root
 * @param {string} directory
 */
function checkOrchestratorPaths(root, directory) {
  for (const [path, kind] of [
    [ORCHESTRATOR_DIRECTORY, 'directory'],
    [join(ORCHESTRATOR_DIRECTORY, '.gitignore'), 'file'],
    [join(ORCHESTRATOR_DIRECTORY, directory), 'directory'],
  ]) {
    /** @type {import('node:fs').Stats} */ let stats;
    try {
      stats = lstatSync(resolve(root, path));
    } catch (error) {
      if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') continue;
      throw new Error(`${path} cannot be examined: ${messageOf(error)}`);
    }
    if (kind === 'directory' ? stats.isDirectory() : stats.isFile()) continue;
    const found = stats.isSymbolicLink()
      ? 'a symbolic link'
      : stats.isDirectory()
        ? 'a directory'
        : stats.isFile()
          ? 'a file'
          : 'neither a file nor a directory';
    throw new Error(
      `${path} is ${found}, which is not what the command makes there: a ${kind}. Remove it, and run the command again`,
    );
  }
}

/**
 * Makes the directory of a new run of the unit, after making `.orchestrator` and the unit's directory in it when they
 * are missing and making sure that `.orchestrator/.gitignore` holds `*` alone, and returns its path from the root.
 * `checkOrchestratorPaths` has ruled out a link and an entry of the wrong kind at each. It is named by the instant the
 * run started, followed by `--` and the variant for a run on a variant's branch, and made without `recursive`, so that
 * a second run of one variant in the same second fails rather than mixing with the first.
 *
 * @param {string} root
 * @param {string} directory
 * @param {string | null} variant
 * @returns {string}
 */
function makeRunDirectory(root, directory, variant) {
  const orchestrator = resolve(root, ORCHESTRATOR_DIRECTORY);
  if (!exists(orchestrator)) mkdirSync(orchestrator);
  const ignore = join(orchestrator, '.gitignore');
  if (!isRegularFile(ignore) || readFileSync(ignore, 'utf-8') !== '*\n') writeWhole(ignore, '*\n', WRITE_FILES);
  const unitDirectory = join(ORCHESTRATOR_DIRECTORY, directory);
  if (!exists(resolve(root, unitDirectory))) mkdirSync(resolve(root, unitDirectory));
  const run = join(unitDirectory, runName(instantOf(Date.now()), variant));
  mkdirSync(resolve(root, run));
  return run;
}

/**
 * Sends `signal` to every process of the process group `group`, when it still has one.
 *
 * @param {number} group
 * @param {NodeJS.Signals} signal
 */
function signalGroup(group, signal) {
  try {
    process.kill(-group, signal);
  } catch (error) {
    if (!(error instanceof Error && 'code' in error && error.code === 'ESRCH')) throw error;
  }
}

/**
 * True while the process group `group` has a process.
 *
 * @param {number} group
 * @returns {boolean}
 */
function groupAlive(group) {
  try {
    process.kill(-group, 0);
    return true;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ESRCH') return false;
    throw error;
  }
}

/** How long a step that ran past its time limit is given to end after `SIGTERM`, before `SIGKILL` ends it. */
const GRACE_MILLISECONDS = 10_000;

/**
 * Runs `args` with this Node.js from `root` in a process group of its own, and gives how it ended, what it printed on
 * standard output, how long it ran until it exited and whether that reached `timeoutMinutes`. When it does, `SIGTERM`
 * is sent to the group, and `SIGKILL` when the group still has a process after the grace. `grouped` is given the
 * group when it starts, and `undefined` when the promise settles. `line` is given each line of standard
 * output as it arrives, without its line break, and what is left after the last line break when the output closes,
 * all before the promise settles.
 *
 * @param {string} root
 * @param {string[]} args
 * @param {number | undefined} timeoutMinutes
 * @param {(group: number | undefined) => void} grouped
 * @param {(text: string) => void} line
 * @returns {Promise<{
 *   status: number | null,
 *   signal: string | null,
 *   stdout: string,
 *   milliseconds: number,
 *   timedOut: boolean,
 * }>}
 */
function runGrouped(root, args, timeoutMinutes, grouped, line) {
  return new Promise((settle, reject) => {
    const began = performance.now();
    let milliseconds = 0;
    let stdout = '';
    // What arrived after the last line break, which the next chunk completes.
    let partial = '';
    let timedOut = false;
    let graceOver = false;
    /** @type {{ status: number | null, signal: string | null } | undefined} */ let closed;
    /** @type {NodeJS.Timeout | undefined} */ let limit;
    /** @type {NodeJS.Timeout | undefined} */ let grace;
    // A group of its own, so that the command can end the harness with it, which `agentrite run` does not pass a
    // signal on to.
    const child = spawn(process.execPath, args, { cwd: root, stdio: ['ignore', 'pipe', 'inherit'], detached: true });
    const group = /** @type {number} */ (child.pid);
    grouped(group);
    const settleWhenDone = () => {
      if (closed === undefined) return;
      // The output can close while a process of the group that does not hold it is left, which the grace still ends.
      if (timedOut && !graceOver && groupAlive(group)) return;
      clearTimeout(limit);
      clearTimeout(grace);
      grouped(undefined);
      settle({ ...closed, stdout, milliseconds, timedOut });
    };
    if (timeoutMinutes !== undefined) {
      limit = setTimeout(() => {
        timedOut = true;
        signalGroup(group, 'SIGTERM');
        grace = setTimeout(() => {
          graceOver = true;
          if (groupAlive(group)) signalGroup(group, 'SIGKILL');
          settleWhenDone();
        }, GRACE_MILLISECONDS);
      }, timeoutMinutes * 60_000);
    }
    child.stdout.setEncoding('utf-8');
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
      const lines = (partial + chunk).split('\n');
      partial = /** @type {string} */ (lines.pop());
      for (const complete of lines) line(complete);
    });
    child.stdout.on('end', () => {
      if (partial !== '') line(partial);
    });
    child.on('error', (error) => {
      clearTimeout(limit);
      clearTimeout(grace);
      grouped(undefined);
      reject(error);
    });
    child.on('exit', () => {
      milliseconds = performance.now() - began;
      // The step's time ends here, though a process it left may hold its output open longer. A grace already
      // started is kept, so that a harness that ignores SIGTERM is still ended.
      clearTimeout(limit);
    });
    child.on('close', (status, signal) => {
      closed = { status, signal };
      settleWhenDone();
    });
  });
}

/**
 * Runs one step as `agentrite run` of this file, headless, in a process group of its own, with the step's prompt and
 * the request of its outcome, for the rerun of a resume with the human's `words` between them, or for an ask again
 * the request of an ask again alone, and gives how its harness ended, its final response, its session, whether it
 * ran past its time limit and the tool calls its harness refused for lack of permission. The harness's standard
 * error reaches the terminal, and its standard output is read. `grouped` is given the group when the step starts, and
 * `undefined` when it has ended. `follow` is given what the harness makes known of the step in each line it prints, as
 * it arrives.
 *
 * @param {string} root
 * @param {string} directory
 * @param {boolean} skipPermissions
 * @param {string | undefined} words
 * @param {import('./agentrite-orchestrate.mjs').Planned} planned
 * @param {(group: number | undefined) => void} grouped
 * @param {(items: import('./agentrite-headless.mjs').Followed[]) => void} follow
 * @returns {Promise<import('./agentrite-orchestrate.mjs').Result>}
 */
async function runStep(root, directory, skipPermissions, words, planned, grouped, follow) {
  const { step, round, session, asked, rerun } = planned;
  const { headless } = harnessNamed(step.harness);
  const start = headless.arguments(session);
  const own = step.prompt === undefined ? [] : [step.prompt];
  const resumed = rerun ? [resumeWords(words)] : [];
  const given = [...own, ...resumed, outcomeRequest(round)].join('\n\n');
  // An ask again continues the session of a step that was given its prompt already, and asks for its outcome alone.
  const prompt = asked ? askAgainRequest(round) : given;
  const args = [
    fileURLToPath(import.meta.url),
    'run',
    step.role,
    step.harness,
    directory,
    // Written onto their options, so that a value that opens with a dash is not taken for an option.
    `--model=${step.model}`,
    '--headless',
    `--prompt=${prompt}`,
    ...(skipPermissions ? ['--skip-permissions'] : []),
    '--',
    ...start.args,
  ];
  const line = (/** @type {string} */ text) => follow(headless.follow(text));
  const { stdout, ...ended } = await runGrouped(root, args, step.timeoutMinutes, grouped, line);
  const read = headless.read(stdout);
  return {
    ...ended,
    response: read.response,
    session: read.session ?? start.session,
    refused: headless.refused(stdout),
  };
}

/**
 * Passes `SIGINT`, `SIGTERM` and `SIGHUP` on to the process group of the step that runs, which a step in a group of
 * its own no longer gets from the terminal, and then ends the command by the same signal, as it ended before steps
 * had a group of their own. With its listener gone, the signal sent to the command itself takes its default action.
 *
 * @param {() => number | undefined} running the group of the step that runs, or `undefined` between steps
 */
function passSignalsOn(running) {
  for (const signal of /** @type {const} */ (['SIGINT', 'SIGTERM', 'SIGHUP'])) {
    process.once(signal, () => {
      const group = running();
      if (group !== undefined) signalGroup(group, signal);
      process.kill(process.pid, signal);
    });
  }
}

/**
 * What a run or a resume runs, once every refusal of it has been ruled out: the unit, the branch checked out, the
 * definition with its path and its text, and for a resume where it starts, the sessions it starts with, the name of
 * the directory of the run it resumes and the line it prints first.
 *
 * @typedef {{
 *   directory: string,
 *   branch: string | null,
 *   path: string,
 *   text: string,
 *   definition: import('./agentrite-definition.mjs').Definition,
 *   from: import('./agentrite-orchestrate.mjs').Position | undefined,
 *   sessions: { role: string, harness: string, session: string }[],
 *   resumes: string | null,
 *   opening: string | undefined,
 * }} Prepared
 */

/**
 * Prepares a run of the definition on an approved unit from its first item, refusing what a run refuses.
 *
 * @param {string} root
 * @param {ReturnType<typeof parseOrchestrateArgs>} parsed
 * @returns {Prepared}
 */
function prepareRun(root, { unit, definition: given }) {
  const settings = readSettings(root);
  const { path, text, definition } = readDefinition(root, given, settings);
  const directory = resolveUnit(unit, changeDirectories(root));
  checkOrchestratorPaths(root, directory);
  checkApproved(root, directory);
  // The branch is read once, before anything is written: the run's directory holds the variant in its name and
  // `state.json` the branch, and neither follows a branch checked out later.
  const branch = checkedOutBranch(root);
  return {
    directory,
    branch,
    path,
    text,
    definition,
    from: undefined,
    sessions: [],
    resumes: null,
    opening: undefined,
  };
}

const DEFINITION_WITH_RESUME =
  '--definition is not taken with --resume, since a resume runs the definition of the run it resumes';

const RESUME_TAKES = 'A resume takes a run that ended with the status 3, which a run does when it stops for the human';

/**
 * The name of the directory of the latest run of the unit on `variant`, the one with no variant for `null`. Throws
 * when the unit has none.
 *
 * @param {string} root
 * @param {string} directory
 * @param {string | null} variant
 * @returns {string}
 */
function latestRunName(root, directory, variant) {
  // The instant opens the name, so of the names of one variant the latest is the largest.
  const names = runDirectoryNames(root, directory)
    .filter((name) => variantOfRun(name) === variant)
    .sort();
  const latest = names.at(-1);
  if (latest !== undefined) return latest;
  throw new Error(
    `the unit ${directory} has no run ${variant === null ? 'without a variant' : `on the variant ${variant}`}`,
  );
}

/**
 * Throws unless the run at `run` ran on the branch checked out, naming both.
 *
 * @param {string} run
 * @param {string | null} ran
 * @param {string | null} checked
 */
function checkRunBranch(run, ran, checked) {
  if (ran !== null && ran === checked) return;
  const was = ran === null ? 'holds no branch' : `ran on the branch ${ran}`;
  const now = checked === null ? 'no branch is checked out' : `the branch checked out is ${checked}`;
  throw new Error(`the latest run, ${run}/, ${was}, and ${now}. A resume runs on the branch of the run it resumes`);
}

/**
 * Prepares the resume of the latest run of the unit on the variant of the branch checked out, which must have
 * stopped for the human, refusing what a resume refuses, and writing nothing. The resume runs the stopped run's
 * definition from the step that stopped it, with its sessions.
 *
 * @param {string} root
 * @param {ReturnType<typeof parseOrchestrateArgs>} parsed
 * @returns {Prepared}
 */
function prepareResume(root, { unit, definition: given }) {
  const settings = readSettings(root);
  if (settings.orchestrator === false) throw new Error(OPTED_OUT);
  if (given !== undefined) throw new Error(DEFINITION_WITH_RESUME);
  const directory = resolveUnit(unit, changeDirectories(root));
  checkResumable(root, directory);
  const branch = checkedOutBranch(root);
  checkOrchestratorPaths(root, directory);
  const name = latestRunName(root, directory, variantOf(branch));
  const run = join(ORCHESTRATOR_DIRECTORY, directory, name);
  const texts = runTexts(root, run);
  const { state, definition, step } = parseRun(directory, name, texts);
  if (state.ended !== null && (state.at === null || step === null)) {
    throw new Error(`${run}/state.json: at is null. It must hold the step the run was at, in a run that ended`);
  }
  const listed = runFrom(directory, name, { ...texts, heartbeat: readHeartbeat(root, run) });
  const runState = runStateOf(listed, Date.now());
  if (runState !== 'ended' || state.ended?.status !== 3 || state.at === null || step === null) {
    const detail = detailOf({ ...listed, state: runState, followed: null });
    throw new Error(`the latest run, ${run}/, is ${runState}: ${detail}\n${RESUME_TAKES}`);
  }
  checkRunBranch(run, state.branch ?? null, branch);
  const asked = isAskAgain(definition, state.at, step.role, readdirSync(resolve(root, run)));
  const from = resumePosition({ ...state.at, asked }, state.sessions);
  return {
    directory,
    branch,
    path: state.definition,
    text: texts.definition,
    definition,
    from,
    sessions: state.sessions,
    resumes: name,
    opening: openingLine(run, { number: from.number, round: from.round, step }),
  };
}

/**
 * Runs the definition on an approved unit, one step at a time, or with `--resume` resumes the latest run of the unit
 * that stopped for the human, keeping the run in its directory under `.orchestrator/`, prints a line before and after
 * each step and what the human needs at the end, and returns the exit status. With `follow`, the messages and tool
 * calls of each step are printed between its two lines as it runs and its own lines and the end report stand in
 * frames. With or without it the messages and tool calls are added to the step's followed file. Nothing is written
 * before every refusal has been ruled out, and nothing outside `.orchestrator/`. The run's directory holds a
 * `heartbeat` while the run lasts, and every file of it but the followed files, which are added to, is written whole.
 *
 * @param {string} root
 * @param {ReturnType<typeof parseOrchestrateArgs>} parsed
 * @returns {Promise<number>}
 */
async function orchestrateCommand(root, parsed) {
  const prepared = parsed.resume ? prepareResume(root, parsed) : prepareRun(root, parsed);
  return runPrepared(root, prepared, parsed);
}

/**
 * Runs what was prepared: makes the run's directory, writes its files, prints the opening line of a resume, runs the
 * steps from where the preparation says, and prints the end report.
 *
 * @param {string} root
 * @param {Prepared} prepared
 * @param {{ skipPermissions: boolean, follow: boolean, prompt: string | undefined }} options
 * @returns {Promise<number>}
 */
async function runPrepared(root, prepared, { skipPermissions, follow, prompt: words }) {
  const { directory, branch, path, text, definition, from, resumes, opening } = prepared;
  const runDirectory = makeRunDirectory(root, directory, variantOf(branch));
  const output = (follow ? framedOutput : plainOutput)((text) => process.stdout.write(text));
  /** @type {number | undefined} */ let group;
  const write = (/** @type {string} */ name, /** @type {string} */ content) => {
    writeWhole(resolve(root, runDirectory, name), content, WRITE_FILES);
  };
  const fileOf = (/** @type {import('./agentrite-orchestrate.mjs').Planned} */ planned, /** @type {string} */ kind) =>
    stepFileName(definition, planned.number, planned.step.role, kind);
  const sessions = prepared.sessions.map((session) => ({ ...session }));
  /** @type {object | null} */ let at = null;
  const writeState = (/** @type {object | null} */ ended) =>
    write(
      'state.json',
      `${JSON.stringify({ unit: directory, definition: path, branch, resumes, at, sessions, ended }, null, 2)}\n`,
    );

  const stopHeartbeat = startHeartbeat((beat) => write('heartbeat', beat));
  try {
    write('definition.json', text);
    writeState(null);
    passSignalsOn(() => group);
    /** @type {string | undefined} */ let responsePath;
    if (opening !== undefined) output.opening(opening);
    /** @type {import('./agentrite-orchestrate.mjs').Effects} */ const effects = {
      started(planned) {
        const { number, item, round, index, asked } = planned;
        at = { number, item, round: round ?? null, index: index ?? null, asked };
        writeState(null);
        output.started(stepLine(planned));
      },
      run: (planned) => {
        const followed = followedFile(resolve(root, runDirectory, fileOf(planned, 'followed.jsonl')), FOLLOWED_FILES);
        const { add } = followed;
        return runStep(
          root,
          directory,
          skipPermissions,
          words,
          planned,
          (running) => {
            group = running;
          },
          (items) => {
            const timed = timedItems(items, Date.now);
            output.items(timed);
            for (const item of timed) add(followedLine(item, instantOf(item.time)));
          },
        ).finally(() => followed.close());
      },
      ended(entry) {
        const { planned, result, reading } = entry;
        const { role, harness } = planned.step;
        if (result.session !== undefined) {
          const known = sessions.find((listed) => listed.role === role && listed.harness === harness);
          if (known === undefined) sessions.push({ role, harness, session: result.session });
          else known.session = result.session;
        }
        responsePath = undefined;
        if (reading.kind === 'outcome') {
          write(fileOf(planned, 'outcome.json'), `${reading.text}\n`);
        } else if (result.response !== undefined) {
          write(fileOf(planned, 'response.md'), result.response);
          responsePath = join(runDirectory, fileOf(planned, 'response.md'));
        }
        writeState(null);
        output.ended(stepLine(planned, entry));
      },
    };
    const { ran, end, unfixed } = await orchestrate(definition, effects, from);
    const status = exitStatus(end);
    stopHeartbeat();
    writeState({ status, line: endLine(end) });
    output.report(
      endReport(ran, end, unfixed, { runDirectory, unitDirectory: directory, responsePath, skipPermissions }),
    );
    return status;
  } finally {
    stopHeartbeat();
  }
}

/**
 * The text of the file at `path`, from the root, of a run. A read that throws is thrown again naming the file.
 *
 * @param {string} root
 * @param {string} path
 * @returns {string}
 */
function readRunFile(root, path) {
  try {
    return readFileSync(resolve(root, path), 'utf-8');
  } catch (error) {
    throw new Error(`${path} cannot be read: ${messageOf(error)}`);
  }
}

/**
 * Whether the run in `directory`, relative to `root`, has a `state.json`. A run without one is left out, and any other
 * fault of the path, as a state.json that is a directory or a path that cannot be examined, is refused so that the run
 * is not hidden from the listing.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {boolean}
 */
function hasRunState(root, directory) {
  const path = join(directory, 'state.json');
  try {
    statSync(resolve(root, path));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return false;
    throw new Error(`${path} cannot be read: ${messageOf(error)}`);
  }
  return true;
}

/**
 * The names of the directories in `path`.
 *
 * @param {string} path
 * @returns {string[]}
 */
function directoriesOf(path) {
  return readdirSync(path, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);
}

/**
 * The names of the directories of the runs of the unit `unit` that have a `state.json`, which are none when
 * `.orchestrator/` holds no directory of the unit.
 *
 * @param {string} root
 * @param {string} unit
 * @returns {string[]}
 */
function runDirectoryNames(root, unit) {
  const path = resolve(root, ORCHESTRATOR_DIRECTORY, unit);
  if (!exists(path)) return [];
  return directoriesOf(path).filter(
    (name) => isRunDirectory(name) && hasRunState(root, join(ORCHESTRATOR_DIRECTORY, unit, name)),
  );
}

/**
 * The text of the `state.json` and the `definition.json` of the run at `directory`, from the root.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {{ state: string, definition: string }}
 */
function runTexts(root, directory) {
  return {
    state: readRunFile(root, join(directory, 'state.json')),
    definition: readRunFile(root, join(directory, 'definition.json')),
  };
}

/**
 * The text of the `heartbeat` of the run at `directory`, from the root, or `undefined` when it has none.
 *
 * @param {string} root
 * @param {string} directory
 * @returns {string | undefined}
 */
function readHeartbeat(root, directory) {
  const heartbeat = resolve(root, directory, 'heartbeat');
  return isRegularFile(heartbeat) ? readFileSync(heartbeat, 'utf-8') : undefined;
}

/**
 * The runs of the orchestrator of the project at `root`, each judged at the instant `now`, only those of the unit
 * `number` names when one is given. It reads `.orchestrator/` and nothing else, and refuses a run whose files are not
 * of the form the orchestrator writes.
 *
 * @param {string} root
 * @param {string | undefined} number
 * @param {number} now
 * @returns {import('./agentrite-runs.mjs').Listed[]}
 */
export function readRuns(root, number, now) {
  const orchestrator = resolve(root, ORCHESTRATOR_DIRECTORY);
  if (!exists(orchestrator)) return [];
  return directoriesOf(orchestrator)
    .filter((unit) => isUnitDirectory(unit) && (number === undefined || unit.startsWith(`${number}-`)))
    .flatMap((unit) =>
      runDirectoryNames(root, unit)
        .map((name) => {
          const directory = join(ORCHESTRATOR_DIRECTORY, unit, name);
          const run = runFrom(unit, name, { ...runTexts(root, directory), heartbeat: readHeartbeat(root, directory) });
          const followed = run.followedName === null ? null : `${run.directory}/${run.followedName}`;
          return {
            ...run,
            state: runStateOf(run, now),
            followed: followed !== null && isRegularFile(resolve(root, followed)) ? followed : null,
          };
        }),
    );
}

/**
 * Prints the runs of the project, or the JSON document of them, and returns 0. Nothing is printed before every run
 * was read, so that a run that is refused leaves standard output empty.
 *
 * @param {string} root
 * @param {ReturnType<typeof parseRunsArgs>} parsed
 * @returns {number}
 */
function runs(root, parsed) {
  const selection = selectRuns(readRuns(root, parsed.number, Date.now()), parsed.limit);
  process.stdout.write(parsed.json ? runsJson(selection) : runsListing(selection, parsed.number));
  return 0;
}

/**
 * A command: `form` is the one line that says how it is run, `parse` reads the arguments after the command's name,
 * and throws what to print for ones it does not take, and `run` takes the project root and what `parse` returned,
 * and returns the exit status, or a promise of it.
 *
 * @template Parsed
 * @typedef {{
 *   form: string,
 *   parse: (args: string[]) => Parsed,
 *   run: (root: string, parsed: Parsed) => number | Promise<number>,
 * }} Command
 */

/**
 * The commands, by the name each is run with.
 *
 * @type {Record<string, Command<object>>}
 */
const COMMANDS = {
  init: { form: INIT_FORM, parse: parseInit, run: init },
  config: { form: CONFIG_FORM, parse: noArgument(CONFIG_FORM), run: config },
  refresh: {
    form: REFRESH_FORM,
    parse: noArgument(`${REFRESH_FORM}\nThe harnesses and the sandbox setting are read from ${SETTINGS_FILE}`),
    run: refresh,
  },
  roles: { form: ROLES_FORM, parse: parseRoles, run: roles },
  units: { form: UNITS_FORM, parse: parseUnitsArgs, run: units },
  approve: { form: APPROVE_FORM, parse: parseApproveArgs, run: approve },
  cancel: { form: CANCEL_FORM, parse: parseCancelArgs, run: cancel },
  run: { form: RUN_FORM, parse: parseRunArgs, run },
  orchestrate: { form: ORCHESTRATE_FORM, parse: parseOrchestrateArgs, run: orchestrateCommand },
  runs: { form: RUNS_FORM, parse: parseRunsArgs, run: runs },
};

/**
 * True when this file is the entry point, even when it is executed through a
 * `node_modules/.bin` symlink whose target is this file, so the guard below
 * fires no matter which side node resolved.
 *
 * @returns {boolean}
 */
function isMain() {
  if (process.argv[1] === undefined) return false;
  const self = pathToFileURL(realpathSync(fileURLToPath(import.meta.url))).href;
  const invoked = pathToFileURL(realpathSync(process.argv[1])).href;
  return self === invoked;
}

if (isMain()) {
  let parsed;
  try {
    parsed = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(messageOf(error));
    process.exit(2);
  }
  try {
    process.exit(await COMMANDS[parsed.command].run(process.cwd(), parsed));
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
