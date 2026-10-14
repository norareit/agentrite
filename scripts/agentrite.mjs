#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
import { chmodSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { basename, dirname, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  claudeInitNotice,
  claudeLacks,
  claudeRefreshNotice,
  OPENCODE_FILE,
  opencodeInitNotice,
  opencodeRefreshNotice,
  opencodeVerdict,
  PROCESS_PATH,
  readProjectFile,
} from './agentrite-instructions.mjs';
import { formattedLike } from './agentrite-json.mjs';
import { HARNESS_NAMES, plannedFiles, ROLES } from './agentrite-roles.mjs';
import {
  harnessCommand,
  parseRunArgs,
  resolveUnit,
  rolesJson,
  rolesListing,
  RUN_FORM,
  unitPrompt,
} from './agentrite-run.mjs';
import { parseSettings, readSettings, SETTINGS_FILE, settingsText } from './agentrite-settings.mjs';

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

const NO_SANDBOX = '--no-sandbox';
const DEFAULT_BRANCH = '--default-branch';

// Its two forms: the one a project with no settings file is set up with, and the one that reads the file.
const INIT_FORM =
  `usage: agentrite init [${NO_SANDBOX}] [${DEFAULT_BRANCH} <name>] ${HARNESS_NAMES.join(' | ')}\n` +
  '       agentrite init';

/**
 * What `init` is given: the harnesses, each once, in the order they were given, whether the sandbox is wanted, the
 * default branch when one was named, and whether any argument was given at all. The options stand at any place among
 * the harnesses and are told apart from one by an exact match, so `--no-sandbox=1` is an unknown harness. The word
 * after `--default-branch` is the name whatever it is, and the last name given counts.
 *
 * @param {string[]} args
 * @returns {{ harnesses: string[], sandbox: boolean, defaultBranch: string | undefined, given: boolean }}
 */
function parseInit(args) {
  /** @type {string[]} */ const harnesses = [];
  let sandbox = true;
  /** @type {string | undefined} */ let defaultBranch;

  for (let index = 0; index < args.length; index += 1) {
    const word = args[index];
    if (word === NO_SANDBOX) {
      sandbox = false;
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

  return { harnesses: [...new Set(harnesses)], sandbox, defaultBranch, given: args.length > 0 };
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
      if (alone === null) return [line.replace(/\{\{(\w+)\}\}/g, (_, name) => valueOf(values, name))];
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
  const directories = new Set(plannedFiles(harnesses).map((file) => dirname(file.path)));
  return [...directories].map((directory) => `* \`${directory}/\``).join('\n');
}

/**
 * The shim that runs the kit's sandbox from the project root.
 *
 * @param {Record<string, string>} templates
 * @returns {{ path: string, content: string, executable: boolean }}
 */
function shimFile(templates) {
  return { path: 'sandbox.sh', content: fillTemplate(templates['sandbox.sh'], {}), executable: true };
}

/**
 * The generated files that hold nothing but what the kit put there, which refresh keeps as the release writes
 * them: the role wrappers, in which a project may have pinned a model, and the shim when the project has the sandbox.
 *
 * @param {{ templates: Record<string, string>, harnesses: string[], sandbox: boolean }} project
 * @returns {{ path: string, content: string, executable?: boolean, keepsModel?: boolean }[]}
 */
function kitOwnedFiles({ templates, harnesses, sandbox }) {
  const wrappers = plannedFiles(harnesses).map((file) => ({ ...file, keepsModel: true }));
  return sandbox ? [...wrappers, shimFile(templates)] : wrappers;
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
 * The files init creates that carry the process: the role wrappers, `AGENTS.md` and `CLAUDE.md`.
 *
 * @param {{ templates: Record<string, string>, harnesses: string[] }} project
 * @returns {{ path: string, content: string }[]}
 */
export function processFiles({ templates, harnesses }) {
  return [
    ...plannedFiles(harnesses),
    {
      path: 'AGENTS.md',
      content: fillTemplate(templates['AGENTS.md'], { role_wrapper_directories: roleWrapperDirectories(harnesses) }),
    },
    { path: 'CLAUDE.md', content: fillTemplate(templates['CLAUDE.md'], {}) },
  ];
}

/**
 * The files init creates that carry the sandbox, apart from `.dockerignore`: the shim and the compose file, which
 * names the Playwright version only when the project has one.
 *
 * @param {{
 *   templates: Record<string, string>,
 *   packageName: string,
 *   playwrightVersion: string | undefined,
 * }} project
 * @returns {{ path: string, content: string, executable?: boolean }[]}
 */
function sandboxFiles({ templates, packageName, playwrightVersion }) {
  const compose = fillTemplate(templates[COMPOSE_FILE], {
    sandbox_name: sandboxName(packageName),
    playwright_build: playwrightVersion === undefined ? '' : playwrightBuildBlock(playwrightVersion),
  });
  return [shimFile(templates), { path: COMPOSE_FILE, content: compose }];
}

/**
 * The files init creates, filled from the templates.
 *
 * @param {{
 *   templates: Record<string, string>,
 *   harnesses: string[],
 *   packageName: string,
 *   playwrightVersion: string | undefined,
 * }} project
 * @returns {{ path: string, content: string, executable?: boolean }[]}
 */
export function projectFiles({ templates, harnesses, packageName, playwrightVersion }) {
  return [
    ...processFiles({ templates, harnesses }),
    ...sandboxFiles({ templates, packageName, playwrightVersion }),
  ];
}

/**
 * What to write over a wrapper a project already has: the wrapper as this release renders it, with the lines of
 * the existing one's frontmatter that pin a model put in after the release's own keys. A pin is a line that opens
 * with `model:` at the left margin, kept as it is written. Nothing else of the existing wrapper is kept, and no
 * YAML is read to find it: the wrappers are tracked files, so whatever else a project added shows in its diff.
 *
 * @param {string} existing
 * @param {string} rendered
 * @returns {string}
 */
export function refreshedWrapper(existing, rendered) {
  // A wrapper saved with CRLF is read as the same lines. What is written ends its lines in LF, as the release does.
  const lines = existing.split(/\r?\n/);
  const end = lines[0] === '---' ? lines.indexOf('---', 1) : -1;
  const pins = lines.slice(1, Math.max(end, 1)).filter((line) => line.startsWith('model:'));
  if (pins.length === 0) return rendered;
  // The rendered wrapper opens with `---`, so the first `---` after a line break is the one that closes it.
  const closing = rendered.indexOf('\n---\n') + 1;
  return `${rendered.slice(0, closing)}${pins.join('\n')}\n${rendered.slice(closing)}`;
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
 * The files init creates in the project at `root`: those of the process, and with the sandbox those of the sandbox.
 *
 * @param {string} root
 * @param {{ path: string, text: string, name: unknown }} manifest
 * @param {string[]} harnesses
 * @param {boolean} sandbox
 * @returns {{ path: string, content: string, executable?: boolean }[]}
 */
function plannedProjectFiles(root, manifest, harnesses, sandbox) {
  const templates = readTemplates();
  if (!sandbox) return processFiles({ templates, harnesses });
  return projectFiles({
    templates,
    harnesses,
    packageName: packageNameOf(manifest),
    playwrightVersion: playwrightVersion(readLockfile(root)),
  });
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
 * Writes the project's `opencode.json`, amends it, or leaves it, prints what it did, and returns the notice to print
 * for one it cannot amend.
 *
 * @param {string} root
 * @returns {string | undefined}
 */
function writeOpencodeJson(root) {
  const read = readProjectFile(root, OPENCODE_FILE);
  const verdict = opencodeVerdict(read);
  if (verdict.loads) {
    console.log(`skipped ${OPENCODE_FILE}, which loads ${PROCESS_PATH}`);
    return undefined;
  }
  if (verdict.content === undefined) {
    console.log(`skipped ${OPENCODE_FILE}, which cannot be amended`);
    return opencodeInitNotice(verdict.problem);
  }
  writeFileSync(resolve(root, OPENCODE_FILE), verdict.content, read.found ? {} : { flag: 'wx' });
  console.log(`${read.found ? 'changed' : 'wrote'} ${OPENCODE_FILE}`);
  return undefined;
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
 * harnesses gives one file however it was typed, and the template's own branch when none was named.
 *
 * @param {{ harnesses: string[], sandbox: boolean, defaultBranch: string | undefined }} given
 * @param {string} templateBranch
 * @returns {import('./agentrite-settings.mjs').Settings}
 */
function settingsToWrite({ harnesses, sandbox, defaultBranch }, templateBranch) {
  return {
    defaultBranch: defaultBranch ?? templateBranch,
    harnesses: HARNESS_NAMES.filter((name) => harnesses.includes(name)),
    sandbox,
  };
}

/**
 * Writes what is missing in the project at `root`, prints what it did, and returns the exit status. A project with
 * an `agentrite.json` gives the harnesses and the sandbox setting in it, and no argument. One without is given them
 * as arguments, and gets the file. Without the sandbox the files of the sandbox are left out and nothing is said of
 * them.
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

  const templateBranch = parseSettings(readSettingsTemplate()).defaultBranch;
  const settings = hasSettings ? readSettings(root) : settingsToWrite(given, templateBranch);
  // Every file but agentrite.json follows the order the harnesses were given in.
  const harnesses = hasSettings ? settings.harnesses : given.harnesses;
  const manifest = readPackageJson(root);
  // Planned before anything is written, the settings file among it: what init refuses on is read here.
  const files = [
    { path: SETTINGS_FILE, content: settingsText(settings) },
    ...plannedProjectFiles(root, manifest, harnesses, settings.sandbox),
  ];
  const ignore = settings.sandbox ? plannedDockerignore(root) : undefined;
  /** @type {string[]} */ const notices = [];

  for (const file of files) {
    const absolute = resolve(root, file.path);
    if (exists(absolute)) {
      console.log(`skipped ${file.path}, which exists`);
      if (file.path === 'AGENTS.md') notices.push(agentsNotice(file.content));
      if (file.path === 'CLAUDE.md' && harnesses.includes('claude')) {
        const lacks = claudeLacks(readProjectFile(root, file.path));
        if (lacks.length > 0) notices.push(claudeInitNotice(lacks));
      }
      continue;
    }
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, file.content, { flag: 'wx' });
    if (file.executable) chmodSync(absolute, 0o755);
    console.log(`wrote ${file.path}`);
  }

  const amendedManifest = withCheckChangesScript(manifest.text);
  if (amendedManifest === undefined) {
    console.log('skipped package.json, which has a check-changes script');
  } else {
    writeFileSync(manifest.path, amendedManifest);
    console.log('changed package.json');
  }

  if (harnesses.includes('opencode')) {
    const notice = writeOpencodeJson(root);
    if (notice !== undefined) notices.push(notice);
  }

  if (ignore !== undefined) writeDockerignore(ignore);

  for (const notice of notices) console.log(`\n${notice}`);

  if (!hasSettings) {
    printSettings(files[0].content);
    if (given.defaultBranch === undefined) process.stdout.write(`\n${defaultBranchNotice(templateBranch)}`);
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
 * What to tell a project, with `harnesses`, whose `CLAUDE.md` or `opencode.json` does not load the kit's
 * instructions, which `refresh` reads and never writes: the notice of each such file of a harness given.
 *
 * @param {string} root
 * @param {string[]} harnesses
 * @returns {string[]}
 */
function instructionNotices(root, harnesses) {
  /** @type {string[]} */ const notices = [];
  if (harnesses.includes('claude')) {
    const read = readProjectFile(root, 'CLAUDE.md');
    const lacks = claudeLacks(read);
    if (lacks.length > 0) notices.push(claudeRefreshNotice(!read.found, lacks));
  }
  if (harnesses.includes('opencode')) {
    const verdict = opencodeVerdict(readProjectFile(root, OPENCODE_FILE));
    if (!verdict.loads) notices.push(opencodeRefreshNotice(verdict.problem));
  }
  return notices;
}

/**
 * Makes the kit's own files in the project at `root` what this release writes, prints what it did to each, and
 * returns the exit status. The harnesses and the sandbox setting are those of the project's `agentrite.json`, which
 * is read and never written. With the sandbox setting false the shim is left out, so that nothing is read or
 * printed of it. After the files come the notices of a `CLAUDE.md` or an `opencode.json` that does not load the
 * kit's instructions, which change neither what is written nor the status.
 *
 * @param {string} root
 * @returns {number}
 */
function refresh(root) {
  const { harnesses, sandbox } = readSettings(root);
  let status = 0;
  for (const file of kitOwnedFiles({ templates: readTemplates(), harnesses, sandbox })) {
    const absolute = resolve(root, file.path);
    const kind = kindOf(absolute);
    if (kind === 'other') {
      console.error(`agentrite: left ${file.path}, which is not a regular file`);
      status = 1;
      continue;
    }

    const existing = kind === 'file' ? readFileSync(absolute, 'utf-8') : undefined;
    const content =
      existing !== undefined && file.keepsModel ? refreshedWrapper(existing, file.content) : file.content;
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
  for (const notice of instructionNotices(root, harnesses)) console.log(`\n${notice}`);
  return status;
}

/**
 * Prints the roles the kit has, for a reader or as JSON, and returns the exit status. It reads nothing of the
 * project.
 *
 * @param {string} _root
 * @param {{ json: boolean }} parsed
 * @returns {number}
 */
function roles(_root, { json }) {
  process.stdout.write(json ? rolesJson(ROLES) : rolesListing(ROLES));
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
 * Throws unless the wrapper of `role` for `harness` is in the project at `root` as refresh would leave it. A
 * harness that is given another wrapper may go on as its default agent, which never reads the role's file, and
 * say so in one line that is easy to miss.
 *
 * @param {string} root
 * @param {string} harness
 * @param {string} role
 */
function checkWrapper(root, harness, role) {
  const wrapper = plannedFiles([harness]).find((file) => basename(file.path) === `${role}.md`);
  if (wrapper === undefined) throw new Error(`the kit writes no wrapper of ${role} for ${harness}`);
  const absolute = resolve(root, wrapper.path);
  const remedy =
    `Run: npx agentrite refresh, which writes the wrappers of the harnesses that ${SETTINGS_FILE} names`;
  if (kindOf(absolute) !== 'file') throw new Error(`the project has no file ${wrapper.path}. ${remedy}`);
  const existing = readFileSync(absolute, 'utf-8');
  if (existing !== refreshedWrapper(existing, wrapper.content)) {
    throw new Error(`${wrapper.path} is not the file refresh would leave there. ${remedy}`);
  }
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
  const directory = resolveUnit(unit, changeDirectories(root));
  checkWrapper(root, harness, role);
  const { command, args } = harnessCommand({ ...start, harness, role, prompt: unitPrompt(directory, text) });

  // The arguments go to the harness as they are, with no shell in between to read the prompt.
  const result = spawnSync(command, args, { cwd: root, stdio: 'inherit' });
  if (result.error !== undefined) {
    const notFound = 'code' in result.error && result.error.code === 'ENOENT';
    throw notFound ? new Error(`the command ${command} was not found on the PATH`) : result.error;
  }
  // A harness that a signal ended has no status of its own to hand on.
  return result.status ?? 1;
}

/**
 * A command: `form` is the one line that says how it is run, `parse` reads the arguments after the command's name,
 * and throws what to print for ones it does not take, and `run` takes the project root and what `parse` returned,
 * and returns the exit status.
 *
 * @template Parsed
 * @typedef {{
 *   form: string,
 *   parse: (args: string[]) => Parsed,
 *   run: (root: string, parsed: Parsed) => number,
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
  run: { form: RUN_FORM, parse: parseRunArgs, run },
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
    process.exit(COMMANDS[parsed.command].run(process.cwd(), parsed));
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
