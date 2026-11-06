import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { HARNESSES, harnessNamed } from '../scripts/agentrite-harness.mjs';
import { environmentEntry } from './compose-entries.mjs';

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');

// The lines of the sandbox service's `KIT_ALLOWLIST` block, read by indentation since the kit has no YAML parser: the
// lines after `      KIT_ALLOWLIST: |` up to the first that has text and is not indented deeper than the key.
function kitAllowlistLines(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('      KIT_ALLOWLIST: |');
  assert.notEqual(start, -1, 'the sandbox service has a KIT_ALLOWLIST block');
  const block = [];
  for (const line of lines.slice(start + 1)) {
    if (line.trim() !== '' && !line.startsWith('        ')) break;
    block.push(line.trim());
  }
  return block.filter((line) => line !== '');
}

// The hosts written in the block, with comments, blank lines and the variable the wrapper composes dropped the way
// the entrypoint drops comments.
function kitAllowlistHosts(text) {
  return kitAllowlistLines(text)
    .map((line) => line.replace(/#.*/, '').trim())
    .filter((line) => line !== '' && !line.startsWith('${'));
}

// 0097 R7, R8: the kit's own host is written in the file, and the hosts of the project's harnesses follow it, as the
// wrapper composes them from their modules.
test("the kit's own host is the npm registry alone, followed by the hosts of the project's harnesses", () => {
  assert.deepEqual(kitAllowlistHosts(compose), ['registry.npmjs.org']);
  const lines = kitAllowlistLines(compose);
  assert.match(lines.at(-1), /^\$\{SANDBOX_HARNESS_ALLOWLIST:\?.+\}$/);
});

test("the probe is a host of the kit's own, and of no harness", () => {
  const probe = environmentEntry('FIREWALL_PROBE');
  assert.ok(kitAllowlistHosts(compose).includes(probe), probe);
  for (const harness of HARNESSES) {
    assert.ok(!harness.sandbox.hosts.some(({ host }) => host === probe), harness.name);
  }
});

// For a project of Claude Code and OpenCode the hosts are the six the kit admitted before the harnesses' hosts moved
// into their modules. Without platform.claude.com Claude Code does not start in a sandbox that holds no saved login,
// and without models.opencode.ai OpenCode cannot fetch its model catalog. OpenCode logged in with a ChatGPT account
// signs in and refreshes its token at auth.openai.com and sends its prompts to chatgpt.com.
test('for a project of claude and opencode the kit admits the six hosts it admitted before', () => {
  const hosts = [
    ...kitAllowlistHosts(compose),
    ...['claude', 'opencode'].flatMap((name) => harnessNamed(name).sandbox.hosts.map(({ host }) => host)),
  ];
  assert.deepEqual(new Set(hosts), new Set([
    'api.anthropic.com',
    'platform.claude.com',
    'models.opencode.ai',
    'auth.openai.com',
    'chatgpt.com',
    'registry.npmjs.org',
  ]));
  assert.equal(hosts.length, 6);
});

// YAML keeps a block scalar going over an empty line, which carries no indentation, so the block ends only at a
// line that has text and is indented no deeper than the key.
test('an empty line inside the block does not end it', () => {
  const text = [
    '      KIT_ALLOWLIST: |',
    '        # a comment',
    '        one.example',
    '',
    '        two.example',
    '      #',
    '      MODEL_SERVER_PORT: "11434"',
  ].join('\n');
  assert.deepEqual(kitAllowlistHosts(text), ['one.example', 'two.example']);
});
