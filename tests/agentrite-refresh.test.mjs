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
import { settingsText } from '../scripts/agentrite-settings.mjs';
import { refreshedWrapper } from '../scripts/agentrite.mjs';

const TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const SHIM = readFileSync(new URL('../templates/project/sandbox.sh', import.meta.url), 'utf-8');

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
  const stale = withAdded(['model: some/model']).replace('mode: all', 'mode: primary');

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
const KIT_OWNED = [...WRAPPERS.map((file) => file.path), 'sandbox.sh'];
// The files init writes or amends that refresh must never touch.
const PROJECT_OWNED = {
  'AGENTS.md': '# Development Guidelines\n\nOurs.\n',
  'CLAUDE.md': '@AGENTS.md\n',
  'sandbox/compose.project.yml': 'name: my-app-sandbox\n',
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
  // Runs refresh, with no argument, on an agentrite.json that names the harnesses and the sandbox setting.
  const refresh = (harnesses, sandbox = true) => {
    write('agentrite.json', settingsText({ defaultBranch: 'master', harnesses, sandbox }));
    return run('refresh');
  };
  return { base, run, read, write, refresh };
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

// A project whose nine files are all out of date: the wrappers name the old package, one pins a model, and the
// shim is another script that is not executable.
function staleProject(t) {
  const made = project(t);
  for (const file of WRAPPERS) {
    made.write(file.path, file.content.replace('node_modules/agentrite', 'node_modules/@ritenoar/agent-kit'));
  }
  const pinnedPath = '.opencode/agents/reviewer.md';
  made.write(pinnedPath, withFrontmatter(made.read(pinnedPath), 'mode:', ['model: some/model']));
  made.write('sandbox.sh', '#!/usr/bin/env bash\nexec something-else "$@"\n');
  chmodSync(join(made.base, 'sandbox.sh'), 0o644);
  return { ...made, pinnedPath };
}

test('stale wrappers and a stale shim are refreshed, a pinned model is kept, and the run exits 0', (t) => {
  const { base, refresh, read, pinnedPath } = staleProject(t);

  const result = refresh(['claude', 'opencode']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  for (const file of WRAPPERS) {
    const expected =
      file.path === pinnedPath ? withFrontmatter(file.content, 'mode:', ['model: some/model']) : file.content;
    assert.equal(read(file.path), expected, file.path);
  }
  assert.equal(read('sandbox.sh'), SHIM);
  assert.notEqual(statSync(join(base, 'sandbox.sh')).mode & 0o111, 0);
  for (const path of KIT_OWNED) assert.match(result.stdout, line('refreshed', path));
  assert.equal(result.stdout.trimEnd().split('\n').length, KIT_OWNED.length);
});

test('a wrapper that holds mode: subagent is refreshed to mode: all, and keeps its pinned model', (t) => {
  const { refresh, read, write } = project(t);
  const wrappers = plannedFiles(['opencode']);
  const pinnedPath = '.opencode/agents/reviewer.md';
  for (const file of wrappers) {
    const earlier = file.content.replace('mode: all\n', 'mode: subagent\n');
    write(file.path, file.path === pinnedPath ? withFrontmatter(earlier, 'mode:', ['model: some/model']) : earlier);
  }

  const result = refresh(['opencode']);

  assert.equal(result.status, 0, result.stderr);
  for (const file of wrappers) {
    assert.match(result.stdout, line('refreshed', file.path));
    assert.match(read(file.path), /^mode: all$/m, file.path);
    assert.doesNotMatch(read(file.path), /subagent/, file.path);
  }
  assert.equal(read(pinnedPath), withFrontmatter(rendered('opencode', 'reviewer'), 'mode:', ['model: some/model']));
});

test('a second run reports every file as up to date and writes none', (t) => {
  const { base, refresh, read } = staleProject(t);
  assert.equal(refresh(['claude', 'opencode']).status, 0);
  const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));
  const longAgo = new Date('2020-01-01T00:00:00Z');
  for (const path of KIT_OWNED) utimesSync(join(base, path), longAgo, longAgo);

  const result = refresh(['claude', 'opencode']);

  assert.equal(result.status, 0, result.stderr);
  for (const path of KIT_OWNED) {
    assert.match(result.stdout, line('up to date', path));
    assert.equal(read(path), before[path], path);
    assert.equal(statSync(join(base, path)).mtimeMs, longAgo.getTime(), path);
  }
  assert.doesNotMatch(result.stdout, /^(wrote|refreshed) /m);
});

test('a project with none of the files gets all nine, listed as written', (t) => {
  const { base, refresh, read } = project(t);

  const result = refresh(['claude', 'opencode']);

  assert.equal(result.status, 0, result.stderr);
  for (const file of WRAPPERS) {
    assert.equal(read(file.path), file.content, file.path);
    assert.match(result.stdout, line('wrote', file.path));
  }
  assert.equal(read('sandbox.sh'), SHIM);
  assert.notEqual(statSync(join(base, 'sandbox.sh')).mode & 0o111, 0);
  assert.match(result.stdout, line('wrote', 'sandbox.sh'));
  assert.equal(result.stdout.trimEnd().split('\n').length, 9);
});

// The descriptions the planner's and the implementer's wrappers held in the release before the specifier, as that
// release wrapped them.
const EARLIER_DESCRIPTIONS = {
  planner: [
    '  Writes the documents a change unit needs in changes/, which is a spec and a plan for a feature and ' +
      'less for a bug or a',
    '  task. Use before implementing anything. Dispatch it with the unit directory, and with the request ' +
      'itself when the unit',
    '  does not exist yet.',
  ],
  implementer: [
    "  Builds an approved change unit and keeps its documents true. Use once the documents the unit's kind " +
      'requires are',
    '  approved, which for a single-commit bug or a small task may be fewer than a spec and a plan. Dispatch ' +
      'it with the unit',
    '  directory.',
  ],
};

// The wrapper of `role` as the release before the specifier wrote it. The reviewer's is what it is now.
function earlierWrapper(harness, role) {
  const now = rendered(harness, role);
  if (!Object.hasOwn(EARLIER_DESCRIPTIONS, role)) return now;
  const lines = now.split('\n');
  const start = lines.indexOf('description: >-') + 1;
  const end = lines.findIndex((line, index) => index >= start && !line.startsWith('  '));
  return [...lines.slice(0, start), ...EARLIER_DESCRIPTIONS[role], ...lines.slice(end)].join('\n');
}

test('a project with the three wrappers of the release before gets the fourth, and keeps a pinned model', (t) => {
  const { base, refresh, read, write } = project(t);
  write('sandbox.sh', SHIM);
  chmodSync(join(base, 'sandbox.sh'), 0o755);
  for (const harness of ['claude', 'opencode']) {
    for (const role of ['planner', 'implementer', 'reviewer']) {
      write(`.${harness}/agents/${role}.md`, earlierWrapper(harness, role));
    }
  }
  const pinnedPath = '.opencode/agents/planner.md';
  write(pinnedPath, withFrontmatter(read(pinnedPath), 'mode:', ['model: some/model']));

  const result = refresh(['claude', 'opencode']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(
    result.stdout,
    [
      'wrote .claude/agents/specifier.md',
      'refreshed .claude/agents/planner.md',
      'refreshed .claude/agents/implementer.md',
      'up to date .claude/agents/reviewer.md',
      'wrote .opencode/agents/specifier.md',
      'refreshed .opencode/agents/planner.md',
      'refreshed .opencode/agents/implementer.md',
      'up to date .opencode/agents/reviewer.md',
      'up to date sandbox.sh',
      '',
    ].join('\n'),
  );
  for (const file of WRAPPERS) {
    const expected =
      file.path === pinnedPath ? withFrontmatter(file.content, 'mode:', ['model: some/model']) : file.content;
    assert.equal(read(file.path), expected, file.path);
  }
});

test('a shim with the right content that is not executable is made executable', (t) => {
  const { base, refresh, write } = project(t);
  write('sandbox.sh', SHIM);
  chmodSync(join(base, 'sandbox.sh'), 0o644);

  const result = refresh(['claude']);

  assert.equal(result.status, 0, result.stderr);
  assert.notEqual(statSync(join(base, 'sandbox.sh')).mode & 0o111, 0);
  assert.match(result.stdout, line('refreshed', 'sandbox.sh'));
});

// Review C1
test('a shim only someone other than its owner may execute is made executable, and is then up to date', (t) => {
  const { base, refresh, write } = project(t);
  write('sandbox.sh', SHIM);
  chmodSync(join(base, 'sandbox.sh'), 0o645);

  const result = refresh(['claude']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, line('refreshed', 'sandbox.sh'));
  assert.equal(statSync(join(base, 'sandbox.sh')).mode & 0o777, 0o755);
  assert.match(refresh(['claude']).stdout, line('up to date', 'sandbox.sh'));
});

// Review S1
test('a pinned model in a wrapper with CRLF line endings survives the command', (t) => {
  const { refresh, read, write } = project(t);
  const path = '.opencode/agents/reviewer.md';
  const wrapper = rendered('opencode', 'reviewer');
  write(path, withFrontmatter(wrapper, 'mode:', ['model: some/model']).replaceAll('\n', '\r\n'));

  const result = refresh(['opencode']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read(path), withFrontmatter(wrapper, 'mode:', ['model: some/model']));
  assert.match(result.stdout, line('refreshed', path));
  assert.match(refresh(['opencode']).stdout, line('up to date', path));
});

// Review S4
test('a model set off from its colon by a tab survives the command, in LF and in CRLF', (t) => {
  for (const [harness, ending] of [
    ['opencode', '\n'],
    ['claude', '\r\n'],
  ]) {
    const { refresh, read, write } = project(t);
    const path = `.${harness}/agents/reviewer.md`;
    const wrapper = rendered(harness, 'reviewer');
    const pinned = wrapper.replace('\n---\n\n', '\nmodel:\tsome/model\n---\n\n');
    write(path, pinned.replace('node_modules/agentrite', 'node_modules/@ritenoar/agent-kit').replaceAll('\n', ending));

    const result = refresh([harness]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(read(path), pinned, harness);
    assert.match(result.stdout, line('refreshed', path));
    assert.match(refresh([harness]).stdout, line('up to date', path));
  }
});

test('the files that are the project own are byte for byte unchanged, and a missing one stays missing', (t) => {
  const present = staleProject(t);
  for (const [path, content] of Object.entries(PROJECT_OWNED)) present.write(path, content);
  assert.equal(present.refresh(['claude', 'opencode']).status, 0);
  for (const [path, content] of Object.entries(PROJECT_OWNED)) assert.equal(present.read(path), content, path);

  const absent = staleProject(t);
  assert.equal(absent.refresh(['claude', 'opencode']).status, 0);
  for (const path of [...Object.keys(PROJECT_OWNED), 'sandbox', 'package-lock.json']) {
    assert.equal(exists(join(absent.base, path)), false, path);
  }
});

test('only the wrappers of the harnesses given are touched', (t) => {
  const { base, refresh, read } = staleProject(t);
  const opencodeBefore = WRAPPERS.filter((file) => file.path.startsWith('.opencode/')).map((file) => [
    file.path,
    read(file.path),
  ]);

  const result = refresh(['claude']);

  assert.equal(result.status, 0, result.stderr);
  for (const [path, content] of opencodeBefore) assert.equal(read(path), content, path);
  assert.doesNotMatch(result.stdout, /\.opencode/);
  assert.equal(read('.claude/agents/planner.md'), rendered('claude', 'planner'));

  const fresh = project(t);
  assert.equal(fresh.refresh(['opencode']).status, 0);
  assert.equal(exists(join(fresh.base, '.claude')), false);
  assert.equal(exists(join(base, '.opencode', 'agents', 'planner.md')), true);
});

test('a symbolic link or a directory where a file would go is left, named, and the rest is refreshed', (t) => {
  const { base, refresh, read } = staleProject(t);
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
  rmSync(join(base, 'sandbox.sh'));
  mkdirSync(join(base, 'sandbox.sh'));

  const result = refresh(['claude', 'opencode']);

  assert.equal(result.status, 1);
  for (const path of [linked, dangling, 'sandbox.sh']) {
    assert.match(result.stderr, new RegExp(path.replaceAll('.', '\\.')));
    assert.doesNotMatch(result.stdout, new RegExp(` ${path.replaceAll('.', '\\.')}$`, 'm'));
  }
  assert.equal(readFileSync(target, 'utf-8'), 'outside the project\n');
  assert.equal(exists(join(outside, 'nowhere.md')), false);
  assert.equal(lstatSync(join(base, linked)).isSymbolicLink(), true);
  assert.equal(lstatSync(join(base, 'sandbox.sh')).isDirectory(), true);
  assert.equal(read('.claude/agents/implementer.md'), rendered('claude', 'implementer'));
  assert.equal(read('.opencode/agents/planner.md'), rendered('opencode', 'planner'));
  assert.match(result.stdout, line('refreshed', '.claude/agents/implementer.md'));
});

test('a project with no package.json and no lockfile is refreshed', (t) => {
  const { base, refresh, read } = staleProject(t);
  assert.equal(exists(join(base, 'package.json')), false);
  assert.equal(exists(join(base, 'package-lock.json')), false);

  const result = refresh(['claude', 'opencode']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('sandbox.sh'), SHIM);
});

const REFRESH_USAGE =
  'usage: agentrite refresh\nThe harnesses and the sandbox setting are read from agentrite.json\n';

// R21
test('every argument refresh took before prints its usage and where the settings are, writes nothing, exits 2', (t) => {
  for (const args of [['claude'], ['claude', 'opencode'], ['--no-sandbox'], ['--no-sandbox', 'claude'], ['codex']]) {
    for (const withFile of [true, false]) {
      const { base, run, read, write } = staleProject(t);
      if (withFile) write('agentrite.json', TEMPLATE);
      const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

      const result = run('refresh', ...args);

      assert.equal(result.status, 2, args.join(' '));
      assert.equal(result.stdout, '');
      assert.equal(result.stderr, REFRESH_USAGE);
      for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
      assert.equal(exists(join(base, 'agentrite.json')), withFile);
      if (withFile) assert.equal(read('agentrite.json'), TEMPLATE);
    }
  }
});

// R6
test('refresh in a project with no agentrite.json names the command that writes one, and writes nothing', (t) => {
  const { base, run, read } = staleProject(t);
  const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

  const result = run('refresh');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    'agentrite: the project has no agentrite.json. Run: npx agentrite config, which writes one\n',
  );
  for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
  assert.equal(exists(join(base, 'agentrite.json')), false);
});

// R5
test('refresh refuses a file that is not valid in a key it does not use, and writes nothing', (t) => {
  const { run, read, write } = staleProject(t);
  const invalid = '{ "defaultBranch": 5, "harnesses": ["claude"], "sandbox": true }\n';
  write('agentrite.json', invalid);
  const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

  const result = run('refresh');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^agentrite: agentrite\.json: defaultBranch is 5\. It must hold /);
  for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
  assert.equal(read('agentrite.json'), invalid);
});

// R20, R22
test('refresh does for each value of the two settings what it did for the arguments, and leaves the file', (t) => {
  for (const harnesses of [['claude'], ['opencode'], ['claude', 'opencode'], ['opencode', 'claude']]) {
    for (const sandbox of [true, false]) {
      const { base, refresh, read } = project(t);
      const text = settingsText({ defaultBranch: 'master', harnesses, sandbox });

      const result = refresh(harnesses, sandbox);

      assert.equal(result.status, 0, result.stderr);
      const expected = plannedFiles(harnesses).map((file) => `wrote ${file.path}`);
      if (sandbox) expected.push('wrote sandbox.sh');
      assert.deepEqual(result.stdout.trimEnd().split('\n'), expected);
      assert.equal(exists(join(base, 'sandbox.sh')), sandbox);
      for (const harness of ['claude', 'opencode']) {
        assert.equal(exists(join(base, `.${harness}`)), harnesses.includes(harness), harness);
      }
      assert.equal(read('agentrite.json'), text);
    }
  }
});

// R41, R42: this repository's own file and its own nine files.
test('the repository own agentrite.json, wrappers and sandbox.sh are up to date, and refresh changes none', (t) => {
  const { base, run, read, write } = project(t);
  const root = join(import.meta.dirname, '..');
  const copied = [...KIT_OWNED, 'agentrite.json'];
  for (const path of copied) write(path, readFileSync(join(root, path), 'utf-8'));
  chmodSync(join(base, 'sandbox.sh'), statSync(join(root, 'sandbox.sh')).mode & 0o777);
  const longAgo = new Date('2020-01-01T00:00:00Z');
  for (const path of copied) utimesSync(join(base, path), longAgo, longAgo);

  const result = run('refresh');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, KIT_OWNED.map((path) => `up to date ${path}\n`).join(''));
  for (const path of copied) {
    assert.equal(read(path), readFileSync(join(root, path), 'utf-8'), path);
    assert.equal(statSync(join(base, path)).mtimeMs, longAgo.getTime(), path);
  }
});

test('refresh runs through a node_modules bin symlink the way npx does', (t) => {
  const { base, read, write } = staleProject(t);
  mkdirSync(join(base, 'node_modules', '.bin'), { recursive: true });
  const bin = join(base, 'node_modules', '.bin', 'agentrite');
  symlinkSync(script, bin);

  write('agentrite.json', settingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: true }));

  const result = spawnSync(process.execPath, [bin, 'refresh'], { cwd: base, encoding: 'utf-8' });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(read('.claude/agents/planner.md'), rendered('claude', 'planner'));
});

// sandbox false, which --no-sandbox was

const WRAPPER_PATHS = WRAPPERS.map((file) => file.path);

test('refresh with sandbox false refreshes the wrappers, keeps a pinned model and says nothing of sandbox.sh', (t) => {
  const { refresh, read, pinnedPath } = staleProject(t);
  const shimBefore = read('sandbox.sh');

  const result = refresh(['claude', 'opencode'], false);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  for (const file of WRAPPERS) {
    const expected =
      file.path === pinnedPath ? withFrontmatter(file.content, 'mode:', ['model: some/model']) : file.content;
    assert.equal(read(file.path), expected, file.path);
    assert.match(result.stdout, line('refreshed', file.path));
  }
  assert.equal(result.stdout.trimEnd().split('\n').length, WRAPPER_PATHS.length);
  assert.doesNotMatch(result.stdout, /sandbox\.sh/);
  assert.equal(read('sandbox.sh'), shimBefore);
});

test('refresh with sandbox false leaves a missing sandbox.sh missing, and refresh without it writes one', (t) => {
  const { base, refresh } = project(t);

  const without = refresh(['claude'], false);
  assert.equal(without.status, 0, without.stderr);
  assert.equal(exists(join(base, 'sandbox.sh')), false);
  assert.doesNotMatch(without.stdout, /sandbox\.sh/);

  const result = refresh(['claude']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, line('wrote', 'sandbox.sh'));
  assert.equal(readFileSync(join(base, 'sandbox.sh'), 'utf-8'), SHIM);
});

test('refresh with sandbox false does not look at what is at the path of sandbox.sh', (t) => {
  const plain = project(t);
  const expected = plain.refresh(['claude'], false);

  const link = project(t);
  symlinkSync('/no/such/target', join(link.base, 'sandbox.sh'));
  const directory = project(t);
  mkdirSync(join(directory.base, 'sandbox.sh'));

  for (const made of [link, directory]) {
    const result = made.refresh(['claude'], false);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
    assert.equal(result.stdout, expected.stdout);
  }
  assert.equal(lstatSync(join(link.base, 'sandbox.sh')).isSymbolicLink(), true);
  assert.equal(lstatSync(join(directory.base, 'sandbox.sh')).isDirectory(), true);

  const without = link.refresh(['claude']);
  assert.equal(without.status, 1);
  assert.match(without.stderr, /left sandbox\.sh, which is not a regular file/);
});

// R5: an `agent.sh` that a project holds is not read, changed or mentioned.

const OLD_SHIM = '#!/bin/sh\necho old\n';

function withOldShim(t, make) {
  const made = project(t);
  make(join(made.base, 'agent.sh'));
  return made;
}

function assertNothingSaid(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout + result.stderr, /agent\.sh/);
}

test('refresh writes the missing sandbox.sh beside an agent.sh, and leaves the agent.sh as it is', (t) => {
  const { base, refresh } = withOldShim(t, (path) => {
    writeFileSync(path, OLD_SHIM);
    chmodSync(path, 0o750);
  });

  const result = refresh(['claude']);

  assertNothingSaid(result);
  assert.match(result.stdout, /^wrote sandbox\.sh$/m);
  assert.equal(readFileSync(join(base, 'agent.sh'), 'utf-8'), OLD_SHIM);
  assert.equal(statSync(join(base, 'agent.sh')).mode & 0o777, 0o750);
});

test('refresh leaves an agent.sh that is a directory, or a dangling link, and exits 0', (t) => {
  for (const make of [(path) => mkdirSync(path), (path) => symlinkSync('no-such-target', path)]) {
    const { refresh } = withOldShim(t, make);
    assertNothingSaid(refresh(['claude']));
  }
});

test('refresh with sandbox false writes no sandbox.sh and says nothing of an agent.sh', (t) => {
  const { base, refresh } = withOldShim(t, (path) => writeFileSync(path, OLD_SHIM));

  const result = refresh(['claude'], false);

  assertNothingSaid(result);
  assert.doesNotMatch(result.stdout, /sandbox\.sh/);
  assert.equal(lstatSync(join(base, 'agent.sh')).isFile(), true);
  assert.throws(() => lstatSync(join(base, 'sandbox.sh')));
});
