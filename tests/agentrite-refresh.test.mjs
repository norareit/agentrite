import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { plannedFiles } from '../scripts/agentrite-roles.mjs';
import { refreshedWrapper } from '../scripts/agentrite.mjs';

const SHIM = readFileSync(new URL('../templates/project/agent.sh', import.meta.url), 'utf-8');

function rendered(harness, role) {
  const directory = harness === 'claude' ? '.claude/agents' : '.opencode/agents';
  return plannedFiles([harness]).find((file) => file.path === `${directory}/${role}.md`).content;
}

// `wrapper` with `lines` added to its frontmatter, straight after the line that starts with `after`.
function withFrontmatter(wrapper, after, lines) {
  const all = wrapper.split('\n');
  const at = all.findIndex((line) => line.startsWith(after));
  assert.notEqual(at, -1, `the wrapper has no line starting with ${after}`);
  return [...all.slice(0, at + 1), ...lines, ...all.slice(at + 1)].join('\n');
}

// The lines of a wrapper's frontmatter, between its two `---` lines.
function frontmatter(wrapper) {
  const lines = wrapper.split('\n');
  return lines.slice(1, lines.indexOf('---', 1));
}

// The OpenCode reviewer wrapper with `lines` added at the end of its frontmatter.
function withAdded(lines) {
  return withFrontmatter(rendered('opencode', 'reviewer'), 'mode:', lines);
}

// R4, R5: a refreshed wrapper keeps the pinned model and is otherwise what the release writes.

test('a wrapper that is what the release writes comes back unchanged', () => {
  for (const harness of ['claude', 'opencode']) {
    const wrapper = rendered(harness, 'planner');
    assert.equal(refreshedWrapper(wrapper, wrapper), wrapper);
  }
});

test('a pinned model is kept, after the keys the kit writes, wherever it stood', () => {
  for (const [harness, before] of [
    ['claude', '---'],
    ['claude', 'name:'],
    ['opencode', '---'],
    ['opencode', 'mode:'],
  ]) {
    const wrapper = rendered(harness, 'reviewer');
    const pinned = withFrontmatter(wrapper, before, ['model: some/model']);

    const result = refreshedWrapper(pinned, wrapper);

    assert.deepEqual(frontmatter(result), [...frontmatter(wrapper), 'model: some/model'], `${harness} ${before}`);
    assert.equal(result.slice(result.lastIndexOf('---\n')), wrapper.slice(wrapper.lastIndexOf('---\n')));
  }
});

test('the model line is kept as it is written, whatever its value', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const lines = ['model: "some/model"', "model:   'a b'  # cheaper", 'model: [not, a, name]', 'model:'];
  // Review S4: what follows the colon is not looked at, a tab and no space at all included.
  for (const line of [...lines, 'model:\tsome/model', 'model:some/model']) {
    const result = refreshedWrapper(withAdded([line]), wrapper);

    assert.deepEqual(frontmatter(result), [...frontmatter(wrapper), line]);
    assert.equal(refreshedWrapper(result, wrapper), result);
  }
});

test('several model lines are kept in their order', () => {
  const wrapper = rendered('claude', 'planner');
  const edited = withFrontmatter(withFrontmatter(wrapper, 'name:', ['model: first']), '---', ['model: second']);

  assert.deepEqual(frontmatter(refreshedWrapper(edited, wrapper)), [
    ...frontmatter(wrapper),
    'model: second',
    'model: first',
  ]);
});

test('nothing else a project added to the frontmatter is kept', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const added = ['# cheaper for reviews', 'model: some/model', 'temperature: 0.1', 'permission:', '  edit: deny'];

  assert.equal(refreshedWrapper(withAdded(added), wrapper), withAdded(['model: some/model']));
});

test('a line that only looks like a pin is not taken for one', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const lookalikes = ['models: a/b', 'model : a/b', 'Model: a/b', '"model": a/b', 'options:', '  model: a/b'];
  assert.equal(refreshedWrapper(withAdded(lookalikes), wrapper), wrapper);

  const inTheBody = `${wrapper}\nmodel: a/b\n`;
  assert.equal(refreshedWrapper(inTheBody, wrapper), wrapper);
});

test("the keys the kit writes and the body are the release's, whatever the wrapper held", () => {
  const claude = rendered('claude', 'implementer');
  const stale = [
    '---',
    'name: builder',
    'description: An older description, on one line.',
    'model: some/model',
    '---',
    '',
    'An older body.',
    '',
    'And a paragraph the project added.',
    '',
  ].join('\n');

  assert.equal(refreshedWrapper(stale, claude), claude.replace('\n---\n\n', '\nmodel: some/model\n---\n\n'));
});

test('a file with no frontmatter, or with one that is never closed, becomes the wrapper the release writes', () => {
  const wrapper = rendered('opencode', 'planner');
  for (const existing of ['', 'Read the planner role.\n', 'model: some/model\n---\n', '---\nmodel: some/model\n']) {
    assert.equal(refreshedWrapper(existing, wrapper), wrapper);
  }
});

// Review S1

test('a wrapper with CRLF line endings keeps its model, and is written with LF', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const stale = withAdded(['model: some/model']).replace('mode: subagent', 'mode: primary');

  const result = refreshedWrapper(stale.replaceAll('\n', '\r\n'), wrapper);

  assert.doesNotMatch(result, /\r/);
  assert.equal(result, withAdded(['model: some/model']));
});

test('refreshing what a refresh returned changes nothing', () => {
  for (const harness of ['claude', 'opencode']) {
    const wrapper = rendered(harness, 'reviewer');
    const once = refreshedWrapper(withFrontmatter(wrapper, '---', ['model: a/b', 'steps: 5']), wrapper);

    assert.equal(refreshedWrapper(once, wrapper), once);
  }
});

// End to end: the executable in a temporary project.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const WRAPPERS = plannedFiles(['claude', 'opencode']);
const KIT_OWNED = [...WRAPPERS.map((file) => file.path), 'agent.sh'];
// The files init writes or amends that refresh must never touch.
const PROJECT_OWNED = {
  'AGENTS.md': '# Development Guidelines\n\nOurs.\n',
  'CLAUDE.md': '@AGENTS.md\n',
  'agent/compose.project.yml': 'name: my-app-agent\n',
  'package.json': '{\n  "name": "my-app"\n}\n',
  '.dockerignore': 'node_modules\n',
};

function project(t) {
  const base = mkdtempSync(join(tmpdir(), 'agentrite-refresh-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: base, encoding: 'utf-8' });
  const read = (path) => readFileSync(join(base, path), 'utf-8');
  const write = (path, content) => {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  };
  return { base, run, read, write };
}

function exists(path) {
  try {
    lstatSync(path);
    return true;
  } catch {
    return false;
  }
}

function line(word, path) {
  return new RegExp(`^${word} ${path.replaceAll('.', '\\.')}`, 'm');
}

// A project whose seven files are all out of date: the wrappers name the old package, one pins a model, and the
// shim is another script that is not executable.
function staleProject(t) {
  const made = project(t);
  for (const file of WRAPPERS) {
    made.write(file.path, file.content.replace('@ritenoar/agentrite', '@ritenoar/agent-kit'));
  }
  const pinnedPath = '.opencode/agents/reviewer.md';
  made.write(pinnedPath, withFrontmatter(made.read(pinnedPath), 'mode:', ['model: some/model']));
  made.write('agent.sh', '#!/usr/bin/env bash\nexec something-else "$@"\n');
  chmodSync(join(made.base, 'agent.sh'), 0o644);
  return { ...made, pinnedPath };
}

test('stale wrappers and a stale shim are refreshed, a pinned model is kept, and the run exits 0', (t) => {
  const { base, run, read, pinnedPath } = staleProject(t);

  const result = run('refresh', 'claude', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  for (const file of WRAPPERS) {
    const expected =
      file.path === pinnedPath ? withFrontmatter(file.content, 'mode:', ['model: some/model']) : file.content;
    assert.equal(read(file.path), expected, file.path);
  }
  assert.equal(read('agent.sh'), SHIM);
  assert.notEqual(statSync(join(base, 'agent.sh')).mode & 0o111, 0);
  for (const path of KIT_OWNED) assert.match(result.stdout, line('refreshed', path));
  assert.equal(result.stdout.trimEnd().split('\n').length, KIT_OWNED.length);
});

test('a second run reports every file as up to date and writes none', (t) => {
  const { base, run, read } = staleProject(t);
  assert.equal(run('refresh', 'claude', 'opencode').status, 0);
  const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));
  const longAgo = new Date('2020-01-01T00:00:00Z');
  for (const path of KIT_OWNED) utimesSync(join(base, path), longAgo, longAgo);

  const result = run('refresh', 'claude', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  for (const path of KIT_OWNED) {
    assert.match(result.stdout, line('up to date', path));
    assert.equal(read(path), before[path], path);
    assert.equal(statSync(join(base, path)).mtimeMs, longAgo.getTime(), path);
  }
  assert.doesNotMatch(result.stdout, /^(wrote|refreshed) /m);
});

test('a project with none of the files gets all seven, listed as written', (t) => {
  const { base, run, read } = project(t);

  const result = run('refresh', 'claude', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  for (const file of WRAPPERS) {
    assert.equal(read(file.path), file.content, file.path);
    assert.match(result.stdout, line('wrote', file.path));
  }
  assert.equal(read('agent.sh'), SHIM);
  assert.notEqual(statSync(join(base, 'agent.sh')).mode & 0o111, 0);
  assert.match(result.stdout, line('wrote', 'agent.sh'));
});

test('a shim with the right content that is not executable is made executable', (t) => {
  const { base, run, write } = project(t);
  write('agent.sh', SHIM);
  chmodSync(join(base, 'agent.sh'), 0o644);

  const result = run('refresh', 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(statSync(join(base, 'agent.sh')).mode & 0o111, 0);
  assert.match(result.stdout, line('refreshed', 'agent.sh'));
});

// Review C1
test('a shim only someone other than its owner may execute is made executable, and is then up to date', (t) => {
  const { base, run, write } = project(t);
  write('agent.sh', SHIM);
  chmodSync(join(base, 'agent.sh'), 0o645);

  const result = run('refresh', 'claude');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, line('refreshed', 'agent.sh'));
  assert.equal(statSync(join(base, 'agent.sh')).mode & 0o777, 0o755);
  assert.match(run('refresh', 'claude').stdout, line('up to date', 'agent.sh'));
});

// Review S1
test('a pinned model in a wrapper with CRLF line endings survives the command', (t) => {
  const { run, read, write } = project(t);
  const path = '.opencode/agents/reviewer.md';
  const wrapper = rendered('opencode', 'reviewer');
  write(path, withFrontmatter(wrapper, 'mode:', ['model: some/model']).replaceAll('\n', '\r\n'));

  const result = run('refresh', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(path), withFrontmatter(wrapper, 'mode:', ['model: some/model']));
  assert.match(result.stdout, line('refreshed', path));
  assert.match(run('refresh', 'opencode').stdout, line('up to date', path));
});

// Review S4
test('a model set off from its colon by a tab survives the command, in LF and in CRLF', (t) => {
  for (const [harness, ending] of [
    ['opencode', '\n'],
    ['claude', '\r\n'],
  ]) {
    const { run, read, write } = project(t);
    const path = `.${harness}/agents/reviewer.md`;
    const wrapper = rendered(harness, 'reviewer');
    const pinned = wrapper.replace('\n---\n\n', '\nmodel:\tsome/model\n---\n\n');
    write(path, pinned.replace('@ritenoar/agentrite', '@ritenoar/agent-kit').replaceAll('\n', ending));

    const result = run('refresh', harness);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(read(path), pinned, harness);
    assert.match(result.stdout, line('refreshed', path));
    assert.match(run('refresh', harness).stdout, line('up to date', path));
  }
});

test('the files that are the project own are byte for byte unchanged, and a missing one stays missing', (t) => {
  const present = staleProject(t);
  for (const [path, content] of Object.entries(PROJECT_OWNED)) present.write(path, content);
  assert.equal(present.run('refresh', 'claude', 'opencode').status, 0);
  for (const [path, content] of Object.entries(PROJECT_OWNED)) assert.equal(present.read(path), content, path);

  const absent = staleProject(t);
  assert.equal(absent.run('refresh', 'claude', 'opencode').status, 0);
  for (const path of [...Object.keys(PROJECT_OWNED), 'agent', 'package-lock.json']) {
    assert.equal(exists(join(absent.base, path)), false, path);
  }
});

test('only the wrappers of the harnesses given are touched', (t) => {
  const { base, run, read } = staleProject(t);
  const opencodeBefore = WRAPPERS.filter((file) => file.path.startsWith('.opencode/')).map((file) => [
    file.path,
    read(file.path),
  ]);

  const result = run('refresh', 'claude');

  assert.equal(result.status, 0, result.stderr);
  for (const [path, content] of opencodeBefore) assert.equal(read(path), content, path);
  assert.doesNotMatch(result.stdout, /\.opencode/);
  assert.equal(read('.claude/agents/planner.md'), rendered('claude', 'planner'));

  const fresh = project(t);
  assert.equal(fresh.run('refresh', 'opencode').status, 0);
  assert.equal(exists(join(fresh.base, '.claude')), false);
  assert.equal(exists(join(base, '.opencode', 'agents', 'planner.md')), true);
});

test('a symbolic link or a directory where a file would go is left, named, and the rest is refreshed', (t) => {
  const { base, run, read } = staleProject(t);
  const outside = mkdtempSync(join(tmpdir(), 'agentrite-refresh-outside-'));
  t.after(() => rmSync(outside, { recursive: true, force: true }));
  const target = join(outside, 'target.md');
  writeFileSync(target, 'outside the project\n');
  const linked = '.claude/agents/planner.md';
  rmSync(join(base, linked));
  symlinkSync(target, join(base, linked));
  const dangling = '.claude/agents/reviewer.md';
  rmSync(join(base, dangling));
  symlinkSync(join(outside, 'nowhere.md'), join(base, dangling));
  rmSync(join(base, 'agent.sh'));
  mkdirSync(join(base, 'agent.sh'));

  const result = run('refresh', 'claude', 'opencode');

  assert.equal(result.status, 1);
  for (const path of [linked, dangling, 'agent.sh']) {
    assert.match(result.stderr, new RegExp(path.replaceAll('.', '\\.')));
    assert.doesNotMatch(result.stdout, new RegExp(` ${path.replaceAll('.', '\\.')}$`, 'm'));
  }
  assert.equal(readFileSync(target, 'utf-8'), 'outside the project\n');
  assert.equal(exists(join(outside, 'nowhere.md')), false);
  assert.equal(lstatSync(join(base, linked)).isSymbolicLink(), true);
  assert.equal(lstatSync(join(base, 'agent.sh')).isDirectory(), true);
  assert.equal(read('.claude/agents/implementer.md'), rendered('claude', 'implementer'));
  assert.equal(read('.opencode/agents/planner.md'), rendered('opencode', 'planner'));
  assert.match(result.stdout, line('refreshed', '.claude/agents/implementer.md'));
});

test('a project with no package.json and no lockfile is refreshed', (t) => {
  const { base, run, read } = staleProject(t);
  assert.equal(exists(join(base, 'package.json')), false);
  assert.equal(exists(join(base, 'package-lock.json')), false);

  const result = run('refresh', 'claude', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('agent.sh'), SHIM);
});

test('no harness and an unknown one print the usage of refresh, write nothing and exit 2', (t) => {
  for (const args of [['refresh'], ['refresh', 'codex']]) {
    const { base, run, read } = staleProject(t);
    const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

    const result = run(...args);

    assert.equal(result.status, 2, args.join(' '));
    assert.match(result.stderr, /^usage: agentrite refresh claude \| opencode$/m);
    assert.doesNotMatch(result.stderr, /agentrite init/);
    for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
    assert.equal(exists(join(base, 'AGENTS.md')), false);
  }
});

test('refresh runs through a node_modules bin symlink the way npx does', (t) => {
  const { base, read } = staleProject(t);
  mkdirSync(join(base, 'node_modules', '.bin'), { recursive: true });
  const bin = join(base, 'node_modules', '.bin', 'agentrite');
  symlinkSync(script, bin);

  const result = spawnSync(process.execPath, [bin, 'refresh', 'claude'], { cwd: base, encoding: 'utf-8' });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('.claude/agents/planner.md'), rendered('claude', 'planner'));
});
