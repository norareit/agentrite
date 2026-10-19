import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const BODY_LINE =
  'Read `{path}` in the project root and follow it. It is your instruction; this file holds none of its own.';

/** The four roles every project has, in the order of their stages, which every listing gives first. */
export const ROLE_NAMES = ['specifier', 'planner', 'implementer', 'reviewer'];

/**
 * @typedef {{ name: string, path: string, description: string }} Role
 */

/**
 * The description that the front matter of a role file holds, or `undefined` for a text whose front matter is not
 * in one of its two forms: a line `---`, then either the line `description: <text>` or the line `description: >-`
 * followed by the text on lines indented by two spaces, then a line `---`. The folded form is read as YAML reads it,
 * as one line whose lines are joined by spaces. No YAML parser is used, and nothing else may stand in the front
 * matter.
 *
 * @param {string} text
 * @returns {string | undefined}
 */
export function parseRoleDescription(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return undefined;
  const end = lines.indexOf('---', 1);
  if (end === -1) return undefined;
  const [first, ...rest] = lines.slice(1, end);
  if (first === undefined || !first.startsWith('description:')) return undefined;
  const value = first.slice('description:'.length).trim();
  if (value === '>-') return foldedDescription(rest);
  return value === '' || rest.length > 0 ? undefined : value;
}

/**
 * The text of the lines of a folded description, each indented by two spaces and then a character that is not a
 * space, joined by single spaces, or `undefined` when there are none or one is indented otherwise.
 *
 * @param {string[]} lines
 * @returns {string | undefined}
 */
function foldedDescription(lines) {
  if (lines.length === 0 || !lines.every((line) => /^ {2}\S/.test(line))) return undefined;
  return lines.map((line) => line.slice(2).trimEnd()).join(' ');
}

const FRONT_MATTER_FORM =
  'It must be a line ---, then either the line description: <text>, or the line description: >- followed by the ' +
  'text on lines indented by two spaces, then a line ---';

/**
 * @param {unknown} error
 * @returns {string}
 */
function messageOf(error) {
  return error instanceof Error ? error.message : String(error);
}

/**
 * Each role with the path of its file, as `roles` gives it, and the description that file holds, in the order of
 * `roles`, which holds the four of `ROLE_NAMES` and then any roles of the project's own. A file two roles share is
 * read for each. Throws, naming the file, for one that cannot be read and for one without the front matter of
 * `parseRoleDescription`.
 *
 * @param {string} root
 * @param {Record<string, string>} roles
 * @returns {Role[]}
 */
export function readRoles(root, roles) {
  return Object.entries(roles).map(([name, path]) => {
    let text;
    try {
      text = readFileSync(resolve(root, path), 'utf-8');
    } catch (error) {
      throw new Error(`cannot read ${path}: ${messageOf(error)}`);
    }
    const description = parseRoleDescription(text);
    if (description === undefined) {
      throw new Error(`${path} has no front matter that a role file must open with. ${FRONT_MATTER_FORM}`);
    }
    return { name, path, description };
  });
}

// The longest line a wrapper holds, so that a project wrapping its text at 120 characters can commit the wrappers
// as they are written.
const LINE_WIDTH = 120;

/**
 * `text` as lines that each start with `indent` and hold as many whole words as fit in `width` characters, the
 * indent included. A word is never broken, so one longer than the width is a line of its own.
 *
 * @param {string} text
 * @param {number} width
 * @param {string} indent
 * @returns {string[]}
 */
export function wrapWords(text, width, indent) {
  /** @type {string[]} */ const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line !== '' && `${indent}${line} ${word}`.length > width) {
      lines.push(indent + line);
      line = word;
    } else {
      line = line === '' ? word : `${line} ${word}`;
    }
  }
  return [...lines, indent + line];
}

/**
 * The description as a folded block scalar, which YAML reads as the one line it is written from: the breaks fold
 * to spaces and `-` drops the final newline.
 *
 * @param {string} description
 * @returns {string}
 */
function descriptionBlock(description) {
  return `description: >-\n${wrapWords(description, LINE_WIDTH, '  ').join('\n')}\n`;
}

/**
 * @param {string} path
 * @returns {string}
 */
function body(path) {
  return `${wrapWords(BODY_LINE.replace('{path}', path), LINE_WIDTH, '').join('\n')}\n`;
}

/**
 * @param {Role} role
 * @returns {string}
 */
function claudeFile(role) {
  return `---\nname: ${role.name}\n${descriptionBlock(role.description)}---\n\n${body(role.path)}`;
}

/**
 * @param {Role} role
 * @returns {string}
 */
function opencodeFile(role) {
  return `---\n${descriptionBlock(role.description)}mode: all\n---\n\n${body(role.path)}`;
}

// `ownAgents` are the names of the agents the harness has of its own, as its documentation writes them on
// 2026-10-19: https://code.claude.com/docs/en/sub-agents and https://opencode.ai/docs/agents/
const HARNESSES = {
  claude: {
    title: 'Claude Code',
    directory: '.claude/agents',
    render: claudeFile,
    ownAgents: ['Explore', 'Plan', 'general-purpose', 'claude', 'statusline-setup', 'claude-code-guide', 'fork'],
  },
  opencode: {
    title: 'OpenCode',
    directory: '.opencode/agents',
    render: opencodeFile,
    ownAgents: ['build', 'plan', 'general', 'explore', 'scout', 'compaction', 'title', 'summary'],
  },
};

/** The names of the harnesses the kit writes wrappers for, as the commands take them. */
export const HARNESS_NAMES = Object.keys(HARNESSES);

/**
 * The titles of the harnesses, in the order of `HARNESS_NAMES`, that have an agent of their own named `name`,
 * without regard to case, and an empty list when none does.
 *
 * @param {string} name
 * @returns {string[]}
 */
export function harnessesWithAgent(name) {
  const lowered = name.toLowerCase();
  return Object.values(HARNESSES)
    .filter((entry) => entry.ownAgents.some((agent) => agent.toLowerCase() === lowered))
    .map((entry) => entry.title);
}

/**
 * The directory of each harness's wrappers, in the order the harnesses are given.
 *
 * @param {string[]} harnesses
 * @returns {string[]}
 */
export function wrapperDirectories(harnesses) {
  return harnesses.map((harness) => HARNESSES[harness].directory);
}

/**
 * The wrappers of each role for each harness, written from `roles`, as `readRoles` gives them: each with its role's
 * description, and a body that says to read its role's file.
 *
 * @param {string[]} harnesses
 * @param {Role[]} roles
 * @returns {{ path: string, content: string }[]}
 */
export function plannedFiles(harnesses, roles) {
  /** @type {{ path: string, content: string }[]} */ const files = [];
  for (const harness of harnesses) {
    for (const role of roles) {
      files.push({
        path: `${HARNESSES[harness].directory}/${role.name}.md`,
        content: HARNESSES[harness].render(role),
      });
    }
  }
  return files;
}
