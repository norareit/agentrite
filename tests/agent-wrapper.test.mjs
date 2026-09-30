import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const wrapper = new URL('../container/agent.sh', import.meta.url).pathname;

// The merged configuration Compose reports for a project whose compose file supplies `buildArgs`.
function composeConfig(buildArgs) {
  return JSON.stringify({ name: 'project-agent', services: { agent: { image: 'image', build: { args: buildArgs } } } });
}

// A project with the kit's wrapper installed at `kitPath` under `root`, and a `docker` that records each call and
// the AGENT_KIT_CONTAINER it saw, answering only the three queries the wrapper makes before running Compose. Its
// merged configuration has the build arguments `buildArgs`.
function setUp(
  t,
  kitPath = 'node_modules/@ritenoar/agent-kit/container',
  buildArgs = { PLAYWRIGHT_VERSION: '1.59.1' },
) {
  const base = mkdtempSync(join(tmpdir(), 'agent-wrapper-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'project');
  mkdirSync(join(root, 'agent'), { recursive: true });
  writeFileSync(join(root, 'agent', 'compose.project.yml'), '');
  const container = join(base, kitPath);
  mkdirSync(container, { recursive: true });
  copyFileSync(wrapper, join(container, 'agent.sh'));
  chmodSync(join(container, 'agent.sh'), 0o755);
  const bin = join(base, 'bin');
  mkdirSync(bin);
  const calls = join(base, 'docker-calls');
  const config = join(base, 'compose-config.json');
  // Build arguments of `null` stand for a configuration Compose refuses, so the query fails.
  writeFileSync(config, buildArgs === null ? '' : composeConfig(buildArgs));
  writeFileSync(
    join(bin, 'docker'),
    `#!/usr/bin/env bash
if [ "$1 $2" = "image inspect" ]; then exit 0; fi
if [[ " $* " == *" config --images "* ]]; then echo image; exit 0; fi
if [[ " $* " == *" config --format json "* ]]; then
  [ -s "${config}" ] || { echo "validating compose.project.yml: invalid" >&2; exit 15; }
  cat "${config}"; exit 0
fi
echo "AGENT_KIT_CONTAINER=$AGENT_KIT_CONTAINER docker $*" >> "${calls}"
`,
  );
  chmodSync(join(bin, 'docker'), 0o755);
  const run = (...args) =>
    spawnSync(join(container, 'agent.sh'), args, {
      encoding: 'utf-8',
      env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
    });
  const dockerCalls = () => {
    try {
      return readFileSync(calls, 'utf-8').trim().split('\n');
    } catch {
      return [];
    }
  };
  return { base, root, container, run, dockerCalls };
}

test('the wrapper refuses to run without a project root, naming the shim', (t) => {
  const { run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agent-kit/container');
  const result = run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.match(result.stderr, /agent\.sh shim/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a project root that is not a directory', (t) => {
  const { base, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agent-kit/container');
  const result = run(join(base, 'no-such-directory'), '--rebuild');
  assert.equal(result.status, 2);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a kit outside the project root, which the build cannot reach', (t) => {
  const { root, run, dockerCalls } = setUp(t, 'elsewhere/container');
  const result = run(root);
  assert.equal(result.status, 2);
  assert.match(result.stderr, /is not inside the project root/);
  assert.match(result.stderr, /image build cannot reach it/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper runs Compose from the project root with the kit located relative to it', (t) => {
  const { root, container, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agent-kit/container');
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const expectedPrefix =
    'AGENT_KIT_CONTAINER=node_modules/@ritenoar/agent-kit/container docker compose ' +
    `--project-directory ${root} -f ${container}/compose.yml -f ${root}/agent/compose.project.yml`;
  assert.deepEqual(dockerCalls(), [
    `${expectedPrefix} build`,
    `${expectedPrefix} run --rm --volume ${root}:/work agent echo hi`,
  ]);
});

for (const [what, buildArgs] of [
  ['no build arguments of the project', {}],
  ['an empty PLAYWRIGHT_VERSION', { PLAYWRIGHT_VERSION: '' }],
]) {
  test(`the wrapper refuses a configuration with ${what}, naming the project's compose file, before building`, (t) => {
    const { root, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agent-kit/container', buildArgs);
    const result = run(root, '--rebuild');
    assert.equal(result.status, 2);
    assert.match(result.stderr, /PLAYWRIGHT_VERSION/);
    assert.match(result.stderr, new RegExp(`${root}/agent/compose\\.project\\.yml must supply`));
    assert.deepEqual(dockerCalls(), []);
  });
}

test("the wrapper stops with Compose's own error when Compose refuses the configuration", (t) => {
  const { root, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agent-kit/container', null);
  const result = run(root, '--rebuild');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /validating compose\.project\.yml: invalid/);
  assert.doesNotMatch(result.stderr, /SyntaxError|JSON/);
  assert.deepEqual(dockerCalls(), []);
});
