import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { ROLE_NAMES } from '../scripts/agentrite-roles.mjs';
import { parseSettings, readSettings, SETTINGS_FILE, settingsText } from '../scripts/agentrite-settings.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const OBJECT_SENTENCE =
  'The file must hold a JSON object with the keys defaultBranch, harnesses, sandbox, standards and roles';
const NO_FILE = 'the project has no agentrite.json. Run: npx agentrite config, which writes one';

const VALID = {
  defaultBranch: 'main',
  harnesses: ['opencode'],
  sandbox: false,
  standards: 'rules/house.md',
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
  for (const path of [settings.standards, ...Object.values(settings.roles)]) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), `# ${path}\n`);
  }
}

test('the file is named agentrite.json', () => {
  assert.equal(SETTINGS_FILE, 'agentrite.json');
});

// R1, R3

test('a valid file gives the five settings', () => {
  assert.deepEqual(parseSettings(textOf(VALID)), VALID);
  const both = { ...VALID, defaultBranch: 'master', harnesses: ['claude', 'opencode'], sandbox: true };
  assert.deepEqual(parseSettings(textOf(both)), both);
});

test('roles are given in the order specifier, planner, implementer, reviewer, whatever the order of the text', () => {
  const reversed = Object.fromEntries(Object.entries(VALID.roles).reverse());
  const settings = parseSettings(textOf({ ...VALID, roles: reversed }));
  assert.deepEqual(Object.keys(settings.roles), ['specifier', 'planner', 'implementer', 'reviewer']);
  assert.deepEqual(Object.keys(settings.roles), ROLE_NAMES);
  assert.deepEqual(settings.roles, VALID.roles);
});

test('two or more roles may name the same file', () => {
  const shared = { ...VALID, roles: { ...VALID.roles, planner: 'rules/specifier.md', reviewer: 'rules/specifier.md' } };
  assert.deepEqual(parseSettings(textOf(shared)), shared);
});

test('a harness named more than once is there once, and the list keeps the order of the file', () => {
  const settings = parseSettings(textOf(withKey('harnesses', ['opencode', 'claude', 'opencode', 'claude'])));
  assert.deepEqual(settings.harnesses, ['opencode', 'claude']);
});

test('a key the kit does not know is ignored, beside the five', () => {
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
    assert.throws(() => parseSettings(text), (error) => {
      assert.ok(error.message.startsWith('agentrite.json is not JSON: '), error.message);
      assert.ok(error.message.includes(parserMessage), error.message);
      assert.ok(error.message.endsWith(OBJECT_SENTENCE), error.message);
      return true;
    });
  }
});

test('JSON that is no object is refused with the file and what the file must hold', () => {
  for (const text of ['[]', 'null', '"main"', '5', 'true']) {
    assert.throws(() => parseSettings(text), (error) => {
      assert.ok(error.message.startsWith('agentrite.json '), `${text}: ${error.message}`);
      assert.ok(error.message.endsWith(OBJECT_SENTENCE), `${text}: ${error.message}`);
      return true;
    });
  }
});

const BRANCH_MUST = 'It must hold the name of a branch, as a string that is not empty';
const HARNESSES_MUST = 'It must hold a list of one or more of "claude" and "opencode"';
const SANDBOX_MUST = 'It must hold true or false';

const PATH_MUST =
  'It must hold the path of a file, relative to the project root, that does not lead outside the project';
const ROLES_OBJECT_MUST =
  'It must hold an object from each of the roles specifier, planner, implementer and reviewer to the path of its file';
const ROLES_EXACTLY_MUST =
  'It must hold exactly the roles specifier, planner, implementer and reviewer, each with the path of its file';

test('each of the five keys, when missing, is named as missing, with what it must hold', () => {
  for (const [key, must] of [
    ['defaultBranch', BRANCH_MUST],
    ['harnesses', HARNESSES_MUST],
    ['sandbox', SANDBOX_MUST],
    ['standards', PATH_MUST],
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
  ]) {
    assert.throws(
      () => parseSettings(textOf(withKey(key, value))),
      { message: `agentrite.json: ${key} is ${JSON.stringify(value)}. ${must}` },
      `${key} ${JSON.stringify(value)}`,
    );
  }
});

test('the first key at fault, in the order defaultBranch, harnesses, sandbox, standards, roles, is named', () => {
  assert.throws(() => parseSettings('{}'), { message: `agentrite.json: defaultBranch is missing. ${BRANCH_MUST}` });
  assert.throws(() => parseSettings('{"sandbox": 1, "harnesses": [], "defaultBranch": "main"}'), {
    message: `agentrite.json: harnesses is []. ${HARNESSES_MUST}`,
  });
  const { standards: _standards, roles: _roles, ...three } = VALID;
  assert.throws(() => parseSettings(textOf({ ...three, roles: 5 })), {
    message: `agentrite.json: standards is missing. ${PATH_MUST}`,
  });
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
      message: `agentrite.json: roles lacks ${role}. ${ROLES_EXACTLY_MUST}`,
    });
  }
  assert.throws(() => parseSettings(textOf({ ...VALID, roles: { reviewer: 'rules/reviewer.md' } })), {
    message: `agentrite.json: roles lacks specifier. ${ROLES_EXACTLY_MUST}`,
  });
});

test('a roles that holds a name that is no role names it, with the four it must hold', () => {
  assert.throws(() => parseSettings(textOf(withRole('tester', 'rules/tester.md'))), {
    message: `agentrite.json: roles holds "tester", which is no role. ${ROLES_EXACTLY_MUST}`,
  });
  assert.throws(() => parseSettings(textOf({ ...withRole('reviewer', undefined), roles: { tester: 'x.md' } })), {
    message: `agentrite.json: roles lacks specifier. ${ROLES_EXACTLY_MUST}`,
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

test('settingsText writes the five keys in order, indented by two spaces, the list on one line', () => {
  const { roles, standards } = VALID;
  assert.equal(
    settingsText({ roles, standards, sandbox: false, harnesses: ['claude', 'opencode'], defaultBranch: 'main' }),
    [
      '{',
      '  "defaultBranch": "main",',
      '  "harnesses": ["claude", "opencode"],',
      '  "sandbox": false,',
      '  "standards": "rules/house.md",',
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
      '  "standards": "rules/house.md",',
      ...ROLES_TEXT,
      '}',
      '',
    ].join('\n'),
  );
});

test('what settingsText writes is read back as the settings it was given', () => {
  const settings = { ...VALID, defaultBranch: 'release/"1"', harnesses: ['opencode', 'claude'], sandbox: false };
  assert.deepEqual(parseSettings(settingsText(settings)), settings);
});

test('the template is the default file, and settingsText of its own values is the template byte for byte', () => {
  assert.equal(
    TEMPLATE,
    [
      '{',
      '  "defaultBranch": "master",',
      '  "harnesses": ["claude", "opencode"],',
      '  "sandbox": true,',
      '  "standards": "node_modules/agentrite/standards.md",',
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

test('readSettings refuses a standards or a role that names no file, a directory or a dangling link', (t) => {
  for (const [key, settingsOf] of [
    ['standards', (path) => withKey('standards', path)],
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

test('readSettings judges standards before the roles, and the roles in their order', (t) => {
  const base = directory(t);
  writeFileSync(join(base, 'agentrite.json'), textOf({ ...VALID, roles: { ...VALID.roles, planner: 'p.md' } }));
  assert.throws(() => readSettings(base), {
    message: `agentrite.json: standards is "rules/house.md", and there is no file at it. ${NO_FILE_MUST}`,
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
  assert.throws(() => readSettings(base), (error) => {
    assert.ok(error.message.startsWith('cannot read agentrite.json: '), error.message);
    assert.match(error.message, /EISDIR/);
    assert.ok(error.message.endsWith(OBJECT_SENTENCE), error.message);
    return true;
  });
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
  for (const args of [[], [directory(t), 'more']]) {
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
