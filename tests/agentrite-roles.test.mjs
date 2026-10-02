import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  lstatSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseHarnesses, plannedFiles, wrapWords } from '../scripts/agentrite-roles.mjs';

// The folded block under `description: >-`, as the string a YAML parser reads from it: its lines without their
// indentation, joined by single spaces.
function unfoldedDescription(wrapper) {
  const block = wrapper.match(/^description: >-\n((?: {2}\S.*\n)+)/m);
  assert.ok(block, 'the wrapper has no folded description');
  return block[1]
    .trimEnd()
    .split('\n')
    .map((line) => line.slice(2))
    .join(' ');
}

function bodyOf(wrapper) {
  return wrapper.slice(wrapper.lastIndexOf('---\n') + 4).trim();
}

test('wrapWords leaves a text shorter than the width on one line', () => {
  assert.deepEqual(wrapWords('one two three', 20, ''), ['one two three']);
});

test('wrapWords breaks at the last space that fits, and no line is longer than the width', () => {
  assert.deepEqual(wrapWords('one two three four', 9, ''), ['one two', 'three', 'four']);
  assert.deepEqual(wrapWords('one two three four', 13, ''), ['one two three', 'four']);
});

test('wrapWords starts every line with the indent, which counts toward the width', () => {
  assert.deepEqual(wrapWords('one two three four', 9, '  '), ['  one two', '  three', '  four']);
  assert.deepEqual(wrapWords('one two three four', 8, '  '), ['  one', '  two', '  three', '  four']);
});

test('wrapWords keeps a word longer than the width whole, on a line of its own', () => {
  assert.deepEqual(wrapWords('a `node_modules/some/long/path.md` b', 10, ''), [
    'a',
    '`node_modules/some/long/path.md`',
    'b',
  ]);
});

test('wrapWords loses nothing: its lines joined by single spaces are the text', () => {
  const text = 'Reviews a finished change unit for spec conformance, plan fidelity and code quality.';
  for (const width of [10, 25, 40, 120]) {
    const lines = wrapWords(text, width, '    ');
    assert.equal(lines.map((line) => line.slice(4)).join(' '), text);
  }
});

test('parseHarnesses accepts each harness and both in either order', () => {
  assert.deepEqual(parseHarnesses(['claude']), ['claude']);
  assert.deepEqual(parseHarnesses(['opencode']), ['opencode']);
  assert.deepEqual(parseHarnesses(['claude', 'opencode']), ['claude', 'opencode']);
  assert.deepEqual(parseHarnesses(['opencode', 'claude']), ['opencode', 'claude']);
});

test('parseHarnesses accepts a repeated name once', () => {
  assert.deepEqual(parseHarnesses(['claude', 'claude']), ['claude']);
});

test('parseHarnesses throws a usage error with no arguments', () => {
  assert.throws(() => parseHarnesses([]), /claude/);
  assert.throws(() => parseHarnesses([]), /opencode/);
});

test('parseHarnesses throws a usage error for an unknown harness', () => {
  assert.throws(() => parseHarnesses(['codex']), /claude/);
  assert.throws(() => parseHarnesses(['codex']), /opencode/);
  assert.throws(() => parseHarnesses(['claude', 'codex']), /codex/);
});

test('parseHarnesses rejects Object.prototype property names as unknown', () => {
  for (const name of ['toString', 'constructor', '__proto__']) {
    assert.throws(() => parseHarnesses([name]), new RegExp(name));
  }
  assert.throws(() => parseHarnesses(['claude', 'toString']), /toString/);
});

test('plannedFiles for claude returns exactly the three fixture files, byte for byte', () => {
  const files = plannedFiles(['claude']);
  assert.deepEqual(
    files,
    ['planner', 'implementer', 'reviewer'].map((name) => ({
      path: `.claude/agents/${name}.md`,
      content: readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8'),
    })),
  );
});

test('plannedFiles for opencode carries the claude description, subagent mode and the pointer body', () => {
  const files = plannedFiles(['opencode']);
  assert.deepEqual(
    files.map((file) => file.path),
    ['.opencode/agents/planner.md', '.opencode/agents/implementer.md', '.opencode/agents/reviewer.md'],
  );

  for (const file of files) {
    const name = file.path.replace('.opencode/agents/', '').replace(/\.md$/, '');
    const fixture = readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8');
    const fixtureBody = bodyOf(fixture);

    const frontmatterBlock = file.content.slice(4, file.content.lastIndexOf('---\n'));
    const body = bodyOf(file.content);

    assert.equal(file.content.startsWith('---\n'), true);
    assert.doesNotMatch(frontmatterBlock, /^name:/m);
    assert.equal(unfoldedDescription(file.content), unfoldedDescription(fixture));
    assert.ok(frontmatterBlock.includes('mode: subagent\n'));
    assert.ok(frontmatterBlock.indexOf('description:') < frontmatterBlock.indexOf('mode:'));
    assert.equal(body, fixtureBody);
    assert.match(body, new RegExp('^Read `node_modules/@ritenoar/agentrite/roles/.*\\.md`'));
    assert.ok(file.content.endsWith('\n'));
    assert.equal(file.content, `${file.content.trimEnd()}\n`);
  }
});

test('no line of a planned wrapper is over 120 characters, and its text is what it was on one line', () => {
  const descriptions = {
    planner:
      'Writes the documents a change unit needs in changes/, which is a spec and a plan for a feature and ' +
      'less for a bug or a task. Use before implementing anything. Dispatch it with the unit directory, and ' +
      'with the request itself when the unit does not exist yet.',
    implementer:
      "Builds an approved change unit and keeps its documents true. Use once the documents the unit's kind " +
      'requires are approved, which for a single-commit bug or a small task may be fewer than a spec and a plan. ' +
      'Dispatch it with the unit directory.',
    reviewer:
      'Reviews a finished change unit for spec conformance, plan fidelity and code quality, and returns its ' +
      "findings in its response. It changes nothing under review, and appends one entry to the unit's record.md " +
      'saying that it reviewed. Use once the implementation is committed. Dispatch it with the unit directory; ' +
      'it produces its own diff and runs the suites itself.',
  };

  for (const file of plannedFiles(['claude', 'opencode'])) {
    const name = file.path.replace(/^.*\//, '').replace(/\.md$/, '');
    for (const line of file.content.split('\n')) {
      assert.ok(line.length <= 120, `${file.path} holds a line of ${line.length} characters`);
    }
    assert.equal(unfoldedDescription(file.content), descriptions[name], file.path);
    assert.equal(
      bodyOf(file.content).split('\n').join(' '),
      `Read \`node_modules/@ritenoar/agentrite/roles/${name}.md\` in the project root and follow it. ` +
        'It is your instruction; this file holds none of its own.',
      file.path,
    );
    assert.ok(file.content.includes(`\`node_modules/@ritenoar/agentrite/roles/${name}.md\``), file.path);
  }
});

test('plannedFiles for both harnesses returns all six files', () => {
  const both = plannedFiles(['claude', 'opencode']);
  assert.deepEqual(
    [...both].sort((a, b) => a.path.localeCompare(b.path)),
    [...plannedFiles(['claude']), ...plannedFiles(['opencode'])].sort((a, b) => a.path.localeCompare(b.path)),
  );
});

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite-roles.mjs');

function project(t) {
  const base = mkdtempSync(join(tmpdir(), 'agentrite-roles-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const run = (...args) => spawnSync(process.execPath, [script, ...args], { cwd: base, encoding: 'utf-8' });
  return { base, run };
}

test('claude opencode writes the six planned files, prints each path and exits 0', (t) => {
  const { base, run } = project(t);
  const all = [...plannedFiles(['claude']), ...plannedFiles(['opencode'])];

  const result = run('claude', 'opencode');

  assert.equal(result.status, 0, result.stderr);
  for (const { path, content } of all) {
    assert.equal(readFileSync(join(base, path), 'utf-8'), content);
    assert.match(result.stdout, new RegExp(`^${path.replace(/\./g, '\\.')}$`, 'm'));
  }
  for (const name of ['planner', 'implementer', 'reviewer']) {
    assert.equal(
      readFileSync(join(base, '.claude', 'agents', `${name}.md`), 'utf-8'),
      readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8'),
    );
  }
});

test('an unrelated file already in .claude/agents/ is left as it was', (t) => {
  const { base, run } = project(t);
  const others = join(base, '.claude', 'agents', 'others.md');
  mkdirSync(join(base, '.claude', 'agents'), { recursive: true });
  writeFileSync(others, 'keep me\n');

  const result = run('claude');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(others, 'utf-8'), 'keep me\n');
});

test('a refused run names the existing file on standard error and writes nothing', (t) => {
  const { base, run } = project(t);
  const existing = join(base, '.opencode', 'agents', 'reviewer.md');
  mkdirSync(join(base, '.opencode', 'agents'), { recursive: true });
  writeFileSync(existing, 'mine\n');
  const modeBefore = statSync(existing).mode;

  const result = run('claude', 'opencode');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /\.opencode\/agents\/reviewer\.md/);
  assert.equal(readFileSync(existing, 'utf-8'), 'mine\n');
  assert.equal(statSync(existing).mode, modeBefore);
  assert.equal(exists(join(base, '.claude')), false);
  for (const name of ['planner', 'implementer', 'reviewer']) {
    assert.equal(exists(join(base, `.opencode/agents/${name}.md`)), name === 'reviewer');
  }
});

function exists(path) {
  try {
    statSync(path);
    return true;
  } catch {
    return false;
  }
}

test('no arguments exits non-zero with the usage on standard error and creates nothing', (t) => {
  const { base, run } = project(t);
  const result = run();
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /claude/);
  assert.match(result.stderr, /opencode/);
  assert.equal(exists(join(base, '.claude')), false);
  assert.equal(exists(join(base, '.opencode')), false);
});

test('an unknown harness exits non-zero with the usage on standard error and creates nothing', (t) => {
  const { base, run } = project(t);
  const result = run('codex');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /claude/);
  assert.match(result.stderr, /opencode/);
  assert.equal(exists(join(base, '.claude')), false);
  assert.equal(exists(join(base, '.opencode')), false);
});

test('a dangling wrapper symlink is named and written over nothing', (t) => {
  const { base, run } = project(t);
  const target = join(base, '.opencode', 'agents', 'reviewer.md');
  mkdirSync(join(base, '.opencode', 'agents'), { recursive: true });
  symlinkSync('/no/such/target/reviewer.md', target);
  assert.equal(lstatSync(target).isSymbolicLink(), true);

  const result = run('claude', 'opencode');

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(`reviewer\\.md`));
  assert.doesNotMatch(result.stderr, /render is not a function|EEXIST|not a function/);
  assert.equal(lstatSync(target).isSymbolicLink(), true);
  assert.equal(exists(join(base, '.claude')), false);
  for (const name of ['planner', 'implementer']) {
    assert.equal(exists(join(base, `.opencode/agents/${name}.md`)), false);
  }
});

test('the command runs through a node_modules bin symlink the way npx does', (t) => {
  const { base } = project(t);
  mkdirSync(join(base, 'node_modules', '@ritenoar', 'agentrite', 'scripts'), { recursive: true });
  mkdirSync(join(base, 'node_modules', '.bin'));
  const bin = join(base, 'node_modules', '.bin', 'agentrite-roles');
  symlinkSync(script, bin);

  const result = spawnSync(process.execPath, [bin, 'claude'], { cwd: base, encoding: 'utf-8' });

  assert.equal(result.status, 0, result.stderr);
  for (const name of ['planner', 'implementer', 'reviewer']) {
    assert.equal(
      readFileSync(join(base, '.claude', 'agents', `${name}.md`), 'utf-8'),
      readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8'),
    );
  }
});
