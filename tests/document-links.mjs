// The links between the kit's documents, judged against the headings each holds. Pure: these take the texts of the
// documents and return data, and read no file.

const FENCE = /^\s*(```|~~~)/;
const HEADING = /^#{1,6}\s+(.*?)\s*#*\s*$/;

// An inline code span, or a link whose text may hold inline code and wrap over lines. The alternation is tried at
// each position, so a span outside a link swallows any link written inside it.
const CODE_OR_LINK = /(`+)[\s\S]*?\1|(?<!!)\[((?:[^[\]`]|`[^`]*`)*)\]\(([^)\s]*)\)/g;

// The text with every line of a fenced code block, fences included, blanked, so that line numbers keep.
function outsideFences(text) {
  let fenced = false;
  return text
    .split('\n')
    .map((line) => {
      if (FENCE.test(line)) {
        fenced = !fenced;
        return '';
      }
      return fenced ? '' : line;
    })
    .join('\n');
}

function anchorOf(heading) {
  return heading
    .toLowerCase()
    .replace(/[^\p{L}\p{N} _-]/gu, '')
    .replace(/ /g, '-');
}

// The anchors GitHub gives the headings of a text, in order, a repeat taking `-1`, `-2` and so on.
export function headingAnchors(text) {
  const seen = new Map();
  return outsideFences(text)
    .split('\n')
    .flatMap((line) => {
      const match = HEADING.exec(line);
      if (!match) return [];
      const anchor = anchorOf(match[1]);
      const count = seen.get(anchor) ?? 0;
      seen.set(anchor, count + 1);
      return [count === 0 ? anchor : `${anchor}-${count}`];
    });
}

// The links `[text](target)` of a text outside fenced and inline code. An image is not a link.
export function markdownLinks(text) {
  return [...outsideFences(text).matchAll(CODE_OR_LINK)]
    .filter((match) => match[3] !== undefined)
    .map((match) => ({ text: match[2], target: match[3] }));
}

// What is wrong with each link of `documents`, a map of a name to its text, that names a document of `names` or a
// bare anchor. A document of `names` missing from `documents` does not exist.
export function linkFaults(documents, names) {
  const anchors = new Map(Object.entries(documents).map(([name, text]) => [name, new Set(headingAnchors(text))]));
  return Object.entries(documents).flatMap(([name, text]) =>
    markdownLinks(text).flatMap((link) => {
      const [path, anchor] = link.target.split('#');
      const target = path === '' ? name : path;
      if (!names.includes(target)) return [];
      const written = `[${link.text}](${link.target})`;
      if (!anchors.has(target)) return [`${name}: ${written} finds no document ${target}`];
      if (anchor === undefined || anchors.get(target).has(anchor)) return [];
      return [`${name}: ${written} finds no heading ${anchor} in ${target}`];
    }),
  );
}
