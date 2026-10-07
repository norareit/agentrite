import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { rmSync, mkdtempSync, mkdirSync, writeFileSync, chmodSync, existsSync, readFileSync } from 'node:fs';
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
//
// check_log_directory_owners reads those as the agent, through setpriv. The suite is not root and has no account
// named agent, so a stand-in for setpriv is first on the PATH: it records its arguments, one call to a line, and
// runs what follows `--` as the user running the suite. `setprivCalls` is what it recorded.
//
// `prepare`, when given, is called with the home after it is made and before the guard runs.
function runGuard(t, agentUid, guard = 'check_home_owner', prepare = () => {}) {
  const base = mkdtempSync(join(tmpdir(), 'entrypoint-home-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const home = join(base, 'home');
  mkdirSync(join(home, '.claude'), { recursive: true });
  mkdirSync(join(home, '.local', 'share'), { recursive: true });
  const bin = join(base, 'bin');
  const calls = join(base, 'setpriv-calls');
  mkdirSync(bin);
  writeFileSync(join(bin, 'setpriv'), `#!/usr/bin/env bash
printf '%s\n' "$*" >> "${calls}"
while [ "$1" != "--" ]; do shift; done
shift
exec "$@"
`);
  chmodSync(join(bin, 'setpriv'), 0o755);
  const script = join(base, 'guard.sh');
  writeFileSync(script, `
    set -euo pipefail
    ${entrypointFunctions('die', 'home_volume_recovery', guard)}
    ${guard} "${agentUid}" "${home}"
  `);
  chmodSync(script, 0o755);
  prepare(home);
  const result = spawnSync('bash', [script], {
    encoding: 'utf-8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}` },
  });
  const setprivCalls = existsSync(calls) ? readFileSync(calls, 'utf-8').split('\n').filter(Boolean) : [];
  return { home, setprivCalls, ...result };
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

// The container's root holds none of the capabilities that let root pass a file's permissions, so it enters a
// directory only as any other user would, and a directory that admits its owner alone, as tools that follow the XDG
// convention make .local, is closed to it. The agent is the one who has to use these directories, so they are read
// as the agent. The suite's user owns what it makes and is not root, so it can show that the read goes through the
// user switch, and not the fault itself: that is shown on a real Docker, in the unit's record.
test('the directories above the log mounts are read as the agent, and the top of the home is not', {
  skip: offLinux ? 'needs GNU stat, the guard runs in the Linux container' : false,
}, (t) => {
  const { home, status, stderr, setprivCalls } = runGuard(t, realOwner(), 'check_log_directory_owners');
  assert.equal(status, 0, stderr);
  assert.deepEqual(
    setprivCalls,
    ['.claude', '.local', '.local/share'].map(
      (name) => `--reuid=agent --regid=agent --init-groups -- stat -c %u ${home}/${name}`,
    ),
  );
  assert.deepEqual(runGuard(t, realOwner()).setprivCalls, []);
});

test('a directory above a log mount that cannot be examined is refused by the entrypoint, not by stat', {
  skip: offLinux ? 'needs GNU stat, the guard runs in the Linux container' : false,
}, (t) => {
  // Closed to its owner too, so that reading what is in it fails for the user running the suite as it would for
  // anyone. Opened again once the guard has run, so that the home can be removed.
  const close = (home) => chmodSync(join(home, '.local'), 0o000);
  const { home, status, stderr } = runGuard(t, realOwner(), 'check_log_directory_owners', close);
  chmodSync(join(home, '.local'), 0o700);
  assert.equal(status, 1, stderr);
  assert.ok(
    stderr.startsWith(`[entrypoint] FATAL: ${home}/.local/share could not be examined as the agent`),
    stderr,
  );
  assert.match(stderr, /stat: cannot statx? '.*\/\.local\/share': Permission denied/);
  assert.match(stderr, /which discards the harnesses' saved logins, and starting again\./);
  assert.equal(stderr.trimEnd().split('\n').at(-1), '  docker volume rm <project>_agent-home');
});
