import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const entrypoint = new URL('../container/entrypoint.sh', import.meta.url).pathname;

// Pull the check_home_owner function definition out of the entrypoint. It is defined
// as a function taking the agent uid and the home path, and references only die and
// stat, so the test can run it in isolation with its own versions of those two rather
// than sourcing the whole entrypoint (whose root check and PATH reset would interfere).
function guardSource() {
  const lines = readFileSync(entrypoint, 'utf-8').split('\n');
  const start = lines.findIndex((line) => line.startsWith('check_home_owner() {'));
  assert.notEqual(start, -1, 'check_home_owner is not defined in entrypoint.sh');
  let end = start;
  while (end < lines.length && lines[end] !== '}') end++;
  assert.ok(end < lines.length, 'check_home_owner is not closed in entrypoint.sh');
  return lines.slice(start, end + 1).join('\n');
}

// Run the guard in a fresh bash shell with a stubbed stat (reporting the volume's
// owner) and a recording die, and call it with the agent uid and home path under test.
function guard(t, { homeOwner, agentUid }) {
  const base = mkdtempSync(join(tmpdir(), 'entrypoint-home-'));
  const script = join(base, 'guard.sh');
  const died = join(base, 'died');
  writeFileSync(script, `
    set -euo pipefail
    die() { printf '[entrypoint] FATAL: %s\\n' "$*" >&2; echo 1 > "${died}"; exit 1; }
    stat() { printf '%s\\n' ${homeOwner}; }
    ${guardSource()}
    check_home_owner "${agentUid}" /home/agent  # the path the entrypoint checks
    echo 0 > "${died}"
  `);
  chmodSync(script, 0o755);
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const result = spawnSync('bash', [script], { encoding: 'utf-8' });
  const refused = readFileSync(died, 'utf-8').trim() === '1';
  return { status: result.status, stderr: result.stderr, refused };
}

test('a home owned by another uid is refused, naming both uids and the recovery', (t) => {
  const { status, stderr, refused } = guard(t, { homeOwner: 1000, agentUid: 501 });
  assert.equal(status, 1, stderr);
  assert.ok(refused, 'the guard should die when the home owner and agent uid differ');
  assert.match(stderr, /\/home\/agent is owned by uid 1000, but the agent is uid 501/);
  assert.match(stderr, /cannot write its home/);
  assert.match(stderr, /docker volume rm <project>_agent-home/);
});

test('a home the agent owns passes the guard, including a new one it owns', (t) => {
  const { status, stderr, refused } = guard(t, { homeOwner: 501, agentUid: 501 });
  assert.equal(status, 0, stderr);
  assert.ok(!refused, 'the guard should pass when the home owner is the agent uid');
  assert.doesNotMatch(stderr, /\/home\/agent is owned/);
});
