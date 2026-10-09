import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { fakeHost } from './wrapper-fixture.mjs';

// R7: a project that release 4.2.0 set up starts its sandbox after the four steps of the release notes and no
// others. The two files below are what `init` of that release wrote for a package named `my-app` with no
// Playwright, but for the path the kit is installed at, which is today's. The old names in them are what the steps
// are for.

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const kitContainer = join(import.meta.dirname, '..', 'container');
const kitPath = 'node_modules/agentrite/container';
const branch = 'task-0001-update';

const OLD_SHIM = `#!/usr/bin/env bash
#
# The sandbox is AgentRite's. This shim keeps it one command from the repository
# root; it holds no configuration of its own. The wrapper is documented in the kit's
# README.md, and this project's half of the configuration is in
# agent/compose.project.yml.
set -euo pipefail

here="$(cd "$(dirname "\${BASH_SOURCE[0]}")" && pwd)"
# The kit's wrapper takes the project root as its first argument, because where npm
# installs the kit says nothing reliable about where the project is.
exec "$here/node_modules/agentrite/container/agent.sh" "$here" "$@"
`;

const OLD_COMPOSE = `# This project's half of the agent sandbox configuration. It layers over the kit's base
# at node_modules/agentrite/container/compose.yml, which holds everything
# that confines the container and is the same for every project. Here is only what
# varies with the project: its names, what it is allowed to reach, how much of the host
# it may use, and, when it has browser tests, the Playwright version they were rendered with.
#
# The kit's container/agent.sh passes both files to Compose with --project-directory set
# to this repository, so relative paths resolve from the repository root.
name: my-app-agent

services:
  agent:
    image: my-app-agent

    # Leave the host usable. Overridable from the environment for a heavier run.
    mem_limit: \${AGENT_MEM_LIMIT:-8g}
    cpus: \${AGENT_CPUS:-6}

    environment:
      # Reachable hosts, over HTTPS on port 443 only, besides those the kit admits
      # itself: the Anthropic API, platform.claude.com, models.opencode.ai,
      # auth.openai.com, chatgpt.com, the npm registry and the kit's release host. See
      # KIT_ALLOWLIST in the kit's container/compose.yml. Everything else is denied.
      # Comments and blank lines are ignored. Entries are hostnames only; the
      # entrypoint refuses an address or a CIDR range, and fails to start if a listed
      # host is unreachable. The kit's README.md explains the boundary under "Egress".
      ALLOWLIST: |
        # Add the hosts this project needs, one per line: the API host of each model
        # provider its agents use besides Anthropic, such as api.openai.com, and what
        # its tools and tests reach, such as github.com for git over HTTPS.
`;

function setUp(t) {
  const base = mkdtempSync(join(tmpdir(), 'sandbox-update-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const root = join(base, 'project');
  const container = join(root, kitPath);
  mkdirSync(container, { recursive: true });
  for (const file of ['sandbox.sh', 'unit-clone.sh']) copyFileSync(join(kitContainer, file), join(container, file));
  chmodSync(join(container, 'sandbox.sh'), 0o755);
  mkdirSync(join(root, 'agent'));
  writeFileSync(join(root, 'package.json'), '{\n  "name": "my-app"\n}\n');
  writeFileSync(join(root, 'agent.sh'), OLD_SHIM, { mode: 0o755 });
  writeFileSync(join(root, 'agent', 'compose.project.yml'), OLD_COMPOSE);
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const host = fakeHost(base, ['AGENTRITE_CONTAINER']);
  const env = { HOME: home, PATH: host.bin };
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: { HOME: home, PATH: process.env.PATH } });
  git('init', '--quiet', '--initial-branch', 'master');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the project');
  git('branch', branch);
  const refresh = () => spawnSync(process.execPath, [script, 'refresh', 'claude'], { cwd: root, encoding: 'utf-8' });
  const sandbox = (...args) => spawnSync(join(root, 'sandbox.sh'), args, { cwd: root, encoding: 'utf-8', env });
  return { base, root, home, refresh, sandbox, ...host };
}

test('a project of the release before starts its sandbox after the four steps, and its names stay', (t) => {
  const { root, home, refresh, sandbox, dockerCalls } = setUp(t);

  // 1. refresh writes the shim and leaves the old files as they were
  const refreshed = refresh();
  assert.equal(refreshed.status, 0, refreshed.stderr);
  assert.match(refreshed.stdout, /^wrote sandbox\.sh$/m);
  assert.equal(lstatSync(join(root, 'sandbox.sh')).mode & 0o111, 0o111);
  assert.equal(readFileSync(join(root, 'agent.sh'), 'utf-8'), OLD_SHIM);
  assert.equal(readFileSync(join(root, 'agent', 'compose.project.yml'), 'utf-8'), OLD_COMPOSE);
  assert.doesNotMatch(refreshed.stdout + refreshed.stderr, /agent\.sh|agent\//);

  // 2. the old shim removed, the directory still named agent: the file of the new name is missing
  rmSync(join(root, 'agent.sh'));
  const missing = sandbox('--in-place', 'true');
  assert.equal(missing.status, 2);
  assert.ok(missing.stderr.includes(`${join(root, 'sandbox', 'compose.project.yml')} not found`), missing.stderr);

  // 3. the directory renamed, the service still agent: refused before anything is run
  renameSync(join(root, 'agent'), join(root, 'sandbox'));
  const refused = sandbox('--in-place', 'true');
  assert.equal(refused.status, 2);
  assert.match(refused.stderr, /rename agent: under services: to sandbox:/);
  assert.deepEqual(dockerCalls(), []);

  // 4. the service renamed: the sandbox starts
  const file = join(root, 'sandbox', 'compose.project.yml');
  writeFileSync(file, readFileSync(file, 'utf-8').replace(/^ {2}agent:$/m, '  sandbox:'));
  const started = sandbox('--in-place', 'true');
  assert.equal(started.status, 0, started.stderr);
  const [run] = dockerCalls().filter((call) => call.includes(' run '));
  assert.ok(run.includes(`-f ${join(root, 'sandbox', 'compose.project.yml')}`), run);
  assert.ok(run.endsWith('sandbox true'), run);

  // the project keeps its names: a unit run is named and cloned as before, and the limits are read as before
  const unit = sandbox(branch, 'true');
  assert.equal(unit.status, 0, unit.stderr);
  const calls = dockerCalls().join('\n');
  assert.ok(calls.includes(`--name my-app-agent-${branch} `), calls);
  const clone = join(home, '.local', 'state', 'agentrite', 'my-app-agent', branch);
  assert.ok(calls.includes(`--volume ${clone}:/work`), calls);
  const text = readFileSync(file, 'utf-8');
  assert.ok(text.includes('${AGENT_MEM_LIMIT:-8g}') && text.includes('${AGENT_CPUS:-6}'));
});
