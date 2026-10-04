import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const wrapper = new URL('../container/agent.sh', import.meta.url).pathname;

// The merged configuration Compose reports for a project whose compose file supplies `buildArgs`.
function composeConfig(buildArgs) {
  return JSON.stringify({ name: 'project-agent', services: { agent: { image: 'image', build: { args: buildArgs } } } });
}

// A project with the kit's wrapper installed at `kitPath` under `root`, and a `docker` that records each call and
// the AGENTRITE_CONTAINER it saw, answering only the two queries the wrapper makes before running Compose. Its
// merged configuration has the build arguments `buildArgs`, and the image it is asked about exists unless
// `imageExists` is false. The wrapper runs with a home of its own, `home`, which is empty until a test fills it,
// so that no test depends on what the home of whoever runs the suite holds.
function setUp(
  t,
  kitPath = 'node_modules/@ritenoar/agentrite/container',
  buildArgs = { PLAYWRIGHT_VERSION: '1.59.1' },
  imageExists = true,
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
  const home = join(base, 'home');
  mkdirSync(home);
  const bin = join(base, 'bin');
  mkdirSync(bin);
  const calls = join(base, 'docker-calls');
  const config = join(base, 'compose-config.json');
  // Build arguments of `null` stand for a configuration Compose refuses, so the query fails.
  writeFileSync(config, buildArgs === null ? '' : composeConfig(buildArgs));
  writeFileSync(
    join(bin, 'docker'),
    `#!/usr/bin/env bash
if [ "$1 $2" = "image inspect" ]; then exit ${imageExists ? 0 : 1}; fi
if [[ " $* " == *" config --images "* ]]; then
  [ -s "${config}" ] || { echo "validating compose.project.yml: invalid" >&2; exit 15; }
  echo image; exit 0
fi
echo "AGENTRITE_CONTAINER=$AGENTRITE_CONTAINER docker $*" >> "${calls}"
`,
  );
  chmodSync(join(bin, 'docker'), 0o755);
  const run = (...args) =>
    spawnSync(join(container, 'agent.sh'), args, {
      encoding: 'utf-8',
      env: { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}` },
    });
  const dockerCalls = () => {
    try {
      return readFileSync(calls, 'utf-8').trim().split('\n');
    } catch {
      return [];
    }
  };
  return { base, root, container, home, run, dockerCalls };
}

test('the wrapper refuses to run without a project root, naming the shim', (t) => {
  const { run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container');
  const result = run();
  assert.equal(result.status, 2);
  assert.match(result.stderr, /first argument must be the project root/);
  assert.match(result.stderr, /agent\.sh shim/);
  assert.deepEqual(dockerCalls(), []);
});

test('the wrapper refuses a project root that is not a directory', (t) => {
  const { base, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container');
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
  const { root, container, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container');
  const result = run(root, '--rebuild', 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const expectedPrefix =
    'AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container docker compose ' +
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
  test(`the wrapper goes on to build and run with ${what}`, (t) => {
    const kitPath = 'project/node_modules/@ritenoar/agentrite/container';
    const { root, container, run, dockerCalls } = setUp(t, kitPath, buildArgs);
    const result = run(root, '--rebuild', 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const expectedPrefix =
      'AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container docker compose ' +
      `--project-directory ${root} -f ${container}/compose.yml -f ${root}/agent/compose.project.yml`;
    assert.deepEqual(dockerCalls(), [
      `${expectedPrefix} build`,
      `${expectedPrefix} run --rm --volume ${root}:/work agent echo hi`,
    ]);
  });

  test(`the wrapper builds the missing image without --rebuild with ${what}`, (t) => {
    const kitPath = 'project/node_modules/@ritenoar/agentrite/container';
    const { root, container, run, dockerCalls } = setUp(t, kitPath, buildArgs, false);
    const result = run(root, 'echo', 'hi');
    assert.equal(result.status, 0, result.stderr);
    const expectedPrefix =
      'AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container docker compose ' +
      `--project-directory ${root} -f ${container}/compose.yml -f ${root}/agent/compose.project.yml`;
    assert.deepEqual(dockerCalls(), [
      `${expectedPrefix} build`,
      `${expectedPrefix} run --rm --volume ${root}:/work agent echo hi`,
    ]);
  });
}

test("the wrapper stops with Compose's own error when Compose refuses the configuration", (t) => {
  const { root, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container', null);
  const result = run(root, '--rebuild');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /validating compose\.project\.yml: invalid/);
  assert.doesNotMatch(result.stderr, /SyntaxError|JSON/);
  assert.deepEqual(dockerCalls(), []);
});

// The developer's Claude Code status line. The wrapper mounts the host's script and the kit's managed settings
// file that runs it, both or neither: Docker would create a root-owned directory at a script that is not there,
// and the settings without a script would blank a status line set inside the sandbox.
const statusLinePath = (home) => join(home, '.claude', 'statusline-command.sh');

function expectedRun(root, container, mounts = '') {
  return (
    'AGENTRITE_CONTAINER=node_modules/@ritenoar/agentrite/container docker compose ' +
    `--project-directory ${root} -f ${container}/compose.yml -f ${root}/agent/compose.project.yml ` +
    `run --rm --volume ${root}:/work ${mounts}agent echo hi`
  );
}

test("the wrapper mounts the host's status line script and the settings that run it, read-only", (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container');
  mkdirSync(join(home, '.claude'));
  writeFileSync(statusLinePath(home), 'echo line\n');
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  const mounts =
    `--volume ${statusLinePath(home)}:/etc/claude-code/statusline-command.sh:ro ` +
    `--volume ${container}/claude-managed-settings.json:/etc/claude-code/managed-settings.json:ro `;
  assert.deepEqual(dockerCalls(), [expectedRun(root, container, mounts)]);
});

test('the wrapper mounts neither without a status line script on the host, and creates nothing there', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container');
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [expectedRun(root, container)]);
  assert.deepEqual(readdirSync(home), []);
});

test('the wrapper mounts neither when a directory is where the status line script would be', (t) => {
  const { root, container, home, run, dockerCalls } = setUp(t, 'project/node_modules/@ritenoar/agentrite/container');
  mkdirSync(statusLinePath(home), { recursive: true });
  const result = run(root, 'echo', 'hi');
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [expectedRun(root, container)]);
  assert.deepEqual(readdirSync(statusLinePath(home)), []);
});
