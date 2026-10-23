import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { containerProject, containerUnitBranch } from './wrapper-fixture.mjs';

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const skip = dockerLacking
  ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
  : false;

// Named after the process, because Docker's container names are shared by every suite that runs on the host.
const project = `project-install-${process.pid}`;

const scriptLine = 'install-dependencies.sh: the clone is new, so its dependencies are installed with npm ci\n';

// The lockfile that `npm install` writes for the package `p` with the dependency `local` as `file:local`. A link to a
// directory of the project, so that the install needs no registry.
const lockfile = {
  name: 'p',
  version: '1.0.0',
  lockfileVersion: 3,
  requires: true,
  packages: {
    '': { name: 'p', version: '1.0.0', dependencies: { local: 'file:local' } },
    local: { version: '1.0.0' },
    'node_modules/local': { resolved: 'local', link: true },
  },
};

// A project of `containerProject` whose unit's branch also holds the package `p`, with `scripts` in its
// package.json, its dependency `local`, the lockfile of the two, and an .npmrc that keeps npm from asking the
// registry for an audit or for funding. Returns the project and a function that runs the wrapper with the unit and
// `command`.
function setUp(testContext, scripts) {
  const host = containerProject(testContext, 'sandbox-install-', project);
  const { root, git, wrapper, environment } = host;
  testContext.after(() => spawnSync('docker', ['rm', '-f', `${project}-${containerUnitBranch}`], { stdio: 'ignore' }));
  git('checkout', '--quiet', containerUnitBranch);
  const json = (value) => `${JSON.stringify(value, null, 2)}\n`;
  writeFileSync(
    join(root, 'package.json'),
    json({ name: 'p', version: '1.0.0', ...(scripts ? { scripts } : {}), dependencies: { local: 'file:local' } }),
  );
  mkdirSync(join(root, 'local'));
  writeFileSync(join(root, 'local', 'package.json'), json({ name: 'local', version: '1.0.0' }));
  writeFileSync(join(root, 'package-lock.json'), json(lockfile));
  writeFileSync(join(root, '.npmrc'), 'audit=false\nfund=false\n');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the package');
  git('checkout', '--quiet', 'master');
  const run = (...command) =>
    spawnSync(wrapper, [root, containerUnitBranch, ...command], { encoding: 'utf-8', env: environment });
  return { ...host, run };
}

const installed = ['sh', '-c', 'test -L node_modules/local && echo installed'];

// Unit 0083, R1, R4, R5: the install runs in the container before the command, and what npm prints is on standard
// error, so that standard output is the command's alone.
test('a unit run of a new clone installs its dependencies before the command', { skip }, (testContext) => {
  const { run } = setUp(testContext);
  const result = run(...installed);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'installed\n');
  const line = result.stderr.indexOf(scriptLine);
  assert.ok(line >= 0, result.stderr);
  assert.ok(result.stderr.indexOf('added 1 package', line) > line, result.stderr);
});

// Unit 0083, R6: an install that fails starts no command, and the wrapper exits with npm's status.
test('a unit run whose install fails starts no command and exits with the status of npm', { skip }, (testContext) => {
  const { run } = setUp(testContext, { preinstall: 'exit 7' });
  const result = run('sh', '-c', 'echo the command ran >&2; echo the command ran');
  assert.equal(result.status, 7, result.stderr);
  assert.equal(result.stdout, '');
  assert.ok(result.stderr.includes(scriptLine), result.stderr);
  assert.doesNotMatch(result.stderr, /the command ran/);
});

// Unit 0083, R3: a clone that an earlier run left, kept by a file that is not committed, is resumed as it is.
test('a unit run that resumes a clone installs nothing', { skip }, (testContext) => {
  const { run } = setUp(testContext);
  const first = run('sh', '-c', 'echo kept > kept.txt');
  assert.equal(first.status, 0, first.stderr);
  assert.ok(first.stderr.includes(scriptLine), first.stderr);
  const second = run(...installed);
  assert.equal(second.status, 0, second.stderr);
  assert.equal(second.stdout, 'installed\n');
  assert.match(second.stderr, /resuming the clone/);
  assert.ok(!second.stderr.includes('install-dependencies.sh'), second.stderr);
});
