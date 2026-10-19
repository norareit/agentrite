import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { after, test } from 'node:test';

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');

// The entries of a list of the sandbox service, such as `cap_add:`, read by indentation since the kit has no YAML
// parser: the lines after the key that open with `      - `, up to the first that does not.
function listEntries(key) {
  const lines = compose.split('\n');
  const start = lines.indexOf(`    ${key}:`);
  assert.notEqual(start, -1, `the sandbox service has a ${key} list`);
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('      - ')) break;
    entries.push(line.slice('      - '.length));
  }
  return entries;
}

function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf-8' }).trim();
}

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const containerName = `agentrite-signal-test-${process.pid}`;

after(() => {
  spawnSync('docker', ['rm', '-f', containerName], { stdio: 'ignore' });
});

async function sleep(milliseconds) {
  await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

function isRunning() {
  return docker('inspect', '-f', '{{.State.Running}}', containerName) === 'true';
}

// Docker's init runs as root and forwards a signal it receives to the command, which runs as the agent. Without
// the KILL capability the kernel refuses the forwarding and the init exits, which stops the container. The test
// starts a container with the settings of the compose file that decide this, and the drop to another user that
// the entrypoint makes, on the image the kit's Dockerfile builds on.
test(
  'a signal to the sandbox is forwarded to the command and does not stop the container',
  {
    skip: dockerLacking
      ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
      : false,
  },
  async () => {
    assert.deepEqual(
      compose.split('\n').filter((line) => line === '    init: true'),
      ['    init: true'],
      'the sandbox service runs with Docker init',
    );
    const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
    assert.ok(image, 'the Dockerfile has a base stage');

    docker(
      'run', '--detach', '--name', containerName, '--init',
      ...listEntries('cap_drop').flatMap((capability) => ['--cap-drop', capability]),
      ...listEntries('cap_add').flatMap((capability) => ['--cap-add', capability]),
      ...listEntries('security_opt').flatMap((option) => ['--security-opt', option]),
      image,
      'setpriv', '--reuid=1000', '--regid=1000', '--clear-groups', '--', 'sleep', '300',
    );
    await sleep(1000);
    assert.ok(isRunning(), 'the container is running before the signal');

    docker('kill', '-s', 'WINCH', containerName);
    await sleep(1000);
    assert.ok(isRunning(), 'SIGWINCH leaves the container running');
    assert.doesNotMatch(docker('logs', containerName), /tini/);

    docker('kill', '-s', 'TERM', containerName);
    docker('wait', containerName);
    assert.ok(!isRunning(), 'SIGTERM ends the command and the container stops');
    assert.doesNotMatch(spawnSync('docker', ['logs', containerName], { encoding: 'utf-8' }).stderr, /tini/);
  },
);
