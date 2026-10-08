import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');

// The entries of the sandbox service's `tmpfs:` list, read by indentation since the kit has no YAML parser: the
// lines after `    tmpfs:` that open with `      - `, up to the first that does not.
function tmpfsEntries(text) {
  const lines = text.split('\n');
  const start = lines.indexOf('    tmpfs:');
  assert.notEqual(start, -1, 'the sandbox service has a tmpfs list');
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('      - ')) break;
    entries.push(line.slice('      - '.length));
  }
  return entries;
}

// Docker mounts a tmpfs noexec unless the entry says exec, and a suite or a tool that runs what it writes to the
// temporary directory then fails in the sandbox. The whole list is held, so that another mount, or exec on /run,
// is a decision and not an accident.
test('the sandbox mounts /tmp as an executable tmpfs, and /run as it was', () => {
  assert.deepEqual(tmpfsEntries(compose), ['/tmp:exec', '/run']);
});
