import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  CLAUDE_LINES,
  claudeInitNotice,
  claudeLacks,
  claudeRefreshNotice,
  OPENCODE_FILE,
  opencodeInitNotice,
  opencodeRefreshNotice,
  INSTRUCTION_PATHS,
  opencodeVerdict,
  PROCESS_PATH,
  readProjectFile,
  STANDARDS_PATH,
} from '../scripts/agentrite-instructions.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const PROCESS = 'node_modules/agentrite/process.md';
const STANDARDS = 'node_modules/agentrite/standards.md';
const IMPORT = `@${PROCESS}`;
const STANDARDS_IMPORT = `@${STANDARDS}`;
const LINES = [IMPORT, STANDARDS_IMPORT, '@AGENTS.md'];
const SECTION = 'See "How the kit\'s instructions reach an agent" in node_modules/agentrite/README.md.';
// The file of R3 of unit 0048 and R18 of unit 0052, byte for byte.
const WRITTEN =
  '{\n  "instructions": [\n    "node_modules/agentrite/process.md",\n    "node_modules/agentrite/standards.md"\n' +
  '  ]\n}\n';

/** @param {string} text */
function found(text) {
  return { found: true, text };
}

const MISSING = { found: false };
const UNREADABLE = { found: true, error: 'EISDIR: illegal operation on a directory, read' };

/** @param {string} text */
function assertLinesFit(text) {
  for (const line of text.split('\n')) assert.ok(line.length <= 120, `over 120 characters: ${line}`);
}

test('the path, the lines and the file are named as the spec gives them', () => {
  assert.equal(PROCESS_PATH, PROCESS);
  assert.equal(STANDARDS_PATH, STANDARDS);
  assert.deepEqual(INSTRUCTION_PATHS, [PROCESS, STANDARDS]);
  assert.deepEqual(CLAUDE_LINES, LINES);
  assert.equal(OPENCODE_FILE, 'opencode.json');
});

// R2, R9, R10 of unit 0048, R18 of unit 0052

test('a CLAUDE.md with the three lines lacks none, in LF and in CRLF', () => {
  assert.deepEqual(claudeLacks(found(`# Ours\n\n${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md\n`)), []);
  assert.deepEqual(claudeLacks(found(`# Ours\r\n\r\n${IMPORT}\r\n${STANDARDS_IMPORT}\r\n@AGENTS.md\r\n`)), []);
  assert.deepEqual(claudeLacks(found(`@AGENTS.md\n${STANDARDS_IMPORT}\n${IMPORT}`)), []);
});

test('a CLAUDE.md lacks each line it does not hold, in the order of the lines', () => {
  assert.deepEqual(claudeLacks(found(`${STANDARDS_IMPORT}\n@AGENTS.md\n`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n@AGENTS.md\n`)), [STANDARDS_IMPORT]);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}\n`)), ['@AGENTS.md']);
  assert.deepEqual(claudeLacks(found('@AGENTS.md\n')), [IMPORT, STANDARDS_IMPORT]);
  assert.deepEqual(claudeLacks(found('our own\n')), LINES);
  assert.deepEqual(claudeLacks(found('')), LINES);
});

test('a line counts only when it is exactly the text', () => {
  const rest = `${STANDARDS_IMPORT}\n@AGENTS.md\n`;
  assert.deepEqual(claudeLacks(found(`${IMPORT} \n${rest}`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`  ${IMPORT}\n${rest}`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`Import ${IMPORT} here\n${rest}`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md is imported\n`)), ['@AGENTS.md']);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\r\r\n${rest}`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}.\n@AGENTS.md\n`)), [STANDARDS_IMPORT]);
});

test('a CLAUDE.md that is missing or cannot be read lacks the three lines', () => {
  assert.deepEqual(claudeLacks(MISSING), LINES);
  assert.deepEqual(claudeLacks(UNREADABLE), LINES);
});

// R3, R4, R5, R9, R10 of unit 0048, R18 of unit 0052

test('a missing opencode.json lacks both paths and gives the file of R3 to write', () => {
  assert.deepEqual(opencodeVerdict(MISSING), {
    loads: false,
    problem: 'it is missing',
    lacks: [PROCESS, STANDARDS],
    content: WRITTEN,
  });
});

test('an opencode.json that cannot be read lacks both paths, and gives its error and nothing to write', () => {
  assert.deepEqual(opencodeVerdict(UNREADABLE), {
    loads: false,
    problem: `it cannot be read: ${UNREADABLE.error}`,
    lacks: [PROCESS, STANDARDS],
    content: undefined,
  });
});

test('an opencode.json that is not JSON loads the paths when its text holds each in quotes', () => {
  const withComment = `{\n  // ours\n  "instructions": ["${PROCESS}", "${STANDARDS}"]\n}\n`;
  assert.deepEqual(opencodeVerdict(found(withComment)), { loads: true });
});

/** @param {string} text */
function parserMessageOf(text) {
  try {
    JSON.parse(text);
  } catch (error) {
    return error.message;
  }
  throw new Error(`${text} is JSON`);
}

test('an opencode.json that is not JSON otherwise lacks what it does not quote, and gives nothing to write', () => {
  const cases = [
    [`{\n  // ours, ${PROCESS} without quotes\n}\n`, [PROCESS, STANDARDS]],
    [`{\n  // ours\n  "instructions": ["${PROCESS}"]\n}\n`, [STANDARDS]],
    [`{\n  // ours\n  "instructions": ["${STANDARDS}"]\n}\n`, [PROCESS]],
  ];
  for (const [text, lacks] of cases) {
    assert.deepEqual(
      opencodeVerdict(found(text)),
      { loads: false, problem: `it is not JSON: ${parserMessageOf(text)}`, lacks, content: undefined },
      text,
    );
  }
});

test('JSON that is not an object lacks both paths and gives nothing to write', () => {
  for (const text of ['[]', 'null', '"x"', '3']) {
    assert.deepEqual(
      opencodeVerdict(found(text)),
      { loads: false, problem: 'it is not a JSON object', lacks: [PROCESS, STANDARDS], content: undefined },
      text,
    );
  }
});

test('an object with no instructions gets both last, keeping its keys, its tab and its missing line break', () => {
  const text = '{\n\t"$schema": "https://opencode.ai/config.json",\n\t"model": "x"\n}';
  const expected =
    '{\n\t"$schema": "https://opencode.ai/config.json",\n\t"model": "x",\n\t"instructions": [\n' +
    `\t\t"${PROCESS}",\n\t\t"${STANDARDS}"\n\t]\n}`;
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: 'it has no instructions list',
    lacks: [PROCESS, STANDARDS],
    content: expected,
  });
});

test('instructions that are not a list lack both paths and give nothing to write', () => {
  assert.deepEqual(opencodeVerdict(found('{ "instructions": "x" }')), {
    loads: false,
    problem: 'its instructions is not a list',
    lacks: [PROCESS, STANDARDS],
    content: undefined,
  });
});

test('a list that holds neither path gets both at its end, in order, in the place of the key', () => {
  const text = '{\n  "instructions": ["a.md"],\n  "model": "x"\n}\n';
  const expected =
    `{\n  "instructions": [\n    "a.md",\n    "${PROCESS}",\n    "${STANDARDS}"\n  ],\n  "model": "x"\n}\n`;
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${PROCESS} or ${STANDARDS}`,
    lacks: [PROCESS, STANDARDS],
    content: expected,
  });
});

test('a list that holds only process.md gets standards.md at its end', () => {
  const text = `{\n  "instructions": ["${PROCESS}", "a.md"]\n}\n`;
  const expected = `{\n  "instructions": [\n    "${PROCESS}",\n    "a.md",\n    "${STANDARDS}"\n  ]\n}\n`;
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${STANDARDS}`,
    lacks: [STANDARDS],
    content: expected,
  });
});

test('a list that holds only standards.md gets process.md at its end', () => {
  const text = `{\n  "instructions": ["${STANDARDS}"]\n}\n`;
  const expected = `{\n  "instructions": [\n    "${STANDARDS}",\n    "${PROCESS}"\n  ]\n}\n`;
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${PROCESS}`,
    lacks: [PROCESS],
    content: expected,
  });
});

test('a list that holds both paths loads them, in either order', () => {
  assert.deepEqual(opencodeVerdict(found(`{ "instructions": ["a.md", "${PROCESS}", "${STANDARDS}"] }`)), {
    loads: true,
  });
  assert.deepEqual(opencodeVerdict(found(`{ "instructions": ["${STANDARDS}", "${PROCESS}"] }`)), { loads: true });
  assert.deepEqual(opencodeVerdict(found(WRITTEN)), { loads: true });
});

// R2, R5, R9, R12 of unit 0048, R18 of unit 0052

test('the notice of init for CLAUDE.md names the lines it was given and points to the section', () => {
  const all = claudeInitNotice(LINES);
  assert.ok(all.startsWith('CLAUDE.md exists and was left as it is.'), all);
  assert.ok(all.includes("Claude Code does not read the kit's\ninstructions without them"), all);
  assert.ok(all.includes(`\n\n${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md\n\n`), all);
  assert.ok(all.endsWith(`${SECTION}\n`), all);
  assertLinesFit(all);

  const one = claudeInitNotice([STANDARDS_IMPORT]);
  assert.ok(one.includes(`\n\n${STANDARDS_IMPORT}\n\n`), one);
  assert.ok(!one.includes(`${IMPORT}\n`) && !one.includes('@AGENTS.md\n'), one);
});

test('the notice of init for opencode.json gives the problem, the paths it was given and the section', () => {
  const both = opencodeInitNotice('it is not a JSON object', [PROCESS, STANDARDS]);
  assert.equal(
    both,
    'opencode.json was left as it is, because it is not a JSON object.\n' +
      "For OpenCode to read the kit's instructions, its instructions list must hold the paths below.\n" +
      `Add them by hand:\n\n${PROCESS}\n${STANDARDS}\n\n${SECTION}\n`,
  );
  assertLinesFit(both);

  const one = opencodeInitNotice('it is not JSON: x', [STANDARDS]);
  assert.ok(one.includes(`:\n\n${STANDARDS}\n\n`), one);
  assert.ok(!one.includes(PROCESS), one);
  assertLinesFit(one);
});

test('the notice of refresh for CLAUDE.md says why, names the lines and says refresh does not add them', () => {
  const missing = claudeRefreshNotice(true, LINES);
  assert.ok(missing.startsWith("CLAUDE.md does not load the kit's instructions, because it is missing."), missing);
  assert.ok(missing.includes(`\n\n${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md\n\n`), missing);
  assert.ok(missing.includes('refresh does\nnot add them'), missing);
  assert.ok(missing.endsWith(`${SECTION}\n`), missing);
  assertLinesFit(missing);

  const lacking = claudeRefreshNotice(false, [STANDARDS_IMPORT]);
  assert.ok(lacking.includes('because it lacks the lines below.'), lacking);
  assert.ok(lacking.includes(`\n\n${STANDARDS_IMPORT}\n\n`), lacking);
  assertLinesFit(lacking);
});

test('the notice of refresh for opencode.json gives the problem, the paths, and says refresh does not add them', () => {
  const cases = [
    ['it is missing', [PROCESS, STANDARDS]],
    ['it has no instructions list', [PROCESS, STANDARDS]],
    [`its instructions list does not hold ${PROCESS} or ${STANDARDS}`, [PROCESS, STANDARDS]],
    [`its instructions list does not hold ${STANDARDS}`, [STANDARDS]],
  ];
  for (const [problem, lacks] of cases) {
    const notice = opencodeRefreshNotice(problem, lacks);
    assert.equal(
      notice,
      `opencode.json does not load the kit's instructions,\nbecause ${problem}.\n` +
        'OpenCode does not read them without the paths below in its instructions list, and refresh\n' +
        `does not add them:\n\n${lacks.join('\n')}\n\n${SECTION}\n`,
    );
    assertLinesFit(notice);
  }
});

test('no notice holds an em dash', () => {
  const notices = [
    claudeInitNotice(LINES),
    opencodeInitNotice('it is missing', [PROCESS, STANDARDS]),
    claudeRefreshNotice(true, LINES),
    opencodeRefreshNotice('it is missing', [PROCESS, STANDARDS]),
  ];
  for (const notice of notices) assert.ok(!notice.includes('\u2014'), notice);
});

// R5, R9

test('readProjectFile tells a file, nothing, and something there that cannot be read apart', (t) => {
  const root = temporaryDirectory(t, 'agentrite-instructions-');
  writeFileSync(join(root, 'file.json'), '{}\n');
  mkdirSync(join(root, 'directory'));
  symlinkSync(join(root, 'nowhere'), join(root, 'dangling'));

  assert.deepEqual(readProjectFile(root, 'file.json'), { found: true, text: '{}\n' });
  assert.deepEqual(readProjectFile(root, 'nothing.json'), { found: false });
  for (const path of ['directory', 'dangling']) {
    const read = readProjectFile(root, path);
    assert.equal(read.found, true, path);
    assert.equal(read.text, undefined, path);
    assert.equal(typeof read.error, 'string', path);
    assert.ok(read.error.length > 0, path);
  }
});
