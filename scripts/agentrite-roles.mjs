#!/usr/bin/env node
import { lstatSync, mkdirSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const BODY_LINE =
  'Read `node_modules/@ritenoar/agentrite/roles/{name}.md` in the project root and follow it. ' +
  'It is your instruction; this file holds none of its own.';

const PLANNER_DESCRIPTION =
  'Writes the documents a change unit needs in changes/, which is a spec and a plan for a feature and ' +
  'less for a bug or a task. Use before implementing anything. Dispatch it with the unit directory, and ' +
  'with the request itself when the unit does not exist yet.';

const IMPLEMENTER_DESCRIPTION =
  "Builds an approved change unit and keeps its documents true. Use once the documents the unit's kind " +
  'requires are approved, which for a single-commit bug or a small task may be fewer than a spec and a plan. ' +
  'Dispatch it with the unit directory.';

const REVIEWER_DESCRIPTION =
  'Reviews a finished change unit for spec conformance, plan fidelity and code quality, and returns its ' +
  "findings in its response. It changes nothing under review, and appends one entry to the unit's record.md " +
  'saying that it reviewed. Use once the implementation is committed. Dispatch it with the unit directory; ' +
  'it produces its own diff and runs the suites itself.';

const ROLES = [
  { name: 'planner', description: PLANNER_DESCRIPTION },
  { name: 'implementer', description: IMPLEMENTER_DESCRIPTION },
  { name: 'reviewer', description: REVIEWER_DESCRIPTION },
];

/**
 * @param {{ name: string, description: string }} role
 * @returns {string}
 */
function claudeFile(role) {
  return (
    '---\n' +
    `name: ${role.name}\n` +
    `description: ${role.description}\n` +
    `---\n\n${BODY_LINE.replaceAll('{name}', role.name)}\n`
  );
}

/**
 * @param {{ name: string, description: string }} role
 * @returns {string}
 */
function opencodeFile(role) {
  return (
    '---\n' +
    `description: ${role.description}\n` +
    'mode: subagent\n' +
    `---\n\n${BODY_LINE.replaceAll('{name}', role.name)}\n`
  );
}

const HARNESSES = {
  claude: { directory: '.claude/agents', render: claudeFile },
  opencode: { directory: '.opencode/agents', render: opencodeFile },
};

/**
 * True when `name` is a harness registered in `HARNESSES`, using an own-property check
 * so that inherited `Object.prototype` names such as `toString` are not accepted.
 *
 * @param {string} name
 * @returns {boolean}
 */
function isKnownHarness(name) {
  return Object.hasOwn(HARNESSES, name);
}

/**
 * @returns {string}
 */
function usage() {
  return `usage: agentrite-roles ${Object.keys(HARNESSES).join(' | ')}`;
}

/**
 * @param {string[]} args
 * @returns {string[]}
 */
export function parseHarnesses(args) {
  if (args.length === 0) throw new Error(usage());

  const unknown = args.filter((name) => !isKnownHarness(name));
  if (unknown.length > 0) {
    throw new Error(`${unknown.map((name) => `unknown harness: ${name}`).join(', ')}\n${usage()}`);
  }

  return [...new Set(args)];
}

/**
 * @param {string[]} harnesses
 * @returns {{ path: string, content: string }[]}
 */
export function plannedFiles(harnesses) {
  /** @type {{ path: string, content: string }[]} */ const files = [];
  for (const harness of harnesses) {
    for (const role of ROLES) {
      files.push({
        path: `${HARNESSES[harness].directory}/${role.name}.md`,
        content: HARNESSES[harness].render(role),
      });
    }
  }
  return files;
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
  const root = process.cwd();
  let files;

  try {
    files = plannedFiles(parseHarnesses(process.argv.slice(2))).map((file) => ({
      ...file,
      absolute: resolve(root, file.path),
    }));
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exit(2);
  }

  const existing = files.filter((file) => {
    try {
      lstatSync(file.absolute);
      return true;
    } catch {
      return false;
    }
  });
  if (existing.length > 0) {
    console.error(
      `refusing to overwrite an existing file:\n${existing.map((file) => `- ${file.absolute}`).join('\n')}`,
    );
    process.exit(1);
  }

  for (const file of files) {
    mkdirSync(dirname(file.absolute), { recursive: true });
    writeFileSync(file.absolute, file.content, { flag: 'wx' });
    console.log(file.path);
  }
}
