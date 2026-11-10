import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ROLE_NAMES } from '../scripts/agentrite-roles.mjs';
import { HARNESS_NAMES } from '../scripts/agentrite-harness.mjs';
import {
  parseSettings,
  parseStart,
  readSettings,
  readStart,
  SETTINGS_FILE,
  settingsText,
} from '../scripts/agentrite-settings.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const OBJECT_SENTENCE =
  'The file must hold a JSON object with the keys defaultBranch, harnesses, process, sandbox, bell, modelServer, ' +
  'standards, orchestrator and roles';
const NO_FILE = 'the project has no agentrite.json. Run: npx agentrite config, which writes one';

const VALID = {
  defaultBranch: 'main',
  harnesses: ['opencode'],
  process: true,
  sandbox: false,
  bell: true,
  modelServer: false,
  standards: 'rules/house.md',
  orchestrator: 'rules/orchestrator.json',
  roles: {
    specifier: 'rules/specifier.md',
    planner: 'rules/planner.md',
    implementer: 'rules/implementer.md',
    reviewer: 'rules/reviewer.md',
  },
};

function textOf(settings) {
  return JSON.stringify(settings);
}

// VALID without `key`, or with `key` holding `value`.
function withKey(key, value) {
  const { [key]: _removed, ...rest } = VALID;
  return value === undefined ? rest : { ...rest, [key]: value };
}

// VALID with `roles` without `role`, or with `role` holding `value`.
function withRole(role, value) {
  const { [role]: _removed, ...rest } = VALID.roles;
  return { ...VALID, roles: value === undefined ? rest : { ...rest, [role]: value } };
}

// Writes a file at each path `settings` name, under `root`.
function writePathsOf(root, settings) {
  const orchestrator = typeof settings.orchestrator === 'string' ? [settings.orchestrator] : [];
  for (const path of [settings.standards, ...orchestrator, ...Object.values(settings.roles)]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), `# ${path}\n`);
  }
}

test('the file is named agentrite.json', () => {
  assert.equal(SETTINGS_FILE, 'agentrite.json');
});

// R1, R3

test('a valid file gives the nine settings', () => {
  assert.deepEqual(parseSettings(textOf(VALID)), VALID);
  const both = { ...VALID, defaultBranch: 'master', harnesses: ['claude', 'opencode'], sandbox: true };
  assert.deepEqual(parseSettings(textOf(both)), both);
});

test('orchestrator gives false, for a project that opted out, and a path, as they are written', () => {
  assert.equal(parseSettings(textOf(withKey('orchestrator', false))).orchestrator, false);
  for (const path of ['rules/orchestrator.json', 'node_modules/agentrite/orchestrator.json', 'a/../b.json']) {
    assert.equal(parseSettings(textOf(withKey('orchestrator', path))).orchestrator, path);
  }
});

test('roles are given in the order specifier, planner, implementer, reviewer, whatever the order of the text', () => {
  const reversed = Object.fromEntries(Object.entries(VALID.roles).reverse());
  const settings = parseSettings(textOf({ ...VALID, roles: reversed }));
  assert.deepEqual(Object.keys(settings.roles), ['specifier', 'planner', 'implementer', 'reviewer']);
  assert.deepEqual(Object.keys(settings.roles), ROLE_NAMES);
  assert.deepEqual(settings.roles, VALID.roles);
});

test('two or more roles may name the same file', () => {
  const shared = {
    ...VALID,
    roles: { ...VALID.roles, planner: 'rules/specifier.md', reviewer: 'rules/specifier.md' },
  };
  assert.deepEqual(parseSettings(textOf(shared)), shared);
});

test('a harness named more than once is there once, and the list keeps the order of the file', () => {
  const settings = parseSettings(textOf(withKey('harnesses', ['opencode', 'claude', 'opencode', 'claude'])));
  assert.deepEqual(settings.harnesses, ['opencode', 'claude']);
});

test('a key the kit does not know is ignored, beside the nine', () => {
  assert.deepEqual(parseSettings(textOf({ ...VALID, baseBranch: 'develop', $schema: 5 })), VALID);
});

// R3, R5

test('text that is not JSON is refused with the file, the parser own error and what the file must hold', () => {
  for (const text of ['', 'not json', '{ "defaultBranch": "main", }']) {
    let parserMessage;
    try {
      JSON.parse(text);
    } catch (error) {
      parserMessage = error.message;
    }
    assert.throws(
      () => parseSettings(text),
      (error) => {
        assert.ok(error.message.startsWith('agentrite.json is not JSON: '), error.message);
        assert.ok(error.message.includes(parserMessage), error.message);
        assert.ok(error.message.endsWith(OBJECT_SENTENCE), error.message);
        return true;
      },
    );
  }
});

test('JSON that is no object is refused with the file and what the file must hold', () => {
  for (const text of ['[]', 'null', '"main"', '5', 'true']) {
    assert.throws(
      () => parseSettings(text),
      (error) => {
        assert.ok(error.message.startsWith('agentrite.json '), `${text}: ${error.message}`);
        assert.ok(error.message.endsWith(OBJECT_SENTENCE), `${text}: ${error.message}`);
        return true;
      },
    );
  }
});

const BRANCH_MUST = 'It must hold the name of a branch, as a string that is not empty';
const HARNESSES_MUST = 'It must hold a list of one or more of "claude", "opencode" and "codex"';
const SANDBOX_MUST = 'It must hold true or false';

const PATH_MUST =
  'It must hold the path of a file, relative to the project root, that does not lead outside the project';
const ORCHESTRATOR_MUST =
  'It must hold false, for a project that does not use the orchestrator, or the path of a file, relative to the ' +
  'project root, that does not lead outside the project';
const ROLES_OBJECT_MUST =
  'It must hold an object from each of the roles specifier, planner, implementer and reviewer, ' +
  "and from any role of the project's own, to the path of its file";
const ROLES_MUST_HOLD =
  'It must hold the roles specifier, planner, implementer and reviewer, each with the path of its file, ' +
  "and may hold roles of the project's own besides";
const NAME_FORM =
  "A role's name is one or more words of the lowercase letters a to z, joined by single hyphens, as security-reviewer";
const OWN_AGENT_REFUSAL = 'A role cannot have the name of an agent of a harness the kit writes wrappers for';

test('each of the nine keys, when missing, is named as missing, with what it must hold', () => {
  for (const [key, must] of [
    ['defaultBranch', BRANCH_MUST],
    ['harnesses', HARNESSES_MUST],
    ['process', SANDBOX_MUST],
    ['sandbox', SANDBOX_MUST],
    ['bell', SANDBOX_MUST],
    ['modelServer', SANDBOX_MUST],
    ['standards', PATH_MUST],
    ['orchestrator', ORCHESTRATOR_MUST],
    ['roles', ROLES_OBJECT_MUST],
  ]) {
    assert.throws(() => parseSettings(textOf(withKey(key, undefined))), {
      message: `agentrite.json: ${key} is missing. ${must}`,
    });
  }
});

test('a key that holds anything else is named with what it holds and what it must hold', () => {
  for (const [key, value, must] of [
    ['defaultBranch', 5, BRANCH_MUST],
    ['defaultBranch', '', BRANCH_MUST],
    ['defaultBranch', null, BRANCH_MUST],
    ['harnesses', 'claude', HARNESSES_MUST],
    ['harnesses', [], HARNESSES_MUST],
    ['harnesses', ['claude', 5], HARNESSES_MUST],
    ['harnesses', ['aider'], HARNESSES_MUST],
    ['harnesses', ['claude', 'toString'], HARNESSES_MUST],
    ['process', 'true', SANDBOX_MUST],
    ['process', 1, SANDBOX_MUST],
    ['process', null, SANDBOX_MUST],
    ['sandbox', 'false', SANDBOX_MUST],
    ['sandbox', 0, SANDBOX_MUST],
    ['bell', null, SANDBOX_MUST],
    ['bell', 0, SANDBOX_MUST],
    ['bell', 'true', SANDBOX_MUST],
    ['bell', [], SANDBOX_MUST],
    ['bell', {}, SANDBOX_MUST],
    ['modelServer', null, SANDBOX_MUST],
    ['modelServer', 0, SANDBOX_MUST],
    ['modelServer', 'true', SANDBOX_MUST],
    ['modelServer', [], SANDBOX_MUST],
    ['modelServer', {}, SANDBOX_MUST],
    ['orchestrator', true, ORCHESTRATOR_MUST],
    ['orchestrator', null, ORCHESTRATOR_MUST],
    ['orchestrator', 0, ORCHESTRATOR_MUST],
    ['orchestrator', '', ORCHESTRATOR_MUST],
    ['orchestrator', '/x.json', ORCHESTRATOR_MUST],
    ['orchestrator', '../x.json', ORCHESTRATOR_MUST],
    ['orchestrator', [], ORCHESTRATOR_MUST],
    ['orchestrator', {}, ORCHESTRATOR_MUST],
  ]) {
    assert.throws(
      () => parseSettings(textOf(withKey(key, value))),
      { message: `agentrite.json: ${key} is ${JSON.stringify(value)}. ${must}` },
      `${key} ${JSON.stringify(value)}`,
    );
  }
});

test('the first key at fault, in the order of the keys as the file is written, is named', () => {
  assert.throws(() => parseSettings('{}'), { message: `agentrite.json: defaultBranch is missing. ${BRANCH_MUST}` });
  assert.throws(() => parseSettings('{"sandbox": 1, "harnesses": [], "defaultBranch": "main"}'), {
    message: `agentrite.json: harnesses is []. ${HARNESSES_MUST}`,
  });
  const { standards: _standards, roles: _roles, ...four } = VALID;
  assert.throws(() => parseSettings(textOf({ ...four, roles: 5 })), {
    message: `agentrite.json: standards is missing. ${PATH_MUST}`,
  });
  const { bell: _bell, ...noBell } = VALID;
  assert.throws(() => parseSettings(textOf({ ...noBell, standards: 5 })), {
    message: `agentrite.json: bell is missing. ${SANDBOX_MUST}`,
  });
  assert.throws(() => parseSettings(textOf({ ...withKey('modelServer', undefined), standards: 5 })), {
    message: `agentrite.json: modelServer is missing. ${SANDBOX_MUST}`,
  });
  assert.throws(() => parseSettings(textOf({ ...withKey('orchestrator', undefined), roles: 5 })), {
    message: `agentrite.json: orchestrator is missing. ${ORCHESTRATOR_MUST}`,
  });
  assert.throws(() => parseSettings(textOf({ ...withKey('orchestrator', 5), standards: '' })), {
    message: `agentrite.json: standards is "". ${PATH_MUST}`,
  });
});

// 0095 R1, R2: process, and the pair of process and sandbox both false.

const NO_PROCESS_NO_SANDBOX =
  'agentrite.json: process is false and sandbox is false. A project without the process has the sandbox, so ' +
  'sandbox must hold true where process holds false';

test('process gives true and false as they are written, and false is taken beside a sandbox that is true', () => {
  assert.equal(parseSettings(textOf(withKey('process', true))).process, true);
  const sandboxOnly = { ...VALID, process: false, sandbox: true };
  assert.deepEqual(parseSettings(textOf(sandboxOnly)), sandboxOnly);
});

test('process is judged right after harnesses, before sandbox', () => {
  assert.throws(() => parseSettings(textOf({ ...withKey('process', undefined), sandbox: 'no' })), {
    message: `agentrite.json: process is missing. ${SANDBOX_MUST}`,
  });
});

test('process and sandbox both false is refused with a message that names both keys', () => {
  assert.throws(() => parseSettings(textOf({ ...VALID, process: false, sandbox: false })), {
    message: NO_PROCESS_NO_SANDBOX,
  });
});

test('a key at fault is named before the pair of process and sandbox', () => {
  assert.throws(() => parseSettings(textOf({ ...VALID, process: false, sandbox: false, standards: '' })), {
    message: `agentrite.json: standards is "". ${PATH_MUST}`,
  });
});

// R6, R8, R11: bell, for each JSON type.

test('bell gives true and false as they are written', () => {
  assert.equal(parseSettings(textOf(withKey('bell', true))).bell, true);
  assert.equal(parseSettings(textOf(withKey('bell', false))).bell, false);
});

// 0104 R1: modelServer, for each JSON type.

test('modelServer gives true and false as they are written', () => {
  assert.equal(parseSettings(textOf(withKey('modelServer', true))).modelServer, true);
  assert.equal(parseSettings(textOf(withKey('modelServer', false))).modelServer, false);
});

test('a roles that is no JSON object is named with what it holds', () => {
  for (const value of [[], ['rules/reviewer.md'], 'rules/reviewer.md', null, 5]) {
    assert.throws(
      () => parseSettings(textOf(withKey('roles', value))),
      { message: `agentrite.json: roles is ${JSON.stringify(value)}. ${ROLES_OBJECT_MUST}` },
      JSON.stringify(value),
    );
  }
});

test('a roles that lacks a role names the first one it lacks, with the four it must hold', () => {
  for (const role of ROLE_NAMES) {
    assert.throws(() => parseSettings(textOf(withRole(role, undefined))), {
      message: `agentrite.json: roles lacks ${role}. ${ROLES_MUST_HOLD}`,
    });
  }
  assert.throws(() => parseSettings(textOf({ ...VALID, roles: { reviewer: 'rules/reviewer.md' } })), {
    message: `agentrite.json: roles lacks specifier. ${ROLES_MUST_HOLD}`,
  });
});

const EXTRA = { 'security-reviewer': 'rules/security.md', 'test-writer': 'rules/tests.md' };

test('a roles that holds roles of the projects own gives the four and then those, in the order of the text', () => {
  const settings = parseSettings(textOf({ ...VALID, roles: { ...VALID.roles, ...EXTRA } }));
  assert.deepEqual(Object.keys(settings.roles), [...ROLE_NAMES, 'security-reviewer', 'test-writer']);
  assert.deepEqual(settings.roles, { ...VALID.roles, ...EXTRA });
  const before = parseSettings(textOf({ ...VALID, roles: { ...EXTRA, ...VALID.roles } }));
  assert.deepEqual(Object.keys(before.roles), [...ROLE_NAMES, 'security-reviewer', 'test-writer']);
  const reversed = parseSettings(
    textOf({ ...VALID, roles: { 'test-writer': 'a.md', 'security-reviewer': 'b.md', ...VALID.roles } }),
  );
  assert.deepEqual(Object.keys(reversed.roles).slice(4), ['test-writer', 'security-reviewer']);
});

test('an extra role may name the file of another role, one of the four or an extra one', () => {
  const roles = {
    ...VALID.roles,
    'security-reviewer': VALID.roles.reviewer,
    'test-writer': 'rules/shared.md',
    other: 'rules/shared.md',
  };
  assert.deepEqual(parseSettings(textOf({ ...VALID, roles })).roles, roles);
});

test('a roles of the four alone gives the four', () => {
  assert.deepEqual(Object.keys(parseSettings(textOf(VALID)).roles), ROLE_NAMES);
});

test('a name of the wrong form is refused with the form, the name written as JSON', () => {
  for (const name of [
    'Security-Reviewer',
    'security_reviewer',
    'reviewer2',
    '-reviewer',
    'reviewer-',
    'security--reviewer',
    'security reviewer',
    'a/b',
    'toString',
    '__proto__',
    '',
  ]) {
    const roles = JSON.parse(JSON.stringify(VALID.roles));
    const text = textOf({ ...VALID, roles: 0 }).replace(
      '"roles":0',
      `"roles":${JSON.stringify(roles).slice(0, -1)},${JSON.stringify(name)}:"x.md"}`,
    );
    assert.throws(() => parseSettings(text), {
      message: `agentrite.json: roles holds ${JSON.stringify(name)}, which is not the name of a role. ${NAME_FORM}`,
    });
  }
});

test('the name of an agent that a harness has of its own is refused with the harnesses that have it', () => {
  for (const [name, who, verb] of [
    ['general-purpose', 'Claude Code', 'has'],
    ['claude', 'Claude Code', 'has'],
    ['fork', 'Claude Code', 'has'],
    ['build', 'OpenCode', 'has'],
    ['compaction', 'OpenCode', 'has'],
    ['plan', 'Claude Code and OpenCode', 'have'],
    ['explore', 'Claude Code and OpenCode', 'have'],
    ['default', 'Codex', 'has'],
    ['worker', 'Codex', 'has'],
    ['explorer', 'Codex', 'has'],
  ]) {
    for (const harnesses of [['claude'], ['opencode'], ['codex']]) {
      assert.throws(() => parseSettings(textOf({ ...VALID, harnesses, roles: { ...VALID.roles, [name]: 'x.md' } })), {
        message:
          `agentrite.json: roles holds "${name}", which is the name of an agent that ${who} ${verb} of its own. ` +
          OWN_AGENT_REFUSAL,
      });
    }
  }
});

// Unit 0100, R4: a role's name is in lowercase, so the name of one of Codex's agents in another case is refused by
// its form before it is compared with the agents, without regard to case.
test("Codex's own agents in another case are refused as no name of a role", () => {
  for (const name of ['Default', 'EXPLORER', 'Worker']) {
    const text = textOf({ ...VALID, harnesses: ['codex'], roles: { ...VALID.roles, [name]: 'x.md' } });
    assert.throws(() => parseSettings(text), {
      message: `agentrite.json: roles holds ${JSON.stringify(name)}, which is not the name of a role. ${NAME_FORM}`,
    });
  }
});

test('a lack is named before a bad name, an earlier bad name before a later one, and a name before a path', () => {
  const lacking = { ...VALID.roles, Bad: 'x.md' };
  delete lacking.planner;
  assert.throws(() => parseSettings(textOf({ ...VALID, roles: lacking })), {
    message: `agentrite.json: roles lacks planner. ${ROLES_MUST_HOLD}`,
  });
  assert.throws(() => parseSettings(textOf({ ...VALID, roles: { ...VALID.roles, Second: 'x.md', build: 'x.md' } })), {
    message: `agentrite.json: roles holds "Second", which is not the name of a role. ${NAME_FORM}`,
  });
  assert.throws(() => parseSettings(textOf({ ...VALID, roles: { ...VALID.roles, planner: '', Bad: 'x.md' } })), {
    message: `agentrite.json: roles holds "Bad", which is not the name of a role. ${NAME_FORM}`,
  });
});

test('the path of an extra role is judged as that of the four, after them, with roles.<name> as the key', () => {
  for (const value of [5, '', '/etc/x.md', '../x.md']) {
    assert.throws(() => parseSettings(textOf({ ...VALID, roles: { ...VALID.roles, 'test-writer': value } })), {
      message: `agentrite.json: roles.test-writer is ${JSON.stringify(value)}. ${PATH_MUST}`,
    });
  }
  const both = { ...VALID.roles, 'test-writer': '', reviewer: '/x.md' };
  assert.throws(() => parseSettings(textOf({ ...VALID, roles: both })), {
    message: `agentrite.json: roles.reviewer is "/x.md". ${PATH_MUST}`,
  });
});

test('a path that is no string, is empty, is absolute or leads outside the project is refused, as written', () => {
  for (const value of [5, null, '', '/etc/standards.md', '..', '../x.md', 'a/../../x.md', './..']) {
    assert.throws(
      () => parseSettings(textOf(withKey('standards', value))),
      { message: `agentrite.json: standards is ${JSON.stringify(value)}. ${PATH_MUST}` },
      `standards ${JSON.stringify(value)}`,
    );
    assert.throws(
      () => parseSettings(textOf(withRole('reviewer', value))),
      { message: `agentrite.json: roles.reviewer is ${JSON.stringify(value)}. ${PATH_MUST}` },
      `roles.reviewer ${JSON.stringify(value)}`,
    );
  }
});

test('a path that goes up and back into the project holds', () => {
  for (const path of ['a/../x.md', './rules/house.md', 'node_modules/agentrite/standards.md']) {
    assert.equal(parseSettings(textOf(withKey('standards', path))).standards, path);
    assert.equal(parseSettings(textOf(withRole('planner', path))).roles.planner, path);
  }
});

test('the roles are judged in the order specifier, planner, implementer, reviewer', () => {
  const both = { ...VALID, roles: { ...VALID.roles, planner: '', reviewer: '/x.md' } };
  assert.throws(() => parseSettings(textOf(both)), { message: `agentrite.json: roles.planner is "". ${PATH_MUST}` });
});

// R2, R9

const ROLES_TEXT = [
  '  "roles": {',
  '    "specifier": "rules/specifier.md",',
  '    "planner": "rules/planner.md",',
  '    "implementer": "rules/implementer.md",',
  '    "reviewer": "rules/reviewer.md"',
  '  }',
];

test('settingsText writes the nine keys in order, indented by two spaces, the list on one line', () => {
  const { roles, standards } = VALID;
  assert.equal(
    settingsText({
      roles,
      orchestrator: false,
      standards,
      modelServer: true,
      bell: false,
      sandbox: true,
      process: false,
      harnesses: ['claude', 'opencode'],
      defaultBranch: 'main',
    }),
    [
      '{',
      '  "defaultBranch": "main",',
      '  "harnesses": ["claude", "opencode"],',
      '  "process": false,',
      '  "sandbox": true,',
      '  "bell": false,',
      '  "modelServer": true,',
      '  "standards": "rules/house.md",',
      '  "orchestrator": false,',
      ...ROLES_TEXT,
      '}',
      '',
    ].join('\n'),
  );
  assert.equal(
    settingsText({ ...VALID, defaultBranch: 'release/"1"', harnesses: ['opencode'], sandbox: true }),
    [
      '{',
      '  "defaultBranch": "release/\\"1\\"",',
      '  "harnesses": ["opencode"],',
      '  "process": true,',
      '  "sandbox": true,',
      '  "bell": true,',
      '  "modelServer": false,',
      '  "standards": "rules/house.md",',
      '  "orchestrator": "rules/orchestrator.json",',
      ...ROLES_TEXT,
      '}',
      '',
    ].join('\n'),
  );
});

test('what settingsText writes is read back, with roles of the projects own after the four', () => {
  const settings = { ...VALID, roles: { ...VALID.roles, ...EXTRA } };
  const text = settingsText(settings);
  assert.ok(text.includes('    "reviewer": "rules/reviewer.md",\n    "security-reviewer": "rules/security.md",\n'));
  assert.deepEqual(parseSettings(text), settings);
});

test('what settingsText writes is read back as the settings it was given', () => {
  const settings = { ...VALID, defaultBranch: 'release/"1"', harnesses: ['opencode', 'claude'], sandbox: false };
  assert.deepEqual(parseSettings(settingsText(settings)), settings);
  assert.deepEqual(parseSettings(settingsText({ ...settings, bell: false })), { ...settings, bell: false });
  const admitted = { ...settings, modelServer: true };
  assert.deepEqual(parseSettings(settingsText(admitted)), admitted);
  const optedOut = { ...settings, orchestrator: false };
  assert.deepEqual(parseSettings(settingsText(optedOut)), optedOut);
  const sandboxOnly = { ...settings, process: false, sandbox: true };
  assert.deepEqual(parseSettings(settingsText(sandboxOnly)), sandboxOnly);
});

test('the template is the default file, and settingsText of its own values is the template byte for byte', () => {
  assert.equal(
    TEMPLATE,
    [
      '{',
      '  "defaultBranch": "master",',
      '  "harnesses": ["claude", "opencode"],',
      '  "process": true,',
      '  "sandbox": true,',
      '  "bell": true,',
      '  "modelServer": false,',
      '  "standards": "node_modules/agentrite/standards.md",',
      '  "orchestrator": "node_modules/agentrite/orchestrator.json",',
      '  "roles": {',
      '    "specifier": "node_modules/agentrite/roles/specifier.md",',
      '    "planner": "node_modules/agentrite/roles/planner.md",',
      '    "implementer": "node_modules/agentrite/roles/implementer.md",',
      '    "reviewer": "node_modules/agentrite/roles/reviewer.md"',
      '  }',
      '}',
      '',
    ].join('\n'),
  );
  assert.equal(settingsText(parseSettings(TEMPLATE)), TEMPLATE);
});

// R5, R6: the one function that touches the file system.

function directory(testContext) {
  const base = temporaryDirectory(testContext, 'agentrite-settings-');
  return base;
}

test('readSettings reads the agentrite.json of the root it is given', (testContext) => {
  const base = directory(testContext);
  writeFileSync(join(base, 'agentrite.json'), settingsText(VALID));
  writePathsOf(base, VALID);
  assert.deepEqual(readSettings(base), VALID);
});

const NO_FILE_MUST = "It must name a file in the project's working tree";

test('readSettings refuses a path of a key that names no file, a directory or a dangling link', (testContext) => {
  for (const [key, settingsOf] of [
    ['standards', (path) => withKey('standards', path)],
    ['orchestrator', (path) => withKey('orchestrator', path)],
    ['roles.reviewer', (path) => withRole('reviewer', path)],
  ]) {
    for (const make of [
      () => {},
      (base, path) => mkdirSync(join(base, path), { recursive: true }),
      (base, path) => symlinkSync(join(base, 'nowhere.md'), join(base, path)),
    ]) {
      const base = directory(testContext);
      writePathsOf(base, VALID);
      const path = 'rules/missing.md';
      make(base, path);
      writeFileSync(join(base, 'agentrite.json'), textOf(settingsOf(path)));
      assert.throws(() => readSettings(base), {
        message: `agentrite.json: ${key} is "${path}", and there is no file at it. ${NO_FILE_MUST}`,
      });
    }
  }
});

test('readSettings judges standards, then orchestrator, then the roles in their order', (testContext) => {
  const base = directory(testContext);
  writeFileSync(join(base, 'agentrite.json'), textOf({ ...VALID, roles: { ...VALID.roles, planner: 'p.md' } }));
  assert.throws(() => readSettings(base), {
    message: `agentrite.json: standards is "rules/house.md", and there is no file at it. ${NO_FILE_MUST}`,
  });
  mkdirSync(join(base, 'rules'));
  writeFileSync(join(base, VALID.standards), '# standards\n');
  assert.throws(() => readSettings(base), {
    message: `agentrite.json: orchestrator is "rules/orchestrator.json", and there is no file at it. ${NO_FILE_MUST}`,
  });
  writePathsOf(base, VALID);
  assert.throws(() => readSettings(base), {
    message: `agentrite.json: roles.planner is "p.md", and there is no file at it. ${NO_FILE_MUST}`,
  });
});

test('readSettings judges the paths of a file whose process is false as of one where it is true', (testContext) => {
  for (const process of [true, false]) {
    const base = directory(testContext);
    const settings = { ...VALID, process, sandbox: true };
    writeFileSync(join(base, 'agentrite.json'), textOf(settings));
    assert.throws(() => readSettings(base), {
      message: `agentrite.json: standards is "rules/house.md", and there is no file at it. ${NO_FILE_MUST}`,
    });
    mkdirSync(join(base, 'rules'));
    writeFileSync(join(base, VALID.standards), '# standards\n');
    assert.throws(() => readSettings(base), {
      message: `agentrite.json: orchestrator is "rules/orchestrator.json", and there is no file at it. ${NO_FILE_MUST}`,
    });
    writeFileSync(join(base, VALID.orchestrator), '{}\n');
    assert.throws(() => readSettings(base), {
      message: `agentrite.json: roles.specifier is "rules/specifier.md", and there is no file at it. ${NO_FILE_MUST}`,
    });
    writePathsOf(base, settings);
    assert.deepEqual(readSettings(base), settings);
  }
});

test('readSettings takes a path through a node_modules/agentrite that links outside the project', (testContext) => {
  const kit = directory(testContext);
  writePathsOf(kit, { standards: 'standards.md', roles: { reviewer: 'roles/reviewer.md' } });
  const base = directory(testContext);
  writePathsOf(base, VALID);
  mkdirSync(join(base, 'node_modules'));
  symlinkSync(kit, join(base, 'node_modules', 'agentrite'), 'dir');
  const linked = {
    ...VALID,
    standards: 'node_modules/agentrite/standards.md',
    roles: { ...VALID.roles, reviewer: 'node_modules/agentrite/roles/reviewer.md' },
  };
  writeFileSync(join(base, 'agentrite.json'), textOf(linked));
  assert.deepEqual(readSettings(base), linked);
});

test(
  'readSettings refuses an extra role that names no file, with roles.<name> as the key, after the four',
  (testContext) => {
    const base = directory(testContext);
    const settings = { ...VALID, roles: { ...VALID.roles, 'test-writer': 'rules/tests.md' } };
    writePathsOf(base, VALID);
    writeFileSync(join(base, 'agentrite.json'), textOf(settings));
    assert.throws(() => readSettings(base), {
      message: `agentrite.json: roles.test-writer is "rules/tests.md", and there is no file at it. ${NO_FILE_MUST}`,
    });
  },
);

test('readSettings looks for no file for an orchestrator that is false', (testContext) => {
  const base = directory(testContext);
  const optedOut = withKey('orchestrator', false);
  writePathsOf(base, optedOut);
  writeFileSync(join(base, 'agentrite.json'), textOf(optedOut));
  assert.deepEqual(readSettings(base), optedOut);
});

test('readSettings takes two roles that name one file', (testContext) => {
  const base = directory(testContext);
  writePathsOf(base, VALID);
  const shared = { ...VALID, roles: { ...VALID.roles, planner: 'rules/specifier.md' } };
  writeFileSync(join(base, 'agentrite.json'), textOf(shared));
  assert.deepEqual(readSettings(base), shared);
});

test('readSettings in a directory with no file names the command that writes one', (testContext) => {
  assert.throws(() => readSettings(directory(testContext)), { message: NO_FILE });
});

test(
  'readSettings of a file that cannot be read names the file, the error and what the file must hold',
  (testContext) => {
    const base = directory(testContext);
    mkdirSync(join(base, 'agentrite.json'));
    assert.throws(
      () => readSettings(base),
      (error) => {
        assert.ok(error.message.startsWith('cannot read agentrite.json: '), error.message);
        assert.match(error.message, /EISDIR/);
        assert.ok(error.message.endsWith(OBJECT_SENTENCE), error.message);
        return true;
      },
    );
  },
);

test('readSettings refuses a file that is not valid as parseSettings does', (testContext) => {
  const base = directory(testContext);
  writeFileSync(join(base, 'agentrite.json'), textOf(withKey('sandbox', 'false')));
  assert.throws(() => readSettings(base), { message: `agentrite.json: sandbox is "false". ${SANDBOX_MUST}` });
});

// R4, R27: the entry point, which the sandbox's wrapper runs for the default branch.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite-settings.mjs');

function entryPoint(...args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf-8' });
}

test('run with a project root, the module prints the default branch and a line break, and exits 0', (testContext) => {
  const base = directory(testContext);
  writeFileSync(join(base, 'agentrite.json'), settingsText(VALID));
  writePathsOf(base, VALID);

  const result = entryPoint(base);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'main\n');
  assert.equal(result.stderr, '');
});

test(
  'run on a project with no file, or with one that is not valid, it prints why on standard error alone',
  (testContext) => {
    const missing = entryPoint(directory(testContext));
    assert.equal(missing.status, 1);
    assert.equal(missing.stdout, '');
    assert.equal(missing.stderr, `agentrite: ${NO_FILE}\n`);

    const base = directory(testContext);
    writeFileSync(join(base, 'agentrite.json'), textOf(withKey('harnesses', [])));
    const invalid = entryPoint(base);
    assert.equal(invalid.status, 1);
    assert.equal(invalid.stdout, '');
    assert.equal(invalid.stderr, `agentrite: agentrite.json: harnesses is []. ${HARNESSES_MUST}\n`);

    const neither = directory(testContext);
    writeFileSync(join(neither, 'agentrite.json'), textOf({ ...VALID, process: false, sandbox: false }));
    const refused = entryPoint(neither);
    assert.equal(refused.status, 1);
    assert.equal(refused.stdout, '');
    assert.equal(refused.stderr, `agentrite: ${NO_PROCESS_NO_SANDBOX}\n`);
  },
);

test('run with no project root, or with more than one argument, it prints its usage and exits 2', (testContext) => {
  for (const args of [
    [],
    [directory(testContext), 'more'],
    [directory(testContext), 'bell'],
    [directory(testContext), 'bell', 'more'],
  ]) {
    const result = entryPoint(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'usage: node agentrite-settings.mjs <project root>\n');
  }
});

test('imported, the module prints nothing', () => {
  const importing = `await import(${JSON.stringify(script)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', importing], { encoding: 'utf-8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout + result.stderr, '');
});

// R18 of 0097 and R4 of 0104: bell, modelServer and harnesses alone, as a start of the sandbox reads them.

const BELL_MUST = 'It must hold true or false';

// A file of bell, modelServer and harnesses alone, the start's three keys.
function startText(bell, harnesses, modelServer = false) {
  return textOf({ bell, modelServer, harnesses });
}

test('parseStart gives bell, modelServer and harnesses, from a file of the three alone and from a whole file', () => {
  assert.deepEqual(parseStart(startText(true, ['claude'])), { bell: true, modelServer: false, harnesses: ['claude'] });
  assert.deepEqual(parseStart(startText(false, ['opencode'], true)), {
    bell: false,
    modelServer: true,
    harnesses: ['opencode'],
  });
  assert.deepEqual(parseStart(settingsText(VALID)), { bell: true, modelServer: false, harnesses: ['opencode'] });
  assert.deepEqual(parseStart(settingsText({ ...VALID, bell: false, modelServer: true })), {
    bell: false,
    modelServer: true,
    harnesses: ['opencode'],
  });
});

test('parseStart gives the harnesses in the order of the list of harnesses, each once', () => {
  const reversed = [...HARNESS_NAMES].reverse();
  assert.deepEqual(parseStart(startText(true, reversed)).harnesses, HARNESS_NAMES);
  assert.deepEqual(parseStart(startText(true, [...reversed, ...HARNESS_NAMES])).harnesses, HARNESS_NAMES);
  for (const name of HARNESS_NAMES) {
    assert.deepEqual(parseStart(startText(true, [name, name])).harnesses, [name]);
  }
});

test('parseStart judges no other key: a file whose other keys are all wrong gives its three', () => {
  const wrong = { defaultBranch: 5, process: 'no', sandbox: 'yes', standards: '/x', orchestrator: 7, roles: [] };
  assert.deepEqual(parseStart(textOf({ ...wrong, bell: false, modelServer: true, harnesses: ['claude'] })), {
    bell: false,
    modelServer: true,
    harnesses: ['claude'],
  });
  const fromValid = { bell: true, modelServer: false, harnesses: ['opencode'] };
  for (const key of ['defaultBranch', 'roles', 'standards']) {
    assert.deepEqual(parseStart(textOf(withKey(key, undefined))), fromValid, key);
  }
  assert.deepEqual(parseStart(textOf(withRole('planner', undefined))), fromValid);
  assert.deepEqual(parseStart(textOf({ ...VALID, process: false, sandbox: false })), fromValid);
});

test('parseStart refuses a bell that is missing or holds anything but true or false, naming what it holds', () => {
  assert.throws(() => parseStart('{}'), { message: `agentrite.json: bell is missing. ${BELL_MUST}` });
  assert.throws(() => parseStart(textOf(withKey('bell', undefined))), {
    message: `agentrite.json: bell is missing. ${BELL_MUST}`,
  });
  for (const value of [null, 0, 1, 'true', 'false', [], [true], {}, { on: true }]) {
    assert.throws(
      () => parseStart(textOf({ bell: value, harnesses: ['claude'] })),
      { message: `agentrite.json: bell is ${JSON.stringify(value)}. ${BELL_MUST}` },
      JSON.stringify(value),
    );
  }
});

test('parseStart judges bell before harnesses', () => {
  assert.throws(() => parseStart(textOf({ bell: 'on', modelServer: false, harnesses: [] })), {
    message: `agentrite.json: bell is "on". ${BELL_MUST}`,
  });
});

test('parseStart refuses a modelServer that is missing or holds anything but true or false', () => {
  assert.throws(() => parseStart(textOf(withKey('modelServer', undefined))), {
    message: `agentrite.json: modelServer is missing. ${BELL_MUST}`,
  });
  for (const value of [null, 0, 'true', 'false', [], {}]) {
    assert.throws(
      () => parseStart(textOf({ bell: true, modelServer: value, harnesses: ['claude'] })),
      { message: `agentrite.json: modelServer is ${JSON.stringify(value)}. ${BELL_MUST}` },
      JSON.stringify(value),
    );
  }
});

test('parseStart judges bell before modelServer, and modelServer before harnesses', () => {
  assert.throws(() => parseStart(textOf({ bell: 'on', modelServer: 'on', harnesses: ['claude'] })), {
    message: `agentrite.json: bell is "on". ${BELL_MUST}`,
  });
  assert.throws(() => parseStart(textOf({ bell: true, modelServer: 'on', harnesses: [] })), {
    message: `agentrite.json: modelServer is "on". ${BELL_MUST}`,
  });
  assert.throws(() => parseStart('{"bell": true, "harnesses": []}'), {
    message: `agentrite.json: modelServer is missing. ${BELL_MUST}`,
  });
});

test('parseStart refuses harnesses missing, empty, not a list or naming an unknown harness', () => {
  assert.throws(() => parseStart('{"bell": true, "modelServer": false}'), {
    message: `agentrite.json: harnesses is missing. ${HARNESSES_MUST}`,
  });
  for (const value of [[], 'claude', null, 5, { claude: true }, ['claude', 5], ['aider'], ['claude', 'toString']]) {
    assert.throws(
      () => parseStart(startText(true, value)),
      { message: `agentrite.json: harnesses is ${JSON.stringify(value)}. ${HARNESSES_MUST}` },
      JSON.stringify(value),
    );
  }
});

test('parseStart refuses a text that is not JSON with the parser own error, and that bell cannot be read', () => {
  for (const text of ['', 'not json', '{ "bell": true, }']) {
    let parserMessage;
    try {
      JSON.parse(text);
    } catch (error) {
      parserMessage = error.message;
    }
    assert.throws(() => parseStart(text), {
      message: `agentrite.json is not JSON: ${parserMessage}, so bell cannot be read. ${BELL_MUST}`,
    });
  }
});

test('parseStart refuses JSON that is no object, naming what it holds and that bell is missing', () => {
  for (const text of ['[]', 'null', 'true', '5', '"bell"']) {
    assert.throws(() => parseStart(text), {
      message:
        `agentrite.json holds ${JSON.stringify(JSON.parse(text))}, which is no JSON object, so bell is missing. ` +
        BELL_MUST,
    });
  }
});

test('readStart reads the agentrite.json at the root, with no file the paths name', (testContext) => {
  const base = directory(testContext);
  writeFileSync(join(base, 'agentrite.json'), settingsText({ ...VALID, bell: false, modelServer: true }));
  assert.deepEqual(readStart(base), { bell: false, modelServer: true, harnesses: ['opencode'] });
});

const NO_FILE_BELL =
  'the project has no agentrite.json, so bell is missing. It must hold true or false. ' +
  'Run: npx agentrite config, which writes one';

test(
  'readStart in a directory with no file says that bell is missing and names the command that writes one',
  (testContext) => {
    assert.throws(() => readStart(directory(testContext)), { message: NO_FILE_BELL });
  },
);

test(
  'readStart of a file that cannot be read names the file, the error and that bell cannot be read',
  (testContext) => {
    const base = directory(testContext);
    mkdirSync(join(base, 'agentrite.json'));
    assert.throws(
      () => readStart(base),
      (error) => {
        assert.ok(error.message.startsWith('cannot read agentrite.json: '), error.message);
        assert.match(error.message, /EISDIR/);
        assert.ok(error.message.endsWith(`, so bell cannot be read. ${BELL_MUST}`), error.message);
        return true;
      },
    );
  },
);
