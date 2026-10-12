import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { entrypointFunctions } from './entrypoint-function.mjs';
import { skipReason } from './skip-reason.mjs';

// parse_allowlist lowercases with ${var,,}, which needs bash 4, and the container's bash is 5. macOS ships bash 3.2,
// so the test runs only where bash is new enough, as it is in the container and on Linux. A host that skips it
// says where the whole suite runs.
const bashMajor = Number(spawnSync('bash', ['-c', 'echo "${BASH_VERSINFO[0]}"'], { encoding: 'utf-8' }).stdout);
const skip = bashMajor < 4 ? skipReason(`needs bash 4 or newer for \${var,,}, found bash ${bashMajor}`) : false;

// Runs the shipped parse_allowlist over the kit's list and the project's, the way the entrypoint does, with the
// environment the compose files would give it. A project list of `undefined` leaves ALLOWLIST unset.
function parse({ kit, project, canary = 'example.com' }) {
  const env = { PATH: process.env.PATH, FIREWALL_CANARY: canary, KIT_ALLOWLIST: kit };
  if (project !== undefined) env.ALLOWLIST = project;
  const script = `
    set -euo pipefail
    ${entrypointFunctions('die', 'read_allowlist', 'parse_allowlist')}
    parse_allowlist KIT_ALLOWLIST ALLOWLIST
    printf '%s\\n' "\${hosts[@]}"
  `;
  const result = spawnSync('bash', ['-c', script], { encoding: 'utf-8', env });
  return { ...result, hosts: result.stdout.split('\n').filter(Boolean) };
}

const KIT = 'api.anthropic.com\nregistry.npmjs.org\nmodels.opencode.ai\n';

test('the hosts of both lists are admitted, lowercased, each once', { skip }, () => {
  const result = parse({
    kit: KIT,
    project:
      "# the project's hosts\nGitHub.com\n\n  registry.npmjs.org  # listed by the kit too\nmodels.dev\ngithub.com\n",
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.hosts, [
    'api.anthropic.com',
    'registry.npmjs.org',
    'models.opencode.ai',
    'github.com',
    'models.dev',
  ]);
});

test('an empty project list admits the kit\'s hosts alone', { skip }, () => {
  const result = parse({ kit: KIT, project: '' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.hosts, ['api.anthropic.com', 'registry.npmjs.org', 'models.opencode.ai']);
});

test('a missing project list admits the kit\'s hosts alone', { skip }, () => {
  const result = parse({ kit: KIT, project: undefined });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.hosts, ['api.anthropic.com', 'registry.npmjs.org', 'models.opencode.ai']);
});

test('no host in either list is refused', { skip }, () => {
  const result = parse({ kit: '# nothing\n', project: '' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /FATAL: .*no hostnames/);
});

for (const entry of ['140.82.112.3', '140.82.112.0/20']) {
  for (const [list, lists] of [
    ['KIT_ALLOWLIST', { kit: `${KIT}${entry}\n`, project: '' }],
    ['ALLOWLIST', { kit: KIT, project: `github.com\n${entry}\n` }],
  ]) {
    test(`the address ${entry} in ${list} is refused, naming the list`, { skip }, () => {
      const result = parse(lists);
      assert.equal(result.status, 1);
      assert.match(result.stderr, new RegExp(`FATAL: ${list} entry ${entry.replaceAll('.', '\\.')} is an address`));
      assert.equal(result.stdout, '');
    });
  }
}

for (const [list, lists] of [
  ['KIT_ALLOWLIST', { kit: `${KIT}Example.com\n`, project: '' }],
  ['ALLOWLIST', { kit: KIT, project: 'Example.com\n' }],
]) {
  test(`the firewall canary in ${list} is refused`, { skip }, () => {
    const result = parse(lists);
    assert.equal(result.status, 1);
    assert.match(result.stderr, new RegExp(`FATAL: the firewall canary example\\.com is allowlisted in ${list}`));
    assert.equal(result.stdout, '');
  });
}
