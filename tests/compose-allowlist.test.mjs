import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');

// The hosts of the agent service's `KIT_ALLOWLIST`, read by indentation since the kit has no YAML parser: the lines
// after `      KIT_ALLOWLIST: |` that are indented deeper than the key, up to the first that is not, with comments
// and blank lines dropped the way the entrypoint drops them.
function kitAllowlistHosts(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('      KIT_ALLOWLIST: |');
  assert.notEqual(start, -1, 'the agent service has a KIT_ALLOWLIST block');
  const hosts = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('        ')) break;
    const host = line.replace(/#.*/, '').trim();
    if (host) hosts.push(host);
  }
  return hosts;
}

// The egress proxy admits only what is on a list, and what the pinned harnesses contact is the kit's to list, so
// that a project gets a host by moving to a release. Without platform.claude.com Claude Code does not start in a
// sandbox that holds no saved login, and without models.opencode.ai OpenCode cannot fetch its model catalog.
test('the kit admits the hosts its harnesses need, besides those it already admitted', () => {
  const hosts = kitAllowlistHosts(compose);
  const needed = [
    'platform.claude.com',
    'models.opencode.ai',
    'api.anthropic.com',
    'registry.npmjs.org',
    'agentrite.ritenoar.com',
  ];
  assert.deepEqual(
    needed.filter((host) => !hosts.includes(host)),
    [],
    `KIT_ALLOWLIST holds ${hosts.join(', ')}`,
  );
});
