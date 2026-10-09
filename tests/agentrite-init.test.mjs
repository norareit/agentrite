import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { plannedFiles } from '../scripts/agentrite-roles.mjs';
import {
  AGENTS_SECTIONS,
  sandboxName,
  agentsNotice,
  CLAUDE_NOTICE,
  dockerignore,
  fillTemplate,
  parseArgs,
  playwrightVersion,
  projectFiles,
  withCheckChangesScript,
} from '../scripts/agentrite.mjs';

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
const EXCEPTION = `!${KIT_CONTAINER}/**`;

function files(harnesses, overrides = {}) {
  return projectFiles({ templates, harnesses, packageName: 'my-app', playwrightVersion: '1.59.1', ...overrides });
}
function fileAt(list, path) {
  const file = list.find((candidate) => candidate.path === path);
  assert.ok(file, `${path} is not among the planned files`);
  return file;
}

// R1

const OPTION = '--no-sandbox';

test('parseArgs takes the command and the harnesses after it, and the sandbox is wanted', () => {
  assert.deepEqual(parseArgs(['init', 'claude']), { command: 'init', harnesses: ['claude'], sandbox: true });
  assert.deepEqual(parseArgs(['init', 'opencode', 'claude', 'claude']), {
    command: 'init',
    harnesses: ['opencode', 'claude'],
    sandbox: true,
  });
  assert.deepEqual(parseArgs(['refresh', 'claude', 'opencode']), {
    command: 'refresh',
    harnesses: ['claude', 'opencode'],
    sandbox: true,
  });
});

test('parseArgs takes --no-sandbox before, between and after the harnesses, for init and for refresh', () => {
  for (const command of ['init', 'refresh']) {
    for (const rest of [
      [OPTION, 'claude', 'opencode'],
      ['claude', OPTION, 'opencode'],
      ['claude', 'opencode', OPTION],
    ]) {
      assert.deepEqual(
        parseArgs([command, ...rest]),
        { command, harnesses: ['claude', 'opencode'], sandbox: false },
        rest.join(' '),
      );
    }
  }
});

test('parseArgs counts --no-sandbox given more than once as given once', () => {
  assert.deepEqual(parseArgs(['init', OPTION, 'claude', OPTION, OPTION]), {
    command: 'init',
    harnesses: ['claude'],
    sandbox: false,
  });
  assert.deepEqual(parseArgs(['refresh', OPTION, OPTION, 'opencode', 'opencode']), {
    command: 'refresh',
    harnesses: ['opencode'],
    sandbox: false,
  });
});

test('parseArgs gives the usage of the command alone for no harness and for an unknown one', () => {
  for (const [command, other] of [
    ['init', 'refresh'],
    ['refresh', 'init'],
  ]) {
    const cases = [
      [command],
      [command, 'codex'],
      [command, 'claude', 'toString'],
      [command, OPTION],
      [command, OPTION, 'codex'],
      [command, 'claude', `${OPTION}=1`],
    ];
    for (const args of cases) {
      assert.throws(() => parseArgs(args), (error) => {
        assert.match(
          error.message,
          new RegExp(`^usage: agentrite ${command} \\[--no-sandbox\\] claude \\| opencode$`, 'm'),
        );
        assert.doesNotMatch(error.message, new RegExp(`agentrite ${other}`));
        assert.doesNotMatch(error.message, /agentrite-roles/);
        return true;
      });
    }
    assert.throws(() => parseArgs([command, 'codex']), /unknown harness: codex/);
    assert.throws(() => parseArgs([command, 'claude', `${OPTION}=1`]), /unknown harness: --no-sandbox=1/);
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
    'usage: agentrite init [--no-sandbox] claude | opencode\n' +
    '       agentrite refresh [--no-sandbox] claude | opencode\n' +
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
    for (const wrapper of plannedFiles(harnesses)) assert.deepEqual(fileAt(planned, wrapper.path), wrapper);
    assert.equal(planned.filter((file) => file.path.includes('/agents/')).length, plannedFiles(harnesses).length);
  }
});

// R3

test('AGENTS.md holds the three sections, naming process.md, the role files and the change check', () => {
  const agents = fileAt(files(['claude']), 'AGENTS.md').content;
  const headings = agents.split('\n').filter((line) => /^#{1,2} /.test(line));
  assert.deepEqual(headings.slice(0, 3), AGENTS_SECTIONS);
  assert.equal(agents.split('\n')[0], '# Development Guidelines');
  assert.match(agents, /node_modules\/agentrite\/process\.md.*\n?.*\*\*required reading\*\*/);
  assert.match(agents, /\[README\.md\]\(README\.md\)/);
  assert.match(agents, /`npm ci` installs it/);
  assert.match(agents, /never under\n?\s*`node_modules\/`/);
  const roles = ['specifier', 'planner', 'implementer', 'reviewer'];
  assert.deepEqual(
    [...agents.matchAll(/^\* \[`node_modules\/agentrite\/roles\/(\w+)\.md`\]\((.*)\)$/gm)].map((link) => [
      link[1],
      link[2],
    ]),
    roles.map((role) => [role, `node_modules/agentrite/roles/${role}.md`]),
  );
  assert.match(agents, /^The four roles that do the work in `changes\/` are the kit's:$/m);
  assert.match(agents, /`npm run check-changes`, which runs the kit's script/);
  assert.match(agents, /## Specific to this project/);
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

test('the notice for an existing CLAUDE.md names the @AGENTS.md import', () => {
  assert.match(CLAUDE_NOTICE, /CLAUDE\.md exists and was left as it is/);
  assert.match(CLAUDE_NOTICE, /`@AGENTS\.md`/);
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
  const base = mkdtempSync(join(tmpdir(), 'agentrite-init-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  writeFileSync(
    join(base, 'package.json'),
    '{\n  "name": "my-app",\n  "scripts": {\n    "test": "node --test"\n  }\n}\n',
  );
  if (lockfile !== null) writeFileSync(join(base, 'package-lock.json'), lockfile);
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
  assert.equal(read('CLAUDE.md'), templates['CLAUDE.md']);
});

// --no-sandbox

const SANDBOX_FILES = ['sandbox.sh', 'sandbox/compose.project.yml', '.dockerignore'];
const PROCESS_PATHS = [...plannedFiles(['claude']).map((file) => file.path), 'AGENTS.md', 'CLAUDE.md'];

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
  assert.equal(noticesOf(result), noticesOf(withSandbox));
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

test('init without the option, in a project set up with it, writes the three files and skips the rest', (t) => {
  const { run, read } = project(t);
  assert.equal(run('init', 'claude', OPTION).status, 0);

  const result = run('init', 'claude');

  assert.equal(result.status, 0, result.stderr);
  for (const path of SANDBOX_FILES) assert.match(result.stdout, line('wrote', path, '$'));
  for (const path of PROCESS_PATHS) assert.match(result.stdout, line('skipped', path, '\\b'));
  assert.match(result.stdout, /^skipped package\.json\b/m);
  assert.equal(read('sandbox/compose.project.yml'), fileAt(files(['claude']), 'sandbox/compose.project.yml').content);
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
