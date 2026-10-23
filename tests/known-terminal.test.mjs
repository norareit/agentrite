import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { executablePaths } from './dockerfile-executables.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const knownTerminal = fileURLToPath(new URL('../container/known-terminal.sh', import.meta.url));
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');
const entrypoint = readFileSync(new URL('../container/entrypoint.sh', import.meta.url), 'utf-8');

// A command that prints its TERM, its COLORTERM and each of its arguments on a line of its own, as its environment
// holds them. A variable that is not set is printed as such, apart from an empty one. It is node and not a shell:
// bash, which is /bin/sh on macOS, gives itself a TERM=dumb when it has none, which its environment does not hold.
const printer = [
  process.execPath,
  '-e',
  'const shown = (name) => process.env[name] ?? "is not set";' +
    'console.log(`TERM ${shown("TERM")}\\nCOLORTERM ${shown("COLORTERM")}`);' +
    'for (const argument of process.argv.slice(1)) console.log(`[${argument}]`);',
];

// Runs the script with `env` as the whole environment, besides a PATH that holds a stand-in `infocmp` and nothing
// else. The stand-in exits 0 for the names in `known` and 1 for any other, as the real one does for a terminal it
// has a description of and one it has none of. It is `sh` with builtins alone, since nothing else is on the PATH.
// It knows `dumb`, as the image does: the script is `sh`, which is bash on macOS and gives itself a TERM=dumb when
// the environment holds none.
function runKnownTerminal(
  testContext,
  { env = {}, known = ['dumb', 'xterm', 'xterm-256color'], command = printer } = {},
) {
  const base = temporaryDirectory(testContext, 'known-terminal-');
  const infocmp = join(base, 'infocmp');
  writeFileSync(
    infocmp,
    '#!/bin/sh\n' +
      `for name in ${known.join(' ')}; do [ "$name" != "$1" ] || exit 0; done\n` +
      'exit 1\n',
  );
  chmodSync(infocmp, 0o755);
  return spawnSync(knownTerminal, command, { encoding: 'utf-8', env: { ...env, PATH: base } });
}

test('a TERM the image describes reaches the command as it is', (testContext) => {
  const result = runKnownTerminal(testContext, { env: { TERM: 'xterm-256color', COLORTERM: 'truecolor' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERM xterm-256color\nCOLORTERM truecolor\n');
});

test(
  'a TERM the image does not describe reaches the command as xterm-256color, with COLORTERM as it is',
  (testContext) => {
    const result = runKnownTerminal(testContext, { env: { TERM: 'xterm-ghostty', COLORTERM: 'truecolor' } });
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, 'TERM xterm-256color\nCOLORTERM truecolor\n');
  },
);

test('with no TERM and no COLORTERM, the command has neither', (testContext) => {
  const result = runKnownTerminal(testContext);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERM is not set\nCOLORTERM is not set\n');
});

test('with no COLORTERM, the command has none beside a TERM that is replaced', (testContext) => {
  const result = runKnownTerminal(testContext, { env: { TERM: 'xterm-ghostty' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERM xterm-256color\nCOLORTERM is not set\n');
});

// A command of `--connect` is given an empty TERM or COLORTERM for one its shell lacks, since a `docker exec` that
// gives none inherits the run's, and Docker cannot remove a variable. The script removes them.
test('an empty TERM and an empty COLORTERM reach the command as not set', (testContext) => {
  const result = runKnownTerminal(testContext, { env: { TERM: '', COLORTERM: '' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERM is not set\nCOLORTERM is not set\n');
});

test('an empty COLORTERM beside a TERM that is replaced reaches the command as not set', (testContext) => {
  const result = runKnownTerminal(testContext, { env: { TERM: 'xterm-ghostty', COLORTERM: '' } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERM xterm-256color\nCOLORTERM is not set\n');
});

test('the arguments reach the command as they were given', (testContext) => {
  const result = runKnownTerminal(testContext, { command: [...printer, 'one two', '', 'three'] });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'TERM is not set\nCOLORTERM is not set\n[one two]\n[]\n[three]\n');
});

test('the script exits with the status of the command', (testContext) => {
  const result = runKnownTerminal(testContext, { command: ['/bin/sh', '-c', 'exit 7'] });
  assert.equal(result.status, 7, result.stderr);
});

// The entrypoint runs the first command through the script, and `--connect` runs its command through it too, which
// a test of tests/sandbox-unit-run.test.mjs holds. Both name it by the path it has in the image, which is where the
// Dockerfile has to put it.
test('the image holds the script at the path the entrypoint runs the command through', () => {
  const through = entrypoint.match(/^exec setpriv --reuid=\S+ --regid=\S+ --init-groups -- (\S+) "\$@"$/m);
  assert.ok(through, "the entrypoint's last command runs the command through a script");
  const [, path] = through;
  assert.match(dockerfile, new RegExp(`^COPY \\$\\{KIT_CONTAINER\\}/known-terminal\\.sh ${path}$`, 'm'));
  assert.ok(executablePaths(dockerfile).includes(path), 'the Dockerfile makes the script executable');
});
