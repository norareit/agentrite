import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { HARNESSES } from '../scripts/agentrite-harness.mjs';

const repository = fileURLToPath(new URL('..', import.meta.url));
const dockerfile = readFileSync(join(repository, 'container', 'Dockerfile'), 'utf-8');
const compose = readFileSync(join(repository, 'container', 'compose.yml'), 'utf-8');

// The three build arguments by which the wrapper hands the image the project's harnesses, and the variable of the
// wrapper each comes from.
const ARGUMENTS = ['HARNESS_PACKAGES', 'HARNESS_RECORD', 'HARNESS_DIRECTORIES'];

const lastStage = dockerfile.slice(dockerfile.lastIndexOf('\nFROM '));

function filesUnder(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)],
  );
}

// 0097 R4
test('the last stage takes the harnesses as three build arguments, none with a default', () => {
  const lines = dockerfile.split('\n');
  for (const argument of ARGUMENTS) {
    assert.deepEqual(
      lines.filter((line) => line.trim().startsWith(`ARG ${argument}=`)),
      [],
    );
    assert.equal(lastStage.split('\n').filter((line) => line === `ARG ${argument}`).length, 1, argument);
  }
});

test('the last stage installs the packages of HARNESS_PACKAGES in one npm install', () => {
  const installs = lastStage.split('\n').filter((line) => line.includes('npm install -g'));
  assert.deepEqual(installs, ['RUN npm install -g --no-audit --no-fund ${HARNESS_PACKAGES} \\']);
});

test("the last stage records the harnesses as a label from HARNESS_RECORD, after it installed them", () => {
  const install = lastStage.indexOf('npm install -g');
  const declared = lastStage.indexOf('\nARG HARNESS_RECORD\n');
  const label = lastStage.indexOf('\nLABEL com.ritenoar.agentrite.harnesses="${HARNESS_RECORD}"\n');
  assert.notEqual(install, -1, 'the last stage installs the harnesses');
  assert.ok(declared > install, 'HARNESS_RECORD is declared after the install, so that it decides no install');
  assert.ok(label > declared, 'the label is set from it');
});

test('the last stage names no harness: no package, version argument or label of one', () => {
  for (const { name, sandbox } of HARNESSES) {
    assert.ok(!dockerfile.includes(sandbox.package), sandbox.package);
    assert.ok(!dockerfile.includes(sandbox.versionArgument), sandbox.versionArgument);
    assert.ok(!dockerfile.includes(`com.ritenoar.agentrite.${name}`), name);
  }
});

test("the base Compose file gives the three from the wrapper's own variables, and no version of a harness", () => {
  const lines = compose.split('\n').map((line) => line.trim());
  for (const argument of ARGUMENTS) {
    const given = lines.filter((line) => line.startsWith(`${argument}: \${SANDBOX_${argument}:?`));
    assert.equal(given.length, 1, `${argument} comes from SANDBOX_${argument}`);
  }
  for (const { sandbox } of HARNESSES) {
    assert.ok(!compose.includes(sandbox.versionArgument), sandbox.versionArgument);
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

/**
 * @param {string} text
 * @returns {string}
 */
function escaped(text) {
  return text.replaceAll(/[.*+?^${}()|[\]\\/]/g, '\\$&');
}

// A version written after a name of a harness, its title, its command, its package or its version argument, with or
// without quotes around the name or the version. It cannot find a version written with no such name before it. The
// names are those of the list, so that a harness added to it is searched for without an edit here.
const harnessNames = HARNESSES.flatMap(({ name, title, start, sandbox }) => [
  name,
  title,
  start.command,
  sandbox.package,
  sandbox.versionArgument,
]);
const versionOfAHarness = new RegExp(
  `(${[...new Set(harnessNames)].map((word) => escaped(word).replaceAll(/[ _-]/g, '[-_ ]?')).join('|')})` +
    `[-_a-z]*["']?[ @=:]+["']?v?\\d+\\.\\d+\\.\\d+`,
  'i',
);

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
    'RUN npm install -g --no-audit --no-fund ${HARNESS_PACKAGES}',
    'OpenCode fetches its model catalog from it',
    "Docker's embedded resolver on 127.0.0.11 is reached over loopback",
    'listening on 127.0.0.1:15443',
  ]) {
    assert.doesNotMatch(text, versionOfAHarness);
  }
});

// The versions SANDBOX.md holds are examples and are not searched.
test('no file under container/ or templates/ names a version of a harness', () => {
  const searched = [...filesUnder(join(repository, 'container')), ...filesUnder(join(repository, 'templates'))];
  const holding = searched
    .filter((file) => versionOfAHarness.test(readFileSync(file, 'utf-8')))
    .map((file) => relative(repository, file));
  assert.deepEqual(holding, []);
});
