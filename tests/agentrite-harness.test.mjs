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
  codex,
  codexInitNotice,
  codexKitStandardsNotice,
  codexRefreshNotice,
} from '../scripts/harnesses/codex.mjs';
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
 * True for an object that holds exactly the fields `fields`, each a string.
 *
 * @param {unknown} item
 * @param {string[]} fields
 * @returns {boolean}
 */
function isRecordOf(item, fields) {
  if (typeof item !== 'object' || item === null || Array.isArray(item)) return false;
  const keys = Object.keys(item);
  return keys.length === fields.length && fields.every((field) => typeof item[field] === 'string');
}

/**
 * The kind of a value as the contract names kinds, or what it is otherwise, for the message of a fault. A list is
 * `records` when `fields` is given and every item holds exactly those fields, each a string, so that an empty list
 * is of either kind of list.
 *
 * @param {unknown} value
 * @param {string[] | undefined} fields
 * @returns {string}
 */
function kindOf(value, fields) {
  if (typeof value === 'string') return 'string';
  if (typeof value === 'function') return 'function';
  if (Array.isArray(value)) {
    if (fields !== undefined && value.every((item) => isRecordOf(item, fields))) return 'records';
    return value.every((item) => typeof item === 'string') ? 'strings' : 'array';
  }
  return value === null ? 'null' : typeof value;
}

/**
 * The kind of a member as a fault names it: `records` with its fields.
 *
 * @param {{ kind: string, fields?: string[] }} entry
 * @returns {string}
 */
function kindNamed({ kind, fields }) {
  if (fields === undefined) return kind;
  return `${kind} of ${fields.slice(0, -1).join(', ')} and ${fields.at(-1)}`;
}

/**
 * The value of the member at the path `member` of `harness`, or `undefined` for one it lacks.
 *
 * @param {Record<string, unknown>} harness
 * @param {string} member
 * @returns {unknown}
 */
function memberOf(harness, member) {
  /** @type {unknown} */ let value = harness;
  for (const key of member.split('.')) {
    value = typeof value === 'object' && value !== null && Object.hasOwn(value, key) ? value[key] : undefined;
  }
  return value;
}

/**
 * The faults of one harness against the contract: a member it lacks, and a member it has of another kind.
 *
 * @param {Record<string, unknown>} harness
 * @param {{ member: string, kind: string, fields?: string[] }[]} contract
 * @returns {string[]}
 */
function contractFaults(harness, contract) {
  return contract.flatMap((entry) => {
    const value = memberOf(harness, entry.member);
    if (value === undefined) return [`${harness.name} lacks ${entry.member}`];
    const found = kindOf(value, entry.fields);
    if (found === entry.kind) return [];
    return [`${harness.name} has ${entry.member} as ${found}, and the contract makes it ${kindNamed(entry)}`];
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

  const hostWithoutReason = {
    ...claude,
    sandbox: { ...claude.sandbox, hosts: [{ host: 'api.anthropic.com' }] },
  };
  assert.deepEqual(contractFaults(hostWithoutReason, HARNESS_CONTRACT), [
    'claude has sandbox.hosts as array, and the contract makes it records of host and reason',
  ]);

  const numberTarget = {
    ...opencode,
    sandbox: {
      ...opencode.sandbox,
      bell: { ...opencode.sandbox.bell, mounts: [{ from: 'kit', path: 'bell-plugin.js', target: 5 }] },
    },
  };
  assert.deepEqual(contractFaults(numberTarget, HARNESS_CONTRACT), [
    'opencode has sandbox.bell.mounts as array, and the contract makes it records of from, path and target',
  ]);

  const stringsForRecords = { ...claude, sandbox: { ...claude.sandbox, hosts: ['api.anthropic.com'] } };
  assert.deepEqual(contractFaults(stringsForRecords, HARNESS_CONTRACT), [
    'claude has sandbox.hosts as strings, and the contract makes it records of host and reason',
  ]);

  const extraField = {
    ...claude,
    sandbox: { ...claude.sandbox, hosts: [{ host: 'api.anthropic.com', reason: 'the API', port: '443' }] },
  };
  assert.deepEqual(contractFaults(extraField, HARNESS_CONTRACT), [
    'claude has sandbox.hosts as array, and the contract makes it records of host and reason',
  ]);

  const withoutHeadless = { ...opencode, headless: undefined };
  assert.deepEqual(
    contractFaults(withoutHeadless, HARNESS_CONTRACT).filter((fault) => fault.includes('headless')),
    ['arguments', 'read', 'follow', 'refused'].map((member) => `opencode lacks headless.${member}`),
  );
});

// R2

test('the contract holds its thirty members, each with a kind and a purpose', () => {
  assert.deepEqual(
    HARNESS_CONTRACT.map(({ member }) => member),
    [
      'name',
      'title',
      'wrappers.directory',
      'wrappers.render',
      'wrappers.ownAgents',
      'wrappers.extension',
      'wrappers.isKit',
      'wrappers.refreshed',
      'start.command',
      'start.skipPermissions',
      'start.interactive',
      'start.headless',
      'start.role',
      'headless.arguments',
      'headless.read',
      'headless.follow',
      'headless.refused',
      'instructions.file',
      'instructions.init',
      'instructions.refresh',
      'sandbox.package',
      'sandbox.versionArgument',
      'sandbox.readVersion',
      'sandbox.updates.environment',
      'sandbox.updates.mounts',
      'sandbox.logDirectories',
      'sandbox.hosts',
      'sandbox.bell.environment',
      'sandbox.bell.mounts',
      'sandbox.host',
    ],
  );
  for (const { member, kind, purpose, fields } of HARNESS_CONTRACT) {
    assert.ok(['string', 'function', 'strings', 'records'].includes(kind), `${member} has the kind ${kind}`);
    assert.equal(typeof purpose, 'string', member);
    assert.notEqual(purpose.trim(), '', member);
    if (kind === 'records') {
      assert.ok(Array.isArray(fields) && fields.length > 0, `${member} names its fields`);
    } else {
      assert.equal(fields, undefined, `${member} has fields and is not of the kind records`);
    }
  }
});

// 0100 R3: the format of each harness's wrappers

const ROLE = { name: 'planner', path: 'node_modules/agentrite/roles/planner.md', description: 'Writes the plan.' };

for (const harness of HARNESSES) {
  test(`${harness.name}: the extension of a wrapper opens with a dot and holds no slash`, () => {
    assert.match(harness.wrappers.extension, /^\.[^/]+$/);
  });

  test(`${harness.name}: a wrapper it renders is the kit's, and refreshing it over itself leaves it`, () => {
    const rendered = harness.wrappers.render(ROLE);
    assert.equal(harness.wrappers.isKit(rendered), true);
    assert.equal(harness.wrappers.refreshed(rendered, rendered), rendered);
  });
}

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

test('the list holds claude, opencode and then codex, and each is found by its name', () => {
  assert.deepEqual(HARNESS_NAMES, ['claude', 'opencode', 'codex']);
  assert.deepEqual(HARNESSES, [claude, opencode, codex]);
  assert.equal(harnessNamed('claude'), claude);
  assert.equal(harnessNamed('opencode'), opencode);
  assert.equal(harnessNamed('codex'), codex);
  assert.equal(codex.title, 'Codex');
  assert.throws(() => harnessNamed('aider'), { message: 'unknown harness: aider' });
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

// 0097 R1: what the sandbox knows of each harness, for every harness of the list

/**
 * Every value of the `sandbox` group of `harness` that is printed to the wrapper as a field, with where it is from.
 * What `sandbox.host` gives is not among them, since it depends on the host; the helper's tests cover it.
 *
 * @param {import('../scripts/agentrite-harness.mjs').Harness} harness
 * @returns {[string, string][]}
 */
function sandboxFields(harness) {
  const { sandbox } = harness;
  const mountFields = (group, mounts) =>
    mounts.flatMap((mount, index) =>
      Object.entries(mount).map(([field, value]) => [`${group}.mounts[${index}].${field}`, value]),
    );
  return [
    ['package', sandbox.package],
    ['versionArgument', sandbox.versionArgument],
    ...sandbox.updates.environment.map((entry, index) => [`updates.environment[${index}]`, entry]),
    ...mountFields('updates', sandbox.updates.mounts),
    ...sandbox.logDirectories.map((directory, index) => [`logDirectories[${index}]`, directory]),
    ...sandbox.hosts.flatMap(({ host, reason }, index) => [
      [`hosts[${index}].host`, host],
      [`hosts[${index}].reason`, reason],
    ]),
    ...sandbox.bell.environment.map((entry, index) => [`bell.environment[${index}]`, entry]),
    ...mountFields('bell', sandbox.bell.mounts),
  ];
}

const HOSTNAME = /^(?=.{1,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/;

for (const harness of HARNESSES) {
  test(`${harness.name}: every log directory is relative, with no empty part, no .. and no space`, () => {
    assert.ok(harness.sandbox.logDirectories.length > 0);
    for (const directory of harness.sandbox.logDirectories) {
      assert.ok(!directory.startsWith('/'), directory);
      for (const part of directory.split('/')) {
        assert.notEqual(part, '', directory);
        assert.notEqual(part, '..', directory);
        assert.notEqual(part, '.', directory);
      }
      assert.doesNotMatch(directory, /\s/);
    }
  });

  test(`${harness.name}: every host is a hostname, and every reason is said`, () => {
    assert.ok(harness.sandbox.hosts.length > 0);
    for (const { host, reason } of harness.sandbox.hosts) {
      assert.match(host, HOSTNAME);
      assert.notEqual(reason.trim(), '', host);
    }
  });

  test(`${harness.name}: every environment entry is NAME=value`, () => {
    for (const entry of [...harness.sandbox.updates.environment, ...harness.sandbox.bell.environment]) {
      assert.match(entry, /^[A-Z_][A-Z0-9_]*=/);
    }
  });

  test(`${harness.name}: every mount is of the kit or the host, and its target is absolute`, () => {
    for (const mount of [...harness.sandbox.updates.mounts, ...harness.sandbox.bell.mounts]) {
      assert.ok(['kit', 'host'].includes(mount.from), JSON.stringify(mount));
      assert.ok(mount.target.startsWith('/'), JSON.stringify(mount));
      if (mount.from === 'kit') {
        assert.ok(!mount.path.startsWith('/') && !mount.path.split('/').includes('..'), JSON.stringify(mount));
      }
    }
  });

  test(`${harness.name}: no field the wrapper is given holds a tab or a line break, or is empty`, () => {
    for (const [where, value] of sandboxFields(harness)) {
      assert.doesNotMatch(value, /[\t\n\r]/, where);
      assert.notEqual(value, '', where);
    }
  });

  test(`${harness.name}: its package is an npm package, and its version argument a build argument's name`, () => {
    assert.match(harness.sandbox.package, /^(@[a-z0-9-]+\/)?[a-z0-9][a-z0-9._-]*$/);
    assert.match(harness.sandbox.versionArgument, /^[A-Z][A-Z0-9_]*_VERSION$/);
  });

  test(`${harness.name}: readVersion gives nothing for what printed nothing`, () => {
    assert.equal(harness.sandbox.readVersion(''), undefined);
    assert.equal(harness.sandbox.readVersion('\n'), undefined);
  });
}

test('no two harnesses share a package, a version argument or a log directory', () => {
  for (const pick of [
    (harness) => [harness.sandbox.package],
    (harness) => [harness.sandbox.versionArgument],
    (harness) => harness.sandbox.logDirectories,
  ]) {
    const all = HARNESSES.flatMap(pick);
    assert.deepEqual(all, [...new Set(all)]);
  }
});

// 0097 R1, R11: what each harness reads of its own

test("Claude Code's version is the first word of what it printed", () => {
  assert.equal(claude.sandbox.readVersion('2.1.288 (Claude Code)\n'), '2.1.288');
  assert.equal(claude.sandbox.readVersion('2.1.288 (Claude Code)\nmore\n'), '2.1.288');
});

test("OpenCode's version is the first word of what it printed", () => {
  assert.equal(opencode.sandbox.readVersion('1.18.33\n'), '1.18.33');
  assert.equal(opencode.sandbox.readVersion('0.0.0-dev-202610030456\n'), '0.0.0-dev-202610030456');
});

const HOME = '/home/developer';

/**
 * A reader of the host's files under `HOME`, from a map of the paths relative to it to what each read gives.
 *
 * @param {Record<string, import('../scripts/agentrite-instructions.mjs').ProjectFile>} files
 */
function hostReader(files) {
  return (/** @type {string} */ path) => files[path] ?? MISSING;
}

const STATUS_LINE = {
  environment: [],
  mounts: [
    { from: 'host', path: `${HOME}/.claude/statusline-command.sh`, target: '/etc/claude-code/statusline-command.sh' },
    { from: 'kit', path: 'managed-settings.json', target: '/etc/claude-code/managed-settings.json' },
  ],
  files: [],
  notes: [],
};

test("Claude Code is given the host's status line when the script is a file that can be read", () => {
  const read = hostReader({ '.claude/statusline-command.sh': found('echo status\n') });
  assert.deepEqual(claude.sandbox.host(HOME, read), STATUS_LINE);
});

test('Claude Code is given no status line for a script that is missing, a directory or unreadable', () => {
  const nothing = { environment: [], mounts: [], files: [], notes: [] };
  assert.deepEqual(claude.sandbox.host(HOME, hostReader({})), nothing);
  assert.deepEqual(claude.sandbox.host(HOME, hostReader({ '.claude/statusline-command.sh': UNREADABLE })), nothing);
});

const CORRECT = 'Correct the file, or remove the key cleanupPeriodDays from it';
const SETTINGS = `${HOME}/.claude/settings.json`;

test("Claude Code is given the host's cleanupPeriodDays as a file of managed settings", () => {
  const read = hostReader({ '.claude/settings.json': found('{"cleanupPeriodDays": 365, "env": {"TOKEN": "x"}}') });
  assert.deepEqual(claude.sandbox.host(HOME, read), {
    environment: [],
    mounts: [],
    files: [
      {
        name: 'claude-cleanup-period-365.json',
        content: '{"cleanupPeriodDays": 365}',
        target: '/etc/claude-code/managed-settings.d/agentrite-cleanup-period.json',
      },
    ],
    notes: [],
  });
});

test('Claude Code is given no cleanup period for settings that are missing or lack the key', () => {
  const nothing = { environment: [], mounts: [], files: [], notes: [] };
  assert.deepEqual(claude.sandbox.host(HOME, hostReader({})), nothing);
  const withoutKey = hostReader({ '.claude/settings.json': found('{"model": "x"}') });
  assert.deepEqual(claude.sandbox.host(HOME, withoutKey), nothing);
});

test("Claude Code's host refuses settings at fault and settings that cannot be read, with today's messages", () => {
  const atFault = hostReader({ '.claude/settings.json': found('{"cleanupPeriodDays": 0}') });
  assert.throws(() => claude.sandbox.host(HOME, atFault), {
    message: `${SETTINGS}: cleanupPeriodDays is 0. It must be a whole number of 1 or more. ${CORRECT}`,
  });
  assert.throws(() => claude.sandbox.host(HOME, hostReader({ '.claude/settings.json': UNREADABLE })), {
    message: `cannot read ${SETTINGS}: ${UNREADABLE.error}. ${CORRECT}`,
  });
});

test('Claude Code is given the status line and the cleanup period together', () => {
  const read = hostReader({
    '.claude/statusline-command.sh': found('echo status\n'),
    '.claude/settings.json': found('{"cleanupPeriodDays": 7}'),
  });
  const given = claude.sandbox.host(HOME, read);
  assert.deepEqual(given.mounts, STATUS_LINE.mounts);
  assert.deepEqual(given.files.map((file) => file.name), ['claude-cleanup-period-7.json']);
});

test('OpenCode is given nothing of the host', () => {
  const read = hostReader({
    '.claude/statusline-command.sh': found('echo status\n'),
    '.claude/settings.json': found('{"cleanupPeriodDays": 7}'),
  });
  assert.deepEqual(opencode.sandbox.host(HOME, read), { environment: [], mounts: [], files: [], notes: [] });
});

// 0097 R3: the files of a harness's own in the sandbox

const KIT_HARNESSES = join(import.meta.dirname, '..', 'container', 'harnesses');

/**
 * The faults of the directory `container/harnesses/`, whose directories `directories` maps to the files each holds,
 * against the `kit` mounts of the harnesses: a mount of a file that is not there, a file no mount of its harness
 * names, and a directory of a name that is no harness of the list.
 *
 * @param {Map<string, string[]>} directories
 * @param {import('../scripts/agentrite-harness.mjs').Harness[]} harnesses
 * @returns {string[]}
 */
function kitFileFaults(directories, harnesses) {
  const faults = [];
  for (const name of directories.keys()) {
    if (!harnesses.some((harness) => harness.name === name)) {
      faults.push(`container/harnesses/${name}/ is of no harness of HARNESSES`);
    }
  }
  for (const harness of harnesses) {
    const { sandbox } = harness;
    const kitMounts = [...sandbox.updates.mounts, ...sandbox.bell.mounts].filter((mount) => mount.from === 'kit');
    const host = sandbox.host('/home/developer', () => ({ found: true, text: '{}' }));
    kitMounts.push(...host.mounts.filter((mount) => mount.from === 'kit'));
    const files = directories.get(harness.name) ?? [];
    const named = kitMounts.map((mount) => mount.path);
    for (const path of named.filter((file) => !files.includes(file))) {
      faults.push(`${harness.name} mounts ${path}, which container/harnesses/${harness.name}/ lacks`);
    }
    for (const file of files.filter((entry) => !named.includes(entry))) {
      faults.push(`container/harnesses/${harness.name}/${file} is named by no mount of ${harness.name}`);
    }
  }
  return faults;
}

test('container/harnesses/ holds the files each harness mounts of its own, and nothing else', () => {
  const directories = new Map(
    readdirSync(KIT_HARNESSES).map((name) => [name, readdirSync(join(KIT_HARNESSES, name))]),
  );
  const faults = kitFileFaults(directories, HARNESSES);
  assert.deepEqual(faults, [], faults.join('\n'));
});

test('a file no mount names, a mount of a file not there and a directory of no harness are named', () => {
  const directories = new Map([
    ['claude', ['managed-settings.json', 'bell-settings.json', 'extra.json']],
    ['opencode', ['bell-plugin.js']],
    ['aider', ['config.toml']],
  ]);
  assert.deepEqual(kitFileFaults(directories, HARNESSES.slice(0, 2)), [
    'container/harnesses/aider/ is of no harness of HARNESSES',
    'container/harnesses/claude/extra.json is named by no mount of claude',
    'opencode mounts opencode.json, which container/harnesses/opencode/ lacks',
  ]);
});

// 0100 R1, R2, R6, R9: what Codex reads and starts of its own

test("Codex's version is the word after codex-cli on the first line of what it printed, and none otherwise", () => {
  assert.equal(codex.sandbox.readVersion('codex-cli 0.167.0\n'), '0.167.0');
  assert.equal(codex.sandbox.readVersion('codex-cli 0.167.0\nmore\n'), '0.167.0');
  assert.equal(codex.sandbox.readVersion('codex 0.167.0\n'), undefined);
  assert.equal(codex.sandbox.readVersion('codex-cli\n'), undefined);
  assert.equal(codex.sandbox.readVersion(''), undefined);
});

test('Codex is given nothing of the host', () => {
  const read = hostReader({ '.codex/config.toml': found('model = "x"\n') });
  assert.deepEqual(codex.sandbox.host(HOME, read), { environment: [], mounts: [], files: [], notes: [] });
});

test('Codex starts in a role by no option, and by words that name the role and its file', () => {
  assert.deepEqual(codex.start.role('reviewer', 'rules/our reviewer.md'), {
    options: [],
    opening:
      'You act as the reviewer. Read `rules/our reviewer.md` in the project root and follow it: it is the ' +
      'instruction of your role.',
  });
});

test("Codex's session and headless run put a -- before the prompt, and the headless run is exec", () => {
  assert.equal(codex.start.command, 'codex');
  assert.equal(codex.start.skipPermissions, '--dangerously-bypass-approvals-and-sandbox');
  assert.deepEqual(codex.start.interactive(['--model', 'm'], 'the prompt'), ['--model', 'm', '--', 'the prompt']);
  assert.deepEqual(codex.start.headless(['--model', 'm'], 'the prompt'), [
    'exec',
    '--model',
    'm',
    '--',
    'the prompt',
  ]);
});

// 0100 R4: the Codex wrapper

const PLANNER = {
  name: 'planner',
  path: 'node_modules/agentrite/roles/planner.md',
  description:
    'Writes the plan of an approved change unit, against the tree the unit will be built on. Use once the human ' +
    "has approved the unit's spec and the unit is next to be built, not before. Dispatch it with the unit directory.",
};

const PLANNER_WRAPPER = `name = "planner"
description = """\\
  Writes the plan of an approved change unit, against the tree the unit will be built on. Use once the human has \\
  approved the unit's spec and the unit is next to be built, not before. Dispatch it with the unit directory."""
developer_instructions = """
Read \`node_modules/agentrite/roles/planner.md\` in the project root and follow it. It is your instruction; this file
holds none of its own.
"""
`;

/**
 * The string a TOML reader reads from the wrapper's description: its lines after the opening one, each with the
 * line-ending backslash and the indent it trims taken off, up to the closing quotes, and its escapes read.
 *
 * @param {string} wrapper
 * @returns {string}
 */
function tomlDescription(wrapper) {
  const block = wrapper.match(/^description = """\\\n([\s\S]*?)"""\n/m);
  assert.ok(block, 'the wrapper has no description block');
  const joined = block[1].replace(/\\\n\s*/g, '');
  return JSON.parse(`"${joined.trimStart()}"`);
}

test('the Codex wrapper of planner is written exactly as the plan has it', () => {
  assert.equal(codex.wrappers.directory, '.codex/agents');
  assert.equal(codex.wrappers.extension, '.toml');
  assert.equal(codex.wrappers.render(PLANNER), PLANNER_WRAPPER);
  assert.equal(tomlDescription(PLANNER_WRAPPER), PLANNER.description);
});

test('a description with quotes and backslashes is escaped, wrapped, and read back as it was', () => {
  const description = `Says "hello" and C:\\path\\to, ${'and more words '.repeat(12)}at the end.`;
  const wrapper = codex.wrappers.render({ ...PLANNER, description });
  assert.ok(wrapper.includes('\\"hello\\"'));
  assert.ok(wrapper.includes('C:\\\\path'));
  for (const line of wrapper.split('\n')) assert.ok(line.length <= 120, line);
  assert.equal(tomlDescription(wrapper), description);
});

const ODD_PATHS = ['rules/our planner.md', 'rules/a"b.md', 'rules/a`b.md', 'rules/a\\b.md'];

test('isKit is true for the wrapper of any path, with CRLF, and with a model line before the instructions', () => {
  for (const path of [PLANNER.path, ...ODD_PATHS]) {
    const wrapper = codex.wrappers.render({ ...PLANNER, path });
    assert.ok(codex.wrappers.isKit(wrapper), wrapper);
    assert.ok(codex.wrappers.isKit(wrapper.replaceAll('\n', '\r\n')), wrapper);
    const pinned = wrapper.replace('developer_instructions', 'model = "gpt-6.1-sol"\ndeveloper_instructions');
    assert.ok(codex.wrappers.isKit(pinned), pinned);
  }
  assert.ok(codex.wrappers.render({ ...PLANNER, path: 'rules/a"b.md' }).includes('`rules/a\\"b.md`'));
});

test('isKit is false for other instructions, a wrapper without its name line and a Markdown wrapper', () => {
  for (const text of [
    PLANNER_WRAPPER.replace('and follow it', 'and follow it now'),
    PLANNER_WRAPPER.replace('name = "planner"\n', ''),
    `${PLANNER_WRAPPER}model = "x"\n`,
    PLANNER_WRAPPER.replace('developer_instructions = """\n', 'developer_instructions = """ \n'),
    claude.wrappers.render(PLANNER),
    opencode.wrappers.render(PLANNER),
    '',
  ]) {
    assert.ok(!codex.wrappers.isKit(text), text);
  }
  assert.ok(!claude.wrappers.isKit(PLANNER_WRAPPER));
});

test('refreshed keeps one or two model lines before the instructions, in place and as they are written', () => {
  const one = PLANNER_WRAPPER.replace('developer_instructions', 'model = "gpt-6.1-sol"\ndeveloper_instructions');
  const stale = one.replace('Writes the plan', 'Wrote the plan');
  assert.equal(codex.wrappers.refreshed(stale, PLANNER_WRAPPER), one);
  const two = PLANNER_WRAPPER.replace(
    'developer_instructions',
    'model  =  "a"\nmodel_reasoning_effort = "high"\nmodel="b"\ndeveloper_instructions',
  );
  assert.equal(
    codex.wrappers.refreshed(two.replaceAll('\n', '\r\n'), PLANNER_WRAPPER),
    PLANNER_WRAPPER.replace('developer_instructions', 'model  =  "a"\nmodel="b"\ndeveloper_instructions'),
  );
});

test('refreshed ignores a model line after the instructions and gives the rendered wrapper without one', () => {
  assert.equal(codex.wrappers.refreshed(`${PLANNER_WRAPPER}model = "x"\n`, PLANNER_WRAPPER), PLANNER_WRAPPER);
  assert.equal(codex.wrappers.refreshed(PLANNER_WRAPPER, PLANNER_WRAPPER), PLANNER_WRAPPER);
  assert.equal(codex.wrappers.refreshed('model = "x"\n', PLANNER_WRAPPER), PLANNER_WRAPPER);
  assert.equal(codex.wrappers.refreshed('', PLANNER_WRAPPER), PLANNER_WRAPPER);
});

test("Codex's own agents are default, worker and explorer", () => {
  assert.deepEqual(codex.wrappers.ownAgents, ['default', 'worker', 'explorer']);
});

// 0100 R5: Codex's instruction file

const CODEX_FILE = (paths) =>
  'developer_instructions = """\n' +
  'Before anything else, read the files below in the project root and follow them. ' +
  "They hold the project's process \\\n" +
  'and its standards.\n\n' +
  paths.map((path) => `- ${path}\n`).join('') +
  '"""\n';

test("Codex's init writes a missing .codex/config.toml that names the instructions", () => {
  assert.equal(codex.instructions.file, '.codex/config.toml');
  assert.deepEqual(codex.instructions.init(MISSING, STANDARDS), {
    content: CODEX_FILE([PROCESS, STANDARDS]),
    line: 'wrote .codex/config.toml',
    notices: [],
  });
  assert.deepEqual(codex.instructions.init(MISSING, HOUSE), {
    content: CODEX_FILE([PROCESS, HOUSE]),
    line: 'wrote .codex/config.toml',
    notices: [],
  });
});

test("Codex's init leaves a .codex/config.toml that names both paths", () => {
  const read = found(`model = "x"\ndeveloper_instructions = "Read ${PROCESS} and ${STANDARDS}."\n`);
  assert.deepEqual(codex.instructions.init(read, STANDARDS), {
    content: undefined,
    line: `skipped .codex/config.toml, which loads ${PROCESS} and ${STANDARDS}`,
    notices: [],
  });
});

test("Codex's init leaves a .codex/config.toml that lacks a path, or is unreadable, with its notice", () => {
  const skipped = "skipped .codex/config.toml, which does not name the kit's instructions";
  assert.deepEqual(codex.instructions.init(found(`# ${PROCESS}\n`), STANDARDS), {
    content: undefined,
    line: skipped,
    notices: [codexInitNotice([STANDARDS])],
  });
  assert.deepEqual(codex.instructions.init(found('model = "x"\n'), STANDARDS), {
    content: undefined,
    line: skipped,
    notices: [codexInitNotice([PROCESS, STANDARDS])],
  });
  assert.deepEqual(codex.instructions.init(UNREADABLE, STANDARDS), {
    content: undefined,
    line: skipped,
    notices: [codexInitNotice([PROCESS, STANDARDS])],
  });
});

test("Codex's init and refresh add the notice of the kit's standards named beside the project's own", () => {
  const both = found(CODEX_FILE([PROCESS, HOUSE, STANDARDS]));
  assert.deepEqual(codex.instructions.init(both, HOUSE), {
    content: undefined,
    line: `skipped .codex/config.toml, which loads ${PROCESS} and ${HOUSE}`,
    notices: [codexKitStandardsNotice(HOUSE)],
  });
  assert.deepEqual(codex.instructions.refresh(both, HOUSE), [codexKitStandardsNotice(HOUSE)]);
  assert.deepEqual(codex.instructions.refresh(found(CODEX_FILE([PROCESS, STANDARDS])), STANDARDS), []);
});

test("Codex's refresh names a .codex/config.toml that is missing, unreadable or lacks paths", () => {
  assert.deepEqual(codex.instructions.refresh(found(CODEX_FILE([PROCESS, STANDARDS])), STANDARDS), []);
  assert.deepEqual(codex.instructions.refresh(MISSING, STANDARDS), [
    codexRefreshNotice('it is missing', [PROCESS, STANDARDS]),
  ]);
  assert.deepEqual(codex.instructions.refresh(UNREADABLE, STANDARDS), [
    codexRefreshNotice(`it cannot be read: ${UNREADABLE.error}`, [PROCESS, STANDARDS]),
  ]);
  assert.deepEqual(codex.instructions.refresh(found(CODEX_FILE([PROCESS])), STANDARDS), [
    codexRefreshNotice(`it does not name ${STANDARDS}`, [STANDARDS]),
  ]);
});

test("every notice of Codex's instruction file ends with the line that names the section", () => {
  const SECTION = 'See "How the kit\'s instructions reach an agent" in node_modules/agentrite/SETUP.md.\n';
  for (const notice of [
    codexInitNotice([PROCESS]),
    codexRefreshNotice('it is missing', [PROCESS]),
    codexKitStandardsNotice(HOUSE),
  ]) {
    assert.ok(notice.endsWith(`\n\n${SECTION}`), notice);
    for (const line of notice.split('\n')) assert.ok(line.length <= 120, line);
  }
});
