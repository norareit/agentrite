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
  opencodeVerdict,
  PROCESS_PATH,
  readProjectFile,
} from '../scripts/agentrite-instructions.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const PROCESS = 'node_modules/agentrite/process.md';
const IMPORT = `@${PROCESS}`;
const SECTION = 'See "How the kit\'s instructions reach an agent" in node_modules/agentrite/README.md.';
// The file of R3, byte for byte.
const WRITTEN = '{\n  "instructions": [\n    "node_modules/agentrite/process.md"\n  ]\n}\n';

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
  assert.deepEqual(CLAUDE_LINES, [IMPORT, '@AGENTS.md']);
  assert.equal(OPENCODE_FILE, 'opencode.json');
});

// R2, R9, R10

test('a CLAUDE.md with both lines lacks none, in LF and in CRLF', () => {
  assert.deepEqual(claudeLacks(found(`# Ours\n\n${IMPORT}\n@AGENTS.md\n`)), []);
  assert.deepEqual(claudeLacks(found(`# Ours\r\n\r\n${IMPORT}\r\n@AGENTS.md\r\n`)), []);
  assert.deepEqual(claudeLacks(found(`@AGENTS.md\n${IMPORT}`)), []);
});

test('a CLAUDE.md lacks each line it does not hold, in the order of the lines', () => {
  assert.deepEqual(claudeLacks(found('@AGENTS.md\n')), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n`)), ['@AGENTS.md']);
  assert.deepEqual(claudeLacks(found('our own\n')), [IMPORT, '@AGENTS.md']);
  assert.deepEqual(claudeLacks(found('')), [IMPORT, '@AGENTS.md']);
});

test('a line counts only when it is exactly the text', () => {
  assert.deepEqual(claudeLacks(found(`${IMPORT} \n@AGENTS.md\n`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`  ${IMPORT}\n@AGENTS.md\n`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`Import ${IMPORT} here\n@AGENTS.md\n`)), [IMPORT]);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n@AGENTS.md is imported\n`)), ['@AGENTS.md']);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\r\r\n@AGENTS.md\n`)), [IMPORT]);
});

test('a CLAUDE.md that is missing or cannot be read lacks both lines', () => {
  assert.deepEqual(claudeLacks(MISSING), [IMPORT, '@AGENTS.md']);
  assert.deepEqual(claudeLacks(UNREADABLE), [IMPORT, '@AGENTS.md']);
});

// R3, R4, R5, R9, R10

test('a missing opencode.json gives the file of R3 to write', () => {
  assert.deepEqual(opencodeVerdict(MISSING), { loads: false, problem: 'it is missing', content: WRITTEN });
});

test('an opencode.json that cannot be read gives its error and nothing to write', () => {
  assert.deepEqual(opencodeVerdict(UNREADABLE), {
    loads: false,
    problem: `it cannot be read: ${UNREADABLE.error}`,
    content: undefined,
  });
});

test('an opencode.json that is not JSON loads the path when its text holds the path in quotes', () => {
  const withComment = `{\n  // ours\n  "instructions": ["${PROCESS}"]\n}\n`;
  assert.deepEqual(opencodeVerdict(found(withComment)), { loads: true });
});

test('an opencode.json that is not JSON otherwise gives the parser error and nothing to write', () => {
  const text = `{\n  // ours, ${PROCESS} without quotes\n}\n`;
  let parserMessage;
  try {
    JSON.parse(text);
  } catch (error) {
    parserMessage = error.message;
  }
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: `it is not JSON: ${parserMessage}`,
    content: undefined,
  });
});

test('JSON that is not an object gives nothing to write', () => {
  for (const text of ['[]', 'null', '"x"', '3']) {
    assert.deepEqual(
      opencodeVerdict(found(text)),
      { loads: false, problem: 'it is not a JSON object', content: undefined },
      text,
    );
  }
});

test('an object with no instructions gets them last, keeping its keys, its tab and its missing line break', () => {
  const text = '{\n\t"$schema": "https://opencode.ai/config.json",\n\t"model": "x"\n}';
  const expected =
    '{\n\t"$schema": "https://opencode.ai/config.json",\n\t"model": "x",\n\t"instructions": [\n' +
    `\t\t"${PROCESS}"\n\t]\n}`;
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: 'it has no instructions list',
    content: expected,
  });
});

test('instructions that are not a list give nothing to write', () => {
  assert.deepEqual(opencodeVerdict(found('{ "instructions": "x" }')), {
    loads: false,
    problem: 'its instructions is not a list',
    content: undefined,
  });
});

test('a list that does not hold the path gets it at its end, in the place of the key', () => {
  const text = '{\n  "instructions": ["a.md"],\n  "model": "x"\n}\n';
  const expected = `{\n  "instructions": [\n    "a.md",\n    "${PROCESS}"\n  ],\n  "model": "x"\n}\n`;
  assert.deepEqual(opencodeVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${PROCESS}`,
    content: expected,
  });
});

test('a list that holds the path loads it', () => {
  assert.deepEqual(opencodeVerdict(found(`{ "instructions": ["a.md", "${PROCESS}"] }`)), { loads: true });
  assert.deepEqual(opencodeVerdict(found(WRITTEN)), { loads: true });
});

// R2, R5, R9, R12

test('the notice of init for CLAUDE.md names the lines it was given and points to the section', () => {
  const both = claudeInitNotice([IMPORT, '@AGENTS.md']);
  assert.ok(both.startsWith('CLAUDE.md exists and was left as it is.'), both);
  assert.ok(both.includes("Claude Code does not read the kit's\ninstructions without them"), both);
  assert.ok(both.includes(`\n\n${IMPORT}\n@AGENTS.md\n\n`), both);
  assert.ok(both.endsWith(`${SECTION}\n`), both);
  assertLinesFit(both);

  const one = claudeInitNotice([IMPORT]);
  assert.ok(one.includes(`\n\n${IMPORT}\n\n`), one);
  assert.ok(!one.includes('@AGENTS.md\n'), one);
});

test('the notice of init for opencode.json gives the problem, the path and the section', () => {
  const notice = opencodeInitNotice('it is not a JSON object');
  assert.ok(notice.startsWith('opencode.json was left as it is, because it is not a JSON object.\n'), notice);
  assert.ok(notice.includes(`its instructions list must hold ${PROCESS}`), notice);
  assert.ok(notice.includes('Add it by hand.'), notice);
  assert.ok(notice.endsWith(`${SECTION}\n`), notice);
  assertLinesFit(notice);
});

test('the notice of refresh for CLAUDE.md says why, names the lines and says refresh does not add them', () => {
  const missing = claudeRefreshNotice(true, [IMPORT, '@AGENTS.md']);
  assert.ok(missing.startsWith("CLAUDE.md does not load the kit's instructions, because it is missing."), missing);
  assert.ok(missing.includes(`\n\n${IMPORT}\n@AGENTS.md\n\n`), missing);
  assert.ok(missing.includes('refresh does\nnot add them'), missing);
  assert.ok(missing.endsWith(`${SECTION}\n`), missing);
  assertLinesFit(missing);

  const lacking = claudeRefreshNotice(false, [IMPORT]);
  assert.ok(lacking.includes('because it lacks the lines below.'), lacking);
  assert.ok(lacking.includes(`\n\n${IMPORT}\n\n`), lacking);
  assertLinesFit(lacking);
});

test('the notice of refresh for opencode.json gives the problem, the path, and says refresh does not add it', () => {
  const problems = ['it is missing', 'it has no instructions list', `its instructions list does not hold ${PROCESS}`];
  for (const problem of problems) {
    const notice = opencodeRefreshNotice(problem);
    assert.ok(notice.startsWith(`opencode.json does not load the kit's instructions,\nbecause ${problem}.\n`), notice);
    assert.ok(notice.includes(`${PROCESS} in its instructions list`), notice);
    assert.ok(notice.includes('refresh\ndoes not add it'), notice);
    assert.ok(notice.endsWith(`${SECTION}\n`), notice);
    assertLinesFit(notice);
  }
});

test('no notice holds an em dash', () => {
  const notices = [
    claudeInitNotice([IMPORT, '@AGENTS.md']),
    opencodeInitNotice('it is missing'),
    claudeRefreshNotice(true, [IMPORT, '@AGENTS.md']),
    opencodeRefreshNotice('it is missing'),
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
