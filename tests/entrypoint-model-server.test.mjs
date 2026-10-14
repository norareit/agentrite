import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { entrypointFunctions } from './entrypoint-function.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

// A stand-in for getent that answers as glibc's did in the sandbox's image on Docker Desktop 4.95.0, for
// host.docker.internal with the addresses in ADDRESSES, in the order of /etc/hosts: `getent hosts` gives the first
// IPv6 address when there is one and else the first IPv4 one, and `getent ahostsv4` gives each IPv4 address three
// times. Any other lookup gives nothing and exits 2, as glibc's does for a name it does not find, so that a lookup
// the stand-in was not written for fails the test rather than passing it. macOS has no getent, so every host runs
// this one.
const getentStandIn = [
  '#!/usr/bin/env bash',
  '[ "$2" = host.docker.internal ] || exit 2',
  'v4=(); v6=()',
  'for address in $ADDRESSES; do',
  '  case "$address" in *:*) v6+=("$address") ;; *) v4+=("$address") ;; esac',
  'done',
  'case "$1" in',
  '  hosts)',
  '    if [ "${#v6[@]}" -gt 0 ]; then echo "${v6[0]} $2"',
  '    elif [ "${#v4[@]}" -gt 0 ]; then echo "${v4[0]} $2"',
  '    else exit 2; fi ;;',
  '  ahostsv4)',
  '    [ "${#v4[@]}" -gt 0 ] || exit 2',
  '    for address in "${v4[@]}"; do',
  '      printf \'%-15s STREAM %s\\n%-15s DGRAM  \\n%-15s RAW    \\n\' "$address" "$2" "$address" "$address"',
  '    done ;;',
  '  *) exit 2 ;;',
  'esac',
  '',
].join('\n');

// Runs allow_model_server of the entrypoint for host.docker.internal on 11434, with the stand-in getent above and a
// stand-in iptables first on the PATH. The iptables stand-in records its arguments, one call to a line, and exits 0.
function allowModelServer(testContext, addresses) {
  const base = temporaryDirectory(testContext, 'entrypoint-model-server-');
  const bin = join(base, 'bin');
  const calls = join(base, 'iptables-calls');
  mkdirSync(bin);
  writeFileSync(join(bin, 'getent'), getentStandIn);
  writeFileSync(join(bin, 'iptables'), `#!/usr/bin/env bash\nprintf '%s\\n' "$*" >> "${calls}"\n`);
  chmodSync(join(bin, 'getent'), 0o755);
  chmodSync(join(bin, 'iptables'), 0o755);
  const script = join(base, 'allow.sh');
  writeFileSync(script, `
    set -euo pipefail
    ${entrypointFunctions('log', 'allow_model_server')}
    allow_model_server host.docker.internal 11434
  `);
  const result = spawnSync('bash', [script], {
    encoding: 'utf-8',
    env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, ADDRESSES: addresses.join(' ') },
  });
  const iptablesCalls = existsSync(calls) ? readFileSync(calls, 'utf-8').split('\n').filter(Boolean) : [];
  return { iptablesCalls, ...result };
}

const ipv4 = '192.168.65.254';
const ipv6 = 'fdc4:f303:9324::254';
const admitted = [`-A OUTPUT -p tcp -d ${ipv4} --dport 11434 -j ACCEPT`];
const allowedLine = `[entrypoint] allowed local model server at ${ipv4}:11434\n`;
const warningLine =
  '[entrypoint] WARNING: host.docker.internal did not resolve; the local model server will be unreachable\n';

// iptables takes no IPv6 address, and the firewall denies every IPv6 address but loopback's, so the model server is
// admitted at the IPv4 address of its host whatever else the host has.
test('a host with an IPv6 address before its IPv4 one is admitted at the IPv4 address', (testContext) => {
  const result = allowModelServer(testContext, [ipv6, ipv4]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.iptablesCalls, admitted);
  assert.equal(result.stderr, allowedLine);
});

test('a host with an IPv4 address before its IPv6 one is admitted at the IPv4 address', (testContext) => {
  const result = allowModelServer(testContext, [ipv4, ipv6]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.iptablesCalls, admitted);
  assert.equal(result.stderr, allowedLine);
});

test('a host with an IPv4 address alone is admitted at it', (testContext) => {
  const result = allowModelServer(testContext, [ipv4]);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.iptablesCalls, admitted);
  assert.equal(result.stderr, allowedLine);
});

test(
  'a host with an IPv6 address alone is not admitted, with the warning, and the entrypoint goes on',
  (testContext) => {
    const result = allowModelServer(testContext, [ipv6]);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(result.iptablesCalls, []);
    assert.equal(result.stderr, warningLine);
  },
);

test('a host with no address is not admitted, with the warning, and the entrypoint goes on', (testContext) => {
  const result = allowModelServer(testContext, []);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(result.iptablesCalls, []);
  assert.equal(result.stderr, warningLine);
});
