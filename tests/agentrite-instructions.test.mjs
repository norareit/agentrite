import assert from 'node:assert/strict';
import { mkdirSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  agentsListNotice,
  agentsNamesList,
  claudeInitNotice,
  claudeKitStandardsNotice,
  claudeLacks,
  claudeLines,
  claudeLoadsKitStandards,
  claudeRefreshNotice,
  INSTRUCTIONS_LIST,
  instructionPaths,
  instructionsList,
  OPENCODE_FILE,
  opencodeInitNotice,
  opencodeKitStandardsNotice,
  opencodeLoadsKitStandards,
  opencodeRefreshNotice,
  opencodeVerdict,
  PROCESS_PATH,
  readProjectFile,
  STANDARDS_PATH,
} from '../scripts/agentrite-instructions.mjs';
import { KIT_SETTINGS } from './installed-kit.mjs';
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

// The verdicts on a file judged against the kit's own standards.
const kitLacks = (read) => claudeLacks(read, STANDARDS);
const kitVerdict = (read) => opencodeVerdict(read, STANDARDS);

/** @param {string} text */
function assertLinesFit(text) {
  for (const line of text.split('\n')) assert.ok(line.length <= 120, `over 120 characters: ${line}`);
}

test('the path, the lines and the file are named as the spec gives them', () => {
  assert.equal(PROCESS_PATH, PROCESS);
  assert.equal(STANDARDS_PATH, STANDARDS);
  assert.deepEqual(instructionPaths(STANDARDS), [PROCESS, STANDARDS]);
  assert.deepEqual(claudeLines(STANDARDS), LINES);
  assert.equal(OPENCODE_FILE, 'opencode.json');
  assert.equal(INSTRUCTIONS_LIST, '.agentrite/instructions.md');
});

// R2, R9, R10 of unit 0048, R18 of unit 0052

test('a CLAUDE.md with the three lines lacks none, in LF and in CRLF', () => {
  assert.deepEqual(kitLacks(found(`# Ours\n\n${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md\n`)), []);
  assert.deepEqual(kitLacks(found(`# Ours\r\n\r\n${IMPORT}\r\n${STANDARDS_IMPORT}\r\n@AGENTS.md\r\n`)), []);
  assert.deepEqual(kitLacks(found(`@AGENTS.md\n${STANDARDS_IMPORT}\n${IMPORT}`)), []);
});

test('a CLAUDE.md lacks each line it does not hold, in the order of the lines', () => {
  assert.deepEqual(kitLacks(found(`${STANDARDS_IMPORT}\n@AGENTS.md\n`)), [IMPORT]);
  assert.deepEqual(kitLacks(found(`${IMPORT}\n@AGENTS.md\n`)), [STANDARDS_IMPORT]);
  assert.deepEqual(kitLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}\n`)), ['@AGENTS.md']);
  assert.deepEqual(kitLacks(found('@AGENTS.md\n')), [IMPORT, STANDARDS_IMPORT]);
  assert.deepEqual(kitLacks(found('our own\n')), LINES);
  assert.deepEqual(kitLacks(found('')), LINES);
});

test('a line counts only when it is exactly the text', () => {
  const rest = `${STANDARDS_IMPORT}\n@AGENTS.md\n`;
  assert.deepEqual(kitLacks(found(`${IMPORT} \n${rest}`)), [IMPORT]);
  assert.deepEqual(kitLacks(found(`  ${IMPORT}\n${rest}`)), [IMPORT]);
  assert.deepEqual(kitLacks(found(`Import ${IMPORT} here\n${rest}`)), [IMPORT]);
  assert.deepEqual(kitLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md is imported\n`)), ['@AGENTS.md']);
  assert.deepEqual(kitLacks(found(`${IMPORT}\r\r\n${rest}`)), [IMPORT]);
  assert.deepEqual(kitLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}.\n@AGENTS.md\n`)), [STANDARDS_IMPORT]);
});

test('a CLAUDE.md that is missing or cannot be read lacks the three lines', () => {
  assert.deepEqual(kitLacks(MISSING), LINES);
  assert.deepEqual(kitLacks(UNREADABLE), LINES);
});

// R3, R4, R5, R9, R10 of unit 0048, R18 of unit 0052

test('a missing opencode.json lacks both paths and gives the file of R3 to write', () => {
  assert.deepEqual(kitVerdict(MISSING), {
    loads: false,
    problem: 'it is missing',
    lacks: [PROCESS, STANDARDS],
    content: WRITTEN,
  });
});

test('an opencode.json that cannot be read lacks both paths, and gives its error and nothing to write', () => {
  assert.deepEqual(kitVerdict(UNREADABLE), {
    loads: false,
    problem: `it cannot be read: ${UNREADABLE.error}`,
    lacks: [PROCESS, STANDARDS],
    content: undefined,
  });
});

test('an opencode.json that is not JSON loads the paths when its text holds each in quotes', () => {
  const withComment = `{\n  // ours\n  "instructions": ["${PROCESS}", "${STANDARDS}"]\n}\n`;
  assert.deepEqual(kitVerdict(found(withComment)), { loads: true });
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
      kitVerdict(found(text)),
      { loads: false, problem: `it is not JSON: ${parserMessageOf(text)}`, lacks, content: undefined },
      text,
    );
  }
});

test('JSON that is not an object lacks both paths and gives nothing to write', () => {
  for (const text of ['[]', 'null', '"x"', '3']) {
    assert.deepEqual(
      kitVerdict(found(text)),
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
  assert.deepEqual(kitVerdict(found(text)), {
    loads: false,
    problem: 'it has no instructions list',
    lacks: [PROCESS, STANDARDS],
    content: expected,
  });
});

test('instructions that are not a list lack both paths and give nothing to write', () => {
  assert.deepEqual(kitVerdict(found('{ "instructions": "x" }')), {
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
  assert.deepEqual(kitVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${PROCESS} or ${STANDARDS}`,
    lacks: [PROCESS, STANDARDS],
    content: expected,
  });
});

test('a list that holds only process.md gets standards.md at its end', () => {
  const text = `{\n  "instructions": ["${PROCESS}", "a.md"]\n}\n`;
  const expected = `{\n  "instructions": [\n    "${PROCESS}",\n    "a.md",\n    "${STANDARDS}"\n  ]\n}\n`;
  assert.deepEqual(kitVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${STANDARDS}`,
    lacks: [STANDARDS],
    content: expected,
  });
});

test('a list that holds only standards.md gets process.md at its end', () => {
  const text = `{\n  "instructions": ["${STANDARDS}"]\n}\n`;
  const expected = `{\n  "instructions": [\n    "${STANDARDS}",\n    "${PROCESS}"\n  ]\n}\n`;
  assert.deepEqual(kitVerdict(found(text)), {
    loads: false,
    problem: `its instructions list does not hold ${PROCESS}`,
    lacks: [PROCESS],
    content: expected,
  });
});

test('a list that holds both paths loads them, in either order', () => {
  assert.deepEqual(kitVerdict(found(`{ "instructions": ["a.md", "${PROCESS}", "${STANDARDS}"] }`)), {
    loads: true,
  });
  assert.deepEqual(kitVerdict(found(`{ "instructions": ["${STANDARDS}", "${PROCESS}"] }`)), { loads: true });
  assert.deepEqual(kitVerdict(found(WRITTEN)), { loads: true });
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

// Unit 0054, R11: the standards a project loads are the file the settings give.

const HOUSE = 'rules/house.md';
const HOUSE_LINES = [IMPORT, `@${HOUSE}`, '@AGENTS.md'];

test('the paths and the lines follow the standards given, after process.md', () => {
  assert.deepEqual(instructionPaths(HOUSE), [PROCESS, HOUSE]);
  assert.deepEqual(claudeLines(HOUSE), HOUSE_LINES);
});

test('a CLAUDE.md is judged against the standards given', () => {
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n@${HOUSE}\n@AGENTS.md\n`), HOUSE), []);
  assert.deepEqual(claudeLacks(found(`${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md\n`), HOUSE), [`@${HOUSE}`]);
  assert.deepEqual(claudeLacks(MISSING, HOUSE), HOUSE_LINES);
});

test('an opencode.json is judged against the standards given, and written or amended with it after process.md', () => {
  assert.deepEqual(opencodeVerdict(found(`{ "instructions": ["${PROCESS}", "${HOUSE}"] }`), HOUSE), { loads: true });
  assert.deepEqual(opencodeVerdict(MISSING, HOUSE), {
    loads: false,
    problem: 'it is missing',
    lacks: [PROCESS, HOUSE],
    content: `{\n  "instructions": [\n    "${PROCESS}",\n    "${HOUSE}"\n  ]\n}\n`,
  });
  assert.deepEqual(opencodeVerdict(found(`{\n  "instructions": ["${PROCESS}", "${STANDARDS}"]\n}\n`), HOUSE), {
    loads: false,
    problem: `its instructions list does not hold ${HOUSE}`,
    lacks: [HOUSE],
    content: `{\n  "instructions": [\n    "${PROCESS}",\n    "${STANDARDS}",\n    "${HOUSE}"\n  ]\n}\n`,
  });
  const withComment = `{\n  // ours\n  "instructions": ["${PROCESS}", "${HOUSE}"]\n}\n`;
  assert.deepEqual(opencodeVerdict(found(withComment), HOUSE), { loads: true });
});

// Unit 0054, R12: the kit's standards loaded beside the project's own.

test('a CLAUDE.md that imports the kit standards loads them only when the project has another standards file', () => {
  const both = found(`${IMPORT}\n@${HOUSE}\n${STANDARDS_IMPORT}\n@AGENTS.md\n`);
  assert.equal(claudeLoadsKitStandards(both, HOUSE), true);
  assert.equal(claudeLoadsKitStandards(found(`${STANDARDS_IMPORT}\r\n`), HOUSE), true);
  assert.equal(claudeLoadsKitStandards(both, STANDARDS), false);
  assert.equal(claudeLoadsKitStandards(both, `./${STANDARDS}`), false);
  assert.equal(claudeLoadsKitStandards(found(`${IMPORT}\n@${HOUSE}\n@AGENTS.md\n`), HOUSE), false);
  assert.equal(claudeLoadsKitStandards(found(`Import ${STANDARDS_IMPORT} here\n`), HOUSE), false);
  assert.equal(claudeLoadsKitStandards(MISSING, HOUSE), false);
  assert.equal(claudeLoadsKitStandards(UNREADABLE, HOUSE), false);
});

test('an opencode.json that lists the kit standards loads them only when the project has other standards', () => {
  const both = found(`{ "instructions": ["${PROCESS}", "${HOUSE}", "${STANDARDS}"] }`);
  assert.equal(opencodeLoadsKitStandards(both, HOUSE), true);
  const withComment = found(`{\n  // ours\n  "instructions": ["${STANDARDS}"]\n}\n`);
  assert.equal(opencodeLoadsKitStandards(withComment, HOUSE), true);
  assert.equal(opencodeLoadsKitStandards(both, STANDARDS), false);
  assert.equal(opencodeLoadsKitStandards(both, `./${STANDARDS}`), false);
  assert.equal(opencodeLoadsKitStandards(found(`{ "instructions": ["${PROCESS}", "${HOUSE}"] }`), HOUSE), false);
  assert.equal(opencodeLoadsKitStandards(found(`{ "model": "${STANDARDS}" }`), HOUSE), false);
  assert.equal(opencodeLoadsKitStandards(found('[]'), HOUSE), false);
  assert.equal(opencodeLoadsKitStandards(MISSING, HOUSE), false);
  assert.equal(opencodeLoadsKitStandards(UNREADABLE, HOUSE), false);
});

test('the notices of the kit standards name the project standards, the line or entry, and the section', () => {
  assert.equal(
    claudeKitStandardsNotice(HOUSE),
    `CLAUDE.md imports the kit's standards.md, and the project's standards are ${HOUSE}. Claude Code then loads\n` +
      'both sets of rules. Remove this line, which init and refresh do not remove:\n\n' +
      `${STANDARDS_IMPORT}\n\n${SECTION}\n`,
  );
  assert.equal(
    opencodeKitStandardsNotice(HOUSE),
    `opencode.json lists the kit's standards.md, and the project's standards are ${HOUSE}. OpenCode then loads\n` +
      'both sets of rules. Remove this entry from its instructions list, which init and refresh do not remove:\n\n' +
      `${STANDARDS}\n\n${SECTION}\n`,
  );
  assertLinesFit(claudeKitStandardsNotice(HOUSE));
  assertLinesFit(opencodeKitStandardsNotice(HOUSE));
});

// Unit 0054, R16: AGENTS.md and the list.

test('an AGENTS.md names the list when its text holds the path of the list', () => {
  assert.equal(agentsNamesList(found('Read [the list](.agentrite/instructions.md) first.\n')), true);
  assert.equal(agentsNamesList(found('.agentrite/instructions.md')), true);
  assert.equal(agentsNamesList(found('Read node_modules/agentrite/standards.md first.\n')), false);
  assert.equal(agentsNamesList(found('')), false);
  assert.equal(agentsNamesList(MISSING), false);
  assert.equal(agentsNamesList(UNREADABLE), false);
});

test('the notice of AGENTS.md says it is missing or does not name the list, that refresh does not change it', () => {
  assert.equal(
    agentsListNotice(true),
    'AGENTS.md is missing, so agents do not learn from it which role and standards files the project uses, which\n' +
      '.agentrite/instructions.md names. refresh does not change AGENTS.md. ' +
      'See "How the kit\'s instructions reach an agent" in\nnode_modules/agentrite/README.md.\n',
  );
  assert.equal(
    agentsListNotice(false),
    'AGENTS.md does not name .agentrite/instructions.md, so agents do not learn from it which role and standards ' +
      'files the\nproject uses, which .agentrite/instructions.md names. refresh does not change AGENTS.md. ' +
      'See "How the kit\'s instructions\nreach an agent" in node_modules/agentrite/README.md.\n',
  );
  assertLinesFit(agentsListNotice(true));
  assertLinesFit(agentsListNotice(false));
});

test('no notice of the unit holds an em dash', () => {
  for (const notice of [
    claudeKitStandardsNotice(HOUSE),
    opencodeKitStandardsNotice(HOUSE),
    agentsListNotice(true),
    agentsListNotice(false),
  ]) {
    assert.ok(!notice.includes('\u2014'), notice);
  }
});

// Unit 0054, R13: the list of the files in use.

const DEFAULT_LIST = [
  '# Instructions in use',
  '',
  'These are the files whose instructions hold in this project. The standards are its whole set of rules on how text,',
  'documentation, commits, code and tests are written.',
  '',
  'The kit writes this list from `agentrite.json`, with `npx agentrite init` and `npx agentrite refresh`, ' +
    'and it is not',
  'edited by hand. To use another file, change `agentrite.json` and run `npx agentrite refresh`.',
  '',
  '* Process: [`node_modules/agentrite/process.md`](../node_modules/agentrite/process.md)',
  '* Standards: [`node_modules/agentrite/standards.md`](../node_modules/agentrite/standards.md)',
  '',
  '## Roles',
  '',
  '* specifier: [`node_modules/agentrite/roles/specifier.md`](../node_modules/agentrite/roles/specifier.md)',
  '* planner: [`node_modules/agentrite/roles/planner.md`](../node_modules/agentrite/roles/planner.md)',
  '* implementer: [`node_modules/agentrite/roles/implementer.md`](../node_modules/agentrite/roles/implementer.md)',
  '* reviewer: [`node_modules/agentrite/roles/reviewer.md`](../node_modules/agentrite/roles/reviewer.md)',
  '',
].join('\n');

test('the list of the default file is the text of the plan, byte for byte, with no line over 120 characters', () => {
  assert.equal(instructionsList(KIT_SETTINGS), DEFAULT_LIST);
  assertLinesFit(DEFAULT_LIST);
});

test('the list names a project own standards and roles, with links that work from .agentrite/', () => {
  const list = instructionsList({
    standards: 'rules/house.md',
    roles: { ...KIT_SETTINGS.roles, planner: './rules/planner.md', reviewer: 'docs/a/../reviewer.md' },
  });
  assert.ok(list.includes('* Standards: [`rules/house.md`](../rules/house.md)\n'), list);
  assert.ok(list.includes('* planner: [`./rules/planner.md`](../rules/planner.md)\n'), list);
  assert.ok(list.includes('* reviewer: [`docs/a/../reviewer.md`](../docs/reviewer.md)\n'), list);
  assert.ok(list.includes('* specifier: [`node_modules/agentrite/roles/specifier.md`]'), list);
  assert.ok(list.includes('* Process: [`node_modules/agentrite/process.md`]'), list);
});

test('the list names a file two roles share for each of them', () => {
  const roles = { ...KIT_SETTINGS.roles, planner: 'rules/both.md', specifier: 'rules/both.md' };
  const list = instructionsList({ ...KIT_SETTINGS, roles });
  const both = '* specifier: [`rules/both.md`](../rules/both.md)\n* planner: [`rules/both.md`](../rules/both.md)\n';
  assert.ok(list.includes(both), list);
});

test('the list links a path with a space with %20', () => {
  const list = instructionsList({ ...KIT_SETTINGS, standards: 'our rules/house rules.md' });
  assert.ok(list.includes('* Standards: [`our rules/house rules.md`](../our%20rules/house%20rules.md)\n'), list);
});

test('the list follows from the settings alone', () => {
  assert.equal(instructionsList({ ...KIT_SETTINGS, defaultBranch: 'main', harnesses: ['opencode'] }), DEFAULT_LIST);
});
