import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  utimesSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  agentsListNotice,
  claudeKitStandardsNotice,
  claudeRefreshNotice,
  instructionsList,
  opencodeKitStandardsNotice,
  opencodeRefreshNotice,
} from '../scripts/agentrite-instructions.mjs';
import { plannedFiles } from '../scripts/agentrite-roles.mjs';
import { refreshedWrapper } from '../scripts/agentrite.mjs';
import { installKit, KIT_ROLES, KIT_SETTINGS, kitSettingsText } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const TEMPLATE = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const SHIM = readFileSync(new URL('../templates/project/sandbox.sh', import.meta.url), 'utf-8');

function rendered(harness, role) {
  const directory = harness === 'claude' ? '.claude/agents' : '.opencode/agents';
  return plannedFiles([harness], KIT_ROLES).find((file) => file.path === `${directory}/${role}.md`).content;
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
const WRAPPERS = plannedFiles(['claude', 'opencode'], KIT_ROLES);
const LIST = '.agentrite/instructions.md';
const KIT_OWNED = [...WRAPPERS.map((file) => file.path), LIST, 'sandbox.sh'];
// An AGENTS.md that names the list, of which refresh says nothing.
const AGENTS_NAMING_LIST = `# Development Guidelines\n\nRead the files ${LIST} names.\n`;
// The files init writes or amends that refresh must never touch.
const PROJECT_OWNED = {
  'AGENTS.md': AGENTS_NAMING_LIST,
  'CLAUDE.md': '@AGENTS.md\n',
  'sandbox/compose.project.yml': 'name: my-app-sandbox\n',
  'package.json': '{\n  "name": "my-app"\n}\n',
  '.dockerignore': 'node_modules\n',
  'opencode.json': '{}\n',
};

function project(t) {
  const base = temporaryDirectory(t, 'agentrite-refresh-');
  installKit(base);
  writeFileSync(join(base, 'AGENTS.md'), AGENTS_NAMING_LIST);
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: base, encoding: 'utf-8' });
  const read = (path) => readFileSync(join(base, path), 'utf-8');
  const write = (path, content) => {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  };
  // Runs refresh, with no argument, on an agentrite.json that names the harnesses and the sandbox setting.
  const refresh = (harnesses, sandbox = true) => {
    write('agentrite.json', kitSettingsText({ defaultBranch: 'master', harnesses, sandbox }));
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

// The lines refresh prints for the files, without the notices, which follow an empty line.
function linesOf(result) {
  return result.stdout.split('\n\n')[0].trimEnd().split('\n');
}

// The notices refresh prints after the lines, each after an empty line.
function noticesOf(result) {
  return result.stdout.split('\n\n').slice(1).join('\n\n');
}

// A project whose ten files are all out of date: the wrappers name the old package, one pins a model, the shim is
// another script that is not executable, and the list is another text.
function staleProject(t) {
  const made = project(t);
  for (const file of WRAPPERS) {
    made.write(file.path, file.content.replace('node_modules/agentrite', 'node_modules/@ritenoar/agent-kit'));
  }
  const pinnedPath = '.opencode/agents/reviewer.md';
  made.write(pinnedPath, withFrontmatter(made.read(pinnedPath), 'mode:', ['model: some/model']));
  made.write('sandbox.sh', '#!/usr/bin/env bash\nexec something-else "$@"\n');
  chmodSync(join(made.base, 'sandbox.sh'), 0o644);
  made.write(LIST, '# An old list\n');
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
  assert.equal(linesOf(result).length, KIT_OWNED.length);
});

test('a wrapper that holds mode: subagent is refreshed to mode: all, and keeps its pinned model', (t) => {
  const { refresh, read, write } = project(t);
  const wrappers = plannedFiles(['opencode'], KIT_ROLES);
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

test('a project with none of the files gets all ten, listed as written', (t) => {
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
  assert.equal(read(LIST), instructionsList(KIT_SETTINGS));
  assert.deepEqual(linesOf(result), KIT_OWNED.map((path) => `wrote ${path}`));
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
  assert.deepEqual(linesOf(result), [
    'wrote .claude/agents/specifier.md',
    'refreshed .claude/agents/planner.md',
    'refreshed .claude/agents/implementer.md',
    'up to date .claude/agents/reviewer.md',
    'wrote .opencode/agents/specifier.md',
    'refreshed .opencode/agents/planner.md',
    'refreshed .opencode/agents/implementer.md',
    'up to date .opencode/agents/reviewer.md',
    `wrote ${LIST}`,
    'up to date sandbox.sh',
  ]);
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
  rmSync(join(absent.base, 'AGENTS.md'));
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
  const outside = temporaryDirectory(t, 'agentrite-refresh-outside-');
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
      const text = kitSettingsText({ defaultBranch: 'master', harnesses, sandbox });

      const result = refresh(harnesses, sandbox);

      assert.equal(result.status, 0, result.stderr);
      const expected = plannedFiles(harnesses, KIT_ROLES).map((file) => `wrote ${file.path}`);
      expected.push(`wrote ${LIST}`);
      if (sandbox) expected.push('wrote sandbox.sh');
      assert.deepEqual(linesOf(result), expected);
      assert.equal(exists(join(base, 'sandbox.sh')), sandbox);
      for (const harness of ['claude', 'opencode']) {
        assert.equal(exists(join(base, `.${harness}`)), harnesses.includes(harness), harness);
      }
      assert.equal(read('agentrite.json'), text);
    }
  }
});

test('refresh runs through a node_modules bin symlink the way npx does', (t) => {
  const { base, read, write } = staleProject(t);
  mkdirSync(join(base, 'node_modules', '.bin'), { recursive: true });
  const bin = join(base, 'node_modules', '.bin', 'agentrite');
  symlinkSync(script, bin);

  write('agentrite.json', kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: true }));

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
  assert.deepEqual(linesOf(result), [...WRAPPER_PATHS, LIST].map((path) => `refreshed ${path}`));
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

// R9, R10 of unit 0048, R18 of unit 0052: refresh reads CLAUDE.md and opencode.json, notices one that does not load
// the kit's instructions, and writes neither.

const PROCESS = 'node_modules/agentrite/process.md';
const STANDARDS = 'node_modules/agentrite/standards.md';
const IMPORT = `@${PROCESS}`;
const STANDARDS_IMPORT = `@${STANDARDS}`;
const LINES = [IMPORT, STANDARDS_IMPORT, '@AGENTS.md'];
const CLAUDE_LOADS = `# Ours\n\n${IMPORT}\n${STANDARDS_IMPORT}\n@AGENTS.md\n`;
const OPENCODE_LOADS = `{\n  "instructions": [\n    "${PROCESS}",\n    "${STANDARDS}"\n  ]\n}\n`;

// Puts `text` at `path` in the project: nothing for undefined, a directory for null, and a file otherwise.
function place(made, path, text) {
  if (text === null) mkdirSync(join(made.base, path));
  else if (text !== undefined) made.write(path, text);
}

// What is at `path` in the project, in the terms `place` takes.
function placed(made, path) {
  if (!exists(join(made.base, path))) return undefined;
  if (lstatSync(join(made.base, path)).isDirectory()) return null;
  return made.read(path);
}

// Runs refresh in a project whose files are up to date, with `claude` and `opencode` at the paths of the two files,
// and checks that it wrote neither and printed for the files what a project whose two files load the kit's
// instructions gets.
function refreshWith(t, harnesses, { claude, opencode }) {
  const loading = project(t);
  loading.write('CLAUDE.md', CLAUDE_LOADS);
  loading.write('opencode.json', OPENCODE_LOADS);
  const expected = loading.refresh(harnesses);
  assert.equal(noticesOf(expected), '');

  const made = project(t);
  place(made, 'CLAUDE.md', claude);
  place(made, 'opencode.json', opencode);
  const result = made.refresh(harnesses);

  assert.equal(result.status, expected.status, result.stderr);
  assert.deepEqual(linesOf(result), linesOf(expected));
  assert.equal(placed(made, 'CLAUDE.md'), claude);
  assert.equal(placed(made, 'opencode.json'), opencode);
  return result;
}

test('refresh with claude notices a CLAUDE.md that is missing or lacks a line, after the lines of the files', (t) => {
  const cases = [
    [undefined, claudeRefreshNotice(true, LINES)],
    [`${STANDARDS_IMPORT}\n@AGENTS.md\n`, claudeRefreshNotice(false, [IMPORT])],
    ['@AGENTS.md\n', claudeRefreshNotice(false, [IMPORT, STANDARDS_IMPORT])],
    // The CLAUDE.md of the last release, which loads process.md alone.
    [`# Ours\n\n${IMPORT}\n@AGENTS.md\n`, claudeRefreshNotice(false, [STANDARDS_IMPORT])],
    ['our own\n', claudeRefreshNotice(false, LINES)],
  ];
  for (const [claude, notice] of cases) {
    const result = refreshWith(t, ['claude'], { claude });
    assert.equal(noticesOf(result), `${notice}\n`, JSON.stringify(claude));
    assert.ok(result.stdout.endsWith(`\n\n${notice}\n`), result.stdout);
  }
});

test('refresh with claude prints nothing of a CLAUDE.md that holds the three lines, in LF or in CRLF', (t) => {
  for (const claude of [CLAUDE_LOADS, CLAUDE_LOADS.replaceAll('\n', '\r\n')]) {
    const result = refreshWith(t, ['claude'], { claude });
    assert.equal(noticesOf(result), '');
    assert.doesNotMatch(result.stdout, /CLAUDE\.md/);
  }
});

test('refresh with opencode notices an opencode.json that does not load the kit\'s instructions, with why', (t) => {
  const both = [PROCESS, STANDARDS];
  const cases = [
    [undefined, 'it is missing', both],
    ['{\n  "model": "x"\n}\n', 'it has no instructions list', both],
    ['{ "instructions": ["a.md"] }\n', `its instructions list does not hold ${PROCESS} or ${STANDARDS}`, both],
    // The opencode.json of the last release, which loads process.md alone.
    [`{ "instructions": ["${PROCESS}"] }\n`, `its instructions list does not hold ${STANDARDS}`, [STANDARDS]],
    ['not json\n', 'it is not JSON: ', both],
    [`{\n  // ours\n  "instructions": ["${PROCESS}"]\n}\n`, 'it is not JSON: ', [STANDARDS]],
    [null, 'it cannot be read: ', both],
  ];
  for (const [opencode, problem, lacks] of cases) {
    const result = refreshWith(t, ['opencode'], { opencode });
    const notices = noticesOf(result);
    assert.ok(notices.startsWith(`opencode.json does not load the kit's instructions,\nbecause ${problem}`), notices);
    if (!problem.endsWith(': ')) assert.equal(notices, `${opencodeRefreshNotice(problem, lacks)}\n`);
    assert.match(notices, /refresh\ndoes not add them/);
    assert.ok(notices.includes(`does not add them:\n\n${lacks.join('\n')}\n\n`), notices);
  }
});

test('refresh with opencode prints nothing of an opencode.json that loads both paths, also one with a comment', (t) => {
  for (const opencode of [OPENCODE_LOADS, `{\n  // ours\n  "instructions": ["${PROCESS}", "${STANDARDS}"]\n}\n`]) {
    const result = refreshWith(t, ['opencode'], { opencode });
    assert.equal(noticesOf(result), '');
    assert.doesNotMatch(result.stdout, /opencode\.json/);
  }
});

test('refresh with both harnesses prints the notice of CLAUDE.md and then that of opencode.json', (t) => {
  const result = refreshWith(t, ['claude', 'opencode'], { claude: undefined, opencode: undefined });
  const claude = claudeRefreshNotice(true, LINES);
  const opencode = opencodeRefreshNotice('it is missing', [PROCESS, STANDARDS]);
  assert.equal(noticesOf(result), `${claude}\n\n${opencode}\n`);
});

test('refresh with one harness says nothing of the file of the other, whatever is at its path', (t) => {
  for (const other of [undefined, 'not json\n', '{}\n', null]) {
    const claudeOnly = refreshWith(t, ['claude'], { claude: CLAUDE_LOADS, opencode: other });
    assert.doesNotMatch(claudeOnly.stdout, /opencode\.json/, String(other));
    assert.equal(noticesOf(claudeOnly), '');

    const opencodeOnly = refreshWith(t, ['opencode'], { claude: other, opencode: OPENCODE_LOADS });
    assert.doesNotMatch(opencodeOnly.stdout, /CLAUDE\.md/, String(other));
    assert.equal(noticesOf(opencodeOnly), '');
  }
});

test('the notices change neither what refresh writes nor its status, also when a wrapper is a symbolic link', (t) => {
  const loading = project(t);
  loading.write('CLAUDE.md', CLAUDE_LOADS);
  loading.write('opencode.json', OPENCODE_LOADS);
  const made = project(t);
  for (const each of [loading, made]) {
    mkdirSync(join(each.base, '.claude', 'agents'), { recursive: true });
    symlinkSync('/no/such/target', join(each.base, '.claude', 'agents', 'planner.md'));
  }

  const expected = loading.refresh(['claude', 'opencode']);
  const result = made.refresh(['claude', 'opencode']);

  assert.equal(expected.status, 1);
  assert.equal(result.status, 1);
  assert.equal(result.stderr, expected.stderr);
  assert.deepEqual(linesOf(result), linesOf(expected));
  assert.match(noticesOf(result), /^CLAUDE\.md does not load/m);
  assert.match(noticesOf(result), /^opencode\.json does not load/m);
  for (const path of ['CLAUDE.md', 'opencode.json']) assert.equal(exists(join(made.base, path)), false, path);
});

// Unit 0054: the list, and what follows the settings.

const OWN_REVIEWER = '---\ndescription: Reviews as this project does.\n---\n\n# Our reviewer\n';
const HOUSE = 'rules/house.md';

// Runs refresh on an agentrite.json with both harnesses and the sandbox whose standards and roles are `own`, after
// writing a file at each path of `own` that is not the kit's.
function refreshOwn(made, own) {
  const settings = { ...KIT_SETTINGS, ...own, roles: { ...KIT_SETTINGS.roles, ...own.roles } };
  if (settings.standards === HOUSE) made.write(HOUSE, '# Our standards\n');
  if (settings.roles.reviewer !== KIT_SETTINGS.roles.reviewer) made.write(settings.roles.reviewer, OWN_REVIEWER);
  const text = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude', 'opencode'], sandbox: true });
  made.write('agentrite.json', JSON.stringify({ ...JSON.parse(text), ...settings }));
  return made.run('refresh');
}

// R13, R14
test('refresh writes the list, refreshes one that differs, and finds one that is up to date', (t) => {
  const { refresh, read, write } = project(t);

  assert.match(refresh(['claude']).stdout, line('wrote', LIST));
  assert.equal(read(LIST), instructionsList(KIT_SETTINGS));
  assert.match(refresh(['claude']).stdout, line('up to date', LIST));
  write(LIST, `${read(LIST)}Our line.\n`);
  assert.match(refresh(['claude']).stdout, line('refreshed', LIST));
  assert.equal(read(LIST), instructionsList(KIT_SETTINGS));
});

test('a directory or a link at the path of the list is left, named, and the other files are written', (t) => {
  for (const make of [
    (base) => mkdirSync(join(base, LIST), { recursive: true }),
    (base) => {
      mkdirSync(join(base, '.agentrite'));
      symlinkSync('/no/such/target', join(base, LIST));
    },
  ]) {
    const { base, refresh } = project(t);
    make(base);

    const result = refresh(['claude', 'opencode']);

    assert.equal(result.status, 1);
    assert.equal(result.stderr, `agentrite: left ${LIST}, which is not a regular file\n`);
    assert.deepEqual(
      linesOf(result),
      KIT_OWNED.filter((path) => path !== LIST).map((path) => `wrote ${path}`),
    );
  }
});

// R9, R13
test('the list and the wrappers follow a changed roles.reviewer and a changed standards', (t) => {
  const made = project(t);
  assert.equal(made.refresh(['claude', 'opencode']).status, 0);

  const result = refreshOwn(made, { standards: HOUSE, roles: { reviewer: 'rules/reviewer.md' } });

  assert.equal(result.status, 0, result.stderr);
  const changed = ['.claude/agents/reviewer.md', '.opencode/agents/reviewer.md', LIST];
  for (const path of KIT_OWNED) {
    assert.match(result.stdout, line(changed.includes(path) ? 'refreshed' : 'up to date', path), path);
  }
  const roles = { ...KIT_SETTINGS.roles, reviewer: 'rules/reviewer.md' };
  assert.equal(made.read(LIST), instructionsList({ standards: HOUSE, roles }));
  for (const path of changed.slice(0, 2)) {
    assert.match(made.read(path), /^ {2}Reviews as this project does\.$/m, path);
    assert.match(made.read(path), /^Read `rules\/reviewer\.md` in the project root and follow it\./m, path);
  }
});

// Unit 0056, R6: a wrapper of a role that is gone
const EXTRA_ROLE_FILE = '---\ndescription: Reviews security.\n---\n\n# S\n';
const WRAPPER_DIRS = ['.claude/agents', '.opencode/agents'];

// Runs refresh on both harnesses and no sandbox, with the four roles and `extra`, a list of the names of roles of the
// project's own, each with a file at `rules/<name>.md`.
function refreshWithRoles(made, extra) {
  const roles = { ...KIT_SETTINGS.roles };
  for (const name of extra) {
    made.write(`rules/${name}.md`, EXTRA_ROLE_FILE);
    roles[name] = `rules/${name}.md`;
  }
  const text = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude', 'opencode'], sandbox: false });
  made.write('agentrite.json', JSON.stringify({ ...JSON.parse(text), roles }));
  return made.run('refresh');
}

test('refresh removes the wrappers of a role taken out of roles, after the files and before the notices', (t) => {
  const made = project(t);
  assert.equal(refreshWithRoles(made, ['security-reviewer']).status, 0);
  const pinned = made.read('.opencode/agents/security-reviewer.md').replace('\n---\n\n', '\nmodel: x/y\n---\n\n');
  made.write('.opencode/agents/security-reviewer.md', pinned);

  const result = refreshWithRoles(made, []);

  assert.equal(result.status, 0, result.stderr);
  for (const directory of WRAPPER_DIRS) {
    assert.match(result.stdout, line('removed', `${directory}/security-reviewer.md`));
    assert.ok(!exists(join(made.base, directory, 'security-reviewer.md')), directory);
  }
  const lines = result.stdout.split('\n');
  const first = lines.findIndex((entry) => entry.startsWith('removed '));
  assert.deepEqual(
    lines.slice(first, first + 2),
    WRAPPER_DIRS.map((directory) => `removed ${directory}/security-reviewer.md`),
  );
  assert.ok(lines.slice(0, first).every((entry) => /^(wrote|refreshed|up to date) /.test(entry)), result.stdout);
  assert.equal(lines[first + 2], '', result.stdout);
  const second = refreshWithRoles(made, []);
  assert.doesNotMatch(second.stdout, /^removed /m);
});

test('a renamed role loses the wrappers of its old name and gets those of its new one', (t) => {
  const made = project(t);
  assert.equal(refreshWithRoles(made, ['security-reviewer']).status, 0);

  const result = refreshWithRoles(made, ['security-checker']);

  assert.match(result.stdout, line('removed', '.claude/agents/security-reviewer.md'));
  assert.match(result.stdout, line('wrote', '.claude/agents/security-checker.md'));
  assert.ok(!exists(join(made.base, '.claude/agents/security-reviewer.md')));
  assert.ok(exists(join(made.base, '.opencode/agents/security-checker.md')));
});

test('refresh leaves an agent of the projects own, a link and a directory, and says nothing of them', (t) => {
  const made = project(t);
  for (const directory of WRAPPER_DIRS) {
    made.write(`${directory}/ours.md`, '---\nname: ours\ndescription: Ours.\n---\n\n# Ours\n');
    mkdirSync(join(made.base, directory, 'folder.md'));
    symlinkSync('ours.md', join(made.base, directory, 'linked.md'));
  }

  const result = refreshWithRoles(made, []);

  assert.equal(result.status, 0, result.stderr);
  assert.doesNotMatch(result.stdout, /removed|ours|folder|linked/);
  for (const directory of WRAPPER_DIRS) {
    assert.ok(exists(join(made.base, directory, 'ours.md')));
    assert.ok(exists(join(made.base, directory, 'folder.md')));
    assert.ok(exists(join(made.base, directory, 'linked.md')));
  }
});

test('refresh leaves the wrappers of a harness that harnesses no longer names', (t) => {
  const made = project(t);
  assert.equal(refreshWithRoles(made, ['security-reviewer']).status, 0);
  const text = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: false });
  made.write('agentrite.json', text);

  const result = made.run('refresh');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, line('removed', '.claude/agents/security-reviewer.md'));
  assert.ok(exists(join(made.base, '.opencode/agents/security-reviewer.md')));
});

// Unit 0056, R5, R9
test('refresh writes the wrappers of a role of the projects own for the harnesses named, and lists it', (t) => {
  const made = project(t);
  made.write('rules/test-writer.md', '---\ndescription: Writes the tests first.\n---\n\n# T\n');
  const roles = { ...KIT_SETTINGS.roles, 'test-writer': 'rules/test-writer.md' };
  const text = kitSettingsText({ defaultBranch: 'master', harnesses: ['opencode'], sandbox: false });
  made.write('agentrite.json', JSON.stringify({ ...JSON.parse(text), roles }));

  const result = made.run('refresh');

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, line('wrote', '.opencode/agents/test-writer.md'));
  assert.doesNotMatch(result.stdout, /\.claude\/agents\/test-writer/);
  assert.match(made.read('.opencode/agents/test-writer.md'), /^Read `rules\/test-writer\.md` in the project root/m);
  assert.match(made.read('.opencode/agents/test-writer.md'), /^ {2}Writes the tests first\.$/m);
  assert.equal(made.read(LIST), instructionsList({ standards: KIT_SETTINGS.standards, roles }));
  assert.ok(made.read(LIST).indexOf('* reviewer: ') < made.read(LIST).indexOf('* test-writer: '));
});

// R11, R12
test('refresh judges CLAUDE.md and opencode.json against the standards the settings give', (t) => {
  const made = project(t);
  made.write('CLAUDE.md', `@${PROCESS}\n@${HOUSE}\n@AGENTS.md\n`);
  made.write('opencode.json', `{ "instructions": ["${PROCESS}", "${HOUSE}"] }\n`);

  const result = refreshOwn(made, { standards: HOUSE });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(noticesOf(result), '');
});

test('refresh notices the kit standards in CLAUDE.md and opencode.json beside the project own, removing none', (t) => {
  const claude = `@${PROCESS}\n@${HOUSE}\n${STANDARDS_IMPORT}\n@AGENTS.md\n`;
  const opencode = `{ "instructions": ["${PROCESS}", "${HOUSE}", "${STANDARDS}"] }\n`;
  const made = project(t);
  made.write('CLAUDE.md', claude);
  made.write('opencode.json', opencode);

  const result = refreshOwn(made, { standards: HOUSE });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(noticesOf(result), `${claudeKitStandardsNotice(HOUSE)}\n\n${opencodeKitStandardsNotice(HOUSE)}\n`);
  assert.equal(made.read('CLAUDE.md'), claude);
  assert.equal(made.read('opencode.json'), opencode);
});

test('refresh gives no notice of the kit standards in a project that uses them', (t) => {
  const made = project(t);
  made.write('CLAUDE.md', CLAUDE_LOADS);
  made.write('opencode.json', OPENCODE_LOADS);

  const result = made.refresh(['claude', 'opencode']);

  assert.equal(noticesOf(result), '');
});

// R16
test('refresh notices an AGENTS.md that is missing or does not name the list, whatever the harnesses', (t) => {
  for (const harnesses of [['claude'], ['opencode'], ['claude', 'opencode']]) {
    for (const [agents, notice] of [
      [undefined, agentsListNotice(true)],
      ['# Ours\n\nRead node_modules/agentrite/standards.md.\n', agentsListNotice(false)],
    ]) {
      const made = project(t);
      made.write('CLAUDE.md', CLAUDE_LOADS);
      made.write('opencode.json', OPENCODE_LOADS);
      rmSync(join(made.base, 'AGENTS.md'));
      if (agents !== undefined) made.write('AGENTS.md', agents);

      const result = made.refresh(harnesses);

      assert.equal(result.status, 0, result.stderr);
      assert.equal(noticesOf(result), `${notice}\n`, `${harnesses} ${JSON.stringify(agents)}`);
      assert.equal(placed(made, 'AGENTS.md'), agents);
    }
  }
});

test('refresh prints the notices: CLAUDE.md, the kit standards in it, opencode.json, in it, then AGENTS.md', (t) => {
  const made = project(t);
  made.write('CLAUDE.md', `${STANDARDS_IMPORT}\n`);
  made.write('opencode.json', `{ "instructions": ["${STANDARDS}"] }\n`);
  rmSync(join(made.base, 'AGENTS.md'));

  const result = refreshOwn(made, { standards: HOUSE });

  assert.equal(result.status, 0, result.stderr);
  const notices = noticesOf(result);
  const order = [
    /^CLAUDE\.md does not load/m,
    /^CLAUDE\.md imports the kit's standards\.md/m,
    /^opencode\.json does not load/m,
    /^opencode\.json lists the kit's standards\.md/m,
    /^AGENTS\.md is missing/m,
  ].map((pattern) => notices.search(pattern));
  assert.ok(order.every((at) => at !== -1), notices);
  assert.deepEqual([...order].sort((first, second) => first - second), order, notices);
});

// R8
test('refresh refuses a role file without front matter, and writes nothing', (t) => {
  const { run, read, write } = staleProject(t);
  write('rules/reviewer.md', '# Our reviewer\n');
  const text = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude', 'opencode'], sandbox: true });
  const settings = { ...JSON.parse(text), roles: { ...KIT_SETTINGS.roles, reviewer: 'rules/reviewer.md' } };
  write('agentrite.json', JSON.stringify(settings));
  const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

  const result = run('refresh');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    'agentrite: rules/reviewer.md has no front matter that a role file must open with. It must be a line ---, ' +
      'then either the line description: <text>, or the line description: >- followed by the text on lines ' +
      'indented by two spaces, then a line ---\n',
  );
  for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
});

// Unit 0058, R8, R11
test('refresh refuses a file that lacks bell, or whose bell is a string, and writes nothing', (t) => {
  for (const [replacement, found] of [
    ['', 'missing'],
    ['  "bell": "true",\n', '"true"'],
  ]) {
    const { run, read, write } = staleProject(t);
    const valid = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: true });
    const text = valid.replace('  "bell": true,\n', replacement);
    assert.notEqual(text, valid);
    write('agentrite.json', text);
    const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

    const result = run('refresh');

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `agentrite: agentrite.json: bell is ${found}. It must hold true or false\n`);
    for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
    assert.equal(read('agentrite.json'), text);
  }
});

// Unit 0065, R3
test('refresh refuses a file that lacks orchestrator, or whose orchestrator names no file, and writes nothing', (t) => {
  const line = '  "orchestrator": "node_modules/agentrite/orchestrator.json",\n';
  for (const [replacement, message] of [
    ['', `orchestrator is missing. ${ORCHESTRATOR_MUST}`],
    [
      '  "orchestrator": "rules/missing.json",\n',
      'orchestrator is "rules/missing.json", and there is no file at it. ' +
        "It must name a file in the project's working tree",
    ],
  ]) {
    const { run, read, write } = staleProject(t);
    const valid = kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: true });
    const text = valid.replace(line, replacement);
    assert.notEqual(text, valid);
    write('agentrite.json', text);
    const before = Object.fromEntries(KIT_OWNED.map((path) => [path, read(path)]));

    const result = run('refresh');

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `agentrite: agentrite.json: ${message}\n`);
    for (const path of KIT_OWNED) assert.equal(read(path), before[path], path);
    assert.equal(read('agentrite.json'), text);
  }
});

const ORCHESTRATOR_MUST =
  'It must hold false, for a project that does not use the orchestrator, or the path of a file, relative to the ' +
  'project root, that does not lead outside the project';
