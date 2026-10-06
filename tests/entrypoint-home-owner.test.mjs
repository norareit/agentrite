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
//
// `guard` is the check to run. The home holds the directories above the two mounted log directories, which are
// what check_log_directory_owners compares, as real directories of the same user.
function runGuard(t, agentUid, guard = 'check_home_owner') {
  const base = mkdtempSync(join(tmpdir(), 'entrypoint-home-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const home = join(base, 'home');
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(join(home, '.local', 'share'), { recursive: true });
  const script = join(base, 'guard.sh');
  writeFileSync(script, `
    set -euo pipefail
    ${entrypointFunctions('die', 'home_volume_recovery', guard)}
    ${guard} "${agentUid}" "${home}"
  `);
  chmodSync(script, 0o755);
  return { home, ...spawnSync('bash', [script], { encoding: 'utf-8' }) };
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

// The directories above the two log directories the wrapper mounts. Docker makes a mount point that the home volume
// lacks, and every directory above it, as root, which is what a volume of an earlier release gets.
test('a home in which the agent owns the directories above the log mounts passes, and nothing is said', {
  skip: offLinux ? 'needs GNU stat, the guard runs in the Linux container' : false,
}, (t) => {
  const { status, stdout, stderr } = runGuard(t, realOwner(), 'check_log_directory_owners');
  assert.equal(status, 0, stderr);
  assert.equal(stdout + stderr, '');
});

test('a home in which another uid owns a directory above a log mount is refused, naming it and the recovery', {
  skip: offLinux ? 'needs GNU stat, the guard runs in the Linux container' : false,
}, (t) => {
  const owner = realOwner();
  const agentUid = Number(owner) === 1000 ? 501 : 1000;
  const { home, status, stderr } = runGuard(t, agentUid, 'check_log_directory_owners');
  assert.equal(status, 1, stderr);
  assert.ok(
    stderr.startsWith(
      `[entrypoint] FATAL: ${home}/.claude is owned by uid ${owner}, but the agent is uid ${agentUid}, so the ` +
        'agent cannot write it.\n',
    ),
    stderr,
  );
  assert.match(stderr, /The home volume was made by an earlier release, in which that directory was never made/);
  assert.match(stderr, /which discards the harnesses' saved logins, and starting again\./);
  assert.match(stderr, /^ {2}docker volume rm <project>_agent-home$/m);
  assert.doesNotMatch(stderr, /\.local/);
});
