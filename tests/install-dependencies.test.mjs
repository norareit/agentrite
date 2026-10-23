import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { executablePaths } from './dockerfile-executables.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const installDependencies = fileURLToPath(new URL('../container/install-dependencies.sh', import.meta.url));
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');

const scriptLine = 'install-dependencies.sh: the clone is new, so its dependencies are installed with npm ci\n';

// Runs the script with `sh` in a directory of its own, with a PATH that holds a stand-in `npm` and nothing else. The
// stand-in records its arguments and its working directory, prints `npm out` on standard output and `npm err` on
// standard error, and exits with the status the file `npm-status` holds, 0 when there is none. It is `sh` with
// builtins alone, since nothing else is on the PATH.
function runInstall(testContext, command, { npmStatus } = {}) {
  const base = temporaryDirectory(testContext, 'install-dependencies-');
  const npm = join(base, 'npm');
  const calls = join(base, 'npm-calls');
  const status = join(base, 'npm-status');
  writeFileSync(
    npm,
    '#!/bin/sh\n' +
      `echo "$* in $PWD" >> "${calls}"\n` +
      'echo "npm out"\n' +
      'echo "npm err" >&2\n' +
      `if [ -f "${status}" ]; then read -r code < "${status}"; exit "$code"; fi\n` +
      'exit 0\n',
  );
  chmodSync(npm, 0o755);
  if (npmStatus !== undefined) writeFileSync(status, `${npmStatus}\n`);
  const result = spawnSync('/bin/sh', [installDependencies, ...command], {
    cwd: base,
    encoding: 'utf-8',
    env: { PATH: base },
  });
  const npmCalls = existsSync(calls) ? readFileSync(calls, 'utf-8').trim().split('\n') : [];
  return { result, base, npmCalls };
}

const nodeCommand = (script) => [process.execPath, '-e', script];

test('the script installs with npm ci and then runs the command, whose standard output is its own', (testContext) => {
  const { result, base, npmCalls } = runInstall(testContext, nodeCommand('console.log("command out")'));
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'command out\n');
  assert.equal(result.stderr, `${scriptLine}npm out\nnpm err\n`);
  assert.deepEqual(npmCalls, [`ci in ${base}`]);
});

test('the script exits with the status of the command', (testContext) => {
  const { result } = runInstall(testContext, nodeCommand('process.exit(3)'));
  assert.equal(result.status, 3, result.stderr);
});

test('an install that fails starts no command, and the script exits with npm status', (testContext) => {
  const base = temporaryDirectory(testContext, 'install-dependencies-marker-');
  const marker = join(base, 'started');
  const command = nodeCommand(
    `require("fs").writeFileSync(${JSON.stringify(marker)}, ""); console.log("command out")`,
  );
  const { result } = runInstall(testContext, command, { npmStatus: 7 });
  assert.equal(result.status, 7, result.stderr);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `${scriptLine}npm out\nnpm err\n`);
  assert.equal(existsSync(marker), false, 'the command was started');
});

test('the arguments reach the command as they were given', (testContext) => {
  const command = [
    ...nodeCommand('for (const argument of process.argv.slice(1)) console.log(`[${argument}]`)'),
    'one two',
    `it's "quoted"`,
    '',
  ];
  const { result } = runInstall(testContext, command);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `[one two]\n[it's "quoted"]\n[]\n`);
});

// container/sandbox.sh puts the script before the command of a unit run's new clone by the path it has in the image,
// which is where the Dockerfile has to put it.
test('the image holds the script at the path the wrapper runs the command through', () => {
  const path = '/usr/local/bin/install-dependencies.sh';
  assert.match(dockerfile, new RegExp(`^COPY \\$\\{KIT_CONTAINER\\}/install-dependencies\\.sh ${path}$`, 'm'));
  assert.ok(executablePaths(dockerfile).includes(path), 'the Dockerfile makes the script executable');
});
