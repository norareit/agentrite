import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
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
import { plannedFiles } from '../scripts/agent-kit-roles.mjs';
import {
  AGENTS_SECTIONS,
  agentName,
  agentsNotice,
  CLAUDE_NOTICE,
  dockerignore,
  fillTemplate,
  parseInitArgs,
  playwrightVersion,
  projectFiles,
  withCheckChangesScript,
} from '../scripts/agent-kit.mjs';

const TEMPLATE_PATHS = ['AGENTS.md', 'CLAUDE.md', 'agent.sh', 'agent/compose.project.yml'];
const templates = Object.fromEntries(
  TEMPLATE_PATHS.map((path) => [
    path,
    readFileSync(new URL(`../templates/project/${path}`, import.meta.url), 'utf-8'),
  ]),
);
const HARNESS_LISTS = [['claude'], ['opencode'], ['claude', 'opencode']];
const CHECK_CHANGES = 'node node_modules/@ritenoar/agent-kit/scripts/check-changes.mjs';
const EXCEPTION = '!node_modules/@ritenoar/agent-kit/container';

function files(harnesses, overrides = {}) {
  return projectFiles({ templates, harnesses, packageName: 'my-app', playwrightVersion: '1.59.1', ...overrides });
}
function fileAt(list, path) {
  const file = list.find((candidate) => candidate.path === path);
  assert.ok(file, `${path} is not among the planned files`);
  return file;
}

// R1

test('parseInitArgs takes the harnesses after init, as agent-kit-roles does', () => {
  assert.deepEqual(parseInitArgs(['init', 'claude']), ['claude']);
  assert.deepEqual(parseInitArgs(['init', 'opencode', 'claude', 'claude']), ['opencode', 'claude']);
});

test('parseInitArgs gives the init usage for no harness and for an unknown one, naming the harnesses', () => {
  for (const args of [['init'], ['init', 'codex'], ['init', 'claude', 'toString']]) {
    assert.throws(() => parseInitArgs(args), (error) => {
      assert.match(error.message, /^usage: agent-kit init claude \| opencode$/m);
      assert.doesNotMatch(error.message, /agent-kit-roles/);
      return true;
    });
  }
  assert.throws(() => parseInitArgs(['init', 'codex']), /unknown harness: codex/);
});

test('parseInitArgs gives the usage for no command and for a command other than init', () => {
  assert.throws(() => parseInitArgs([]), { message: 'usage: agent-kit init claude | opencode' });
  assert.throws(() => parseInitArgs(['claude']), /unknown command: claude\nusage: agent-kit init/);
  assert.throws(() => parseInitArgs(['setup', 'claude']), /unknown command: setup/);
});

// R2

test('the role wrappers are exactly those agent-kit-roles writes', () => {
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
  assert.match(agents, /node_modules\/@ritenoar\/agent-kit\/process\.md.*\n?.*\*\*required reading\*\*/);
  assert.match(agents, /\[README\.md\]\(README\.md\)/);
  assert.match(agents, /`npm ci` installs it/);
  assert.match(agents, /never under\n?\s*`node_modules\/`/);
  for (const role of ['planner', 'implementer', 'reviewer']) {
    assert.match(agents, new RegExp(`node_modules/@ritenoar/agent-kit/roles/${role}\\.md`));
  }
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

test('agent.sh is planned executable, and execs the kit wrapper with its own directory first', () => {
  const shim = fileAt(files(['claude']), 'agent.sh');
  assert.equal(shim.executable, true);
  assert.match(
    shim.content,
    /^exec "\$here\/node_modules\/@ritenoar\/agent-kit\/container\/agent\.sh" "\$here" "\$@"$/m,
  );
});

// R7

test('agentName derives the names from an unscoped and a scoped package name', () => {
  assert.equal(agentName('norareit'), 'norareit-agent');
  assert.equal(agentName('@ritenoar/agent-kit'), 'ritenoar-agent-kit-agent');
});

test('agentName reduces a package name to the characters Compose accepts in a project name', () => {
  for (const name of ['my.app', '@scope/My_App~2', 'a--b', '_leading']) {
    assert.match(agentName(name), /^[a-z0-9][a-z0-9_-]*$/, name);
  }
  assert.equal(agentName('my.app'), 'my-app-agent');
});

test('the compose file carries the names, the Playwright version, the limits and no host the kit supplies', () => {
  const compose = fileAt(files(['claude'], { packageName: '@acme/shop' }), 'agent/compose.project.yml').content;
  assert.match(compose, /^name: acme-shop-agent$/m);
  assert.match(compose, /^ {4}image: acme-shop-agent$/m);
  assert.match(compose, /^ {8}PLAYWRIGHT_VERSION: 1\.59\.1$/m);
  assert.match(compose, /^ {4}mem_limit: \$\{AGENT_MEM_LIMIT:-8g\}$/m);
  assert.match(compose, /^ {4}cpus: \$\{AGENT_CPUS:-6\}$/m);
  const allowlist = compose.slice(compose.indexOf('ALLOWLIST: |'));
  const hosts = allowlist
    .split('\n')
    .slice(1)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter(Boolean);
  assert.deepEqual(hosts, []);
});

test('the compose file admits models.dev for opencode, which OpenCode fetches at start-up', () => {
  const compose = fileAt(files(['claude', 'opencode']), 'agent/compose.project.yml').content;
  assert.match(compose, /^ {8}models\.dev$/m);
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

test('no compose file is planned without a Playwright version', () => {
  const planned = files(['claude'], { playwrightVersion: undefined });
  assert.equal(planned.some((file) => file.path === 'agent/compose.project.yml'), false);
  assert.ok(planned.some((file) => file.path === 'agent.sh'));
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
  const created = dockerignore(undefined);
  const lines = created.split('\n').filter((line) => line && !line.startsWith('#'));
  assert.deepEqual(lines, ['node_modules', EXCEPTION]);
});

test('.dockerignore that excludes node_modules without the exception gets it appended', () => {
  assert.equal(dockerignore('.git\nnode_modules\n'), `.git\nnode_modules\n${EXCEPTION}\n`);
  assert.equal(dockerignore('/node_modules/'), `/node_modules/\n${EXCEPTION}\n`);
});

test('.dockerignore that excludes the kit by a wildcard, or before its exception, gets it appended', () => {
  for (const existing of [
    '**/node_modules\n',
    'node_modules/**\n',
    'node_modules/*\n',
    './node_modules\n',
    `${EXCEPTION}\nnode_modules\n`,
  ]) {
    const amended = dockerignore(existing);
    assert.equal(amended, `${existing}${EXCEPTION}\n`, existing);
    assert.equal(dockerignore(amended), undefined, `appending to ${existing} does not let the kit in`);
  }
});

test('.dockerignore that holds the exception, or does not exclude node_modules, is left unchanged', () => {
  assert.equal(dockerignore(`node_modules\n${EXCEPTION}\n`), undefined);
  assert.equal(dockerignore('.git\n*/node_modules\n'), undefined);
  assert.equal(dockerignore('node_modules_cache\n# node_modules\n'), undefined);
  assert.equal(dockerignore('node_modules/**\n!node_modules/@ritenoar/agent-kit/container/**\n'), undefined);
  assert.equal(dockerignore(''), undefined);
});

// R15

test('every filled template has no placeholder left, whatever the harnesses', () => {
  for (const harnesses of HARNESS_LISTS) {
    for (const file of files(harnesses)) assert.doesNotMatch(file.content, /\{\{/, file.path);
  }
});

test('every project template is filled from templates/project/', () => {
  for (const path of TEMPLATE_PATHS) assert.ok(files(['claude']).some((file) => file.path === path), path);
  assert.match(templates['agent/compose.project.yml'], /\{\{playwright_version\}\}/);
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

const script = join(import.meta.dirname, '..', 'scripts', 'agent-kit.mjs');
const LOCKFILE = JSON.stringify({ lockfileVersion: 3, packages: { 'node_modules/playwright': { version: '1.59.1' } } });

// A lockfile of `null` leaves the project without one.
function project(t, { lockfile = LOCKFILE } = {}) {
  const base = mkdtempSync(join(tmpdir(), 'agent-kit-init-'));
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
  assert.match(read('agent/compose.project.yml'), /^name: my-app-agent$/m);
  assert.equal(JSON.parse(read('package.json')).scripts['check-changes'], CHECK_CHANGES);
  assert.match(result.stdout, /^changed package\.json$/m);
  assert.equal(read('.dockerignore'), dockerignore(undefined));
  assert.match(result.stdout, /^wrote \.dockerignore$/m);
  assert.doesNotMatch(result.stdout, /skipped/);
  assert.notEqual(statSync(join(base, 'agent.sh')).mode & 0o111, 0);
});

test('the written agent.sh execs the kit wrapper with the project root and every other argument', (t) => {
  const { base, run } = project(t);
  assert.equal(run('init', 'claude').status, 0);
  const kitContainer = join(base, 'node_modules', '@ritenoar', 'agent-kit', 'container');
  mkdirSync(kitContainer, { recursive: true });
  writeFileSync(join(kitContainer, 'agent.sh'), '#!/usr/bin/env bash\nprintf "%s\\n" "$@"\n');
  chmodSync(join(kitContainer, 'agent.sh'), 0o755);

  const result = spawnSync(join(base, 'agent.sh'), ['--rebuild', 'echo hi'], { encoding: 'utf-8' });

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
    'agent.sh': '#!/bin/sh\necho ours\n',
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
  for (const path of ['.claude/agents/planner.md', '.claude/agents/implementer.md', 'agent/compose.project.yml']) {
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

test('a project without playwright gets everything but the compose file, and exits non-zero', (t) => {
  for (const lockfile of [JSON.stringify({ lockfileVersion: 3, packages: {} }), null]) {
    const { base, run } = project(t, { lockfile });
    const result = run('init', 'claude');
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /requires the project to depend on Playwright/);
    assert.equal(exists(join(base, 'agent', 'compose.project.yml')), false);
    for (const path of ['AGENTS.md', 'CLAUDE.md', 'agent.sh', '.dockerignore', '.claude/agents/planner.md']) {
      assert.ok(exists(join(base, path)), path);
    }
    assert.match(result.stdout, /^changed package\.json$/m);
  }
});

test('a project without playwright whose compose file exists keeps it, and still exits non-zero', (t) => {
  const { base, run, read } = project(t, { lockfile: null });
  mkdirSync(join(base, 'agent'));
  writeFileSync(join(base, 'agent', 'compose.project.yml'), 'ours\n');
  const result = run('init', 'claude');
  assert.notEqual(result.status, 0);
  assert.equal(read('agent/compose.project.yml'), 'ours\n');
  assert.match(result.stdout, /^skipped agent\/compose\.project\.yml\b/m);
  assert.match(result.stderr, /requires the project to depend on Playwright/);
  assert.ok(exists(join(base, 'AGENTS.md')));
});

test('a usage error writes nothing and exits non-zero', (t) => {
  for (const args of [[], ['init'], ['init', 'codex'], ['setup', 'claude']]) {
    const { base, run, read } = project(t);
    const result = run(...args);
    assert.notEqual(result.status, 0, args.join(' '));
    assert.match(result.stderr, /usage: agent-kit init/);
    for (const path of ['AGENTS.md', 'CLAUDE.md', 'agent.sh', '.dockerignore', '.claude', 'agent']) {
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
  const bin = join(base, 'node_modules', '.bin', 'agent-kit');
  symlinkSync(script, bin);
  const result = spawnSync(process.execPath, [bin, 'init', 'claude'], { cwd: base, encoding: 'utf-8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('CLAUDE.md'), templates['CLAUDE.md']);
});
