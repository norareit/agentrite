import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repository = fileURLToPath(new URL('..', import.meta.url));
const dockerfile = readFileSync(join(repository, 'container', 'Dockerfile'), 'utf-8');
const compose = readFileSync(join(repository, 'container', 'compose.yml'), 'utf-8');

const harnesses = [
  {
    argument: 'CLAUDE_CODE_VERSION',
    label: 'com.ritenoar.agentrite.claude-code-version',
    npmPackage: '@anthropic-ai/claude-code',
  },
  { argument: 'OPENCODE_VERSION', label: 'com.ritenoar.agentrite.opencode-version', npmPackage: 'opencode-ai' },
];

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

test('the Dockerfile gives neither harness a version: no line gives its build argument a default', () => {
  const lines = dockerfile.split('\n');
  const lastStage = dockerfile.slice(dockerfile.lastIndexOf('\nFROM ')).split('\n');
  for (const { argument } of harnesses) {
    assert.deepEqual(
      lines.filter((line) => line.trim().startsWith(`ARG ${argument}=`)),
      [],
    );
    assert.equal(lastStage.filter((line) => line === `ARG ${argument}`).length, 1, `the last stage declares it`);
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
    const given = lines.filter((line) => line.startsWith(`${argument}: \${SANDBOX_${argument}:?`));
    assert.equal(given.length, 1, `${argument} comes from SANDBOX_${argument}`);
  }
});

// Unit 0078, R16: the image records the kit it was built from, which the wrapper compares with the installed kit.
test("the Dockerfile's last stage records the kit's version as a label from an argument with no default", () => {
  const lastStage = dockerfile.slice(dockerfile.lastIndexOf('\nFROM ')).split('\n');
  assert.deepEqual(
    dockerfile.split('\n').filter((line) => line.trim().startsWith('ARG AGENTRITE_VERSION=')),
    [],
  );
  const declared = lastStage.indexOf('ARG AGENTRITE_VERSION');
  assert.notEqual(declared, -1, 'the last stage declares AGENTRITE_VERSION');
  const label = lastStage.indexOf('LABEL com.ritenoar.agentrite.kit-version="${AGENTRITE_VERSION}"');
  assert.ok(label > declared, 'the last stage sets com.ritenoar.agentrite.kit-version from it, after declaring it');
  // Last, so that a new version of the kit changes no layer before it.
  const lastCopy = lastStage.findLastIndex((line) => line.startsWith('COPY '));
  assert.ok(declared > lastCopy, 'the argument is declared after the last COPY');
});

test("the base Compose file gives the kit's version from the wrapper's own variable", () => {
  const lines = compose.split('\n').map((line) => line.trim());
  const given = lines.filter((line) => line.startsWith('AGENTRITE_VERSION: ${SANDBOX_AGENTRITE_VERSION:?'));
  assert.equal(given.length, 1, 'AGENTRITE_VERSION comes from SANDBOX_AGENTRITE_VERSION');
});

// The wrapper asks the registry for the latest version of a package by its name, which the tests of the wrapper
// hold it to. These are the packages the Dockerfile installs.
test('the Dockerfile installs the packages the wrapper asks the registry about, each at its build argument', () => {
  for (const { argument, npmPackage } of harnesses) {
    assert.ok(dockerfile.includes(`"${npmPackage}@\${${argument}}"`), `the Dockerfile installs ${npmPackage}`);
  }
});

// A version written after a name of either harness, of its package or of its build argument, with or without
// quotes around the name or the version. It cannot find a version written with no such name before it.
const versionOfAHarness = /(claude[-_ ]?code|opencode)[-_a-z]*["']?[ @=:]+["']?v?\d+\.\d+\.\d+/i;

test('the search for a version of a harness finds one in the forms a file may write it in', () => {
  for (const text of [
    'ARG CLAUDE_CODE_VERSION=2.1.266',
    'ARG OPENCODE_VERSION="1.18.30"',
    'OPENCODE_VERSION: 1.2.3',
    'OPENCODE_VERSION: "1.2.3"',
    "CLAUDE_CODE_VERSION: '2.3.4'",
    '{"OPENCODE_VERSION": "1.2.3"}',
    '{ "CLAUDE_CODE_VERSION":"2.3.4" }',
    '"@anthropic-ai/claude-code@2.1.289"',
    'opencode-ai@1.18.34',
    'the kit pins Claude Code 2.1.288',
    'OPENCODE_VERSION: 0.0.0-dev-202610030456',
  ]) {
    assert.match(text, versionOfAHarness);
  }
});

test('the search for a version of a harness passes by an argument with no version, and an address', () => {
  for (const text of [
    'ARG CLAUDE_CODE_VERSION',
    'ARG OPENCODE_VERSION',
    "CLAUDE_CODE_VERSION: ${SANDBOX_CLAUDE_CODE_VERSION:?run the sandbox through the project's sandbox.sh}",
    '"opencode-ai@${OPENCODE_VERSION}"',
    'com.ritenoar.agentrite.opencode-version="${OPENCODE_VERSION}"',
    'OpenCode fetches its model catalog from it',
    "Docker's embedded resolver on 127.0.0.11 is reached over loopback",
    'listening on 127.0.0.1:15443',
  ]) {
    assert.doesNotMatch(text, versionOfAHarness);
  }
});

// The versions SANDBOX.md holds are examples and are not searched.
test('no file under container/ or templates/ names a version of either harness', () => {
  const searched = [...filesUnder(join(repository, 'container')), ...filesUnder(join(repository, 'templates'))];
  const holding = searched
    .filter((file) => versionOfAHarness.test(readFileSync(file, 'utf-8')))
    .map((file) => relative(repository, file));
  assert.deepEqual(holding, []);
});
