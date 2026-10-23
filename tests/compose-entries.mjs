import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');

// The entries of a list of the sandbox service, such as `cap_add:`, read by indentation since the kit has no YAML
// parser: the lines after the key that open with `      - `, up to the first that does not.
export function listEntries(key) {
  const lines = compose.split('\n');
  const start = lines.indexOf(`    ${key}:`);
  assert.notEqual(start, -1, `the sandbox service has a ${key} list`);
  const entries = [];
  for (const line of lines.slice(start + 1)) {
    if (!line.startsWith('      - ')) break;
    entries.push(line.slice('      - '.length));
  }
  return entries;
}

// The value of one entry of the sandbox service's `environment:` mapping, the line `      <key>: <value>`, with
// the quotes around the value removed.
export function environmentEntry(key) {
  const line = compose.split('\n').find((candidate) => candidate.startsWith(`      ${key}: `));
  assert.ok(line, `the sandbox service's environment has ${key}`);
  return line.slice(`      ${key}: `.length).replace(/^"(.*)"$/, '$1');
}
