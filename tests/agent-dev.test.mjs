import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const shim = new URL('../agent-dev.sh', import.meta.url).pathname;
const wrapper = new URL('../container/agent.sh', import.meta.url).pathname;
const projectCompose = readFileSync(new URL('../agent/compose.project.yml', import.meta.url), 'utf-8');

const devName = 'ritenoar-agentrite-agent-dev';
const nameFromVariable = '${AGENT_PROJECT_NAME:-ritenoar-agentrite-agent}';

// A checkout holding copies of the shim and of the working copy's wrapper, and a `docker` that says the image
// exists, answers the wrapper's query for the image name, and records every other call with the
// AGENT_PROJECT_NAME and the AGENTRITE_CONTAINER it saw.
function setUp(t) {
  const base = mkdtempSync(join(tmpdir(), 'agent-dev-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'checkout');
  mkdirSync(join(root, 'agent'), { recursive: true });
  writeFileSync(join(root, 'agent', 'compose.project.yml'), '');
  mkdirSync(join(root, 'container'));
  for (const [from, to] of [
    [shim, join(root, 'agent-dev.sh')],
    [wrapper, join(root, 'container', 'agent.sh')],
  ]) {
    copyFileSync(from, to);
    chmodSync(to, 0o755);
  }
  const bin = join(base, 'bin');
  mkdirSync(bin);
  const calls = join(base, 'docker-calls');
  writeFileSync(
    join(bin, 'docker'),
    `#!/usr/bin/env bash
if [ "$1 $2" = "image inspect" ]; then exit 0; fi
if [[ " $* " == *" config --images "* ]]; then echo image; exit 0; fi
echo "AGENT_PROJECT_NAME=$AGENT_PROJECT_NAME AGENTRITE_CONTAINER=$AGENTRITE_CONTAINER docker $*" >> "${calls}"
`,
  );
  chmodSync(join(bin, 'docker'), 0o755);
  const run = (args, env = {}) =>
    spawnSync(join(root, 'agent-dev.sh'), args, {
      encoding: 'utf-8',
      env: { ...process.env, ...env, PATH: `${bin}:${process.env.PATH}` },
    });
  const dockerCalls = () => {
    try {
      return readFileSync(calls, 'utf-8').trim().split('\n');
    } catch {
      return [];
    }
  };
  // What every recorded call opens with: the dev name, and Compose run by the checkout's own wrapper.
  const prefix =
    `AGENT_PROJECT_NAME=${devName} AGENTRITE_CONTAINER=container docker compose ` +
    `--project-directory ${root} -f ${root}/container/compose.yml -f ${root}/agent/compose.project.yml`;
  return { base, root, run, dockerCalls, prefix };
}

// The wrapper builds only a missing image or on --rebuild, and a run on an image built before the change under
// test exits 0 all the same, so the shim asks for the build itself.
test("the shim runs the checkout's own wrapper, and builds before it runs although the image exists", (t) => {
  const { root, run, dockerCalls, prefix } = setUp(t);
  const result = run([]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${prefix} build`, `${prefix} run --rm --volume ${root}:/work agent`]);
});

// The release sandbox's image and home volume are safe only while the name is the shim's to set.
test('the shim sets the dev name over one the caller had set', (t) => {
  const { root, run, dockerCalls, prefix } = setUp(t);
  const result = run([], { AGENT_PROJECT_NAME: 'ritenoar-agentrite-agent' });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [`${prefix} build`, `${prefix} run --rm --volume ${root}:/work agent`]);
});

test("the shim passes the wrapper's options and the command on", (t) => {
  const { base, run, dockerCalls, prefix } = setUp(t);
  const workdir = join(base, 'elsewhere');
  const mounted = join(base, 'mounted');
  mkdirSync(workdir);
  mkdirSync(mounted);
  const result = run(['--workdir', workdir, '--mount', `${mounted}:ro`, 'echo', 'hi']);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(dockerCalls(), [
    `${prefix} build`,
    `${prefix} run --rm --volume ${workdir}:/work --volume ${mounted}:/mnt/mounted:ro agent echo hi`,
  ]);
});

// With the variable unset both resolve to the names ./agent.sh has always used, and with the shim's value to a
// project, an image and so a home volume of their own.
test("this repository's project Compose file names its project and its image after the variable", () => {
  const lines = projectCompose.split('\n');
  assert.deepEqual(
    lines.filter((line) => line.startsWith('name:')),
    [`name: ${nameFromVariable}`],
  );
  assert.deepEqual(
    lines.map((line) => line.trim()).filter((line) => line.startsWith('image:')),
    [`image: ${nameFromVariable}`],
  );
});
