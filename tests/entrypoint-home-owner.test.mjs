import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, rmSync, mkdtempSync, mkdirSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';

const entrypoint = new URL('../container/entrypoint.sh', import.meta.url).pathname;

// Pull the check_home_owner guard and die out of the entrypoint so the test runs the
// guard that ships, not a copy. The guard references only die and stat, and stat is
// left real, so the one line that reads the owner, stat -c %u, runs against a real
// directory. A fresh bash script is used rather than sourcing the whole entrypoint,
// whose root check and PATH reset would interfere.
function guardSource() {
  const lines = readFileSync(entrypoint, 'utf-8').split('\n');
  function block(startRe, name) {
    const start = lines.findIndex((line) => startRe.test(line));
    assert.notEqual(start, -1, name + ' is not defined in entrypoint.sh');
    // die is a one-liner (`die() { ...; exit 1; }`); everything else closes on its own
    // line. A body that ends with `}` on its start line is taken as-is, otherwise the
    // block runs to the first standalone closing brace.
    if (/\}\s*$/.test(lines[start])) return lines[start];
    let end = start;
    while (end < lines.length && lines[end].trim() !== '}') end += 1;
    assert.ok(end < lines.length, name + ' is not closed in entrypoint.sh');
    return lines.slice(start, end + 1).join('\n');
  }
  return block(/^die\(\) \{/, 'die') + '\n' + block(/^check_home_owner\(\) \{/, 'check_home_owner');
}

// The home the agent would write is a real directory, owned by the user running the
// test. The real stat -c %u reports that owner; the guard passes when it equals the
// agent uid under test and dies when it does not.
function runGuard(t, agentUid) {
  const base = mkdtempSync(join(tmpdir(), 'entrypoint-home-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  const home = join(base, 'home');
  mkdirSync(home);
  const script = join(base, 'guard.sh');
  writeFileSync(script, `
    set -euo pipefail
    ${guardSource()}
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
