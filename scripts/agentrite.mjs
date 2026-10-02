#!/usr/bin/env node
import { chmodSync, lstatSync, mkdirSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { parseHarnesses, plannedFiles } from './agentrite-roles.mjs';

const CHECK_CHANGES = 'node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs';
// The kit's container/ directory as a project installs it, from which the image build copies its files.
const KIT_CONTAINER = 'node_modules/@ritenoar/agentrite/container';
// Names the files, not only the directory: BuildKit would not let a directory's exception reach a file that a
// pattern excluded by name.
const KIT_CONTAINER_EXCEPTION = `!${KIT_CONTAINER}/**`;
const COMPOSE_FILE = 'agent/compose.project.yml';

const DOCKERIGNORE =
  "# Keeps node_modules out of the image build context, except AgentRite's container/\n" +
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
 * @param {unknown} error
 * @returns {string}
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * agentrite-roles words its usage for its own command. The harnesses it lists are the ones each command here takes.
 *
 * @param {string} command
 * @param {string} message
 * @returns {string}
 */
function forCommand(command, message) {
  return message.replace('usage: agentrite-roles ', `usage: agentrite ${command} `);
}

/**
 * The usage of every command, one to a line, the lines after the first indented to start under the command's name.
 *
 * @returns {string}
 */
function usage() {
  try {
    // With no harnesses, parseHarnesses throws its usage alone.
    parseHarnesses([]);
  } catch (error) {
    const lines = Object.keys(COMMANDS).map((command) => forCommand(command, messageOf(error)));
    return lines.join('\n').replaceAll('\nusage: ', '\n       ');
  }
  throw new Error('parseHarnesses accepted an empty list of harnesses');
}

/**
 * @param {string[]} args
 * @returns {{ command: string, harnesses: string[] }}
 */
export function parseArgs(args) {
  const [command, ...names] = args;
  if (command === undefined) throw new Error(usage());
  if (!Object.hasOwn(COMMANDS, command)) throw new Error(`unknown command: ${command}\n${usage()}`);
  try {
    return { command, harnesses: parseHarnesses(names) };
  } catch (error) {
    throw new Error(forCommand(command, messageOf(error)));
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
 * The shim that runs the kit's sandbox from the project root.
 *
 * @param {Record<string, string>} templates
 * @returns {{ path: string, content: string, executable: boolean }}
 */
function shimFile(templates) {
  return { path: 'agent.sh', content: fillTemplate(templates['agent.sh'], {}), executable: true };
}

/**
 * The generated files that hold nothing but what the kit put there, which refresh keeps as the release writes
 * them: the role wrappers, whose frontmatter a project may have added keys to, and the shim.
 *
 * @param {{ templates: Record<string, string>, harnesses: string[] }} project
 * @returns {{ path: string, content: string, executable?: boolean, keepsFrontmatter?: boolean }[]}
 */
function kitOwnedFiles({ templates, harnesses }) {
  return [...plannedFiles(harnesses).map((file) => ({ ...file, keepsFrontmatter: true })), shimFile(templates)];
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
    shimFile(templates),
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
 * A wrapper as its frontmatter lines, between a first line of `---` and the next one, and the lines after them.
 * Undefined for a text that does not open with such a block.
 *
 * @param {string} wrapper
 * @returns {{ frontmatter: string[], rest: string[] } | undefined}
 */
function splitWrapper(wrapper) {
  // A wrapper saved with CRLF is read as the same lines. What is written from them ends in LF, as the release's does.
  const lines = wrapper.split(/\r?\n/);
  const end = lines.indexOf('---', 1);
  if (lines[0] !== '---' || end === -1) return undefined;
  return { frontmatter: lines.slice(1, end), rest: lines.slice(end + 1) };
}

// A key at the left margin, as YAML lets a block mapping write one: in double quotes, in single quotes or plain,
// with any space before its colon, and the colon followed by space or by the end of the line. That last part is
// what tells a key from a value that holds a colon. A line that opens with `-` is an item of a list, not a key.
const KEY_LINE = /^(?:"([^"]*)"|'([^']*)'|([^\s"'#?:-][^:]*?))[ \t]*:(?:[ \t]|$)/;

/**
 * The name of the key `line` opens, without its quotes, so that `"mode"` and `mode` are one key. Undefined for a
 * line that opens none.
 *
 * @param {string} line
 * @returns {string | undefined}
 */
function keyName(line) {
  const key = line.match(KEY_LINE);
  return key ? (key[1] ?? key[2] ?? key[3]) : undefined;
}

/**
 * The frontmatter's keys, each with its lines: the line that names it at the left margin and every line up to the
 * next key, which holds a value that runs on, such as a folded text, a nested map or a list.
 *
 * @param {string[]} frontmatter
 * @returns {{ name: string, lines: string[] }[]}
 */
function keyBlocks(frontmatter) {
  /** @type {{ name: string, lines: string[] }[]} */ const blocks = [];
  for (const line of frontmatter) {
    const name = keyName(line);
    if (name !== undefined) blocks.push({ name, lines: [line] });
    else blocks.at(-1)?.lines.push(line);
  }
  return blocks;
}

/**
 * What to write over a wrapper a project already has: the wrapper as this release renders it, with every
 * frontmatter key of the existing one that the release does not write kept after the release's own, in the order
 * they had. That keeps a model the project pinned for the role. The keys the release writes and the whole body are
 * the release's.
 *
 * @param {string} existing
 * @param {string} rendered
 * @returns {string}
 */
export function refreshedWrapper(existing, rendered) {
  const current = splitWrapper(existing);
  const release = splitWrapper(rendered);
  if (current === undefined || release === undefined) return rendered;

  const written = new Set(keyBlocks(release.frontmatter).map((block) => block.name));
  const kept = keyBlocks(current.frontmatter)
    .filter((block) => !written.has(block.name))
    .flatMap((block) => block.lines);
  return ['---', ...release.frontmatter, ...kept, '---', ...release.rest].join('\n');
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
    `agentrite: package-lock.json resolves no playwright, so ${COMPOSE_FILE} ` +
      `${composeExists ? 'was left as it is' : 'was not written'}.\n` +
      "The sandbox requires the project to depend on Playwright: the image takes Playwright's browsers at the\n" +
      'version the project resolved. Install it, then run init again.',
  );
  return 1;
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
 * Makes the kit's own files in the project at `root` what this release writes, prints what it did to each, and
 * returns the exit status.
 *
 * @param {string} root
 * @param {string[]} harnesses
 * @returns {number}
 */
function refresh(root, harnesses) {
  let status = 0;
  for (const file of kitOwnedFiles({ templates: readTemplates(), harnesses })) {
    const absolute = resolve(root, file.path);
    const kind = kindOf(absolute);
    if (kind === 'other') {
      console.error(`agentrite: left ${file.path}, which is not a regular file`);
      status = 1;
      continue;
    }

    const existing = kind === 'file' ? readFileSync(absolute, 'utf-8') : undefined;
    const content =
      existing !== undefined && file.keepsFrontmatter ? refreshedWrapper(existing, file.content) : file.content;
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
  return status;
}

/**
 * The commands, by the name each is run with. Each takes the project root and the harnesses, and returns the exit
 * status.
 *
 * @type {Record<string, (root: string, harnesses: string[]) => number>}
 */
const COMMANDS = { init, refresh };

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
    process.exit(COMMANDS[parsed.command](process.cwd(), parsed.harnesses));
  } catch (error) {
    console.error(`agentrite: ${messageOf(error)}`);
    process.exit(1);
  }
}
