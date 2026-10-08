const BODY_LINE =
  'Read `node_modules/@ritenoar/agentrite/roles/{name}.md` in the project root and follow it. ' +
  'It is your instruction; this file holds none of its own.';

const SPECIFIER_DESCRIPTION =
  'Writes what a change unit must make true: the spec of a feature or a bug, or the record of a task, in ' +
  'changes/. Use before anything is planned or implemented. Dispatch it with the request, and with the ' +
  'unit directory when the unit exists already.';

const PLANNER_DESCRIPTION =
  'Writes the plan of an approved change unit, against the tree the unit will be built on. Use once the ' +
  "human has approved the unit's spec and the unit is next to be built, not before. Dispatch it with the " +
  'unit directory.';

const IMPLEMENTER_DESCRIPTION =
  'Builds a planned change unit and keeps its documents true. Use once the unit is planned, or approved ' +
  'where it is a task, which has no plan. Dispatch it with the unit directory.';

const REVIEWER_DESCRIPTION =
  'Reviews a finished change unit for spec conformance, plan fidelity and code quality, and returns its ' +
  "findings in its response. It changes nothing under review, and appends one entry to the unit's record.md " +
  'saying that it reviewed. Use once the implementation is committed. Dispatch it with the unit directory; ' +
  'it produces its own diff and runs the suites itself.';

/** The roles the kit has, in the order every listing of them follows. */
export const ROLES = [
  { name: 'specifier', description: SPECIFIER_DESCRIPTION },
  { name: 'planner', description: PLANNER_DESCRIPTION },
  { name: 'implementer', description: IMPLEMENTER_DESCRIPTION },
  { name: 'reviewer', description: REVIEWER_DESCRIPTION },
];

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
 * @param {string} name
 * @returns {string}
 */
function body(name) {
  return `${wrapWords(BODY_LINE.replaceAll('{name}', name), LINE_WIDTH, '').join('\n')}\n`;
}

/**
 * @param {{ name: string, description: string }} role
 * @returns {string}
 */
function claudeFile(role) {
  return `---\nname: ${role.name}\n${descriptionBlock(role.description)}---\n\n${body(role.name)}`;
}

/**
 * @param {{ name: string, description: string }} role
 * @returns {string}
 */
function opencodeFile(role) {
  return `---\n${descriptionBlock(role.description)}mode: all\n---\n\n${body(role.name)}`;
}

const HARNESSES = {
  claude: { directory: '.claude/agents', render: claudeFile },
  opencode: { directory: '.opencode/agents', render: opencodeFile },
};

/** The names of the harnesses the kit writes wrappers for, as the commands take them. */
export const HARNESS_NAMES = Object.keys(HARNESSES);

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
