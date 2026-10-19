import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  agentsListNotice,
  claudeInitNotice,
  claudeKitStandardsNotice,
  claudeLacks,
  instructionsList,
  opencodeInitNotice,
  opencodeKitStandardsNotice,
  opencodeVerdict,
} from '../scripts/agentrite-instructions.mjs';
import { plannedFiles } from '../scripts/agentrite-roles.mjs';
import {
  AGENTS_SECTIONS,
  sandboxName,
  agentsNotice,
  defaultBranchNotice,
  dockerignore,
  fillTemplate,
  parseArgs,
  playwrightVersion,
  projectFiles,
  withCheckChangesScript,
} from '../scripts/agentrite.mjs';
import { installKit, KIT_ROLES, KIT_SETTINGS, kitSettingsText } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const TEMPLATE_PATHS = ['AGENTS.md', 'CLAUDE.md', 'sandbox.sh', 'sandbox/compose.project.yml'];
const templates = Object.fromEntries(
  TEMPLATE_PATHS.map((path) => [
    path,
    readFileSync(new URL(`../templates/project/${path}`, import.meta.url), 'utf-8'),
  ]),
);
// The files of the kit's container/ directory, as a project's installed kit holds them.
const CONTAINER_FILES = readdirSync(new URL('../container/', import.meta.url));
const ignore = (existing) => dockerignore(existing, CONTAINER_FILES);
const HARNESS_LISTS = [['claude'], ['opencode'], ['claude', 'opencode']];
const CHECK_CHANGES = 'node node_modules/agentrite/scripts/check-changes.mjs';
const KIT_CONTAINER = 'node_modules/agentrite/container';
const PROCESS = 'node_modules/agentrite/process.md';
const STANDARDS = 'node_modules/agentrite/standards.md';
const LIST = '.agentrite/instructions.md';
// The notice of init for a CLAUDE.md that holds none of the lines.
const CLAUDE_NOTICE = claudeInitNotice([`@${PROCESS}`, `@${STANDARDS}`, '@AGENTS.md']);
// The opencode.json of R3 of unit 0048 and R18 of unit 0052, byte for byte.
const OPENCODE = `{\n  "instructions": [\n    "${PROCESS}",\n    "${STANDARDS}"\n  ]\n}\n`;
const EXCEPTION = `!${KIT_CONTAINER}/**`;

function files(harnesses, overrides = {}) {
  return projectFiles({
    templates,
    harnesses,
    roles: KIT_ROLES,
    standards: STANDARDS,
    packageName: 'my-app',
    playwrightVersion: '1.59.1',
    ...overrides,
  });
}
function fileAt(list, path) {
  const file = list.find((candidate) => candidate.path === path);
  assert.ok(file, `${path} is not among the planned files`);
  return file;
}

// R1

const OPTION = '--no-sandbox';

const BRANCH = '--default-branch';
const INIT_USAGE =
  'usage: agentrite init [--no-sandbox] [--default-branch <name>] claude | opencode\n       agentrite init';

function parsedInit(overrides) {
  return { command: 'init', harnesses: [], sandbox: true, defaultBranch: undefined, given: true, ...overrides };
}

test('parseArgs takes the harnesses of init in the order given, each once, and the sandbox is wanted', () => {
  assert.deepEqual(parseArgs(['init', 'claude']), parsedInit({ harnesses: ['claude'] }));
  assert.deepEqual(
    parseArgs(['init', 'opencode', 'claude', 'claude']),
    parsedInit({ harnesses: ['opencode', 'claude'] }),
  );
});

test('parseArgs takes init with no argument, and says that none was given', () => {
  assert.deepEqual(parseArgs(['init']), parsedInit({ given: false }));
  assert.deepEqual(parseArgs(['init', OPTION]), parsedInit({ sandbox: false }));
});

test('parseArgs takes --no-sandbox before, between and after the harnesses, and more than once as once', () => {
  for (const rest of [
    [OPTION, 'claude', 'opencode'],
    ['claude', OPTION, 'opencode'],
    ['claude', 'opencode', OPTION],
    [OPTION, 'claude', OPTION, 'opencode', OPTION],
  ]) {
    assert.deepEqual(
      parseArgs(['init', ...rest]),
      parsedInit({ harnesses: ['claude', 'opencode'], sandbox: false }),
      rest.join(' '),
    );
  }
});

// R10
test('parseArgs takes --default-branch at any place, with the word after it as the name, the last one counting', () => {
  for (const rest of [
    [BRANCH, 'main', 'claude', 'opencode'],
    ['claude', BRANCH, 'main', 'opencode'],
    ['claude', 'opencode', BRANCH, 'main'],
    [BRANCH, 'develop', 'claude', 'opencode', BRANCH, 'main'],
  ]) {
    assert.deepEqual(
      parseArgs(['init', ...rest]),
      parsedInit({ harnesses: ['claude', 'opencode'], defaultBranch: 'main' }),
      rest.join(' '),
    );
  }
  assert.deepEqual(parseArgs(['init', BRANCH, 'main']), parsedInit({ defaultBranch: 'main' }));
  // The word after the option is the name whatever it is, also one that is an option or a harness elsewhere.
  assert.deepEqual(
    parseArgs(['init', 'claude', BRANCH, OPTION]),
    parsedInit({ harnesses: ['claude'], defaultBranch: OPTION }),
  );
  assert.deepEqual(
    parseArgs(['init', BRANCH, 'claude', 'opencode']),
    parsedInit({ harnesses: ['opencode'], defaultBranch: 'claude' }),
  );
  assert.deepEqual(
    parseArgs(['init', BRANCH, BRANCH, 'claude']),
    parsedInit({ harnesses: ['claude'], defaultBranch: BRANCH }),
  );
});

test('parseArgs says why and gives the usage of init for --default-branch with no name or an empty one', () => {
  for (const rest of [[BRANCH], ['claude', BRANCH], ['claude', BRANCH, ''], [BRANCH, '', 'claude']]) {
    assert.throws(() => parseArgs(['init', ...rest]), {
      message: `--default-branch needs the name of a branch\n${INIT_USAGE}`,
    });
  }
});

test('parseArgs gives the usage of init alone for an unknown harness', () => {
  for (const rest of [['codex'], ['claude', 'toString'], [OPTION, 'codex'], ['claude', `${OPTION}=1`]]) {
    assert.throws(() => parseArgs(['init', ...rest]), (error) => {
      assert.ok(error.message.endsWith(`\n${INIT_USAGE}`), error.message);
      assert.doesNotMatch(error.message, /agentrite (refresh|config|roles|run)/);
      return true;
    });
  }
  assert.throws(() => parseArgs(['init', 'codex']), /unknown harness: codex/);
  assert.throws(() => parseArgs(['init', 'claude', `${OPTION}=1`]), /unknown harness: --no-sandbox=1/);
  assert.throws(() => parseArgs(['init', `${BRANCH}=main`]), /unknown harness: --default-branch=main/);
});

// R16, R21
test('parseArgs takes config and refresh with no argument, and gives each its own usage for any argument', () => {
  assert.deepEqual(parseArgs(['config']), { command: 'config' });
  assert.deepEqual(parseArgs(['refresh']), { command: 'refresh' });
  for (const rest of [['claude'], [OPTION], [OPTION, 'claude'], ['codex'], ['']]) {
    assert.throws(() => parseArgs(['config', ...rest]), { message: 'usage: agentrite config' });
    assert.throws(() => parseArgs(['refresh', ...rest]), {
      message: 'usage: agentrite refresh\nThe harnesses and the sandbox setting are read from agentrite.json',
    });
  }
});

test('parseArgs gives roles and run what they print for an argument they do not take, --no-sandbox included', () => {
  assert.throws(() => parseArgs(['roles', OPTION]), { message: 'usage: agentrite roles [--json]' });
  assert.throws(() => parseArgs(['roles', '--json', OPTION]), { message: 'usage: agentrite roles [--json]' });
  assert.throws(() => parseArgs(['run', 'planner', 'claude', '0001', OPTION]), (error) => {
    assert.match(error.message, new RegExp(`${OPTION}`));
    assert.match(error.message, /^usage: agentrite run /m);
    return true;
  });
});

test('parseArgs gives the usage of every command for no command and for one that is none of them', () => {
  const usage =
    'usage: agentrite init [--no-sandbox] [--default-branch <name>] claude | opencode\n' +
    '       agentrite init\n' +
    '       agentrite config\n' +
    '       agentrite refresh\n' +
    '       agentrite roles [--json]\n' +
    '       agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] ' +
    '[--skip-permissions]\n' +
    '                     [-- <harness arguments...>]';
  assert.throws(() => parseArgs([]), { message: usage });
  assert.throws(() => parseArgs(['claude']), { message: `unknown command: claude\n${usage}` });
  assert.throws(() => parseArgs(['setup', 'claude']), { message: `unknown command: setup\n${usage}` });
});

// R2

test('the role wrappers are exactly those the kit renders', () => {
  for (const harnesses of HARNESS_LISTS) {
    const planned = files(harnesses);
    for (const wrapper of plannedFiles(harnesses, KIT_ROLES)) assert.deepEqual(fileAt(planned, wrapper.path), wrapper);
    const wrappers = plannedFiles(harnesses, KIT_ROLES);
    assert.equal(planned.filter((file) => file.path.includes('/agents/')).length, wrappers.length);
  }
});

// R3

test('AGENTS.md holds the three sections, naming the list of the files in use and the change check', () => {
  const agents = fileAt(files(['claude']), 'AGENTS.md').content;
  const headings = agents.split('\n').filter((line) => /^#{1,2} /.test(line));
  assert.deepEqual(headings.slice(0, 3), AGENTS_SECTIONS);
  assert.equal(agents.split('\n')[0], '# Development Guidelines');
  const opening = agents.split('\n\n')[1];
  assert.ok(opening.includes(`[\`${LIST}\`](${LIST})`), `the first paragraph does not link the list: ${opening}`);
  assert.match(opening, /\*\*required reading\*\*/);
  assert.match(opening, /the kit's `process\.md`, the project's standards, and the file of each role/);
  assert.match(opening, /The kit writes the list from `agentrite\.json`/);
  assert.match(agents, /is in the files\s+\.agentrite\/instructions\.md names already\./);
  assert.match(agents, /\[README\.md\]\(README\.md\)/);
  assert.match(agents, /`npm ci` installs it/);
  assert.match(agents, /never under\n?\s*`node_modules\/`/);
  const roles = agents.slice(agents.indexOf('## Roles'), agents.indexOf('## Changes in this project'));
  assert.ok(roles.includes(`[\`${LIST}\`](${LIST}) names the file of each of the four roles`), roles);
  assert.match(roles, /Each wrapper is a pointer to\s+one role file/);
  assert.match(agents, /`npm run check-changes`, which runs the kit's script/);
  assert.match(agents, /## Specific to this project/);
});

// Unit 0054, R15
test('AGENTS.md names no role file and no standards file itself', () => {
  for (const harnesses of HARNESS_LISTS) {
    const agents = fileAt(files(harnesses), 'AGENTS.md').content;
    assert.doesNotMatch(agents, /roles\//);
    assert.doesNotMatch(agents, /standards\.md/);
    assert.ok(agents.includes(LIST));
  }
});

test('AGENTS.md names the wrapper directories of the harnesses given, and only those', () => {
  const claude = fileAt(files(['claude']), 'AGENTS.md').content;
  assert.match(claude, /^\* `\.claude\/agents\/`$/m);
  assert.doesNotMatch(claude, /\.opencode/);
  const both = fileAt(files(['claude', 'opencode']), 'AGENTS.md').content;
  assert.match(both, /^\* `\.claude\/agents\/`\n\* `\.opencode\/agents\/`$/m);
});

// R4

test('CLAUDE.md is planned for every harness list and imports AGENTS.md', () => {
  for (const harnesses of HARNESS_LISTS) {
    const claude = fileAt(files(harnesses), 'CLAUDE.md').content;
    assert.match(claude, /^@AGENTS\.md$/m);
    assert.match(claude, /AGENTS\.md.*canonical source/);
  }
});

// R1

test('CLAUDE.md imports process.md, standards.md and AGENTS.md in order, outside a fence and a code span', () => {
  for (const harnesses of HARNESS_LISTS) {
    const claude = fileAt(files(harnesses), 'CLAUDE.md').content;
    const lines = claude.split('\n');
    const imports = [`@${PROCESS}`, `@${STANDARDS}`, '@AGENTS.md'].map((line) => lines.indexOf(line));
    for (const index of imports) assert.ok(index !== -1, `CLAUDE.md lacks an import: ${imports}`);
    assert.deepEqual([...imports].sort((first, second) => first - second), imports, 'the imports are out of order');
    const fence = lines.findIndex((line) => line.startsWith('```'));
    assert.ok(fence === -1 || fence > imports[2], 'a fenced block opens before the imports');
    for (const index of imports) assert.ok(!lines[index].includes('`'), lines[index]);
    assert.deepEqual(claudeLacks({ found: true, text: claude }, STANDARDS), []);
  }
});

// Unit 0054, R11, R15
test('CLAUDE.md names the list in its text, and imports the standards the settings give between the other two', () => {
  const claude = fileAt(files(['claude']), 'CLAUDE.md').content;
  const text = claude.split('\n').filter((line) => !line.startsWith('@')).join('\n');
  assert.match(text, /imports the kit's `process\.md`, the project's standards and\n`AGENTS\.md`/);
  assert.ok(text.includes(`[\`${LIST}\`](${LIST})`), text);
  assert.doesNotMatch(text, /standards\.md/);

  const house = fileAt(files(['claude'], { standards: 'rules/house.md' }), 'CLAUDE.md').content;
  const lines = house.split('\n');
  assert.deepEqual(lines.slice(lines.indexOf(`@${PROCESS}`), lines.indexOf('@AGENTS.md') + 1), [
    `@${PROCESS}`,
    '@rules/house.md',
    '@AGENTS.md',
  ]);
  assert.doesNotMatch(house, /standards\.md/);
  assert.deepEqual(claudeLacks({ found: true, text: house }, 'rules/house.md'), []);
});

// Unit 0054, R13
test('the list is planned after the wrappers and before AGENTS.md, with what the settings give', () => {
  for (const harnesses of HARNESS_LISTS) {
    const planned = files(harnesses);
    const paths = planned.map((file) => file.path);
    const wrappers = plannedFiles(harnesses, KIT_ROLES).map((file) => file.path);
    assert.deepEqual(paths.slice(0, wrappers.length + 3), [...wrappers, LIST, 'AGENTS.md', 'CLAUDE.md']);
    assert.equal(fileAt(planned, LIST).content, instructionsList({ standards: STANDARDS, roles: KIT_SETTINGS.roles }));
  }
  const own = files(['claude'], { standards: 'rules/house.md' });
  assert.equal(
    fileAt(own, LIST).content,
    instructionsList({ standards: 'rules/house.md', roles: KIT_SETTINGS.roles }),
  );
});

// R5

test('the notice for an existing AGENTS.md names the three sections and holds them as AGENTS.md is written', () => {
  const agents = fileAt(files(['claude', 'opencode']), 'AGENTS.md').content;
  const notice = agentsNotice(agents);
  assert.match(notice, /AGENTS\.md exists and was left as it is/);
  for (const heading of AGENTS_SECTIONS) {
    const start = agents.indexOf(heading);
    const next = agents.slice(start + heading.length).search(/^#{1,2} /m);
    const section = agents.slice(start, start + heading.length + next).trimEnd();
    assert.ok(notice.includes(section), `the notice does not hold the ${heading} section as written`);
    assert.ok(notice.includes(heading.replace(/^#+ /, '')), `the notice does not name ${heading}`);
  }
  assert.doesNotMatch(notice, /Specific to this project/);
});

// R6

test('sandbox.sh is planned executable, and execs the kit wrapper with its own directory first', () => {
  const shim = fileAt(files(['claude']), 'sandbox.sh');
  assert.equal(shim.executable, true);
  assert.match(
    shim.content,
    /^exec "\$here\/node_modules\/agentrite\/container\/sandbox\.sh" "\$here" "\$@"$/m,
  );
});

// R7

test('sandboxName derives the names from an unscoped and a scoped package name', () => {
  assert.equal(sandboxName('norareit'), 'norareit-sandbox');
  assert.equal(sandboxName('@acme/my-kit'), 'acme-my-kit-sandbox');
});

test('sandboxName reduces a package name to the characters Compose accepts in a project name', () => {
  for (const name of ['my.app', '@scope/My_App~2', 'a--b', '_leading']) {
    assert.match(sandboxName(name), /^[a-z0-9][a-z0-9_-]*$/, name);
  }
  assert.equal(sandboxName('my.app'), 'my-app-sandbox');
});

test('the compose file carries the names, the Playwright version, the limits and no host the kit supplies', () => {
  const compose = fileAt(
    files(['claude', 'opencode'], { packageName: '@acme/shop' }),
    'sandbox/compose.project.yml',
  ).content;
  assert.match(compose, /^name: acme-shop-sandbox$/m);
  assert.match(compose, /^ {4}image: acme-shop-sandbox$/m);
  assert.match(compose, /^ {8}PLAYWRIGHT_VERSION: 1\.59\.1$/m);
  assert.match(compose, /^ {4}mem_limit: \$\{SANDBOX_MEM_LIMIT:-8g\}$/m);
  assert.match(compose, /^ {4}cpus: \$\{SANDBOX_CPUS:-6\}$/m);
  const allowlist = compose.slice(compose.indexOf('ALLOWLIST: |'));
  const hosts = allowlist
    .split('\n')
    .slice(1)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean);
  assert.deepEqual(hosts, []);
});

test('playwrightVersion reads playwright resolved directly and through @playwright/test', () => {
  assert.equal(
    playwrightVersion({ packages: { '': {}, 'node_modules/playwright': { version: '1.59.1' } } }),
    '1.59.1',
  );
  assert.equal(
    playwrightVersion({
      packages: {
        'node_modules/@playwright/test': { version: '1.58.0' },
        'node_modules/@playwright/test/node_modules/playwright': { version: '1.58.0' },
      },
    }),
    '1.58.0',
  );
});

// R8

test('playwrightVersion is undefined for a lockfile without playwright and for no lockfile', () => {
  assert.equal(playwrightVersion({ packages: { 'node_modules/playwright-core': { version: '1.0.0' } } }), undefined);
  assert.equal(playwrightVersion(undefined), undefined);
});

test('the compose file without a Playwright version has the names, the limits and no build arguments', () => {
  const compose = fileAt(files(['claude'], { playwrightVersion: undefined }), 'sandbox/compose.project.yml').content;
  assert.match(compose, /^name: my-app-sandbox$/m);
  assert.match(compose, /^ {4}image: my-app-sandbox$/m);
  assert.match(compose, /^ {4}mem_limit: \$\{SANDBOX_MEM_LIMIT:-8g\}$/m);
  assert.match(compose, /^ {6}ALLOWLIST: \|$/m);
  assert.doesNotMatch(compose, /^\s*build:/m);
  assert.doesNotMatch(compose, /PLAYWRIGHT_VERSION/);
  assert.doesNotMatch(compose, /\{\{/);
});

test('the compose file with a Playwright version holds the build block under the image', () => {
  const compose = fileAt(files(['claude']), 'sandbox/compose.project.yml').content;
  const block = /^ {4}image: my-app-sandbox\n {4}build:\n {6}args:\n(?: {8}#.*\n)+ {8}PLAYWRIGHT_VERSION: 1\.59\.1\n/m;
  assert.match(compose, block);
});

// R9, R13

test('package.json gains the check-changes script, keeping key order and indentation', () => {
  const original =
    '{\n    "name": "my-app",\n    "scripts": {\n        "test": "node --test"\n    },\n    "private": true\n}\n';
  const amended = withCheckChangesScript(original);
  assert.equal(
    amended,
    '{\n    "name": "my-app",\n    "scripts": {\n        "test": "node --test",\n' +
      `        "check-changes": "${CHECK_CHANGES}"\n    },\n    "private": true\n}\n`,
  );
});

test('package.json without scripts gains them last, with tab indentation kept', () => {
  const amended = withCheckChangesScript('{\n\t"name": "my-app",\n\t"version": "1.0.0"\n}\n');
  assert.equal(
    amended,
    `{\n\t"name": "my-app",\n\t"version": "1.0.0",\n\t"scripts": {\n\t\t"check-changes": "${CHECK_CHANGES}"\n\t}\n}\n`,
  );
});

test('package.json with a check-changes script already is left unchanged', () => {
  const original = '{\n  "name": "my-app",\n  "scripts": {\n    "check-changes": "my own"\n  }\n}\n';
  assert.equal(withCheckChangesScript(original), undefined);
});

// R10, R13

test('.dockerignore is created keeping node_modules out except the kit container directory', () => {
  const created = ignore(undefined);
  const lines = created.split('\n').filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(lines, ['node_modules', EXCEPTION]);
});

test('.dockerignore that excludes node_modules without the exception gets it appended', () => {
  assert.equal(ignore('.git\nnode_modules\n'), `.git\nnode_modules\n${EXCEPTION}\n`);
  assert.equal(ignore('/node_modules/'), `/node_modules/\n${EXCEPTION}\n`);
});

test('.dockerignore that excludes the kit by a wildcard, or before its exception, gets it appended', () => {
  for (const existing of [
    '**/node_modules\n',
    'node_modules/**\n',
    'node_modules/*\n',
    './node_modules\n',
    `${EXCEPTION}\nnode_modules\n`,
  ]) {
    const amended = ignore(existing);
    assert.equal(amended, `${existing}${EXCEPTION}\n`, existing);
    assert.equal(ignore(amended), undefined, `appending to ${existing} does not let the kit in`);
  }
});

test('.dockerignore that lets only one file of the kit container back in gets the directory exception', () => {
  const existing = 'node_modules\n!node_modules/agentrite/container/entrypoint.sh\n';
  assert.equal(ignore(existing), `${existing}${EXCEPTION}\n`);
});

test('.dockerignore that excludes node_modules gets the exception whatever a later exception lets back in', () => {
  for (const existing of ['node_modules\n!node_modules/*/index.js\n', 'node_modules/**/*\n', '**\n']) {
    assert.equal(ignore(existing), `${existing}${EXCEPTION}\n`, existing);
  }
});

// BuildKit lets an exception reach into a directory only when the directory was excluded at that point, so an
// exception naming the directory does not bring back a file excluded by name.
test('.dockerignore whose directory exception does not reach a file excluded by name gets the exception', () => {
  for (const existing of [
    `${KIT_CONTAINER}/sni.mjs\n!${KIT_CONTAINER}\n`,
    `${KIT_CONTAINER}/*\n!${KIT_CONTAINER}\n`,
    `node_modules\n!${KIT_CONTAINER}\n${KIT_CONTAINER}/sni.mjs\n`,
  ]) {
    const amended = ignore(existing);
    assert.equal(amended, `${existing}${EXCEPTION}\n`, existing);
    assert.equal(ignore(amended), undefined, `appending to ${existing} does not let the kit in`);
  }
});

test('.dockerignore that excludes node_modules and lets the kit directory back in is left unchanged', () => {
  assert.equal(ignore(`node_modules\n!${KIT_CONTAINER}\n`), undefined);
});

test('.dockerignore that keeps the kit out without excluding node_modules also gets the exception', () => {
  for (const existing of [
    'node_modules/agentrite/container/sni.mjs\n',
    'node_modules/agentrite\n',
    'node_modules\n!node_modules\nnode_modules/agentrite\n',
  ]) {
    assert.equal(ignore(existing), `${existing}${EXCEPTION}\n`, existing);
  }
});

test('.dockerignore that holds the exception, or does not exclude node_modules, is left unchanged', () => {
  assert.equal(ignore(`node_modules\n${EXCEPTION}\n`), undefined);
  assert.equal(ignore('.git\n*/node_modules\n'), undefined);
  assert.equal(ignore('node_modules_cache\n# node_modules\n'), undefined);
  assert.equal(ignore('node_modules/**\n!node_modules/agentrite/container/**\n'), undefined);
  assert.equal(ignore(''), undefined);
});

// R15

test('every filled template has no placeholder left, whatever the harnesses', () => {
  for (const harnesses of HARNESS_LISTS) {
    for (const file of files(harnesses)) assert.doesNotMatch(file.content, /\{\{/, file.path);
  }
});

test('no file init plans holds a line over 120 characters, whatever the harnesses', () => {
  for (const harnesses of HARNESS_LISTS) {
    for (const file of files(harnesses)) {
      for (const line of file.content.split('\n')) {
        assert.ok(line.length <= 120, `${file.path} holds a line of ${line.length} characters`);
      }
    }
  }
});

test('every project template is filled from templates/project/', () => {
  for (const path of TEMPLATE_PATHS) assert.ok(files(['claude']).some((file) => file.path === path), path);
  assert.match(templates['sandbox/compose.project.yml'], /^ {4}\{\{playwright_build\}\}$/m);
});

test('the AGENTS.md template holds the three headings the notice cuts by', () => {
  for (const heading of AGENTS_SECTIONS) assert.match(templates['AGENTS.md'], new RegExp(`^${heading}$`, 'm'));
});

test('fillTemplate replaces inline placeholders and indents or drops one alone on its line', () => {
  assert.equal(fillTemplate('name: {{a}}\n', { a: 'x' }), 'name: x\n');
  assert.equal(fillTemplate('list:\n  {{b}}\nend\n', { b: 'one\ntwo' }), 'list:\n  one\n  two\nend\n');
  assert.equal(fillTemplate('list:\n  {{b}}\nend\n', { b: '' }), 'list:\nend\n');
  assert.throws(() => fillTemplate('{{missing}}', {}), /\{\{missing\}\}/);
});

// End to end: the executable in a temporary project.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const LOCKFILE = JSON.stringify({ lockfileVersion: 3, packages: { 'node_modules/playwright': { version: '1.59.1' } } });

// A lockfile of `null` leaves the project without one.
function project(t, { lockfile = LOCKFILE } = {}) {
  const base = temporaryDirectory(t, 'agentrite-init-');
  writeFileSync(
    join(base, 'package.json'),
    '{\n  "name": "my-app",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n',
  );
  if (lockfile !== null) writeFileSync(join(base, 'package-lock.json'), lockfile);
  installKit(base);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: base, encoding: 'utf-8' });
  const read = (path) => readFileSync(join(base, path), 'utf-8');
  return { base, run, read };
}

function exists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

test('a fresh project gets every file, listed as written, and exits 0', (t) => {
  const { base, run, read } = project(t);
  const result = run('init', 'claude', 'opencode');
  assert.equal(result.status, 0, result.stderr);
  const expected = files(['claude', 'opencode'], { packageName: 'my-app' });
  for (const file of expected) {
    assert.equal(read(file.path), file.content, file.path);
    assert.match(result.stdout, new RegExp(`^wrote ${file.path.replaceAll('.', '\\.')}$`, 'm'));
  }
  assert.match(read('sandbox/compose.project.yml'), /^name: my-app-sandbox$/m);
  assert.equal(JSON.parse(read('package.json')).scripts['check-changes'], CHECK_CHANGES);
  assert.match(result.stdout, /^changed package\.json$/m);
  assert.equal(read('.dockerignore'), ignore(undefined));
  assert.match(result.stdout, /^wrote \.dockerignore$/m);
  assert.equal(read('opencode.json'), OPENCODE);
  assert.match(result.stdout, /^changed package\.json\nwrote opencode\.json\n/m);
  assert.doesNotMatch(result.stdout, /skipped/);
  assert.notEqual(statSync(join(base, 'sandbox.sh')).mode & 0o111, 0);
});

test('the written sandbox.sh execs the kit wrapper with the project root and every other argument', (t) => {
  const { base, run } = project(t);
  assert.equal(run('init', 'claude').status, 0);
  const kitContainer = join(base, 'node_modules', 'agentrite', 'container');
  mkdirSync(kitContainer, { recursive: true });
  writeFileSync(join(kitContainer, 'sandbox.sh'), '#!/usr/bin/env bash\nprintf "%s\\n" "$@"\n');
  chmodSync(join(kitContainer, 'sandbox.sh'), 0o755);

  const result = spawnSync(join(base, 'sandbox.sh'), ['--rebuild', 'echo hi'], { encoding: 'utf-8' });

  assert.equal(result.status, 0, result.stderr);
  const [root, ...rest] = result.stdout.trimEnd().split('\n');
  assert.equal(realpathSync(root), realpathSync(base));
  assert.deepEqual(rest, ['--rebuild', 'echo hi']);
});

test('a project with some files present gets the rest; the present ones are skipped, unchanged, with notices', (t) => {
  const { base, run, read } = project(t);
  const present = {
    'AGENTS.md': '# Our own instructions\n',
    'CLAUDE.md': 'our own\n',
    '.claude/agents/reviewer.md': 'our reviewer\n',
    'sandbox.sh': '#!/bin/sh\necho ours\n',
    '.dockerignore': `node_modules\n${EXCEPTION}\n`,
  };
  for (const [path, content] of Object.entries(present)) {
    mkdirSync(join(base, path, '..'), { recursive: true });
    writeFileSync(join(base, path), content);
  }
  const packageJson = `{\n  "name": "my-app",\n  "scripts": {\n    "check-changes": "ours"\n  }\n}\n`;
  writeFileSync(join(base, 'package.json'), packageJson);

  const result = run('init', 'claude');

  assert.equal(result.status, 0, result.stderr);
  for (const [path, content] of Object.entries(present)) {
    assert.equal(read(path), content, path);
    assert.match(result.stdout, new RegExp(`^skipped ${path.replaceAll('.', '\\.')}\\b`, 'm'));
  }
  assert.equal(read('package.json'), packageJson);
  assert.match(result.stdout, /^skipped package\.json\b/m);
  for (const path of ['.claude/agents/planner.md', '.claude/agents/implementer.md', 'sandbox/compose.project.yml']) {
    assert.ok(exists(join(base, path)), path);
    assert.match(result.stdout, new RegExp(`^wrote ${path.replaceAll('.', '\\.')}$`, 'm'));
  }
  const agents = fileAt(files(['claude']), 'AGENTS.md').content;
  assert.ok(result.stdout.includes(agentsNotice(agents)));
  assert.ok(result.stdout.includes(CLAUDE_NOTICE));
});

test('a dangling symlink where a file would go is skipped, not written through', (t) => {
  const { base, run } = project(t);
  symlinkSync('/no/such/target', join(base, 'CLAUDE.md'));
  const result = run('init', 'claude');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(lstatSync(join(base, 'CLAUDE.md')).isSymbolicLink(), true);
  assert.match(result.stdout, /^skipped CLAUDE\.md\b/m);
});

test('a project without playwright gets every file, the compose file without the build argument, and exits 0', (t) => {
  for (const lockfile of [JSON.stringify({ lockfileVersion: 3, packages: {} }), null]) {
    const { base, run, read } = project(t, { lockfile });
    const result = run('init', 'claude');
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.match(result.stdout, /^wrote sandbox\/compose\.project\.yml$/m);
    assert.doesNotMatch(read('sandbox/compose.project.yml'), /PLAYWRIGHT_VERSION|build:/);
    for (const path of ['AGENTS.md', 'CLAUDE.md', 'sandbox.sh', '.dockerignore', '.claude/agents/planner.md']) {
      assert.ok(exists(join(base, path)), path);
    }
    assert.match(result.stdout, /^changed package\.json$/m);
  }
});

test('a project without playwright whose compose file exists keeps it, and exits 0', (t) => {
  const { base, run, read } = project(t, { lockfile: null });
  mkdirSync(join(base, 'sandbox'));
  writeFileSync(join(base, 'sandbox', 'compose.project.yml'), 'ours\n');
  const result = run('init', 'claude');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(read('sandbox/compose.project.yml'), 'ours\n');
  assert.match(result.stdout, /^skipped sandbox\/compose\.project\.yml\b/m);
  assert.ok(exists(join(base, 'AGENTS.md')));
});

test('a usage error writes nothing and exits non-zero', (t) => {
  for (const args of [[], ['init'], ['init', 'codex'], ['setup', 'claude']]) {
    const { base, run, read } = project(t);
    const result = run(...args);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.match(result.stderr, /usage: agentrite init/);
    for (const path of ['AGENTS.md', 'CLAUDE.md', 'sandbox.sh', '.dockerignore', '.claude', 'sandbox']) {
      assert.equal(exists(join(base, path)), false, path);
    }
    assert.doesNotMatch(read('package.json'), /check-changes/);
  }
});

test('a package.json without a name is refused before anything is written', (t) => {
  const { base, run } = project(t);
  writeFileSync(join(base, 'package.json'), '{\n  "dependencies": {}\n}\n');
  const result = run('init', 'claude');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /package\.json/);
  assert.match(result.stderr, /name/);
  assert.equal(exists(join(base, 'AGENTS.md')), false);
});

test('the command runs through a node_modules bin symlink the way npx does', (t) => {
  const { base, read } = project(t);
  mkdirSync(join(base, 'node_modules', '.bin'), { recursive: true });
  const bin = join(base, 'node_modules', '.bin', 'agentrite');
  symlinkSync(script, bin);
  const result = spawnSync(process.execPath, [bin, 'init', 'claude'], { cwd: base, encoding: 'utf-8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('CLAUDE.md'), fillTemplate(templates['CLAUDE.md'], { standards: STANDARDS }));
});

// --no-sandbox

const SANDBOX_FILES = ['sandbox.sh', 'sandbox/compose.project.yml', '.dockerignore'];
const PROCESS_PATHS = [...plannedFiles(['claude'], KIT_ROLES).map((file) => file.path), 'AGENTS.md', 'CLAUDE.md'];

function line(word, path, end) {
  return new RegExp(`^${word} ${path.replaceAll('.', '\\.')}${end}`, 'm');
}

// The lines of an init's output without the notices, which follow a blank line.
function linesOf(result) {
  return result.stdout.split('\n\n')[0].split('\n');
}

// The notices of an init's output, which follow its lines.
function noticesOf(result) {
  return result.stdout.split('\n\n').slice(1).join('\n\n');
}

// The files of the sandbox as a project that has it holds them.
function withSandboxFiles(base) {
  mkdirSync(join(base, 'sandbox'), { recursive: true });
  writeFileSync(join(base, 'sandbox.sh'), '#!/bin/sh\necho ours\n');
  chmodSync(join(base, 'sandbox.sh'), 0o755);
  writeFileSync(join(base, 'sandbox', 'compose.project.yml'), 'ours\n');
  writeFileSync(join(base, '.dockerignore'), 'ours\n');
}

test('init --no-sandbox writes what init writes but the three files of the sandbox, in a project with none', (t) => {
  const { base, run, read } = project(t);
  const full = project(t);
  const withSandbox = full.run('init', 'claude');

  const result = run('init', OPTION, 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  const expected = linesOf(withSandbox).filter((line) => !SANDBOX_FILES.some((path) => line.endsWith(` ${path}`)));
  assert.deepEqual(linesOf(result), expected);
  for (const path of PROCESS_PATHS) assert.equal(read(path), full.read(path), path);
  assert.equal(read('package.json'), full.read('package.json'));
  for (const path of SANDBOX_FILES) {
    assert.equal(exists(join(base, path)), false, path);
    assert.doesNotMatch(result.stdout, new RegExp(path.replaceAll('.', '\\.')));
  }
});

test('init --no-sandbox prints the same lines and notices for what exists, and leaves the sandbox alone', (t) => {
  const { base, run, read } = project(t);
  const full = project(t);
  for (const made of [{ base }, full]) {
    writeFileSync(join(made.base, 'AGENTS.md'), '# Our own instructions\n');
    writeFileSync(join(made.base, 'CLAUDE.md'), 'our own\n');
  }
  const withSandbox = full.run('init', 'claude');
  withSandboxFiles(base);
  const modes = Object.fromEntries(SANDBOX_FILES.map((path) => [path, statSync(join(base, path)).mode]));

  const result = run('init', 'claude', OPTION);

  assert.equal(result.status, 0, result.stderr);
  const expected = linesOf(withSandbox).filter((line) => !SANDBOX_FILES.some((path) => line.endsWith(` ${path}`)));
  assert.deepEqual(linesOf(result), expected);
  assert.match(result.stdout, /^skipped AGENTS\.md, which exists$/m);
  assert.match(result.stdout, /^skipped CLAUDE\.md, which exists$/m);
  assert.ok(result.stdout.includes(agentsNotice(fileAt(files(['claude']), 'AGENTS.md').content)));
  assert.ok(result.stdout.includes(CLAUDE_NOTICE));
  assert.equal(noticesOf(result), noticesOf(withSandbox).replace('"sandbox": true', '"sandbox": false'));
  assert.equal(read('sandbox.sh'), '#!/bin/sh\necho ours\n');
  assert.equal(read('sandbox/compose.project.yml'), 'ours\n');
  assert.equal(read('.dockerignore'), 'ours\n');
  for (const path of SANDBOX_FILES) {
    assert.equal(statSync(join(base, path)).mode, modes[path], path);
    assert.doesNotMatch(result.stdout, new RegExp(path.replaceAll('.', '\\.')));
  }
});

test('init --no-sandbox runs with a package.json that has no name, and with no lockfile', (t) => {
  const { base, run, read } = project(t, { lockfile: null });
  writeFileSync(join(base, 'package.json'), '{\n  "dependencies": {}\n}\n');

  const result = run('init', 'claude', OPTION);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.match(result.stdout, /^changed package\.json$/m);
  assert.equal(JSON.parse(read('package.json')).scripts['check-changes'], CHECK_CHANGES);
  assert.ok(exists(join(base, 'AGENTS.md')));
});

test('init --no-sandbox does not read the lockfile, so one that cannot be read does not stop it', (t) => {
  const { base, run } = project(t, { lockfile: 'not json' });

  const withOption = run('init', OPTION, 'claude');
  assert.equal(withOption.status, 0, withOption.stderr);
  assert.equal(withOption.stderr, '');
  assert.ok(exists(join(base, 'CLAUDE.md')));

  const other = project(t, { lockfile: 'not json' });
  const without = other.run('init', 'claude');
  assert.notEqual(without.status, 0);
  assert.match(without.stderr, /package-lock\.json/);
});

test('init --no-sandbox with no package.json, or one that is not JSON, is refused and writes nothing', (t) => {
  for (const manifest of [null, 'not json']) {
    const { base, run } = project(t);
    rmSync(join(base, 'package.json'));
    if (manifest !== null) writeFileSync(join(base, 'package.json'), manifest);

    const result = run('init', 'claude', OPTION);

    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /cannot read .*package\.json/);
    assert.equal(result.stdout, '');
    for (const path of [...PROCESS_PATHS, ...SANDBOX_FILES, '.claude']) {
      assert.equal(exists(join(base, path)), false, path);
    }
  }
});

// R36: a project set up without the sandbox gets one by setting sandbox to true and running init.
test('init with no argument, in a project whose file was set to sandbox true, writes the three files', (t) => {
  const { base, run, read } = project(t);
  assert.equal(run('init', 'claude', OPTION).status, 0);
  const edited = read('agentrite.json').replace('"sandbox": false', '"sandbox": true');
  writeFileSync(join(base, 'agentrite.json'), edited);

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  for (const path of SANDBOX_FILES) assert.match(result.stdout, line('wrote', path, '$'));
  for (const path of PROCESS_PATHS) assert.match(result.stdout, line('skipped', path, '\\b'));
  assert.match(result.stdout, /^skipped package\.json\b/m);
  assert.equal(read('sandbox/compose.project.yml'), fileAt(files(['claude']), 'sandbox/compose.project.yml').content);
  assert.equal(read('agentrite.json'), edited);
});

// R4: a project that holds the files of the release before is not read, changed or mentioned.

// The old shim and compose file of a project, with a mode and a content that a write over them would change.
function withOldSandboxFiles(base) {
  mkdirSync(join(base, 'agent'), { recursive: true });
  writeFileSync(join(base, 'agent.sh'), '#!/bin/sh\necho old\n');
  chmodSync(join(base, 'agent.sh'), 0o750);
  writeFileSync(join(base, 'agent', 'compose.project.yml'), 'name: my-app-agent\n');
  chmodSync(join(base, 'agent', 'compose.project.yml'), 0o640);
}

function assertOldSandboxFilesKept(base, result) {
  assert.equal(readFileSync(join(base, 'agent.sh'), 'utf-8'), '#!/bin/sh\necho old\n');
  assert.equal(statSync(join(base, 'agent.sh')).mode & 0o777, 0o750);
  assert.equal(readFileSync(join(base, 'agent', 'compose.project.yml'), 'utf-8'), 'name: my-app-agent\n');
  assert.equal(statSync(join(base, 'agent', 'compose.project.yml')).mode & 0o777, 0o640);
  for (const output of result.stdout.split('\n')) assert.doesNotMatch(output, /agent\.sh|agent\//);
}

test('init writes the sandbox of this release beside the files of the release before, and leaves them', (t) => {
  const { base, run, read } = project(t);
  withOldSandboxFiles(base);

  const result = run('init', 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^wrote sandbox\.sh$/m);
  assert.match(result.stdout, /^wrote sandbox\/compose\.project\.yml$/m);
  const compose = read('sandbox/compose.project.yml');
  assert.match(compose, /^ {2}sandbox:$/m);
  assert.equal(compose.match(/my-app-sandbox/g).length, 2);
  assert.ok(compose.includes('${SANDBOX_MEM_LIMIT:-8g}') && compose.includes('${SANDBOX_CPUS:-6}'));
  assertOldSandboxFilesKept(base, result);
});

test('init --no-sandbox writes neither file of this release beside the files of the release before', (t) => {
  const { base, run } = project(t);
  withOldSandboxFiles(base);

  const result = run('init', OPTION, 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(exists(join(base, 'sandbox.sh')), false);
  assert.equal(exists(join(base, 'sandbox')), false);
  assertOldSandboxFilesKept(base, result);
});

// agentrite.json

const SETTINGS_TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const KIT_ORDER = ['claude', 'opencode'];
const WITH_FILE_REFUSAL =
  'agentrite: the project has an agentrite.json, and the settings are read from it, not from the arguments.\n' +
  'To change a setting, edit the file. Then run: npx agentrite init, with no argument, which writes what is missing\n';

// Every path under `base`, node_modules apart, with what a file holds.
function snapshot(base, directory = '') {
  const entries = readdirSync(join(base, directory), { withFileTypes: true });
  return entries.flatMap((entry) => {
    const path = join(directory, entry.name);
    if (path === 'node_modules') return [];
    if (entry.isDirectory()) return [[path, null], ...snapshot(base, path)];
    return [[path, entry.isFile() ? readFileSync(join(base, path), 'utf-8') : null]];
  });
}

// R8, R9
test('init writes the file for every combination of harnesses, --no-sandbox and --default-branch', (t) => {
  for (const harnesses of [['claude'], ['opencode'], ['claude', 'opencode'], ['opencode', 'claude']]) {
    for (const sandbox of [true, false]) {
      for (const defaultBranch of [undefined, 'main']) {
        const { run, read } = project(t);
        const args = [
          ...harnesses,
          ...(sandbox ? [] : [OPTION]),
          ...(defaultBranch === undefined ? [] : [BRANCH, defaultBranch]),
        ];

        const result = run('init', ...args);

        assert.equal(result.status, 0, `${args.join(' ')}: ${result.stderr}`);
        const expected = kitSettingsText({
          defaultBranch: defaultBranch ?? 'master',
          harnesses: KIT_ORDER.filter((harness) => harnesses.includes(harness)),
          sandbox,
        });
        assert.equal(read('agentrite.json'), expected, args.join(' '));
        assert.equal(result.stdout.split('\n')[0], 'wrote agentrite.json');
      }
    }
  }
});

// R10
test('init takes --default-branch before, between and after the harnesses, and the last one given', (t) => {
  for (const args of [
    [BRANCH, 'main', 'claude', 'opencode'],
    ['claude', BRANCH, 'main', 'opencode'],
    ['claude', 'opencode', BRANCH, 'main'],
    [BRANCH, 'develop', 'claude', BRANCH, 'main', 'opencode'],
  ]) {
    const { run, read } = project(t);
    assert.equal(run('init', ...args).status, 0, args.join(' '));
    assert.equal(read('agentrite.json'), SETTINGS_TEMPLATE.replace('"master"', '"main"'), args.join(' '));
  }
});

// R9, R15
test('init claude opencode and init opencode claude both write the default file, byte for byte', (t) => {
  const first = project(t);
  assert.equal(first.run('init', 'claude', 'opencode').status, 0);
  assert.equal(first.read('agentrite.json'), SETTINGS_TEMPLATE);

  const second = project(t);
  const result = second.run('init', 'opencode', 'claude');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(second.read('agentrite.json'), SETTINGS_TEMPLATE);
  // Every other file is written and listed in the order the harnesses were given in, as before.
  const wrappers = linesOf(result).filter((line) => line.includes('/agents/'));
  assert.deepEqual(
    wrappers,
    plannedFiles(['opencode', 'claude'], KIT_ROLES).map((file) => `wrote ${file.path}`),
  );
  assert.match(second.read('AGENTS.md'), /^\* `\.opencode\/agents\/`\n\* `\.claude\/agents\/`$/m);
});

// R8
test('init prints the file it wrote after its notices, and the notice of the default branch last', (t) => {
  const { base, run, read } = project(t);
  writeFileSync(join(base, 'AGENTS.md'), '# Our own instructions\n');
  writeFileSync(join(base, 'CLAUDE.md'), 'our own\n');

  const result = run('init', 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(linesOf(result)[0], 'wrote agentrite.json');
  const content = read('agentrite.json');
  const notice = defaultBranchNotice('master');
  assert.ok(result.stdout.endsWith(`\n${content}\n${notice}`), result.stdout);
  assert.ok(result.stdout.indexOf(CLAUDE_NOTICE) < result.stdout.indexOf(content));
  assert.ok(result.stdout.indexOf('AGENTS.md exists') < result.stdout.indexOf(CLAUDE_NOTICE));
});

test('the notice of the default branch says what was written and where it is changed, and not by which option', () => {
  const notice = defaultBranchNotice('master').replaceAll('\n', ' ');
  assert.match(notice, /master was written as the default branch, because none was named/);
  assert.match(notice, /A project whose default branch is another changes defaultBranch in agentrite\.json/);
  assert.doesNotMatch(notice, /--default-branch/);
  for (const line of defaultBranchNotice('master').split('\n')) assert.ok(line.length <= 120, line);
});

test('init with --default-branch prints the file it wrote and no notice of the default branch', (t) => {
  const { run, read } = project(t);

  const result = run('init', 'claude', BRANCH, 'main');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(result.stdout.endsWith(`\n\n${read('agentrite.json')}`), result.stdout);
  assert.doesNotMatch(result.stdout, /was written as the default branch/);
  // Also when the name given is the one that is written unasked.
  const named = project(t);
  assert.doesNotMatch(named.run('init', 'claude', BRANCH, 'master').stdout, /was written as the default branch/);
  assert.equal(named.read('agentrite.json').includes('"defaultBranch": "master"'), true);
});

// R10
test('init with --default-branch and no name, or an empty one, says why, writes nothing and exits 2', (t) => {
  for (const args of [['claude', BRANCH], ['claude', BRANCH, ''], [BRANCH]]) {
    const { base, run } = project(t);
    const before = snapshot(base);

    const result = run('init', ...args);

    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `--default-branch needs the name of a branch\n${INIT_USAGE}\n`);
    assert.deepEqual(snapshot(base), before);
  }
});

// R13
test('init with no harness, in a project with no agentrite.json, prints its usage, writes nothing and exits 2', (t) => {
  for (const args of [[], [OPTION], [BRANCH, 'main'], [OPTION, BRANCH, 'main']]) {
    const { base, run } = project(t);
    const before = snapshot(base);

    const result = run('init', ...args);

    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `${INIT_USAGE}\n`);
    assert.deepEqual(snapshot(base), before);
  }
});

test('an init that refuses for package.json or the lockfile has written no agentrite.json', (t) => {
  const breakers = [
    (base) => rmSync(join(base, 'package.json')),
    (base) => writeFileSync(join(base, 'package.json'), 'not json'),
    (base) => writeFileSync(join(base, 'package.json'), '{\n  "dependencies": {}\n}\n'),
    (base) => writeFileSync(join(base, 'package-lock.json'), 'not json'),
  ];
  for (const breakIt of breakers) {
    const { base, run } = project(t);
    breakIt(base);
    const before = snapshot(base);

    const result = run('init', 'claude');

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.deepEqual(snapshot(base), before);
    assert.equal(exists(join(base, 'agentrite.json')), false);
  }
});

// R13. `.dockerignore` is the last thing init reads, so it is the one a refusal came too late for.
test('an init that refuses for a .dockerignore it cannot read has written no agentrite.json', (t) => {
  const { base, run } = project(t);
  mkdirSync(join(base, '.dockerignore'));
  const before = snapshot(base);

  const result = run('init', 'claude');

  assert.equal(result.status, 1);
  assert.match(result.stderr, /^agentrite: /);
  assert.equal(result.stdout, '');
  assert.deepEqual(snapshot(base), before);
  assert.equal(exists(join(base, 'agentrite.json')), false);
});

// R11
test('init with no argument takes the harnesses and the sandbox from the file, and leaves the file', (t) => {
  const { base, run, read } = project(t);
  const settings = kitSettingsText({ defaultBranch: 'main', harnesses: ['opencode'], sandbox: true });
  writeFileSync(join(base, 'agentrite.json'), settings);
  const given = project(t);
  const expected = given.run('init', 'opencode');

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(
    result.stdout,
    ['skipped agentrite.json, which exists', ...linesOf(expected).slice(1), ''].join('\n'),
  );
  assert.equal(read('agentrite.json'), settings);
  for (const [path, content] of snapshot(given.base)) {
    if (path !== 'agentrite.json') assert.equal(exists(join(base, path)), true, path);
    if (path !== 'agentrite.json' && content !== null) assert.equal(read(path), content, path);
  }
  assert.equal(exists(join(base, '.claude')), false);
  assert.doesNotMatch(result.stdout, /defaultBranch|was written as the default branch/);
});

// R11, R14
test('init with no argument and sandbox false asks for no name and reads no lockfile', (t) => {
  const { base, run, read } = project(t, { lockfile: 'not json' });
  writeFileSync(join(base, 'package.json'), '{\n  "dependencies": {}\n}\n');
  const settings = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: false });
  writeFileSync(join(base, 'agentrite.json'), settings);

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(linesOf(result)[0], 'skipped agentrite.json, which exists');
  for (const path of PROCESS_PATHS) assert.match(result.stdout, line('wrote', path, '$'));
  for (const path of SANDBOX_FILES) assert.equal(exists(join(base, path)), false, path);
  assert.equal(read('agentrite.json'), settings);

  // With sandbox true, the same project is refused for its name.
  const other = project(t);
  writeFileSync(join(other.base, 'package.json'), '{\n  "dependencies": {}\n}\n');
  writeFileSync(join(other.base, 'agentrite.json'), settings.replace('false', 'true'));
  const refused = other.run('init');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /has no name/);
});

// R12
test('init given an argument in a project with an agentrite.json refuses, and writes nothing', (t) => {
  const valid = kitSettingsText({ defaultBranch: 'main', harnesses: ['claude'], sandbox: false });
  for (const settings of [valid, 'not json']) {
    for (const args of [['claude'], [OPTION], [BRANCH, 'main'], ['claude', OPTION, BRANCH, 'main'], ['opencode']]) {
      const { base, run } = project(t);
      writeFileSync(join(base, 'agentrite.json'), settings);
      const before = snapshot(base);

      const result = run('init', ...args);

      assert.equal(result.status, 1, args.join(' '));
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, WITH_FILE_REFUSAL);
      assert.deepEqual(snapshot(base), before);
    }
  }
});

// R5
test('init with no argument in a project whose agentrite.json is not valid refuses, and writes nothing', (t) => {
  for (const settings of ['not json', '{ "defaultBranch": "main", "harnesses": [], "sandbox": true }']) {
    const { base, run } = project(t);
    writeFileSync(join(base, 'agentrite.json'), settings);
    const before = snapshot(base);

    const result = run('init');

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, /^agentrite: agentrite\.json/);
    assert.deepEqual(snapshot(base), before);
  }
});

// Unit 0054, R1, R5
test('init --default-branch main opencode writes the default file with main and opencode alone', (t) => {
  const { run, read } = project(t);

  const result = run('init', BRANCH, 'main', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    read('agentrite.json'),
    SETTINGS_TEMPLATE.replace('"master"', '"main"').replace('["claude", "opencode"]', '["opencode"]'),
  );
});

// Unit 0054, R4
test('init given harnesses in a project without the kit installed refuses for standards, and writes nothing', (t) => {
  const { base, run } = project(t);
  rmSync(join(base, 'node_modules'), { recursive: true });
  const before = snapshot(base);

  const result = run('init', 'claude', 'opencode');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    'agentrite: agentrite.json: standards is "node_modules/agentrite/standards.md", and there is no file at it. ' +
      "It must name a file in the project's working tree\n",
  );
  assert.deepEqual(snapshot(base), before);
  assert.equal(exists(join(base, 'agentrite.json')), false);
});

// Unit 0054, R1, R4
test('init with no argument in a project whose agentrite.json lacks roles refuses, and writes nothing', (t) => {
  const { base, run } = project(t);
  const settings = kitSettingsText({ defaultBranch: 'main', harnesses: ['claude'], sandbox: false });
  const withoutRoles = JSON.stringify({ ...JSON.parse(settings), roles: undefined });
  writeFileSync(join(base, 'agentrite.json'), withoutRoles);
  const before = snapshot(base);

  const result = run('init');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    'agentrite: agentrite.json: roles is missing. It must hold an object from each of the roles specifier, ' +
      "planner, implementer and reviewer, and from any role of the project's own, to the path of its file\n",
  );
  assert.deepEqual(snapshot(base), before);
});

// opencode.json and CLAUDE.md, which load process.md and standards.md

const OPENCODE_WITH_COMMENT = `{\n  // ours\n  "instructions": ["${PROCESS}", "${STANDARDS}"]\n}\n`;
// What can be at the path of opencode.json and cannot be amended, each with what makes it so.
const UNAMENDABLE = {
  'not JSON': 'not json\n',
  'a JSON list': '[]\n',
  null: 'null\n',
  'a string of instructions': '{ "instructions": "x" }\n',
};

// R3
test('init opencode writes opencode.json as R3 gives it, after the line of package.json', (t) => {
  for (const args of [['opencode'], ['claude', 'opencode'], ['opencode', OPTION], ['claude', 'opencode', OPTION]]) {
    const { run, read } = project(t);

    const result = run('init', ...args);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(read('opencode.json'), OPENCODE, args.join(' '));
    const lines = linesOf(result);
    assert.equal(lines[lines.indexOf('changed package.json') + 1], 'wrote opencode.json', args.join(' '));
    assert.doesNotMatch(noticesOf(result), /opencode\.json/);
  }
});

// R4
test('init amends an opencode.json that is an object without the paths, and prints no notice of it', (t) => {
  const onlyProcess = `{\n  "instructions": ["${PROCESS}"]\n}\n`;
  for (const text of ['{\n  "model": "x"\n}\n', '{\n\t"instructions": ["a.md"]\n}', onlyProcess]) {
    const { base, run, read } = project(t);
    writeFileSync(join(base, 'opencode.json'), text);

    const result = run('init', 'opencode');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(read('opencode.json'), opencodeVerdict({ found: true, text }, STANDARDS).content);
    const { instructions } = JSON.parse(read('opencode.json'));
    assert.deepEqual(instructions.slice(-2), [PROCESS, STANDARDS], text);
    assert.ok(linesOf(result).includes('changed opencode.json'), result.stdout);
    assert.doesNotMatch(noticesOf(result), /opencode\.json/);
  }
});

// R4, R5
test('init leaves an opencode.json that loads the paths, also one with a comment, and says so', (t) => {
  for (const text of [`{ "instructions": ["a.md", "${PROCESS}", "${STANDARDS}"] }`, OPENCODE_WITH_COMMENT]) {
    const { base, run, read } = project(t);
    writeFileSync(join(base, 'opencode.json'), text);

    const result = run('init', 'opencode');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(read('opencode.json'), text);
    const line = `skipped opencode.json, which loads ${PROCESS} and ${STANDARDS}`;
    assert.ok(linesOf(result).includes(line), result.stdout);
    assert.doesNotMatch(noticesOf(result), /opencode\.json/);
  }
});

// R5
test('init leaves an opencode.json it cannot amend, with a notice of why, writes the rest and exits 0', (t) => {
  const plain = project(t);
  const expected = plain.run('init', 'opencode');
  const cases = { ...UNAMENDABLE, 'a directory': null };

  for (const [name, text] of Object.entries(cases)) {
    const { base, run, read } = project(t);
    if (text === null) mkdirSync(join(base, 'opencode.json'));
    else writeFileSync(join(base, 'opencode.json'), text);

    const result = run('init', 'opencode');

    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    assert.equal(result.stderr, '', name);
    if (text === null) assert.ok(statSync(join(base, 'opencode.json')).isDirectory(), name);
    else assert.equal(read('opencode.json'), text, name);
    const swapped = linesOf(expected).map((line) =>
      line === 'wrote opencode.json' ? 'skipped opencode.json, which cannot be amended' : line,
    );
    assert.deepEqual(linesOf(result), swapped, name);
    const verdict = opencodeVerdict(text === null ? { found: true, error: 'x' } : { found: true, text }, STANDARDS);
    if (text !== null) assert.ok(noticesOf(result).includes(opencodeInitNotice(verdict.problem, verdict.lacks)), name);
    assert.match(noticesOf(result), /^opencode\.json was left as it is, because /m, name);
    assert.ok(noticesOf(result).indexOf('opencode.json was left') < noticesOf(result).indexOf('"harnesses"'), name);
    for (const [path, content] of snapshot(plain.base)) {
      if (path === 'opencode.json' || content === null) continue;
      assert.equal(read(path), content, `${name}: ${path}`);
    }
  }
});

// R18 of unit 0052
test('init leaves a not-JSON opencode.json that quotes only process.md, with a notice naming standards.md', (t) => {
  const { base, run, read } = project(t);
  const text = `{\n  // ours\n  "instructions": ["${PROCESS}"]\n}\n`;
  writeFileSync(join(base, 'opencode.json'), text);

  const result = run('init', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('opencode.json'), text);
  assert.ok(linesOf(result).includes('skipped opencode.json, which cannot be amended'), result.stdout);
  const notice = noticesOf(result);
  assert.ok(notice.includes(`Add them by hand:\n\n${STANDARDS}\n\n`), notice);
  assert.ok(!notice.includes(`\n${PROCESS}\n`), notice);
});

// R6
test('an opencode.json that is not JSON neither stops init nor is written before a refusal', (t) => {
  const refused = project(t);
  writeFileSync(join(refused.base, 'package.json'), '{\n  "dependencies": {}\n}\n');
  writeFileSync(join(refused.base, 'opencode.json'), 'not json\n');
  const before = snapshot(refused.base);
  const refusal = refused.run('init', 'opencode');
  assert.equal(refusal.status, 1);
  assert.match(refusal.stderr, /has no name/);
  assert.deepEqual(snapshot(refused.base), before);

  const { base, run, read } = project(t);
  writeFileSync(join(base, 'opencode.json'), 'not json\n');
  const result = run('init', 'opencode');
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('opencode.json'), 'not json\n');
  for (const path of ['agentrite.json', 'AGENTS.md', 'CLAUDE.md', '.opencode', 'sandbox.sh']) {
    assert.ok(exists(join(base, path)), path);
  }
});

// R7
test('init claude neither reads, writes nor names opencode.json, whatever is at its path', (t) => {
  const cases = { none: undefined, ...UNAMENDABLE, 'an object': '{ "model": "x" }\n', 'a directory': null };
  for (const [name, text] of Object.entries(cases)) {
    const { base, run, read } = project(t);
    if (text === null) mkdirSync(join(base, 'opencode.json'));
    else if (text !== undefined) writeFileSync(join(base, 'opencode.json'), text);

    const result = run('init', 'claude');

    assert.equal(result.status, 0, `${name}: ${result.stderr}`);
    assert.doesNotMatch(result.stdout, /opencode\.json/, name);
    if (text === undefined) assert.equal(exists(join(base, 'opencode.json')), false, name);
    else if (text === null) assert.ok(statSync(join(base, 'opencode.json')).isDirectory(), name);
    else assert.equal(read('opencode.json'), text, name);
  }
});

// R2
test('init claude notices an existing CLAUDE.md only for the lines it lacks', (t) => {
  const cases = [
    ['our own\n', CLAUDE_NOTICE],
    ['# Ours\n\n@AGENTS.md\n', claudeInitNotice([`@${PROCESS}`, `@${STANDARDS}`])],
    [`# Ours\n\n@${PROCESS}\n@AGENTS.md\n`, claudeInitNotice([`@${STANDARDS}`])],
    [`# Ours\n\n@${PROCESS}\n@${STANDARDS}\n@AGENTS.md\n`, undefined],
    [`# Ours\r\n\r\n@${PROCESS}\r\n@${STANDARDS}\r\n@AGENTS.md\r\n`, undefined],
  ];
  for (const [text, notice] of cases) {
    const { base, run, read } = project(t);
    writeFileSync(join(base, 'CLAUDE.md'), text);

    const result = run('init', 'claude');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(read('CLAUDE.md'), text);
    assert.ok(linesOf(result).includes('skipped CLAUDE.md, which exists'), result.stdout);
    if (notice === undefined) assert.doesNotMatch(noticesOf(result), /CLAUDE\.md/, JSON.stringify(text));
    else assert.ok(noticesOf(result).includes(notice), JSON.stringify(text));
  }
});

// R2
test('init opencode does not notice an existing CLAUDE.md that lacks the lines', (t) => {
  const { base, run } = project(t);
  writeFileSync(join(base, 'CLAUDE.md'), 'our own\n');

  const result = run('init', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(linesOf(result).includes('skipped CLAUDE.md, which exists'), result.stdout);
  assert.doesNotMatch(noticesOf(result), /CLAUDE\.md/);
});

// Unit 0054: what follows the settings.

const HOUSE = 'rules/house.md';
const OWN_PLANNER = '---\ndescription: Plans as this project does.\n---\n\n# Our planner\n';

// A project with both harnesses and no sandbox, whose agentrite.json names `standards` and the planner's file
// `planner`, with a file at each.
function ownProject(t, { standards = HOUSE, planner = KIT_SETTINGS.roles.planner }) {
  const made = project(t);
  const settings = { ...KIT_SETTINGS, roles: { ...KIT_SETTINGS.roles, planner } };
  const text = kitSettingsText({ defaultBranch: 'main', harnesses: ['claude', 'opencode'], sandbox: false });
  writeFileSync(join(made.base, 'agentrite.json'), JSON.stringify({ ...JSON.parse(text), ...settings, standards }));
  mkdirSync(join(made.base, 'rules'), { recursive: true });
  if (standards === HOUSE) writeFileSync(join(made.base, HOUSE), '# Our standards\n');
  if (planner !== KIT_SETTINGS.roles.planner) writeFileSync(join(made.base, planner), OWN_PLANNER);
  return made;
}

// R13, R14
test('init writes the list after the wrappers and before AGENTS.md, with the files the settings give', (t) => {
  const { run, read } = project(t);

  const result = run('init', 'claude', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  const wrappers = plannedFiles(['claude', 'opencode'], KIT_ROLES).map((file) => `wrote ${file.path}`);
  assert.deepEqual(linesOf(result).slice(0, wrappers.length + 4), [
    'wrote agentrite.json',
    ...wrappers,
    `wrote ${LIST}`,
    'wrote AGENTS.md',
    'wrote CLAUDE.md',
  ]);
  assert.equal(read(LIST), instructionsList(KIT_SETTINGS));
});

test('init skips a list that exists, and leaves it as it is', (t) => {
  const { base, run, read } = project(t);
  mkdirSync(join(base, '.agentrite'));
  writeFileSync(join(base, LIST), 'ours\n');

  const result = run('init', 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(LIST), 'ours\n');
  assert.ok(linesOf(result).includes(`skipped ${LIST}, which exists`), result.stdout);
});

// R9, R11, R13
test('init in a project with its own standards and planner writes everything from them', (t) => {
// Unit 0056, R5, R9
test('init in a project that names a role of its own writes its wrappers for the harnesses and lists it', (t) => {
  const { base, run, read } = project(t);
  const text = kitSettingsText({ defaultBranch: 'main', harnesses: ['opencode'], sandbox: false });
  const roles = { ...KIT_SETTINGS.roles, 'security-reviewer': 'rules/security-reviewer.md' };
  writeFileSync(join(base, 'agentrite.json'), JSON.stringify({ ...JSON.parse(text), roles }));
  mkdirSync(join(base, 'rules'));
  writeFileSync(join(base, 'rules/security-reviewer.md'), '---\ndescription: Reviews security.\n---\n\n# S\n');

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(linesOf(result).includes('wrote .opencode/agents/security-reviewer.md'), result.stdout);
  assert.ok(!exists(join(base, '.claude/agents/security-reviewer.md')));
  assert.match(read('.opencode/agents/security-reviewer.md'), /^Read `rules\/security-reviewer\.md` in the project/m);
  assert.equal(read(LIST), instructionsList({ standards: KIT_SETTINGS.standards, roles }));
  assert.match(
    read(LIST),
    /\* security-reviewer: \[`rules\/security-reviewer\.md`\]\(\.\.\/rules\/security-reviewer\.md\)\n/,
  );
});

  const { run, read } = ownProject(t, { planner: 'rules/planner.md' });

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  const lines = read('CLAUDE.md').split('\n');
  assert.deepEqual(lines.slice(lines.indexOf(`@${PROCESS}`), lines.indexOf('@AGENTS.md') + 1), [
    `@${PROCESS}`,
    `@${HOUSE}`,
    '@AGENTS.md',
  ]);
  assert.doesNotMatch(read('CLAUDE.md'), /standards\.md/);
  assert.equal(read('opencode.json'), `{\n  "instructions": [\n    "${PROCESS}",\n    "${HOUSE}"\n  ]\n}\n`);
  assert.ok(read(LIST).includes(`* Standards: [\`${HOUSE}\`](../${HOUSE})\n`));
  assert.ok(read(LIST).includes('* planner: [`rules/planner.md`](../rules/planner.md)\n'));
  for (const directory of ['.claude/agents', '.opencode/agents']) {
    const planner = read(`${directory}/planner.md`);
    assert.match(planner, /^description: >-\n {2}Plans as this project does\.\n/m);
    assert.match(planner, /^Read `rules\/planner\.md` in the project root and follow it\./m);
    assert.equal(read(`${directory}/reviewer.md`), fixtureOf(directory, 'reviewer'));
  }
});

// The wrapper of `role` the kit writes into `directory` for its own role file.
function fixtureOf(directory, role) {
  return plannedFiles([directory.startsWith('.claude') ? 'claude' : 'opencode'], KIT_ROLES).find((file) =>
    file.path.endsWith(`/${role}.md`),
  ).content;
}

test('init in a project that names the kit standards writes CLAUDE.md importing them', (t) => {
  const { run, read } = ownProject(t, { standards: STANDARDS });

  assert.equal(run('init').status, 0);

  assert.match(read('CLAUDE.md'), new RegExp(`^@${PROCESS}\n@${STANDARDS}\n@AGENTS\\.md$`, 'm'));
});

test('init amends an opencode.json with the standards the settings give, after process.md', (t) => {
  const { base, run, read } = ownProject(t, {});
  writeFileSync(join(base, 'opencode.json'), `{\n  "instructions": ["${PROCESS}"]\n}\n`);

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('opencode.json'), `{\n  "instructions": [\n    "${PROCESS}",\n    "${HOUSE}"\n  ]\n}\n`);
  assert.match(result.stdout, /^changed opencode\.json$/m);
});

// R12
test('init notices a CLAUDE.md and an opencode.json that load the kit standards beside the project own', (t) => {
  const claude = `@${PROCESS}\n@${HOUSE}\n@${STANDARDS}\n@AGENTS.md\n`;
  const opencode = `{\n  "instructions": ["${PROCESS}", "${HOUSE}", "${STANDARDS}"]\n}\n`;
  const { base, run, read } = ownProject(t, {});
  writeFileSync(join(base, 'CLAUDE.md'), claude);
  writeFileSync(join(base, 'opencode.json'), opencode);

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('CLAUDE.md'), claude);
  assert.equal(read('opencode.json'), opencode);
  assert.equal(
    noticesOf(result),
    `${claudeKitStandardsNotice(HOUSE)}\n\n${opencodeKitStandardsNotice(HOUSE)}\n`,
  );
});

test('init notices the kit standards only when the project has other standards', (t) => {
  const { base, run } = ownProject(t, { standards: STANDARDS });
  writeFileSync(join(base, 'CLAUDE.md'), `@${PROCESS}\n@${STANDARDS}\n@AGENTS.md\n`);
  writeFileSync(join(base, 'opencode.json'), `{ "instructions": ["${PROCESS}", "${STANDARDS}"] }\n`);

  const result = run('init');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(noticesOf(result), '');
});

// R15, R16
test('init notices an existing AGENTS.md with the sections, and then that it does not name the list', (t) => {
  const { base, run } = project(t);
  writeFileSync(join(base, 'AGENTS.md'), '# Our own instructions\n');

  const result = run('init', OPTION, 'claude');

  assert.equal(result.status, 0, result.stderr);
  const agents = fileAt(files(['claude']), 'AGENTS.md').content;
  const notices = noticesOf(result);
  const sections = notices.indexOf(agentsNotice(agents));
  const list = notices.indexOf(agentsListNotice(false));
  assert.ok(sections !== -1 && list > sections, notices);
  assert.ok(notices.indexOf(CLAUDE_NOTICE) === -1 || notices.indexOf(CLAUDE_NOTICE) > list, notices);
});

test('init gives an existing AGENTS.md that names the list the notice of the sections alone', (t) => {
  const { base, run } = project(t);
  writeFileSync(join(base, 'AGENTS.md'), `# Ours\n\nRead the files [${LIST}](${LIST}) names.\n`);

  const result = run('init', OPTION, 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(noticesOf(result).includes('AGENTS.md exists and was left as it is'));
  assert.doesNotMatch(noticesOf(result), /does not name \.agentrite/);
});

test('init gives no notice of AGENTS.md when it writes AGENTS.md', (t) => {
  const { run } = project(t);
  const result = run('init', OPTION, 'claude');
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /AGENTS\.md (?:is missing|does not name|exists)/);
});

// R8
test('init refuses a project whose role file has no front matter, and writes nothing', (t) => {
  const { base, run } = ownProject(t, { planner: 'rules/planner.md' });
  writeFileSync(join(base, 'rules', 'planner.md'), '# Our planner\n');
  const before = snapshot(base);

  const result = run('init');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^agentrite: rules\/planner\.md has no front matter that a role file must open with\. /);
  assert.deepEqual(snapshot(base), before);
});
