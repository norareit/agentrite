import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { plannedFiles, ROLES } from '../scripts/agentrite-roles.mjs';
import { rolesListing } from '../scripts/agentrite-run.mjs';

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');

// The description a wrapper holds, as the string a YAML parser reads from its folded block.
function wrapperDescription(wrapper) {
  const block = wrapper.match(/^description: >-\n((?: {2}\S.*\n)+)/m);
  assert.ok(block, 'the wrapper has no folded description');
  return block[1]
    .trimEnd()
    .split('\n')
    .map((line) => line.slice(2))
    .join(' ');
}

function emptyDirectory(t) {
  const base = mkdtempSync(join(tmpdir(), 'agentrite-run-'));
  t.after(() => rmSync(base, { recursive: true, force: true }));
  return base;
}

// R1: the roles.

test('the listing holds every role the kit has, in the order the kit holds them', () => {
  const blocks = rolesListing(ROLES).trimEnd().split('\n\n');

  assert.ok(ROLES.length > 0);
  assert.deepEqual(
    blocks.map((block) => block.split('\n')[0]),
    ROLES.map((role) => role.name),
  );
});

test('each role is listed with its description as the wrappers hold it, indented by two spaces', () => {
  const wrappers = plannedFiles(['claude']);
  const blocks = rolesListing(ROLES).trimEnd().split('\n\n');

  blocks.forEach((block, index) => {
    const [name, ...lines] = block.split('\n');
    const wrapper = wrappers.find((file) => file.path === `.claude/agents/${name}.md`);
    assert.ok(wrapper, `no wrapper for ${name}`);
    for (const line of lines) assert.match(line, /^ {2}\S/);
    assert.equal(lines.map((line) => line.slice(2)).join(' '), wrapperDescription(wrapper.content));
    assert.equal(lines.map((line) => line.slice(2)).join(' '), ROLES[index].description);
  });
});

test('no line of the listing is over 120 characters, and it ends with one line break', () => {
  const listing = rolesListing(ROLES);

  for (const line of listing.split('\n')) assert.ok(line.length <= 120, `a line of ${line.length} characters`);
  assert.equal(listing, `${listing.trimEnd()}\n`);
});

test('agentrite roles prints the listing and exits 0 in a directory that is no project', (t) => {
  const result = spawnSync(process.execPath, [script, 'roles'], { cwd: emptyDirectory(t), encoding: 'utf-8' });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, rolesListing(ROLES));
});

test('agentrite roles with an argument prints its usage on standard error and exits 2', (t) => {
  const result = spawnSync(process.execPath, [script, 'roles', 'claude'], {
    cwd: emptyDirectory(t),
    encoding: 'utf-8',
  });

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'usage: agentrite roles\n');
});
