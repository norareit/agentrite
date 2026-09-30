#!/usr/bin/env node
import { chmodSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseHarnesses, plannedFiles } from './agent-kit-roles.mjs';

const CHECK_CHANGES = 'node node_modules/@ritenoar/agent-kit/scripts/check-changes.mjs';
// The kit's container/ directory as a project installs it, from which the image build copies its files.
const KIT_CONTAINER = 'node_modules/@ritenoar/agent-kit/container';
const KIT_CONTAINER_EXCEPTION = `!${KIT_CONTAINER}`;
// A file of some package other than the kit, standing for node_modules as a whole: an exclusion of node_modules
// excludes it, while a pattern aimed at the kit, or at one package, does not.
const NODE_MODULES_PROBE = 'node_modules/any-package/index.js';
const COMPOSE_FILE = 'agent/compose.project.yml';

const DOCKERIGNORE =
  "# Keeps node_modules out of the image build context, except the agent kit's container/\n" +
  '# directory, from which the image build copies the entrypoint and the egress proxy.\n' +
  `node_modules\n${KIT_CONTAINER_EXCEPTION}\n`;

/** The headings of the sections of `AGENTS.md` that make the kit's instructions reach an agent. */
export const AGENTS_SECTIONS = ['# Development Guidelines', '## Roles', '## Changes in this project'];

export const CLAUDE_NOTICE =
  'CLAUDE.md exists and was left as it is. For Claude Code to read the instructions in AGENTS.md, it must import\n' +
  'that file with a line holding `@AGENTS.md`.\n';

// Hosts a harness reaches at start-up beyond those the kit admits itself, as the lines of the project's allowlist.
/** @type {Record<string, string[]>} */
const HARNESS_HOSTS = {
  opencode: ['# OpenCode fetches its model catalog from here at start-up', 'models.dev'],
};

/**
 * agent-kit-roles words its usage for its own command. The harnesses it lists are the ones init takes.
 *
 * @param {string} message
 * @returns {string}
 */
function forInit(message) {
  return message.replace('usage: agent-kit-roles ', 'usage: agent-kit init ');
}

/**
 * @param {string[]} args
 * @returns {string[]}
 */
export function parseInitArgs(args) {
  const [command, ...names] = args;
  try {
    // With no harnesses, parseHarnesses throws the usage alone, which is what a missing or unknown command needs.
    return parseHarnesses(command === 'init' ? names : []);
  } catch (error) {
    const unknownCommand = command === undefined || command === 'init' ? '' : `unknown command: ${command}\n`;
    throw new Error(unknownCommand + forInit(error instanceof Error ? error.message : String(error)));
  }
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
export function agentName(packageName) {
  const reduced = packageName
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^[-_]+|[-_]+$/g, '');
  return `${reduced}-agent`;
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
 * @param {string[]} harnesses
 * @returns {string}
 */
function harnessHosts(harnesses) {
  return harnesses.flatMap((harness) => HARNESS_HOSTS[harness] ?? []).join('\n');
}

/**
 * The files init creates, filled from the templates. The compose file is left out without a Playwright version.
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
  const files = [
    ...plannedFiles(harnesses),
    {
      path: 'AGENTS.md',
      content: fillTemplate(templates['AGENTS.md'], { role_wrapper_directories: roleWrapperDirectories(harnesses) }),
    },
    { path: 'CLAUDE.md', content: fillTemplate(templates['CLAUDE.md'], {}) },
    { path: 'agent.sh', content: fillTemplate(templates['agent.sh'], {}), executable: true },
  ];
  if (playwrightVersion === undefined) return files;
  const compose = fillTemplate(templates[COMPOSE_FILE], {
    agent_name: agentName(packageName),
    playwright_version: playwrightVersion,
    harness_hosts: harnessHosts(harnesses),
  });
  return [...files, { path: COMPOSE_FILE, content: compose }];
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
  const indent = packageJson.match(/^[ \t]+(?=")/m)?.[0] ?? '  ';
  const amended = { ...manifest, scripts: { ...manifest.scripts, 'check-changes': CHECK_CHANGES } };
  return JSON.stringify(amended, null, indent) + (packageJson.endsWith('\n') ? '\n' : '');
}

/**
 * A `.dockerignore` pattern as a regular expression, following Docker's rules: `*` and `?` stay within one path
 * segment, `**` spans any number of segments, including none, and the pattern is cleaned as a path first.
 *
 * @param {string} pattern
 * @returns {RegExp}
 */
function dockerignoreRegex(pattern) {
  const cleaned = posix.normalize(pattern).replace(/^\/+|\/+$/g, '');
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
 * True when the `.dockerignore` text keeps `path` out of the build context. As in Docker, the last pattern that
 * matches the path or one of its parent directories decides, and a pattern starting with `!` lets it back in.
 *
 * @param {string} ignore
 * @param {string} path
 * @returns {boolean}
 */
function dockerignoreExcludes(ignore, path) {
  const segments = path.split('/');
  const candidates = segments.map((_, index) => segments.slice(0, index + 1).join('/'));
  let excluded = false;
  for (const line of ignore.split('\n').map((text) => text.trim())) {
    if (line === '' || line.startsWith('#')) continue;
    const negated = line.startsWith('!');
    const regex = dockerignoreRegex(negated ? line.slice(1).trim() : line);
    if (candidates.some((candidate) => regex.test(candidate))) excluded = !negated;
  }
  return excluded;
}

/**
 * The `.dockerignore` to write: a new one when there is none, the existing one with the kit's exception appended
 * when it excludes `node_modules`, in whatever pattern, and keeps any of the kit's `container/` files out of the
 * build context with it, and otherwise `undefined`, for no change. A file that excludes the kit, or one package,
 * without excluding `node_modules` is the project's own choice and is left alone. Every container file is checked,
 * not one, because an exception may let a single file back in.
 *
 * @param {string | undefined} existing
 * @param {string[]} containerFiles the names of the files in the kit's `container/` directory
 * @returns {string | undefined}
 */
export function dockerignore(existing, containerFiles) {
  if (existing === undefined) return DOCKERIGNORE;
  const excludesNodeModules = dockerignoreExcludes(existing, NODE_MODULES_PROBE);
  const keepsKitOut = containerFiles.some((name) => dockerignoreExcludes(existing, `${KIT_CONTAINER}/${name}`));
  if (!excludesNodeModules || !keepsKitOut) return undefined;
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
 * The project's `package.json`, which must name the package, since the sandbox's names are derived from it.
 *
 * @param {string} root
 * @returns {{ text: string, name: string }}
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
  if (typeof name !== 'string' || name === '') {
    throw new Error(`${path} has no name, from which the sandbox's Compose project and image names are derived`);
  }
  return { text, name };
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
 * @returns {Record<string, string>}
 */
function readTemplates() {
  const paths = ['AGENTS.md', 'CLAUDE.md', 'agent.sh', COMPOSE_FILE];
  return Object.fromEntries(
    paths.map((path) => [path, readFileSync(new URL(`../templates/project/${path}`, import.meta.url), 'utf-8')]),
  );
}

/**
 * Writes what is missing in the project at `root`, prints what it did, and returns the exit status.
 *
 * @param {string} root
 * @param {string[]} harnesses
 * @returns {number}
 */
function init(root, harnesses) {
  const manifest = readPackageJson(root);
  const version = playwrightVersion(readLockfile(root));
  const files = projectFiles({
    templates: readTemplates(),
    harnesses,
    packageName: manifest.name,
    playwrightVersion: version,
  });
  /** @type {string[]} */ const notices = [];

  for (const file of files) {
    const absolute = resolve(root, file.path);
    if (exists(absolute)) {
      console.log(`skipped ${file.path}, which exists`);
      if (file.path === 'AGENTS.md') notices.push(agentsNotice(file.content));
      if (file.path === 'CLAUDE.md') notices.push(CLAUDE_NOTICE);
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
    writeFileSync(resolve(root, 'package.json'), amendedManifest);
    console.log('changed package.json');
  }

  const ignorePath = resolve(root, '.dockerignore');
  const existingIgnore = readIfPresent(ignorePath);
  const ignore = dockerignore(existingIgnore, readdirSync(new URL('../container/', import.meta.url)));
  if (ignore === undefined) {
    console.log('skipped .dockerignore, which lets the kit into the build context or does not exclude node_modules');
  } else {
    writeFileSync(ignorePath, ignore);
    console.log(`${existingIgnore === undefined ? 'wrote' : 'changed'} .dockerignore`);
  }

  for (const notice of notices) console.log(`\n${notice}`);

  if (version !== undefined) return 0;
  // An existing compose file is kept, but its Playwright version does not save the build: the image installs
  // Playwright's system libraries from the project's lockfile.
  const composeExists = exists(resolve(root, COMPOSE_FILE));
  if (composeExists) console.log(`skipped ${COMPOSE_FILE}, which exists`);
  console.error(
    `agent-kit: package-lock.json resolves no playwright, so ${COMPOSE_FILE} ` +
      `${composeExists ? 'was left as it is' : 'was not written'}.\n` +
      "The sandbox requires the project to depend on Playwright: the image takes Playwright's browsers at the\n" +
      'version the project resolved. Install it, then run init again.',
  );
  return 1;
}

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
  let harnesses;
  try {
    harnesses = parseInitArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }
  try {
    process.exit(init(process.cwd(), harnesses));
  } catch (error) {
    console.error(`agent-kit: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
