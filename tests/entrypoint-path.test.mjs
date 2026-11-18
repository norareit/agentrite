import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { DROP_TO_AGENT } from './entrypoint-drop.mjs';

// The entrypoint runs as root with a PATH of its own, and gives the agent's command the PATH it was started with,
// which Docker takes from the image. Its top level is no function, so these tests read its shipped lines out of the
// file, and run those that can be run on the host verbatim.
const entrypoint = readFileSync(new URL('../container/entrypoint.sh', import.meta.url), 'utf-8');
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');

const FIXED_PATH = '/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin';
const CAPTURE = 'image_path="$PATH"';
const EXPORT = `export PATH=${FIXED_PATH}`;

// The lines of the entrypoint that are neither blank nor comments, in their order.
const codeLines = entrypoint.split('\n').filter((line) => line.trim() !== '' && !line.trim().startsWith('#'));
const opening = codeLines.indexOf('set -euo pipefail');
const lastLine = codeLines.at(-1);

test('the entrypoint keeps the PATH it was started with and then sets its own, before anything else', () => {
  assert.notEqual(opening, -1, 'the entrypoint runs with set -euo pipefail');
  assert.deepEqual(codeLines.slice(opening + 1, opening + 3), [CAPTURE, EXPORT]);
});

test('no other line of the entrypoint sets the PATH', () => {
  const others = codeLines.filter((line, index) => index !== opening + 1 && index !== opening + 2 && line !== lastLine);
  assert.deepEqual(
    others.filter((line) => line.includes('PATH=') || /\bexport\s+PATH\b/.test(line)),
    [],
  );
});

test("the entrypoint gives the image's PATH only to what runs as the agent, through a script named by its path", () => {
  const drop = lastLine.match(DROP_TO_AGENT);
  assert.ok(drop, `the last line of the entrypoint is the drop to the agent: ${lastLine}`);
  assert.ok(drop[1].startsWith('/'), `the script the command runs through is named by an absolute path: ${drop[1]}`);
});

test('the entrypoint runs its own commands with the fixed PATH and the agent with the one it was started with', () => {
  const drop = lastLine.match(DROP_TO_AGENT);
  assert.ok(drop, `the last line of the entrypoint is the drop to the agent: ${lastLine}`);
  const handOver = lastLine.slice(lastLine.indexOf(' env ') + 1, lastLine.lastIndexOf(` ${drop[1]} `));
  const program = 'console.log(`agent ${process.env.PATH}`)';
  const script = [
    codeLines[opening + 1],
    codeLines[opening + 2],
    `printf 'root %s\\n' "$PATH"`,
    `${handOver} '${process.execPath}' -e '${program}'`,
  ].join('\n');
  const startedWith = `/opt/tool/bin:${process.env.PATH ?? ''}`;
  const result = spawnSync('bash', ['-c', script], { encoding: 'utf-8', env: { PATH: startedWith } });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `root ${FIXED_PATH}\nagent ${startedWith}\n`);
});

test("the kit's image sets no PATH, so it has the one of its base image", () => {
  const settingPath = dockerfile.split('\n').filter((line) => /^\s*ENV\s(?:.*\s)?PATH[=\s]/i.test(line));
  assert.deepEqual(settingPath, []);
});
