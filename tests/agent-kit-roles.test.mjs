import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { parseHarnesses, plannedFiles } from '../scripts/agent-kit-roles.mjs';

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
    const fixtureDescription = fixture.match(/^description: (.*)$/m)[1];
    const fixtureBody = fixture.slice(fixture.lastIndexOf('---') + 3).trim();

    const frontmatterBlock = file.content.slice(4, file.content.lastIndexOf('---\n'));
    const body = file.content.slice(file.content.lastIndexOf('---\n') + 3).trim();

    assert.equal(file.content.startsWith('---\n'), true);
    assert.doesNotMatch(frontmatterBlock, /^name:/m);
    assert.ok(frontmatterBlock.includes(`${fixtureDescription}\n`));
    assert.ok(frontmatterBlock.includes('mode: subagent\n'));
    assert.ok(frontmatterBlock.indexOf('description:') < frontmatterBlock.indexOf('mode:'));
    assert.equal(body, fixtureBody);
    assert.match(body, new RegExp('^Read `node_modules/@ritenoar/agent-kit/roles/.*\\.md`'));
    assert.ok(file.content.endsWith('\n'));
    assert.equal(file.content, `${file.content.trimEnd()}\n`);
  }
});

test('plannedFiles for both harnesses returns all six files', () => {
  const both = plannedFiles(['claude', 'opencode']);
  assert.deepEqual(
    [...both].sort((a, b) => a.path.localeCompare(b.path)),
    [...plannedFiles(['claude']), ...plannedFiles(['opencode'])].sort((a, b) => a.path.localeCompare(b.path)),
  );
});

const script = join(import.meta.dirname, '..', 'scripts', 'agent-kit-roles.mjs');

function project(t) {
  const base = mkdtempSync(join(tmpdir(), 'agent-kit-roles-'));
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
