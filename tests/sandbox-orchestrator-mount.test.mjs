import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { containerProject, containerUnitBranch } from './wrapper-fixture.mjs';

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const skip = dockerLacking
  ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
  : false;

// Named after the process, because Docker's container names are shared by every suite that runs on the host.
const project = `project-orchestrator-${process.pid}`;

// Unit 0065, R25, R31: what the agent writes at /work/.orchestrator in a unit run reaches the host's .orchestrator,
// which the wrapper made as the developer, and not Docker as root.
test("a unit run mounts the host's .orchestrator, made as the developer", { skip }, (testContext) => {
  const { root, wrapper, environment } = containerProject(testContext, 'sandbox-orchestrator-mount-', project);
  testContext.after(() => spawnSync('docker', ['rm', '-f', `${project}-${containerUnitBranch}`], { stdio: 'ignore' }));
  rmSync(join(root, '.orchestrator'), { recursive: true, force: true });

  const result = spawnSync(
    wrapper,
    [root, containerUnitBranch, 'sh', '-c', 'echo seen > /work/.orchestrator/seen'],
    { encoding: 'utf-8', env: environment },
  );

  assert.equal(result.status, 0, result.stderr);
  assert.equal(readFileSync(join(root, '.orchestrator', 'seen'), 'utf-8'), 'seen\n');
  assert.equal(statSync(join(root, '.orchestrator')).uid, process.getuid());
});
