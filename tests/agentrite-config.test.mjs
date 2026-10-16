import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { lstatSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { plannedFiles } from '../scripts/agentrite-roles.mjs';
import { CONFIG_NOTICE } from '../scripts/agentrite.mjs';
import { installKit, KIT_ROLES } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');

// An empty directory, which has no package.json.
function directory(t) {
  const base = temporaryDirectory(t, 'agentrite-config-');
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: base, encoding: 'utf-8' });
  return { base, run };
}

// R16
test('config with an argument prints its usage, writes nothing and exits 2', (t) => {
  for (const args of [['claude'], ['--no-sandbox'], ['--default-branch', 'main'], ['']]) {
    const { base, run } = directory(t);

    const result = run('config', ...args);

    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, 'usage: agentrite config\n');
    assert.deepEqual(readdirSync(base), []);
  }
});

// R17, R18
test('config writes the default file in a directory with no package.json, and prints it with its notice', (t) => {
  const { base, run } = directory(t);

  const result = run('config');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.deepEqual(readdirSync(base), ['agentrite.json']);
  assert.equal(readFileSync(join(base, 'agentrite.json'), 'utf-8'), TEMPLATE);
  assert.equal(result.stdout, `wrote agentrite.json\n\n${TEMPLATE}\n${CONFIG_NOTICE}`);
});

// R18
test('the notice of config says the four things, in lines of at most 120 characters', () => {
  const notice = CONFIG_NOTICE.replaceAll('\n', ' ');
  assert.match(notice, /These are the kit's defaults, and nothing of the project was looked at to find them/);
  assert.match(notice, /Check each against the project/);
  assert.match(notice, /edit agentrite\.json by hand where one is wrong/);
  assert.match(notice, /commit the file/);
  assert.ok(CONFIG_NOTICE.endsWith('\n'));
  for (const line of CONFIG_NOTICE.split('\n')) assert.ok(line.length <= 120, line);
});

// R19
test('config leaves what is at the path of agentrite.json, whatever it is, and prints one line', (t) => {
  const makers = [
    (path) => writeFileSync(path, '{\n  "defaultBranch": "main",\n  "harnesses": ["claude"],\n  "sandbox": false\n}\n'),
    (path) => writeFileSync(path, 'not json'),
    (path) => mkdirSync(path),
  ];
  for (const make of makers) {
    const { base, run } = directory(t);
    const path = join(base, 'agentrite.json');
    make(path);
    const before = lstatSync(path).isFile() ? readFileSync(path, 'utf-8') : undefined;

    const result = run('config');

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, 'skipped agentrite.json, which exists\n');
    if (before === undefined) assert.deepEqual(readdirSync(path), []);
    else assert.equal(readFileSync(path, 'utf-8'), before);
  }
});

// R46, and the list of unit 0054
test('refresh runs on the file config wrote, and writes the eight wrappers, the list and sandbox.sh', (t) => {
  const { base, run } = directory(t);
  installKit(base);
  assert.equal(run('config').status, 0);

  const result = run('refresh');

  assert.equal(result.status, 0, result.stderr);
  const wrappers = plannedFiles(['claude', 'opencode'], KIT_ROLES).map((file) => file.path);
  const paths = [...wrappers, '.agentrite/instructions.md', 'sandbox.sh'];
  assert.equal(paths.length, 10);
  // The lines before the first empty line: the notices of CLAUDE.md, opencode.json and AGENTS.md, which the
  // directory lacks, follow it.
  assert.deepEqual(result.stdout.split('\n\n')[0].split('\n'), paths.map((path) => `wrote ${path}`));
  assert.equal(readFileSync(join(base, 'agentrite.json'), 'utf-8'), TEMPLATE);
});
