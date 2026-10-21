import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ROLE_NAMES } from '../scripts/agentrite-roles.mjs';
import {
  parseBell,
  parseSettings,
  readBell,
  readSettings,
  SETTINGS_FILE,
  settingsText,
} from '../scripts/agentrite-settings.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const OBJECT_SENTENCE =
  'The file must hold a JSON object with the keys defaultBranch, harnesses, sandbox, bell, standards, ' +
  'orchestrator and roles';
const NO_FILE = 'the project has no agentrite.json. Run: npx agentrite config, which writes one';

const VALID = {
  defaultBranch: 'main',
  harnesses: ['opencode'],
  sandbox: false,
  bell: true,
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

test('a valid file gives the seven settings', () => {
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

test('a key the kit does not know is ignored, beside the seven', () => {
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
const HARNESSES_MUST = 'It must hold a list of one or more of "claude" and "opencode"';
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

test('each of the seven keys, when missing, is named as missing, with what it must hold', () => {
  for (const [key, must] of [
    ['defaultBranch', BRANCH_MUST],
    ['harnesses', HARNESSES_MUST],
    ['sandbox', SANDBOX_MUST],
    ['bell', SANDBOX_MUST],
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
    ['harnesses', ['codex'], HARNESSES_MUST],
    ['harnesses', ['claude', 'toString'], HARNESSES_MUST],
    ['sandbox', 'false', SANDBOX_MUST],
    ['sandbox', 0, SANDBOX_MUST],
    ['bell', null, SANDBOX_MUST],
    ['bell', 0, SANDBOX_MUST],
    ['bell', 'true', SANDBOX_MUST],
    ['bell', [], SANDBOX_MUST],
    ['bell', {}, SANDBOX_MUST],
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
  assert.throws(() => parseSettings(textOf({ ...withKey('orchestrator', undefined), roles: 5 })), {
    message: `agentrite.json: orchestrator is missing. ${ORCHESTRATOR_MUST}`,
  });
  assert.throws(() => parseSettings(textOf({ ...withKey('orchestrator', 5), standards: '' })), {
    message: `agentrite.json: standards is "". ${PATH_MUST}`,
  });
});

// R6, R8, R11: bell, for each JSON type.

test('bell gives true and false as they are written', () => {
  assert.equal(parseSettings(textOf(withKey('bell', true))).bell, true);
  assert.equal(parseSettings(textOf(withKey('bell', false))).bell, false);
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
  ]) {
    for (const harnesses of [['claude'], ['opencode']]) {
      assert.throws(() => parseSettings(textOf({ ...VALID, harnesses, roles: { ...VALID.roles, [name]: 'x.md' } })), {
        message:
          `agentrite.json: roles holds "${name}", which is the name of an agent that ${who} ${verb} of its own. ` +
          OWN_AGENT_REFUSAL,
      });
    }
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

test('settingsText writes the seven keys in order, indented by two spaces, the list on one line', () => {
  const { roles, standards } = VALID;
  assert.equal(
    settingsText({
      roles,
      orchestrator: false,
      standards,
      bell: false,
      sandbox: false,
      harnesses: ['claude', 'opencode'],
      defaultBranch: 'main',
    }),
    [
      '{',
      '  "defaultBranch": "main",',
      '  "harnesses": ["claude", "opencode"],',
      '  "sandbox": false,',
      '  "bell": false,',
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
      '  "sandbox": true,',
      '  "bell": true,',
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
  const optedOut = { ...settings, orchestrator: false };
  assert.deepEqual(parseSettings(settingsText(optedOut)), optedOut);
});

test('the template is the default file, and settingsText of its own values is the template byte for byte', () => {
  assert.equal(
    TEMPLATE,
    [
      '{',
      '  "defaultBranch": "master",',
      '  "harnesses": ["claude", "opencode"],',
      '  "sandbox": true,',
      '  "bell": true,',
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

function directory(t) {
  const base = temporaryDirectory(t, 'agentrite-settings-');
  return base;
}

test('readSettings reads the agentrite.json of the root it is given', (t) => {
  const base = directory(t);
  writeFileSync(join(base, 'agentrite.json'), settingsText(VALID));
  writePathsOf(base, VALID);
  assert.deepEqual(readSettings(base), VALID);
});

const NO_FILE_MUST = "It must name a file in the project's working tree";

test('readSettings refuses a path of a key that names no file, a directory or a dangling link', (t) => {
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
      const base = directory(t);
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

test('readSettings judges standards, then orchestrator, then the roles in their order', (t) => {
  const base = directory(t);
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

test('readSettings takes a path through a node_modules/agentrite that links outside the project', (t) => {
  const kit = directory(t);
  writePathsOf(kit, { standards: 'standards.md', roles: { reviewer: 'roles/reviewer.md' } });
  const base = directory(t);
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

test('readSettings refuses an extra role that names no file, with roles.<name> as the key, after the four', (t) => {
  const base = directory(t);
  const settings = { ...VALID, roles: { ...VALID.roles, 'test-writer': 'rules/tests.md' } };
  writePathsOf(base, VALID);
  writeFileSync(join(base, 'agentrite.json'), textOf(settings));
  assert.throws(() => readSettings(base), {
    message: `agentrite.json: roles.test-writer is "rules/tests.md", and there is no file at it. ${NO_FILE_MUST}`,
  });
});

test('readSettings looks for no file for an orchestrator that is false', (t) => {
  const base = directory(t);
  const optedOut = withKey('orchestrator', false);
  writePathsOf(base, optedOut);
  writeFileSync(join(base, 'agentrite.json'), textOf(optedOut));
  assert.deepEqual(readSettings(base), optedOut);
});

test('readSettings takes two roles that name one file', (t) => {
  const base = directory(t);
  writePathsOf(base, VALID);
  const shared = { ...VALID, roles: { ...VALID.roles, planner: 'rules/specifier.md' } };
  writeFileSync(join(base, 'agentrite.json'), textOf(shared));
  assert.deepEqual(readSettings(base), shared);
});

test('readSettings in a directory with no file names the command that writes one', (t) => {
  assert.throws(() => readSettings(directory(t)), { message: NO_FILE });
});

test('readSettings of a file that cannot be read names the file, the error and what the file must hold', (t) => {
  const base = directory(t);
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
});

test('readSettings refuses a file that is not valid as parseSettings does', (t) => {
  const base = directory(t);
  writeFileSync(join(base, 'agentrite.json'), textOf(withKey('sandbox', 'false')));
  assert.throws(() => readSettings(base), { message: `agentrite.json: sandbox is "false". ${SANDBOX_MUST}` });
});

// R4, R27: the entry point, which the sandbox's wrapper runs for the default branch.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite-settings.mjs');

function entryPoint(...args) {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf-8' });
}

test('run with a project root, the module prints the default branch and a line break, and exits 0', (t) => {
  const base = directory(t);
  writeFileSync(join(base, 'agentrite.json'), settingsText(VALID));
  writePathsOf(base, VALID);

  const result = entryPoint(base);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'main\n');
  assert.equal(result.stderr, '');
});

test('run on a project with no file, or with one that is not valid, it prints why on standard error alone', (t) => {
  const missing = entryPoint(directory(t));
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.equal(missing.stderr, `agentrite: ${NO_FILE}\n`);

  const base = directory(t);
  writeFileSync(join(base, 'agentrite.json'), textOf(withKey('harnesses', [])));
  const invalid = entryPoint(base);
  assert.equal(invalid.status, 1);
  assert.equal(invalid.stdout, '');
  assert.equal(invalid.stderr, `agentrite: agentrite.json: harnesses is []. ${HARNESSES_MUST}\n`);
});

test('run with no project root, or with more than one argument, it prints its usage and exits 2', (t) => {
  for (const args of [[], [directory(t), 'more'], [directory(t), 'bell', 'more'], [directory(t), 'Bell']]) {
    const result = entryPoint(...args);
    assert.equal(result.status, 2);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'usage: node agentrite-settings.mjs <project root> [bell]\n');
  }
});

test('imported, the module prints nothing', () => {
  const importing = `await import(${JSON.stringify(script)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', importing], { encoding: 'utf-8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout + result.stderr, '');
});

// R6, R7, R11: bell alone, as a start of the sandbox reads it.

const BELL_MUST = 'It must hold true or false';

test('parseBell gives true and false, from a file of bell alone and from a whole file', () => {
  assert.equal(parseBell('{"bell": true}'), true);
  assert.equal(parseBell('{"bell": false}'), false);
  assert.equal(parseBell(settingsText(VALID)), true);
  assert.equal(parseBell(settingsText({ ...VALID, bell: false })), false);
  assert.equal(parseBell(textOf(withKey('orchestrator', undefined))), true);
});

test('parseBell judges no other key: a file whose other keys are all wrong gives its bell', () => {
  const wrong = { defaultBranch: 5, harnesses: [], sandbox: 'yes', standards: '/x', roles: [], bell: false };
  assert.equal(parseBell(textOf(wrong)), false);
  assert.equal(parseBell(textOf({ ...wrong, bell: true })), true);
});

test('parseBell refuses a bell that is missing or holds anything but true or false, naming what it holds', () => {
  assert.throws(() => parseBell('{}'), { message: `agentrite.json: bell is missing. ${BELL_MUST}` });
  assert.throws(() => parseBell(textOf(withKey('bell', undefined))), {
    message: `agentrite.json: bell is missing. ${BELL_MUST}`,
  });
  for (const value of [null, 0, 1, 'true', 'false', [], [true], {}, { on: true }]) {
    assert.throws(
      () => parseBell(textOf({ bell: value })),
      { message: `agentrite.json: bell is ${JSON.stringify(value)}. ${BELL_MUST}` },
      JSON.stringify(value),
    );
  }
});

test('parseBell refuses a text that is not JSON with the parser own error, and that bell cannot be read', () => {
  for (const text of ['', 'not json', '{ "bell": true, }']) {
    let parserMessage;
    try {
      JSON.parse(text);
    } catch (error) {
      parserMessage = error.message;
    }
    assert.throws(() => parseBell(text), {
      message: `agentrite.json is not JSON: ${parserMessage}, so bell cannot be read. ${BELL_MUST}`,
    });
  }
});

test('parseBell refuses JSON that is no object, naming what it holds and that bell is missing', () => {
  for (const text of ['[]', 'null', 'true', '5', '"bell"']) {
    assert.throws(() => parseBell(text), {
      message:
        `agentrite.json holds ${JSON.stringify(JSON.parse(text))}, which is no JSON object, so bell is missing. ` +
        BELL_MUST,
    });
  }
});

test('readBell reads the bell of the agentrite.json at the root, with no file the paths name', (t) => {
  const base = directory(t);
  writeFileSync(join(base, 'agentrite.json'), settingsText({ ...VALID, bell: false }));
  assert.equal(readBell(base), false);
});

const NO_FILE_BELL =
  'the project has no agentrite.json, so bell is missing. It must hold true or false. ' +
  'Run: npx agentrite config, which writes one';

test('readBell in a directory with no file says that bell is missing and names the command that writes one', (t) => {
  assert.throws(() => readBell(directory(t)), { message: NO_FILE_BELL });
});

test('readBell of a file that cannot be read names the file, the error and that bell cannot be read', (t) => {
  const base = directory(t);
  mkdirSync(join(base, 'agentrite.json'));
  assert.throws(
    () => readBell(base),
    (error) => {
      assert.ok(error.message.startsWith('cannot read agentrite.json: '), error.message);
      assert.match(error.message, /EISDIR/);
      assert.ok(error.message.endsWith(`, so bell cannot be read. ${BELL_MUST}`), error.message);
      return true;
    },
  );
});

test('run with a project root and bell, the module prints true or false and a line break, and exits 0', (t) => {
  for (const bell of [true, false]) {
    const base = directory(t);
    writeFileSync(join(base, 'agentrite.json'), textOf({ bell }));
    const result = entryPoint(base, 'bell');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${bell}\n`);
    assert.equal(result.stderr, '');
  }
});

// A shell that sets FORCE_COLOR would give a value printed in colour to container/sandbox.sh, which takes nothing but
// the bare word for true.
test('run with bell, the module prints the bare word also where the environment asks for colour', (t) => {
  for (const bell of [true, false]) {
    const base = directory(t);
    writeFileSync(join(base, 'agentrite.json'), textOf({ bell }));
    const result = spawnSync(process.execPath, [script, base, 'bell'], {
      encoding: 'utf-8',
      env: { ...process.env, FORCE_COLOR: '1' },
    });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, `${bell}\n`);
  }
});

test('run with bell on a file at fault, or on no file, it prints why on standard error alone and exits 1', (t) => {
  const missing = entryPoint(directory(t), 'bell');
  assert.equal(missing.status, 1);
  assert.equal(missing.stdout, '');
  assert.equal(missing.stderr, `agentrite: ${NO_FILE_BELL}\n`);

  for (const [text, message] of [
    ['{}', `agentrite.json: bell is missing. ${BELL_MUST}`],
    ['{"bell": "true"}', `agentrite.json: bell is "true". ${BELL_MUST}`],
    ['[]', `agentrite.json holds [], which is no JSON object, so bell is missing. ${BELL_MUST}`],
  ]) {
    const base = directory(t);
    writeFileSync(join(base, 'agentrite.json'), text);
    const result = entryPoint(base, 'bell');
    assert.equal(result.status, 1, text);
    assert.equal(result.stdout, '', text);
    assert.equal(result.stderr, `agentrite: ${message}\n`, text);
  }
});
