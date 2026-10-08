import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { plannedFiles, wrapWords } from '../scripts/agentrite-roles.mjs';

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

test('plannedFiles for claude returns exactly the four fixture files, byte for byte', () => {
  const files = plannedFiles(['claude']);
  assert.deepEqual(
    files,
    ['specifier', 'planner', 'implementer', 'reviewer'].map((name) => ({
      path: `.claude/agents/${name}.md`,
      content: readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8'),
    })),
  );
});

test('plannedFiles for opencode carries the claude description, the mode all and the pointer body', () => {
  const files = plannedFiles(['opencode']);
  assert.deepEqual(
    files.map((file) => file.path),
    [
      '.opencode/agents/specifier.md',
      '.opencode/agents/planner.md',
      '.opencode/agents/implementer.md',
      '.opencode/agents/reviewer.md',
    ],
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
    assert.ok(frontmatterBlock.includes('mode: all\n'));
    assert.ok(frontmatterBlock.indexOf('description:') < frontmatterBlock.indexOf('mode:'));
    assert.equal(body, fixtureBody);
    assert.match(body, new RegExp('^Read `node_modules/@ritenoar/agentrite/roles/.*\\.md`'));
    assert.ok(file.content.endsWith('\n'));
    assert.equal(file.content, `${file.content.trimEnd()}\n`);
  }
});

test('no line of a planned wrapper is over 120 characters, and its text is what it was on one line', () => {
  const descriptions = {
    specifier:
      'Writes what a change unit must make true: the spec of a feature or a bug, or the record of a task, in ' +
      'changes/. Use before anything is planned or implemented. Dispatch it with the request, and with the ' +
      'unit directory when the unit exists already.',
    planner:
      'Writes the plan of an approved change unit, against the tree the unit will be built on. Use once the ' +
      "human has approved the unit's spec and the unit is next to be built, not before. Dispatch it with the " +
      'unit directory.',
    implementer:
      'Builds a planned change unit and keeps its documents true. Use once the unit is planned, or approved ' +
      'where it is a task, which has no plan. Dispatch it with the unit directory.',
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

test('plannedFiles for both harnesses returns all eight files', () => {
  const both = plannedFiles(['claude', 'opencode']);
  assert.deepEqual(
    [...both].sort((a, b) => a.path.localeCompare(b.path)),
    [...plannedFiles(['claude']), ...plannedFiles(['opencode'])].sort((a, b) => a.path.localeCompare(b.path)),
  );
});

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite-roles.mjs');
const scripts = join(import.meta.dirname, '..', 'scripts');
const root = join(import.meta.dirname, '..');

test('the module run by itself prints nothing and writes nothing', (t) => {
  const base = mkdtempSync(join(tmpdir(), 'agentrite-roles-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));

  for (const args of [[], ['claude'], ['claude', 'opencode']]) {
    const result = spawnSync(process.execPath, [script, ...args], { cwd: base, encoding: 'utf-8' });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
  assert.deepEqual(readdirSync(base), []);
});

test('the package has one command, agentrite', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));

  assert.deepEqual(manifest.bin, { agentrite: 'scripts/agentrite.mjs' });
});

test('no file under scripts/ has a shebang but the commands the package has', () => {
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf-8'));
  const commands = Object.values(manifest.bin).map((path) => path.replace(/^scripts\//, ''));

  const withShebang = readdirSync(scripts)
    .filter((name) => readFileSync(join(scripts, name), 'utf-8').startsWith('#!'))
    .sort();

  assert.deepEqual(withShebang, commands.sort());
});
