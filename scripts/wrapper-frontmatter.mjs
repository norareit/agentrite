// Reads the frontmatter of a role wrapper well enough to keep what a project added to it, without a YAML parser.
//
// It reads one exact form and reports anything else rather than guess. A guess that takes the inside of a value for
// a key cuts the value in two, and one that misses a key drops it, and either way the wrapper is changed wrongly
// with nothing said. The form is chosen so that this cannot happen: the only things in YAML that let a value run
// on to a line at the left margin are a quoted text, a bracketed list or map, and a text opened by `|` or `>`. The
// first two must start and end on one line here, and the third is told by its indentation. So a line read as a key
// is a key.

// A key at the left margin: a plain name, its colon, and a value after one space or none at all.
const TOP_KEY = /^([A-Za-z_][\w-]*):(?: (.*))?$/;
// A key anywhere below one: plain, without a character that could open something else, or a quoted text that ends
// before its colon.
const NESTED_KEY = /^(?:[^\s'"[\]{}:#,&*!|>%@`?-][^'"[\]{}:#]*|"(?:[^"\\]|\\.)*"|'(?:[^']|'')*'):(?: (.*))?$/;
const LIST_ITEM = /^-(?: +|$)/;
const DOUBLE_QUOTED = /^"(?:[^"\\]|\\.)*"(?: +#.*)?$/;
const SINGLE_QUOTED = /^'(?:[^']|'')*'(?: +#.*)?$/;
// `|` or `>`, with the indicators YAML allows after it, and nothing else on the line but a comment.
const BLOCK_TEXT = /^[|>](?:[1-9][+-]?|[+-][1-9]?)?(?: +#.*)?$/;
/** @type {Record<string, string>} */
const CLOSERS = { '[': ']', '{': '}' };

/**
 * @param {string} line
 * @returns {number}
 */
function indentOf(line) {
  return line.length - line.trimStart().length;
}

/**
 * True for a bracketed list or map that opens with the first character of `value`, closes with its last and holds
 * no quote, which is what lets brackets be counted without reading what is between them.
 *
 * @param {string} value
 * @returns {boolean}
 */
function closesOnItsLine(value) {
  if (/['"]/.test(value)) return false;
  /** @type {string[]} */ const open = [];
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (Object.hasOwn(CLOSERS, character)) open.push(CLOSERS[character]);
    else if (character === ']' || character === '}') {
      if (open.pop() !== character) return false;
      if (open.length === 0) return index === value.length - 1;
    }
  }
  return false;
}

/**
 * What keeps a value from being read, or undefined for one that is: nothing, a quoted text or a bracketed list or
 * map that starts and ends on its line, or a text with no quote in it.
 *
 * @param {string} value
 * @returns {string | undefined}
 */
function valueProblem(value) {
  if (value.startsWith('"') || value.startsWith("'")) {
    const closed = DOUBLE_QUOTED.test(value) || SINGLE_QUOTED.test(value);
    return closed ? undefined : 'a quoted text that does not start and end on this line';
  }
  if (value.startsWith('[') || value.startsWith('{')) {
    return closesOnItsLine(value)
      ? undefined
      : 'a bracketed list or map that does not start and end on this line, or holds a quote';
  }
  if (value.startsWith('&') || value.startsWith('!')) return 'an anchor or a tag';
  return /['"]/.test(value) ? 'a quote in a text that is not quoted' : undefined;
}

/**
 * The lines among `waiting` that travel with a key: its comments, and not the blank lines around them. A kept key
 * is written after the release's own, and the release may end those with a text opened by `>`, which would take a
 * blank line that follows it for its own.
 *
 * @param {string[]} waiting
 * @returns {string[]}
 */
function carried(waiting) {
  return waiting.filter((line) => line.trim() !== '');
}

/**
 * The frontmatter's keys, each with its lines: the comments directly above it, the line that names it at the left
 * margin, and every line of its value below that. With them, the comments that follow the last key. Or the first
 * line that is not in the form this module reads, by its index, with what is wrong with it.
 *
 * @param {string[]} frontmatter
 * @returns {{ blocks: { name: string, lines: string[] }[], loose: string[] } | { index: number, problem: string }}
 */
function keyBlocks(frontmatter) {
  /** @type {{ name: string, lines: string[] }[]} */ const blocks = [];
  // Comment and blank lines at the left margin not yet followed by anything: they go with what comes next.
  /** @type {string[]} */ let waiting = [];
  // Inside a text opened by `|` or `>`: the column its key starts at, past which every line is that text.
  /** @type {number | undefined} */ let textColumn;

  for (const [index, line] of frontmatter.entries()) {
    const indent = indentOf(line);
    if (textColumn !== undefined) {
      if (line.trim() === '' || (indent > textColumn && !line.startsWith('\t'))) {
        blocks.at(-1)?.lines.push(line);
        continue;
      }
      textColumn = undefined;
    }
    if (line.trim() === '') {
      waiting.push(line);
      continue;
    }
    if (line.trimStart().startsWith('#')) {
      // An indented comment is inside the value above it. One at the left margin goes with what comes next.
      const block = blocks.at(-1);
      if (indent === 0) waiting.push(line);
      else if (block) block.lines.push(...waiting.splice(0), line);
      else return { index, problem: 'a line with no key above it' };
      continue;
    }
    if (line.slice(0, indent).includes('\t')) return { index, problem: 'a tab in the indentation' };

    let rest = line.slice(indent);
    let column = indent;
    for (let item = rest.match(LIST_ITEM); item; item = rest.match(LIST_ITEM)) {
      rest = rest.slice(item[0].length);
      column += item[0].length;
    }

    let value;
    if (column === 0) {
      const key = rest.match(TOP_KEY);
      if (!key) return { index, problem: 'not a plain key followed by a colon' };
      blocks.push({ name: key[1], lines: [...carried(waiting), line] });
      value = key[2] ?? '';
    } else {
      const block = blocks.at(-1);
      if (!block) return { index, problem: 'a line with no key above it' };
      block.lines.push(...waiting, line);
      const key = rest.match(NESTED_KEY);
      value = key ? (key[1] ?? '') : rest;
    }
    waiting = [];

    value = value.trim();
    if (BLOCK_TEXT.test(value)) {
      textColumn = column;
      continue;
    }
    const problem = valueProblem(value);
    if (problem !== undefined) return { index, problem };
  }

  // Comments after the last key go with no key. They are kept, so that they do not vanish on the second refresh,
  // when the keys above them are the release's.
  return { blocks, loose: carried(waiting) };
}

/**
 * A wrapper as its frontmatter lines, between a first line of `---` and the next one, and the lines after them.
 * A wrapper saved with CRLF is read as the same lines. `frontmatter` is undefined when the wrapper does not open
 * with `---`, and `closed` is false when it opens with one that nothing closes.
 *
 * @param {string} wrapper
 * @returns {{ frontmatter: string[] | undefined, rest: string[], closed: boolean }}
 */
function splitWrapper(wrapper) {
  const lines = wrapper.split(/\r?\n/);
  if (lines[0] !== '---') return { frontmatter: undefined, rest: lines, closed: true };
  const end = lines.indexOf('---', 1);
  if (end === -1) return { frontmatter: lines.slice(1), rest: [], closed: false };
  return { frontmatter: lines.slice(1, end), rest: lines.slice(end + 1), closed: true };
}

/**
 * What to write over a wrapper a project already has: the wrapper as this release renders it, with every
 * frontmatter key of the existing one that the release does not write kept after the release's own, in the order
 * they had, each with the comment lines above it. That keeps a model the project pinned for the role. The keys the
 * release writes and the whole body are the release's, and the result ends its lines in LF, as the release does.
 *
 * A wrapper with no frontmatter becomes the release's. One whose frontmatter is not in the form this module reads
 * gives a problem instead of content, naming the line, and is the caller's to leave alone.
 *
 * @param {string} existing
 * @param {string} rendered
 * @returns {{ content: string } | { problem: string }}
 */
export function refreshedWrapper(existing, rendered) {
  const release = splitWrapper(rendered);
  const releaseKeys = keyBlocks(release.frontmatter ?? []);
  if (release.frontmatter === undefined || !release.closed || 'problem' in releaseKeys) {
    throw new Error('the wrapper this release renders is not in the form refresh reads');
  }

  const current = splitWrapper(existing);
  if (current.frontmatter === undefined) return { content: rendered };
  if (!current.closed) return { problem: 'line 1: the frontmatter opened here is not closed by a line of ---' };
  const currentKeys = keyBlocks(current.frontmatter);
  // The frontmatter starts on the wrapper's second line.
  if ('problem' in currentKeys) return { problem: `line ${currentKeys.index + 2}: ${currentKeys.problem}` };

  const written = new Set(releaseKeys.blocks.map((block) => block.name));
  const kept = currentKeys.blocks.filter((block) => !written.has(block.name)).flatMap((block) => block.lines);
  return {
    content: ['---', ...release.frontmatter, ...kept, ...currentKeys.loose, '---', ...release.rest].join('\n'),
  };
}
