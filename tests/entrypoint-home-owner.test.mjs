import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync, mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { entrypointFunctions } from './entrypoint-function.mjs';

// The guard references only die and stat, and stat is left real, so the one line that reads
// the owner, stat -c %u, runs against a real directory. The home the agent would write is
// a real directory, owned by the user running the test. The real stat -c %u reports that
// owner; the guard passes when it equals the agent uid under test and dies when it does not.
function runGuard(t, agentUid) {
  const base = mkdtempSync(join(tmpdir(), 'entrypoint-home-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const home = join(base, 'home');
  mkdirSync(home);
  const script = join(base, 'guard.sh');
  writeFileSync(script, `
    set -euo pipefail
    ${entrypointFunctions('die', 'home_volume_recovery', 'check_home_owner')}
    check_home_owner "${agentUid}" "${home}"
  `);
  chmodSync(script, 0o755);
  return spawnSync('bash', [script], { encoding: 'utf-8' });
}
const realOwner = () => String(process.getuid());

// The guard reads the owner with GNU stat -c %u, which is what the Linux container provides.
// On a BSD host (macOS) the same option is illegal, so run the guard only on Linux.
const offLinux = process.platform !== 'linux';

test('a home owned by another uid is refused, naming both uids and the recovery', {
  skip: offLinux ? 'needs GNU stat, the guard runs in the Linux container' : false,
}, (t) => {
  const owner = realOwner();
  const agentUid = Number(owner) === 1000 ? 501 : 1000;
  const { status, stderr } = runGuard(t, agentUid);
  assert.equal(status, 1, stderr);
  assert.match(stderr, new RegExp(`${owner}, but the agent is uid ${agentUid}`));
  assert.match(stderr, /cannot write its home/);
  assert.match(stderr, /docker volume rm <project>_agent-home/);
});

test('a home the agent owns passes the guard, including a new one it owns', {
  skip: offLinux ? 'needs GNU stat, the guard runs in the Linux container' : false,
}, (t) => {
  const { status, stderr } = runGuard(t, realOwner());
  assert.equal(status, 0, stderr);
  assert.doesNotMatch(stderr, /is owned by uid/);
});
