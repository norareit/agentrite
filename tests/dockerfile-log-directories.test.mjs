import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { logMounts } from './wrapper-fixture.mjs';

const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');

// The RUN instructions of the Dockerfile's last stage, which is the image, each on one line: a line that ends in a
// backslash continues on the next.
function runsOfLastStage(text) {
  const lastStage = text.slice(text.lastIndexOf('\nFROM '));
  return lastStage
    .replaceAll(/\\\n\s*/g, '')
    .split('\n')
    .filter((line) => line.startsWith('RUN '));
}

// Where the wrapper mounts the two log directories in the container, read from the flags it passes.
const mountPoints = [...logMounts('/logs').matchAll(/:(\/home\/agent\/\S+) /g)].map((match) => match[1]);

// The wrapper, the Dockerfile and the entrypoint each name the two directories, in a language of their own, and
// nothing can be shared between them. Docker fills a new home volume from the image, ownership included, before it
// mounts anything inside it, so a mount point the image holds as the agent's is found there. One the image lacks is
// made by Docker as root, with every directory above it, and the entrypoint then refuses the volume.
test("the image holds both log mount points, and they and all above them in the home are the agent's", () => {
  assert.deepEqual(mountPoints, ['/home/agent/.claude/projects', '/home/agent/.local/share/opencode']);
  const runs = runsOfLastStage(dockerfile);
  const account = runs.findIndex((run) => /\buseradd\b.* agent\b/.test(run) && !run.includes('egress-proxy'));
  assert.notEqual(account, -1, "a RUN of the last stage makes the agent's account");
  const made = runs.findIndex((run) => mountPoints.every((mountPoint) => run.includes(mountPoint)));
  assert.notEqual(made, -1, 'a RUN of the last stage names both mount points');
  assert.ok(made > account, "the mount points are made after the agent's account");
  assert.ok(runs[made].includes(`mkdir -p ${mountPoints.join(' ')} `), runs[made]);
  assert.ok(
    runs[made].endsWith('&& chown -R "${AGENT_UID}:${AGENT_GID}" /home/agent/.claude /home/agent/.local'),
    runs[made],
  );
});
