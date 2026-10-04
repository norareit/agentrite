import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const settings = readFileSync(new URL('../container/claude-managed-settings.json', import.meta.url), 'utf-8');

// Managed settings stand above every other level of Claude Code's settings, so the file holds the status line and
// nothing else: any further key would be forced on every developer's sandbox. The command names the path the
// wrapper mounts the host's script at.
test('the managed settings hold the status line that runs the mounted script, and no other key', () => {
  assert.deepEqual(JSON.parse(settings), {
    statusLine: { type: 'command', command: 'bash /etc/claude-code/statusline-command.sh' },
  });
});
