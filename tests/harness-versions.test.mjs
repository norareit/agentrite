import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { test } from 'node:test';

const repository = new URL('..', import.meta.url).pathname;
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
    const given = lines.filter((line) => line.startsWith(`${argument}: \${AGENT_${argument}:?`));
    assert.equal(given.length, 1, `${argument} comes from AGENT_${argument}`);
  }
});

// The wrapper asks the registry for the latest version of a package by its name, which the tests of the wrapper
// hold it to. These are the packages the Dockerfile installs.
test('the Dockerfile installs the packages the wrapper asks the registry about, each at its build argument', () => {
  for (const { argument, npmPackage } of harnesses) {
    assert.ok(dockerfile.includes(`"${npmPackage}@\${${argument}}"`), `the Dockerfile installs ${npmPackage}`);
  }
});

// A search for a version written after a name of either harness, of its package or of its build argument. It
// cannot find a version written with no such name before it. The versions the README holds are examples and are
// not searched.
test('no file under container/ or templates/ names a version of either harness', () => {
  const searched = [...filesUnder(join(repository, 'container')), ...filesUnder(join(repository, 'templates'))];
  const versionOfAHarness = /(claude[-_ ]?code|opencode)[-_a-z]*[ @=:]+v?\d+\.\d+\.\d+/i;
  const holding = searched
    .filter((file) => versionOfAHarness.test(readFileSync(file, 'utf-8')))
    .map((file) => relative(repository, file));
  assert.deepEqual(holding, []);
});
