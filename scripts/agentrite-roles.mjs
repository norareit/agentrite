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
export function descriptionBlock(description) {
  return `description: >-\n${wrapWords(description, LINE_WIDTH, '  ').join('\n')}\n`;
}

/**
 * The body of a wrapper, which says to read the role's file at `path`.
 *
 * @param {string} path
 * @returns {string}
 */
export function wrapperBody(path) {
  return `${wrapWords(BODY_LINE.replace('{path}', path), LINE_WIDTH, '').join('\n')}\n`;
}

/**
 * True when `text` is `opening`, then the body the kit writes for the path its first backtick opens, then
 * `closing`. A path that holds a space may be wrapped at it, so a line break in the path is read as a space.
 *
 * @param {string} text
 * @param {string} opening
 * @param {string} closing
 * @returns {boolean}
 */
export function isWrapperBody(text, opening, closing) {
  const start = text.indexOf('`');
  if (start === -1) return false;
  // A path may hold a backtick, so each backtick after the opening one is tried as the end of the path
  for (let end = text.indexOf('`', start + 1); end !== -1; end = text.indexOf('`', end + 1)) {
    const path = text.slice(start + 1, end).replaceAll('\n', ' ');
    if (text === `${opening}${wrapperBody(path)}${closing}`) return true;
  }
  return false;
}

/**
 * True when `text` is a wrapper as the kit writes it, whatever role, harness or path it names: front matter that is
 * not looked into, so that a pinned model does not matter, then the body the kit writes for the path its first line
 * names.
 *
 * @param {string} text
 * @returns {boolean}
 */
export function isKitWrapper(text) {
  const lines = text.split(/\r?\n/);
  if (lines[0] !== '---') return false;
  const end = lines.indexOf('---', 1);
  if (end === -1) return false;
  return isWrapperBody(lines.slice(end + 1).join('\n'), '\n', '');
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
