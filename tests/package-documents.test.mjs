import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { posix } from 'node:path';
import { test } from 'node:test';

const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));

// npm packs the README whatever `files` says, and no other document, so the reference of the sandbox reaches a
// project only while the list names it.
test('the package ships the reference of the sandbox', () => {
  assert.ok(packageJson.files.includes('SANDBOX.md'), `files holds ${packageJson.files.join(', ')}`);
  assert.ok(existsSync(new URL('../SANDBOX.md', import.meta.url)), 'SANDBOX.md is a file at the root');
});

// R1 of unit 0052: the rules on how things are written reach a project only while the package holds them.
test('the package ships the standards, as a file at the root', () => {
  assert.ok(packageJson.files.includes('standards.md'), `files holds ${packageJson.files.join(', ')}`);
  assert.ok(existsSync(new URL('../standards.md', import.meta.url)), 'standards.md is a file at the root');
});

// Working on the kit is for whoever has the repository, and a project that installed the kit does not.
test('the package does not ship CONTRIBUTING.md', () => {
  assert.ok(!packageJson.files.includes('CONTRIBUTING.md'), `files holds ${packageJson.files.join(', ')}`);
});

// What the registry shows of the package, and what `npm publish` needs to accept it.
test('package.json names the package agentrite, with no private field', () => {
  assert.equal(packageJson.name, 'agentrite');
  assert.ok(!Object.hasOwn(packageJson, 'private'), 'package.json holds no key private');
});

test('package.json says what the package is, where it lives and under which license', () => {
  assert.equal(packageJson.license, 'MIT');
  assert.deepEqual(packageJson.repository, { type: 'git', url: 'git+https://github.com/norareit/agentrite.git' });
  assert.equal(packageJson.description, 'A kit for running coding agents by a fixed process');
  assert.deepEqual(packageJson.keywords, [
    'agents',
    'coding-agents',
    'claude-code',
    'opencode',
    'sandbox',
    'process',
  ]);
  assert.equal(packageJson.homepage, 'https://github.com/norareit/agentrite#readme');
  assert.deepEqual(packageJson.bugs, { url: 'https://github.com/norareit/agentrite/issues' });
});

test('package.json keeps the one command and the files the package holds', () => {
  assert.deepEqual(packageJson.bin, { agentrite: 'scripts/agentrite.mjs' });
  assert.deepEqual(packageJson.files, [
    'process.md',
    'standards.md',
    'orchestrator.json',
    'CHANGELOG.md',
    'SANDBOX.md',
    'roles',
    'templates',
    'scripts/check-changes.mjs',
    'scripts/agentrite-json.mjs',
    'scripts/agentrite-definition.mjs',
    'scripts/agentrite-outcome.mjs',
    'scripts/agentrite-headless.mjs',
    'scripts/agentrite-orchestrate.mjs',
    'scripts/agentrite-instructions.mjs',
    'scripts/agentrite-roles.mjs',
    'scripts/agentrite-units.mjs',
    'scripts/agentrite-approve.mjs',
    'scripts/agentrite-runs.mjs',
    'scripts/agentrite-run.mjs',
    'scripts/agentrite-settings.mjs',
    'scripts/agentrite-hook.mjs',
    'scripts/agentrite.mjs',
    'container',
  ]);
});

// A script of the package that imports a file the package does not hold fails in a project and passes here.
test('every file that a listed script imports by a relative path is itself listed', () => {
  const scripts = packageJson.files.filter((path) => path.startsWith('scripts/'));
  /** @type {string[]} */ const found = [];
  for (const script of scripts) {
    const source = readFileSync(new URL(`../${script}`, import.meta.url), 'utf-8');
    const imported = [...source.matchAll(/\bfrom '(\.[^']+)'/g)].map((match) => match[1]);
    for (const specifier of imported) {
      const path = posix.join(posix.dirname(script), specifier);
      assert.ok(packageJson.files.includes(path), `${script} imports ${path}, which files does not list`);
      found.push(path);
    }
  }
  // The imports are found at all, so that the loop above does not pass on nothing.
  assert.ok(found.includes('scripts/agentrite-roles.mjs'), `found ${found.join(', ')}`);
});

test('the package ships the default agentrite.json, as a template', () => {
  assert.ok(packageJson.files.includes('templates'), `files holds ${packageJson.files.join(', ')}`);
  assert.ok(existsSync(new URL('../templates/project/agentrite.json', import.meta.url)));
});

// R4 of unit 0065: the default definition, as the spec writes it.
const DEFAULT_DEFINITION = `{
  "steps": [
    { "role": "planner", "harness": "claude", "model": "claude-opus-5-5" },
    {
      "repeat": {
        "times": 3,
        "until": "no-findings",
        "steps": [
          {
            "role": "implementer",
            "harness": "claude",
            "model": "claude-sonnet-5-5",
            "prompt": "From round 2, this definition accepts review findings you agree with. Propose declining others."
          },
          {
            "role": "reviewer",
            "harness": "opencode",
            "model": "openai/gpt-6.1-sol"
          }
        ]
      }
    }
  ]
}
`;

test('the package ships the default definition of the orchestrator, as the spec writes it', () => {
  assert.ok(packageJson.files.includes('orchestrator.json'), `files holds ${packageJson.files.join(', ')}`);
  assert.equal(readDocument('orchestrator.json'), DEFAULT_DEFINITION);
});

// R26 of unit 0065: the README gives the default definition as its example, as it ships.
test('README.md holds the default definition of the orchestrator in a block marked json', () => {
  assert.ok(readDocument('README.md').includes(`\n\`\`\`json\n${DEFAULT_DEFINITION}\`\`\`\n`));
});

test('LICENSE is the MIT License at the root, with the copyright holder', () => {
  const license = new URL('../LICENSE', import.meta.url);
  assert.ok(existsSync(license), 'LICENSE is a file at the root');
  const lines = readFileSync(license, 'utf-8').split('\n');
  assert.equal(lines[0], 'MIT License');
  assert.ok(lines.includes('Copyright (c) 2026 Stef Klaassen'), 'LICENSE holds the copyright line');
});

// npm runs `prepublishOnly` on `npm publish` alone. Every other lifecycle script named here runs on an install or
// a pack as well, in this repository or in a project that installs the kit.
test('package.json checks a release in prepublishOnly, and holds no script that an install or a pack runs', () => {
  assert.equal(packageJson.scripts.prepublishOnly, 'node publish-check.mjs && npm test');
  for (const name of [
    'preinstall',
    'install',
    'postinstall',
    'prepublish',
    'preprepare',
    'prepare',
    'postprepare',
    'prepack',
    'postpack',
  ]) {
    assert.ok(!Object.hasOwn(packageJson.scripts, name), `scripts holds no ${name}`);
  }
});

// R1 of unit 0055: the package is named agentrite, so in this repository `npx agentrite` runs the working tree's
// command. The script runs the installed release's.
test('package.json runs the installed release of the kit as the script kit', () => {
  assert.equal(packageJson.scripts.kit, 'node node_modules/agentrite/scripts/agentrite.mjs');
});

test('the package does not ship the check of npm publish', () => {
  assert.ok(!packageJson.files.includes('publish-check.mjs'), `files holds ${packageJson.files.join(', ')}`);
});

// R11 of unit 0048, R17 of unit 0052 and R17 of unit 0054: the harness loads process.md and the project's
// standards, and the instruction to read them stays for what the loading misses. The standards are the file the
// list names, which may be the project's own.
test('each of the four role files says first to read process.md and the standards the list names', () => {
  for (const role of ['specifier', 'planner', 'implementer', 'reviewer']) {
    const text = readDocument(`roles/${role}.md`);
    const firstRead = text.split('\n\n').find((paragraph) => paragraph.startsWith('Read '));
    assert.ok(firstRead.startsWith("Read [process.md](../process.md) and the project's standards first"), role);
    assert.ok(firstRead.includes('`.agentrite/instructions.md`'), `roles/${role}.md: ${firstRead}`);
    const rules = /rules on how text,\s+documentation,\s+commits,\s+code\s+and\s+tests\s+are\s+written/;
    assert.match(firstRead, rules, role);
    assert.ok(!text.includes('../standards.md'), `roles/${role}.md links ../standards.md`);
  }
});

// R17 of unit 0054
test('no text of process.md or of a role file links standards.md or names it as the rules that hold', () => {
  const roleFiles = ['specifier', 'planner', 'implementer', 'reviewer'].map((role) => `roles/${role}.md`);
  for (const path of ['process.md', ...roleFiles]) {
    const text = readDocument(path);
    assert.doesNotMatch(text, /\]\((?:\.\.\/)?standards\.md\)/, path);
    assert.doesNotMatch(text, /(?:in|and|or) `standards\.md`/, path);
  }
  const process = readDocument('process.md');
  assert.match(process, /\* A rule in `process\.md` or in the project's standards is broken/);
  assert.ok(process.split('\n\n').slice(0, 3).join('\n\n').includes('`.agentrite/instructions.md`'));
});

// R18 of unit 0054
test('roles/reviewer.md sends to the role files the list names, and links none of the kit three', () => {
  const text = readDocument('roles/reviewer.md');
  for (const role of ['specifier', 'planner', 'implementer']) {
    assert.doesNotMatch(text, new RegExp(`\\]\\(${role}\\.md\\)`), role);
  }
  const firstRead = text.split('\n\n').find((paragraph) => paragraph.startsWith('Read '));
  const list = /the specifier, the planner and the implementer that\s+`\.agentrite\/instructions\.md`\s+names/;
  assert.match(firstRead, list);
  assert.match(firstRead, /instructions the work was produced\s+under/);
});

// R10 of unit 0056
test('roles/reviewer.md reads the file of each other role with an entry in the record, and of none without', () => {
  const firstRead = readDocument('roles/reviewer.md')
    .split('\n\n')
    .find((paragraph) => paragraph.startsWith('Read '));
  const flat = firstRead.replace(/\s+/g, ' ');
  for (const sentence of [
    "Read also the file of each role besides the four that has an entry in the unit's `record.md`, written as " +
      '`as the <name>`, by the path `.agentrite/instructions.md` names for it',
    'judge the work against it as against the three',
    'A role besides the four with no entry in `record.md` did not work on the unit, and its file is not read',
  ]) {
    assert.ok(flat.includes(sentence), sentence);
  }
});

const ROLE_NAMES = /specifier|planner|implementer|reviewer/i;

function readDocument(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), 'utf-8');
}

/** @param {string} directory */
function filesUnder(directory) {
  const root = new URL(`../${directory}/`, import.meta.url);
  return readdirSync(root, { recursive: true, encoding: 'utf-8' })
    .filter((path) => statSync(new URL(path, root)).isFile())
    .map((path) => `${directory}/${path}`);
}

// R6 and R7 of unit 0052: the process depends on no role, and its example of the log format shows one.
test('process.md names no role but in its example log entry, which names the implementer alone', () => {
  const text = readDocument('process.md');
  const example = text.match(/```markdown\n[\s\S]*?```\n/);
  assert.ok(example, 'process.md holds a fenced markdown block');
  assert.doesNotMatch(text.replace(example[0], ''), ROLE_NAMES);
  assert.ok(example[0].includes('as the implementer'), example[0]);
  assert.doesNotMatch(example[0].replaceAll('as the implementer', ''), ROLE_NAMES);
});

// R8 of unit 0052: the project's AGENTS.md names the role files, so that a role can be replaced or added. Since unit
// 0054 it does so by pointing to the list, which names them.
test('the section Roles of process.md names no role file and points to AGENTS.md and the list', () => {
  const section = readDocument('process.md').split(/^## Roles$/m)[1];
  assert.ok(section, 'process.md has a section Roles');
  const body = section.split(/^## /m)[0];
  assert.doesNotMatch(body, /roles\//);
  assert.ok(body.includes('`AGENTS.md`'), body);
  assert.ok(body.includes('`.agentrite/instructions.md`'), body);
  assert.match(body, /this document, the project's standards and the\s+project's `AGENTS\.md` alone/);
});

// R10 and R13 of unit 0052, and R10 of unit 0074: the kit's text names no status planned, and the template gives the
// five statuses.
test('no text of the kit names the status planned, and the record template gives the five statuses', () => {
  const paths = [
    'process.md',
    'standards.md',
    'README.md',
    ...filesUnder('roles'),
    ...filesUnder('templates'),
  ];
  assert.ok(paths.includes('roles/planner.md') && paths.includes('templates/changes/record.md'), paths.join(', '));
  for (const path of paths) {
    const text = readDocument(path);
    assert.ok(!text.includes('`planned`') && !text.includes('| planned'), `${path} names the status planned`);
  }
  const lines = readDocument('templates/changes/record.md').split('\n');
  assert.ok(
    lines.includes('status: [draft | approved | in-progress | implemented | cancelled]'),
    lines.slice(0, 6).join('\n'),
  );
});

// R14 of unit 0052: a bug that needs no plan is found by these words in its record.
test('roles/planner.md gives the words a record holds for a unit that needs no plan', () => {
  assert.ok(readDocument('roles/planner.md').includes('needs no plan'));
});
