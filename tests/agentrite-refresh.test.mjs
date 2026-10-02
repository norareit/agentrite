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
import { refreshedWrapper } from '../scripts/wrapper-frontmatter.mjs';

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

// What a refresh writes over `existing`, which the command must have been able to read.
function refreshed(existing, release) {
  const result = refreshedWrapper(existing, release);
  assert.equal(result.problem, undefined);
  return result.content;
}

// The OpenCode reviewer wrapper with `lines` added at the end of its frontmatter.
function withAdded(lines) {
  return withFrontmatter(rendered('opencode', 'reviewer'), 'mode:', lines);
}

// The number of the line of `wrapper` that is `line`, counted from one as an editor counts.
function lineNumber(wrapper, line) {
  const index = wrapper.split('\n').indexOf(line);
  assert.notEqual(index, -1, `the wrapper has no line ${line}`);
  return index + 1;
}

// R4, R5: what a refreshed wrapper keeps and what it replaces.

test('a wrapper that is what the release writes comes back unchanged', () => {
  for (const harness of ['claude', 'opencode']) {
    const wrapper = rendered(harness, 'planner');
    assert.equal(refreshed(wrapper, wrapper), wrapper);
  }
});

test('a model pinned in the frontmatter is kept, after the keys the kit writes', () => {
  // Pinned ahead of the description in both, so that the kit's keys are seen to come first afterwards.
  for (const [harness, before] of [
    ['claude', 'name:'],
    ['opencode', '---'],
  ]) {
    const wrapper = rendered(harness, 'reviewer');
    const pinned = withFrontmatter(wrapper, before, ['model: some/model']);

    const result = refreshed(pinned, wrapper);

    assert.deepEqual(frontmatter(result), [...frontmatter(wrapper), 'model: some/model']);
    assert.equal(result.slice(result.lastIndexOf('---\n')), wrapper.slice(wrapper.lastIndexOf('---\n')));
  }
});

test('two added keys keep the order they had', () => {
  const wrapper = rendered('opencode', 'planner');
  const edited = withFrontmatter(withFrontmatter(wrapper, 'mode:', ['temperature: 0.1']), '---', ['model: a/b']);

  assert.deepEqual(frontmatter(refreshed(edited, wrapper)), [
    ...frontmatter(wrapper),
    'model: a/b',
    'temperature: 0.1',
  ]);
});

test('a key the kit writes takes the value the release writes, whatever the wrapper held', () => {
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
  ].join('\n');
  assert.deepEqual(frontmatter(refreshed(stale, claude)), [...frontmatter(claude), 'model: some/model']);

  const opencode = rendered('opencode', 'implementer');
  const primary = opencode.replace('mode: subagent', 'mode: primary');
  assert.equal(refreshed(primary, opencode), opencode);
});

test('a folded description of other text, quotes and all, is replaced whole', () => {
  const wrapper = rendered('claude', 'planner');
  const stale = [
    '---',
    'name: planner',
    'description: >-',
    '  An older description that was folded',
    "  over more lines, and isn't",
    '  the one the release writes: "it said',
    '  mode: something else.',
    '',
    '  It leaves nothing behind.',
    'model: some/model',
    '---',
    '',
    'An older body.',
    '',
  ].join('\n');

  assert.deepEqual(frontmatter(refreshed(stale, wrapper)), [...frontmatter(wrapper), 'model: some/model']);
});

test('the body becomes the body the release writes, whatever was added to it', () => {
  const wrapper = rendered('claude', 'planner');
  const stale =
    wrapper.replace('@ritenoar/agentrite', '@ritenoar/agent-kit') + '\nAlways answer in rhyme.\n\nAnd in French.\n';

  assert.equal(refreshed(stale, wrapper), wrapper);
});

test('a file that does not open with frontmatter becomes the wrapper the release writes', () => {
  const wrapper = rendered('opencode', 'planner');
  for (const existing of ['', 'Read the planner role.\n', 'model: some/model\n---\n']) {
    assert.equal(refreshed(existing, wrapper), wrapper);
  }
});

test('refreshing what a refresh returned changes nothing', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const once = refreshed(withAdded(['model: a/b', '', 'permission:', '  edit: deny', '']), wrapper);

  assert.equal(refreshed(once, wrapper), once);
});

// R13: the values a kept key may have, each kept whole.

const READABLE = {
  'a nested map, with a nested key in quotes': [
    'permission:',
    '  edit: deny',
    '  bash:',
    '    "git push": deny',
    "    'rm *': ask",
    '    git status: allow',
  ],
  'a list, indented and at the left margin': ['tools:', '  - read', 'skills:', '- grep', '- "glob"', '-'],
  'quoted texts that hold a colon, a # and a quote': [
    'notes: "see https://example.com/a: b # not a comment"',
    "title: 'it''s: fine'",
    'label: "say \\"mode: primary\\""  # a comment',
  ],
  'a bracketed list and map on one line': ['tools: [read, grep]', 'limits: {steps: 5, depth: [1, 2]}'],
  'a text opened by | that holds quotes and a line shaped like a key': [
    'prompt: |',
    "  Don't stop.",
    '  "mode": primary',
    "  model: 'x",
    '',
    '  [unclosed',
    'model: a/b',
  ],
  'a nested text opened by >, and what follows it at its own depth': [
    'options:',
    '  note: >-',
    "    it's",
    "    mode: 'x",
    '  depth: 2',
    'steps:',
    '  - list: |+',
    '      "a',
    '    after: 1',
  ],
  'a plain text that runs on, indented': ['notes: first', '  second', '  third'],
  'a comment inside a nested map, and a blank line in it': [
    'permission:',
    '  edit: deny',
    '',
    '  # shell commands',
    '  bash: ask',
    '  # nothing after this',
    'model: a/b',
  ],
  'a key with no value': ['model:', 'fallback: null'],
};

for (const [what, added] of Object.entries(READABLE)) {
  test(`${what} is read, and kept whole`, () => {
    const wrapper = rendered('opencode', 'reviewer');

    const result = refreshed(withAdded(added), wrapper);

    assert.deepEqual(frontmatter(result), [...frontmatter(wrapper), ...added]);
    assert.equal(refreshed(result, wrapper), result);
  });
}

test('a comment goes with the key below it: kept above an added key, dropped above a kit key', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const kept = ['# cheaper for reviews', '# and quick', 'model: a/b', '# said last'];
  const edited = withFrontmatter(withAdded(kept), 'description: >-', []).replace(
    'mode: subagent',
    '# about the mode\nmode: subagent',
  );

  assert.deepEqual(frontmatter(refreshed(edited, wrapper)), [...frontmatter(wrapper), ...kept]);
});

test('blank lines between keys are not carried along, so that none lands inside the folded description', () => {
  // The Claude wrapper ends its own keys with the folded description, which takes in any blank or indented line
  // that follows it.
  const wrapper = rendered('claude', 'reviewer');
  const existing = ['---', '', 'model: a/b', '', '# why', '', 'steps: 5', '', '---', '', 'Old body.', ''].join('\n');

  const result = refreshed(existing, wrapper);

  assert.deepEqual(frontmatter(result), [...frontmatter(wrapper), 'model: a/b', '# why', 'steps: 5']);
  assert.equal(refreshed(result, wrapper), result);
});

test('an indented comment with no key above it is not read', () => {
  const result = refreshedWrapper('---\n  # stray\nmodel: a/b\n---\n\nBody.\n', rendered('claude', 'reviewer'));

  assert.equal(result.content, undefined);
  assert.match(result.problem, /^line 2: .*no key above/);
});

test('frontmatter that holds only a comment keeps it', () => {
  const wrapper = rendered('opencode', 'reviewer');

  const result = refreshed('---\n# nothing set yet\n---\n\nOld body.\n', wrapper);

  assert.deepEqual(frontmatter(result), [...frontmatter(wrapper), '# nothing set yet']);
  assert.equal(refreshed(result, wrapper), result);
});

// Review S1

test('a wrapper with CRLF line endings keeps its added keys, and is written with LF', () => {
  const wrapper = rendered('opencode', 'reviewer');
  const added = ['model: some/model', 'permission:', '  edit: deny'];
  const stale = withAdded(added)
    .replace('mode: subagent', 'mode: primary')
    .replace('@ritenoar/agentrite', '@ritenoar/agent-kit');

  const result = refreshed(stale.replaceAll('\n', '\r\n'), wrapper);

  assert.doesNotMatch(result, /\r/);
  assert.equal(result, withAdded(added));
  assert.equal(refreshed(result.replaceAll('\n', '\r\n'), wrapper), result);
});

// R14, and the delta review's S2 and C2: what is not read is reported by its line, never guessed at.

const UNREADABLE = [
  { what: 'a key in double quotes', added: ['"model": a/b'], at: '"model": a/b', why: /plain key/ },
  { what: 'a key in single quotes', added: ["'model': a/b"], at: "'model': a/b", why: /plain key/ },
  { what: 'a key with space before its colon', added: ['model : a/b'], at: 'model : a/b', why: /plain key/ },
  { what: 'a key written with ?', added: ['? model', ': a/b'], at: '? model', why: /plain key/ },
  { what: 'a key with no space after its colon', added: ['model:a/b'], at: 'model:a/b', why: /plain key/ },
  { what: 'a map in braces at the margin', added: ['{model: a/b}'], at: '{model: a/b}', why: /plain key/ },
  {
    what: 'a single-quoted value that runs over several lines',
    added: ["notes: 'first", '"mode": primary', "last'"],
    at: "notes: 'first",
    why: /quoted text/,
  },
  {
    what: 'a double-quoted value that runs over several lines',
    added: ['notes: "first', 'mode: primary"'],
    at: 'notes: "first',
    why: /quoted text/,
  },
  {
    what: 'a double-quoted value whose last quote is escaped',
    added: ['notes: "first\\"', 'mode: primary"'],
    at: 'notes: "first\\"',
    why: /quoted text/,
  },
  {
    what: 'a bracketed list that runs over several lines',
    added: ['tools: [read,', 'mode: b]'],
    at: 'tools: [read,',
    why: /bracketed/,
  },
  {
    what: 'a bracketed list that holds a quote',
    added: ['tools: [read, "]"]'],
    at: 'tools: [read, "]"]',
    why: /bracketed/,
  },
  {
    what: 'a quoted value opened on an indented line',
    added: ['permission:', "  note: 'first", "mode: b'"],
    at: "  note: 'first",
    why: /quoted text/,
  },
  {
    what: 'a quoted item of a list that is not closed',
    added: ['tools:', "- 'read", "mode: b'"],
    at: "- 'read",
    why: /quoted text/,
  },
  {
    what: 'a bracketed list opened on an indented line',
    added: ['permission:', '  tools: [a,', 'mode: b]'],
    at: '  tools: [a,',
    why: /bracketed/,
  },
  {
    what: 'a nested key with a quote in it ahead of an open quote',
    added: ['permission:', "  it's: 'first", "mode: b'"],
    at: "  it's: 'first",
    why: /quote in a text/,
  },
  {
    what: 'a quote in a text that is not quoted',
    added: ["notes: it's fine"],
    at: "notes: it's fine",
    why: /quote in a text/,
  },
  {
    what: 'a value with an anchor',
    added: ['base: &base [a,', 'mode: b]'],
    at: 'base: &base [a,',
    why: /anchor or a tag/,
  },
  { what: 'a value with a tag', added: ['kind: !!seq [a,', 'mode: b]'], at: 'kind: !!seq [a,', why: /anchor or a tag/ },
  { what: 'a tab in the indentation', added: ['permission:', '\tedit: deny'], at: '\tedit: deny', why: /tab/ },
];

for (const { what, added, at, why } of UNREADABLE) {
  test(`${what} is not read: the wrapper is reported by that line, with no content to write`, () => {
    const existing = withAdded(added);

    const result = refreshedWrapper(existing, rendered('opencode', 'reviewer'));

    assert.equal(result.content, undefined);
    assert.match(result.problem, new RegExp(`^line ${lineNumber(existing, at)}: `));
    assert.match(result.problem, why);
  });
}

test('an indented line with no key above it, and frontmatter never closed, are not read', () => {
  const wrapper = rendered('opencode', 'reviewer');

  const indented = refreshedWrapper('---\n  stray: 1\nmode: subagent\n---\n\nBody.\n', wrapper);
  assert.equal(indented.content, undefined);
  assert.match(indented.problem, /^line 2: .*no key above/);

  const open = refreshedWrapper('---\nmodel: some/model\nnever closed\n', wrapper);
  assert.equal(open.content, undefined);
  assert.match(open.problem, /^line 1: .*not closed/);
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

// R14
test('a wrapper the command does not read is left byte for byte, named with its line, and the rest is done', (t) => {
  const { run, read, write } = staleProject(t);
  const path = '.opencode/agents/planner.md';
  const unreadable = withFrontmatter(read(path), 'mode:', ["notes: 'first", '"mode": primary', "last'"]);
  write(path, unreadable);

  for (const round of ['first', 'second']) {
    const result = run('refresh', 'claude', 'opencode');

    assert.equal(result.status, 1, round);
    assert.equal(read(path), unreadable, round);
    const named = new RegExp(`${path.replaceAll('.', '\\.')}.*line ${lineNumber(unreadable, "notes: 'first")}: `);
    assert.match(result.stderr, named, round);
    assert.doesNotMatch(result.stdout, new RegExp(` ${path.replaceAll('.', '\\.')}$`, 'm'));
    assert.equal(read('.opencode/agents/implementer.md'), rendered('opencode', 'implementer'), round);
    assert.equal(read('agent.sh'), SHIM, round);
  }
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
