import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');
const wrapper = readFileSync(new URL('../container/sandbox.sh', import.meta.url), 'utf-8');

// The RUN instructions of the Dockerfile's last stage, which is the image, each on one line: a line that ends in a
// backslash continues on the next.
function runsOfLastStage(text) {
  const lastStage = text.slice(text.lastIndexOf('\nFROM '));
  return lastStage
    .replaceAll(/\\\n\s*/g, '')
    .split('\n')
    .filter((line) => line.startsWith('RUN '));
}

// 0097 R9: Docker fills a new home volume from the image, ownership included, before it mounts anything inside it,
// so a mount point the image holds as the agent's is found there. One the image lacks is made by Docker as root,
// with every directory above it, and the entrypoint then refuses the volume. The directories are those of the
// project's harnesses, which the wrapper hands the build as HARNESS_DIRECTORIES.
test("the image makes each log directory, and the directory of the home it is in, as the agent's", () => {
  const runs = runsOfLastStage(dockerfile);
  const account = runs.findIndex((run) => /\buseradd\b.* agent\b/.test(run) && !run.includes('egress-proxy'));
  assert.notEqual(account, -1, "a RUN of the last stage makes the agent's account");
  const made = runs.findIndex((run) => run.includes('${HARNESS_DIRECTORIES}'));
  assert.notEqual(made, -1, 'a RUN of the last stage goes over HARNESS_DIRECTORIES');
  assert.ok(made > account, "the log directories are made after the agent's account");
  const run = runs[made];
  assert.match(run, /for directory in \$\{HARNESS_DIRECTORIES\}; do /);
  assert.ok(run.includes('mkdir -p "/home/agent/$directory"'), run);
  assert.ok(run.includes('chown -R "${AGENT_UID}:${AGENT_GID}" "/home/agent/${directory%%/*}"'), run);
  assert.ok(run.includes('echo "$directory" >> /usr/local/lib/agentrite/log-directories'), run);
});

test('the wrapper hands the build the log directories of the project harnesses, from the helper', () => {
  assert.match(wrapper, /^export .*\bSANDBOX_HARNESS_DIRECTORIES\b/m);
  assert.match(wrapper, /^SANDBOX_HARNESS_DIRECTORIES="\$\{log_directories\[\*\]\}"$/m);
  assert.match(wrapper, /^ {6}directory\) log_directories\+=\("\$first"\) ;;$/m);
});
