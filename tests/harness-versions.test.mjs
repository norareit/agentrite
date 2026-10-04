import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const repository = new URL('..', import.meta.url).pathname;
const dockerfile = readFileSync(join(repository, 'container', 'Dockerfile'), 'utf-8');
const compose = readFileSync(join(repository, 'container', 'compose.yml'), 'utf-8');

// Three numbers separated by dots, optionally followed by a hyphen and a pre-release part.
const version = /^\d+\.\d+\.\d+(-[0-9A-Za-z.-]+)?$/;

const harnesses = [
  { argument: 'CLAUDE_CODE_VERSION', label: 'com.ritenoar.agentrite.claude-code-version' },
  { argument: 'OPENCODE_VERSION', label: 'com.ritenoar.agentrite.opencode-version' },
];

// What follows `ARG <argument>=` on each line that starts with it. The wrapper reads the kit's pin from these
// lines, and a release bumps them, so there is one of each and it holds a version and nothing else.
function pins(argument) {
  const opening = `ARG ${argument}=`;
  return dockerfile
    .split('\n')
    .filter((line) => line.startsWith(opening))
    .map((line) => line.slice(opening.length));
}

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

test('the Dockerfile pins each harness once, as the default of its build argument', () => {
  for (const { argument } of harnesses) {
    const found = pins(argument);
    assert.equal(found.length, 1, `one line starts with ARG ${argument}=`);
    assert.match(found[0], version);
  }
});

test("the Dockerfile's last stage records both versions as labels, after it installed them", () => {
  const lastStage = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));
  const install = lastStage.indexOf('npm install -g');
  assert.notEqual(install, -1, 'the last stage installs the harnesses');
  const afterInstall = lastStage.slice(install);
  const instruction = afterInstall.match(/^LABEL (.*\\\n)*.*$/m);
  assert.notEqual(instruction, null, 'a LABEL follows the install');
  for (const { argument, label } of harnesses) {
    assert.ok(instruction[0].includes(`${label}="\${${argument}}"`), `${label} is set from ${argument}`);
  }
});

test("the base Compose file gives both build arguments from the wrapper's own variables", () => {
  const lines = compose.split('\n').map((line) => line.trim());
  for (const { argument } of harnesses) {
    const given = lines.filter((line) => line.startsWith(`${argument}: \${AGENT_${argument}:?`));
    assert.equal(given.length, 1, `${argument} comes from AGENT_${argument}`);
  }
});

test('no file that ships holds a pinned version but the Dockerfile', () => {
  const pinned = harnesses.map(({ argument }) => pins(argument)[0]);
  const shipped = [
    ...filesUnder(join(repository, 'container')),
    ...filesUnder(join(repository, 'templates')),
    join(repository, 'README.md'),
  ];
  const holding = shipped
    .filter((file) => file !== join(repository, 'container', 'Dockerfile'))
    .filter((file) => pinned.some((pin) => readFileSync(file, 'utf-8').includes(pin)))
    .map((file) => relative(repository, file));
  assert.deepEqual(holding, []);
  const lines = dockerfile.split('\n');
  for (const pin of pinned) {
    assert.equal(lines.filter((line) => line.includes(pin)).length, 1, `${pin} is written once in the Dockerfile`);
  }
});
