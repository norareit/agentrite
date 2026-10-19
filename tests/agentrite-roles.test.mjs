import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import {
  harnessesWithAgent,
  parseRoleDescription,
  plannedFiles,
  readRoles,
  ROLE_NAMES,
  wrapperDirectories,
  wrapWords,
} from '../scripts/agentrite-roles.mjs';
import { installKit, KIT_SETTINGS } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

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

// Unit 0054, R6: the front matter of a role file.

const FOLDED = '---\ndescription: >-\n  Builds a unit\n  and keeps it true.\n---\n\n# Implementer\n';

test('parseRoleDescription reads the description on one line, trimmed', () => {
  assert.equal(parseRoleDescription('---\ndescription: Builds a unit.\n---\n\n# Role\n'), 'Builds a unit.');
  assert.equal(parseRoleDescription('---\ndescription:   Builds a unit.  \n---\n'), 'Builds a unit.');
});

test('parseRoleDescription reads the folded form as one line, joined by spaces', () => {
  assert.equal(parseRoleDescription(FOLDED), 'Builds a unit and keeps it true.');
  assert.equal(parseRoleDescription('---\ndescription: >-\n  One line only.  \n---\n'), 'One line only.');
});

test('parseRoleDescription reads both forms with CRLF line ends', () => {
  assert.equal(parseRoleDescription(FOLDED.replaceAll('\n', '\r\n')), 'Builds a unit and keeps it true.');
  assert.equal(parseRoleDescription('---\r\ndescription: Builds.\r\n---\r\n'), 'Builds.');
});

test('parseRoleDescription refuses a text with front matter not in one of the two forms', () => {
  for (const text of [
    '',
    '# Implementer\n',
    '\n---\ndescription: Builds.\n---\n',
    '---\ndescription: Builds.\n',
    '---\n---\n',
    '---\nname: implementer\n---\n',
    '---\ndescription: Builds.\nmode: all\n---\n',
    '---\nmode: all\ndescription: Builds.\n---\n',
    '---\ndescription:\n---\n',
    '---\ndescription:   \n---\n',
    '---\ndescription: >-\n---\n',
    '---\ndescription: >-\n Builds.\n---\n',
    '---\ndescription: >-\n    Builds.\n---\n',
    '---\ndescription: >-\n  Builds.\n\n  More.\n---\n',
    '---\ndescription: >-\n  Builds.\n  \n---\n',
    '---\n\ndescription: Builds.\n---\n',
    '---\ndescription: Builds.\n  More.\n---\n',
  ]) {
    assert.equal(parseRoleDescription(text), undefined, JSON.stringify(text));
  }
});

// The description of each fixture, the wrappers the kit wrote before the descriptions moved into the role files.
function fixtureDescription(name) {
  return unfoldedDescription(readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8'));
}

test('each kit role file opens with its description in the folded form, as its wrapper holds it', () => {
  for (const name of ROLE_NAMES) {
    const text = readFileSync(new URL(`../roles/${name}.md`, import.meta.url), 'utf-8');
    assert.equal(parseRoleDescription(text), fixtureDescription(name), name);
    const block = readFileSync(new URL(`./fixtures/claude-agents/${name}.md`, import.meta.url), 'utf-8').match(
      /^description: >-\n(?: {2}\S.*\n)+/m,
    )[0];
    assert.ok(text.startsWith(`---\n${block}---\n`), name);
  }
});

// A project with the kit installed, and a file of its own at each of `files`, with what it holds.
function projectWith(t, files = {}) {
  const base = temporaryDirectory(t, 'agentrite-roles-');
  installKit(base);
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  }
  return base;
}

const OWN_REVIEWER = '---\ndescription: Reviews as this project does.\n---\n\n# Our reviewer\n';

test('readRoles reads the four kit files of a project with the kit installed, in the order of the roles', (t) => {
  const roles = readRoles(projectWith(t), KIT_SETTINGS.roles);
  assert.deepEqual(
    roles,
    ROLE_NAMES.map((name) => ({
      name,
      path: `node_modules/agentrite/roles/${name}.md`,
      description: fixtureDescription(name),
    })),
  );
});

test('readRoles gives each of two roles that share a file that file and its description', (t) => {
  const base = projectWith(t, { 'rules/both.md': '---\ndescription: Specifies and plans.\n---\n' });
  const roles = readRoles(base, { ...KIT_SETTINGS.roles, specifier: 'rules/both.md', planner: 'rules/both.md' });
  assert.deepEqual(roles.slice(0, 2), [
    { name: 'specifier', path: 'rules/both.md', description: 'Specifies and plans.' },
    { name: 'planner', path: 'rules/both.md', description: 'Specifies and plans.' },
  ]);
});

test('readRoles refuses a role file without front matter, naming the file and the form it must have', (t) => {
  const base = projectWith(t, { 'rules/reviewer.md': '# Our reviewer\n' });
  assert.throws(() => readRoles(base, { ...KIT_SETTINGS.roles, reviewer: 'rules/reviewer.md' }), {
    message:
      'rules/reviewer.md has no front matter that a role file must open with. It must be a line ---, then either ' +
      'the line description: <text>, or the line description: >- followed by the text on lines indented by two ' +
      'spaces, then a line ---',
  });
});

test('readRoles refuses a role file it cannot read, naming it and the error', (t) => {
  const base = projectWith(t);
  mkdirSync(join(base, 'rules', 'reviewer.md'), { recursive: true });
  assert.throws(
    () => readRoles(base, { ...KIT_SETTINGS.roles, reviewer: 'rules/reviewer.md' }),
    (error) => {
      assert.ok(error.message.startsWith('cannot read rules/reviewer.md: '), error.message);
      assert.match(error.message, /EISDIR/);
      return true;
    },
  );
});

// Unit 0054, R7, R9: the wrappers from the role files the settings give.

function fixture(harness, name) {
  return readFileSync(new URL(`./fixtures/${harness}-agents/${name}.md`, import.meta.url), 'utf-8');
}

test('plannedFiles of both harnesses, from the kit role files, is the eight fixtures byte for byte', (t) => {
  const roles = readRoles(projectWith(t), KIT_SETTINGS.roles);
  assert.deepEqual(
    plannedFiles(['claude', 'opencode'], roles),
    ['claude', 'opencode'].flatMap((harness) =>
      ROLE_NAMES.map((name) => ({ path: `.${harness}/agents/${name}.md`, content: fixture(harness, name) })),
    ),
  );
  assert.deepEqual(
    plannedFiles(['opencode'], roles).map((file) => file.path),
    ROLE_NAMES.map((name) => `.opencode/agents/${name}.md`),
  );
});

test('a role whose file is replaced gets a wrapper with that file description and a body naming its path', (t) => {
  const base = projectWith(t, { 'rules/reviewer.md': OWN_REVIEWER });
  const roles = readRoles(base, { ...KIT_SETTINGS.roles, reviewer: 'rules/reviewer.md' });
  const files = plannedFiles(['claude', 'opencode'], roles);
  const body =
    'Read `rules/reviewer.md` in the project root and follow it. It is your instruction; this file holds none of ' +
    'its own.\n';
  assert.equal(
    files.find((file) => file.path === '.claude/agents/reviewer.md').content,
    `---\nname: reviewer\ndescription: >-\n  Reviews as this project does.\n---\n\n${body}`,
  );
  assert.equal(
    files.find((file) => file.path === '.opencode/agents/reviewer.md').content,
    `---\ndescription: >-\n  Reviews as this project does.\nmode: all\n---\n\n${body}`,
  );
  for (const name of ['specifier', 'planner', 'implementer']) {
    assert.equal(files.find((file) => file.path === `.claude/agents/${name}.md`).content, fixture('claude', name));
  }
});

test('two roles that share a file both get wrappers with its description, each naming the file', (t) => {
  const base = projectWith(t, { 'rules/reviewer.md': OWN_REVIEWER });
  const shared = { ...KIT_SETTINGS.roles, implementer: 'rules/reviewer.md', reviewer: 'rules/reviewer.md' };
  const roles = readRoles(base, shared);
  for (const name of ['implementer', 'reviewer']) {
    const wrapper = plannedFiles(['claude'], roles).find((file) => file.path === `.claude/agents/${name}.md`).content;
    assert.equal(unfoldedDescription(wrapper), 'Reviews as this project does.', name);
    assert.match(wrapper, new RegExp(`^name: ${name}$`, 'm'));
    assert.match(bodyOf(wrapper), /^Read `rules\/reviewer\.md` in the project root/);
  }
});

test('no line of a planned wrapper is over 120 characters, and its body names the role file', (t) => {
  const roles = readRoles(projectWith(t), KIT_SETTINGS.roles);
  for (const file of plannedFiles(['claude', 'opencode'], roles)) {
    const name = file.path.replace(/^.*\//, '').replace(/\.md$/, '');
    for (const line of file.content.split('\n')) {
      assert.ok(line.length <= 120, `${file.path} holds a line of ${line.length} characters`);
    }
    assert.equal(unfoldedDescription(file.content), fixtureDescription(name), file.path);
    assert.equal(
      bodyOf(file.content).split('\n').join(' '),
      `Read \`node_modules/agentrite/roles/${name}.md\` in the project root and follow it. ` +
        'It is your instruction; this file holds none of its own.',
      file.path,
    );
  }
});

test('wrapperDirectories gives the directory of each harness, in the order given', () => {
  assert.deepEqual(wrapperDirectories(['opencode', 'claude']), ['.opencode/agents', '.claude/agents']);
  assert.deepEqual(wrapperDirectories(['claude']), ['.claude/agents']);
});

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite-roles.mjs');
const scripts = join(import.meta.dirname, '..', 'scripts');
const root = join(import.meta.dirname, '..');

test('the module run by itself prints nothing and writes nothing', (t) => {
  const base = temporaryDirectory(t, 'agentrite-roles-');

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

// Unit 0056, R3: the names of the agents that the harnesses have of their own, written as their documentation does.

test('harnessesWithAgent names the harness of each of its own agents, without regard to case', () => {
  const table = {
    'Claude Code': ['Explore', 'Plan', 'general-purpose', 'claude', 'statusline-setup', 'claude-code-guide', 'fork'],
    OpenCode: ['build', 'plan', 'general', 'explore', 'scout', 'compaction', 'title', 'summary'],
  };
  for (const [title, names] of Object.entries(table)) {
    for (const name of names) {
      for (const form of [name, name.toLowerCase(), name.toUpperCase()]) {
        assert.ok(harnessesWithAgent(form).includes(title), `${form} is an agent of ${title}`);
      }
    }
  }
});

test('harnessesWithAgent gives both titles in order for plan and explore, and none for any other name', () => {
  assert.deepEqual(harnessesWithAgent('plan'), ['Claude Code', 'OpenCode']);
  assert.deepEqual(harnessesWithAgent('explore'), ['Claude Code', 'OpenCode']);
  assert.deepEqual(harnessesWithAgent('security-reviewer'), []);
  for (const name of ROLE_NAMES) assert.deepEqual(harnessesWithAgent(name), []);
});
