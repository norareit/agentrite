import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { HARNESS_CONTRACT, HARNESS_NAMES, HARNESSES, harnessNamed } from '../scripts/agentrite-harness.mjs';
import {
  claude,
  claudeInitNotice,
  claudeKitStandardsNotice,
  claudeRefreshNotice,
} from '../scripts/harnesses/claude.mjs';
import {
  opencode,
  opencodeInitNotice,
  opencodeKitStandardsNotice,
  opencodeRefreshNotice,
  opencodeVerdict,
} from '../scripts/harnesses/opencode.mjs';

const PROCESS = 'node_modules/agentrite/process.md';
const STANDARDS = 'node_modules/agentrite/standards.md';
const HOUSE = 'docs/house-standards.md';
const LINES = [`@${PROCESS}`, `@${STANDARDS}`, '@AGENTS.md'];
const HARNESS_DIRECTORY = join(import.meta.dirname, '..', 'scripts', 'harnesses');

const MISSING = { found: false };
const UNREADABLE = { found: true, error: 'EISDIR: illegal operation on a directory, read' };

/** @param {string} text */
function found(text) {
  return { found: true, text };
}

/**
 * The kind of a value as the contract names kinds, or what it is otherwise, for the message of a fault.
 *
 * @param {unknown} value
 * @returns {string}
 */
function kindOf(value) {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) return value.every((item) => typeof item === 'string') ? 'strings' : 'array';
  return value === null ? 'null' : typeof value;
}

/**
 * The faults of one harness against the contract: a member it lacks, and a member it has of another kind.
 *
 * @param {Record<string, unknown>} harness
 * @param {{ member: string, kind: string }[]} contract
 * @returns {string[]}
 */
function contractFaults(harness, contract) {
  return contract.flatMap(({ member, kind }) => {
    /** @type {unknown} */ let value = harness;
    for (const key of member.split('.')) {
      value = typeof value === 'object' && value !== null && Object.hasOwn(value, key) ? value[key] : undefined;
    }
    if (value === undefined) return [`${harness.name} lacks ${member}`];
    const found = kindOf(value);
    if (found === kind) return [];
    return [`${harness.name} has ${member} as ${found}, and the contract makes it ${kind}`];
  });
}

/**
 * The faults of a directory of harness modules against the names of the list of the harnesses.
 *
 * @param {string[]} files
 * @param {string[]} names
 * @returns {string[]}
 */
function directoryFaults(files, names) {
  return [
    ...files
      .filter((file) => !names.some((name) => file === `${name}.mjs`))
      .map((file) => `${file} is in scripts/harnesses/ and not in HARNESSES`),
    ...names
      .filter((name) => !files.includes(`${name}.mjs`))
      .map((name) => `${name} is in HARNESSES and scripts/harnesses/ has no ${name}.mjs`),
  ];
}

// R4

test('every harness of the list implements every member of the contract', () => {
  for (const harness of HARNESSES) {
    const faults = contractFaults(harness, HARNESS_CONTRACT);
    assert.deepEqual(faults, [], faults.join('\n'));
  }
});

test('a harness that lacks a member, or has one of another kind, is named with the member', () => {
  const withoutCommand = { ...claude, start: { ...claude.start, command: undefined } };
  assert.deepEqual(contractFaults(withoutCommand, HARNESS_CONTRACT), ['claude lacks start.command']);

  const stringAgents = { ...claude, wrappers: { ...claude.wrappers, ownAgents: 'Explore' } };
  assert.deepEqual(contractFaults(stringAgents, HARNESS_CONTRACT), [
    'claude has wrappers.ownAgents as string, and the contract makes it strings',
  ]);

  const withoutHeadless = { ...opencode, headless: undefined };
  assert.deepEqual(
    contractFaults(withoutHeadless, HARNESS_CONTRACT).filter((fault) => fault.includes('headless')),
    ['arguments', 'read', 'follow', 'refused'].map((member) => `opencode lacks headless.${member}`),
  );
});

// R2

test('the contract holds its sixteen members, each with a kind and a purpose', () => {
  assert.deepEqual(
    HARNESS_CONTRACT.map(({ member }) => member),
    [
      'name',
      'title',
      'wrappers.directory',
      'wrappers.render',
      'wrappers.ownAgents',
      'start.command',
      'start.skipPermissions',
      'start.interactive',
      'start.headless',
      'headless.arguments',
      'headless.read',
      'headless.follow',
      'headless.refused',
      'instructions.file',
      'instructions.init',
      'instructions.refresh',
    ],
  );
  for (const { member, kind, purpose } of HARNESS_CONTRACT) {
    assert.ok(['string', 'function', 'strings'].includes(kind), `${member} has the kind ${kind}`);
    assert.equal(typeof purpose, 'string', member);
    assert.notEqual(purpose.trim(), '', member);
  }
});

// R10

test('scripts/harnesses/ holds a module for each harness of the list, and nothing else', () => {
  const faults = directoryFaults(readdirSync(HARNESS_DIRECTORY), HARNESS_NAMES);
  assert.deepEqual(faults, [], faults.join('\n'));
});

test('a module the list lacks, and an entry of the list without its module, are named', () => {
  assert.deepEqual(directoryFaults(['claude.mjs', 'extra.mjs', 'opencode.mjs'], ['claude', 'opencode']), [
    'extra.mjs is in scripts/harnesses/ and not in HARNESSES',
  ]);
  assert.deepEqual(directoryFaults(['claude.mjs'], ['claude', 'opencode']), [
    'opencode is in HARNESSES and scripts/harnesses/ has no opencode.mjs',
  ]);
});

// R3

test('the list holds claude and then opencode, and each is found by its name', () => {
  assert.deepEqual(HARNESS_NAMES, ['claude', 'opencode']);
  assert.deepEqual(HARNESSES, [claude, opencode]);
  assert.equal(harnessNamed('claude'), claude);
  assert.equal(harnessNamed('opencode'), opencode);
  assert.throws(() => harnessNamed('codex'), { message: 'unknown harness: codex' });
});

// R1, R5: what init does with the instruction file of each harness

test("OpenCode's init writes a missing opencode.json", () => {
  assert.equal(opencode.instructions.file, 'opencode.json');
  assert.deepEqual(opencode.instructions.init(MISSING, STANDARDS), {
    content: opencodeVerdict(MISSING, STANDARDS).content,
    line: 'wrote opencode.json',
    notices: [],
  });
});

test("OpenCode's init changes an opencode.json it can amend", () => {
  const read = found('{\n  "model": "x"\n}\n');
  assert.deepEqual(opencode.instructions.init(read, STANDARDS), {
    content: opencodeVerdict(read, STANDARDS).content,
    line: 'changed opencode.json',
    notices: [],
  });
});

test("OpenCode's init leaves an opencode.json that loads the instructions", () => {
  assert.deepEqual(opencode.instructions.init(found(`{ "instructions": ["${PROCESS}", "${STANDARDS}"] }`), STANDARDS), {
    content: undefined,
    line: `skipped opencode.json, which loads ${PROCESS} and ${STANDARDS}`,
    notices: [],
  });
});

test("OpenCode's init leaves an opencode.json it cannot amend, with its notice", () => {
  assert.deepEqual(opencode.instructions.init(found('[]'), STANDARDS), {
    content: undefined,
    line: 'skipped opencode.json, which cannot be amended',
    notices: [opencodeInitNotice('it is not a JSON object', [PROCESS, STANDARDS])],
  });
});

test("OpenCode's init adds the notice of the kit's standards listed beside the project's own", () => {
  const loads = found(`{ "instructions": ["${PROCESS}", "${HOUSE}", "${STANDARDS}"] }`);
  assert.deepEqual(opencode.instructions.init(loads, HOUSE), {
    content: undefined,
    line: `skipped opencode.json, which loads ${PROCESS} and ${HOUSE}`,
    notices: [opencodeKitStandardsNotice(HOUSE)],
  });
  const amendable = found(`{ "instructions": ["${STANDARDS}"] }`);
  const amended = opencode.instructions.init(amendable, HOUSE);
  assert.equal(amended.line, 'changed opencode.json');
  assert.deepEqual(amended.notices, [opencodeKitStandardsNotice(HOUSE)]);
  const unamendable = found(`{ "instructions": "${STANDARDS}" }`);
  assert.deepEqual(opencode.instructions.init(unamendable, HOUSE).notices, [
    opencodeInitNotice('its instructions is not a list', [PROCESS, HOUSE]),
  ]);
});

test("Claude Code's init writes nothing and judges a CLAUDE.md that exists", () => {
  assert.equal(claude.instructions.file, 'CLAUDE.md');
  assert.deepEqual(claude.instructions.init(MISSING, STANDARDS), { content: undefined, line: undefined, notices: [] });
  assert.deepEqual(claude.instructions.init(found(`${LINES.join('\n')}\n`), STANDARDS), {
    content: undefined,
    line: undefined,
    notices: [],
  });
  assert.deepEqual(claude.instructions.init(found('@AGENTS.md\n'), STANDARDS), {
    content: undefined,
    line: undefined,
    notices: [claudeInitNotice(LINES.slice(0, 2))],
  });
  assert.deepEqual(claude.instructions.init(UNREADABLE, STANDARDS).notices, [claudeInitNotice(LINES)]);
  const both = found(`@${PROCESS}\n@${HOUSE}\n@${STANDARDS}\n@AGENTS.md\n`);
  assert.deepEqual(claude.instructions.init(both, HOUSE), {
    content: undefined,
    line: undefined,
    notices: [claudeKitStandardsNotice(HOUSE)],
  });
});

// R1, R5: what refresh says of the instruction file of each harness

test("Claude Code's refresh names a CLAUDE.md that is missing, lacks lines or imports the kit's standards", () => {
  assert.deepEqual(claude.instructions.refresh(found(`${LINES.join('\n')}\n`), STANDARDS), []);
  assert.deepEqual(claude.instructions.refresh(MISSING, STANDARDS), [claudeRefreshNotice(true, LINES)]);
  assert.deepEqual(claude.instructions.refresh(found('@AGENTS.md\n'), STANDARDS), [
    claudeRefreshNotice(false, LINES.slice(0, 2)),
  ]);
  const both = found(`@${PROCESS}\n@${HOUSE}\n@${STANDARDS}\n@AGENTS.md\n`);
  assert.deepEqual(claude.instructions.refresh(both, HOUSE), [claudeKitStandardsNotice(HOUSE)]);
});

test("OpenCode's refresh names an opencode.json that does not load the instructions or lists the kit standards", () => {
  const loads = found(`{ "instructions": ["${PROCESS}", "${STANDARDS}"] }`);
  assert.deepEqual(opencode.instructions.refresh(loads, STANDARDS), []);
  assert.deepEqual(opencode.instructions.refresh(MISSING, STANDARDS), [
    opencodeRefreshNotice('it is missing', [PROCESS, STANDARDS]),
  ]);
  assert.deepEqual(opencode.instructions.refresh(found(`{ "instructions": ["${PROCESS}"] }`), STANDARDS), [
    opencodeRefreshNotice(`its instructions list does not hold ${STANDARDS}`, [STANDARDS]),
  ]);
  const both = found(`{ "instructions": ["${PROCESS}", "${HOUSE}", "${STANDARDS}"] }`);
  assert.deepEqual(opencode.instructions.refresh(both, HOUSE), [opencodeKitStandardsNotice(HOUSE)]);
});
