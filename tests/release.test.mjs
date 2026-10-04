import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';

const repository = new URL('..', import.meta.url).pathname;
const releasing = 'RELEASING.md';
const skill = join('.claude', 'skills', 'release', 'SKILL.md');

// A file of the repository, or the empty string when it is not there, so that a missing file fails the assertion
// that names it and not the whole file of tests.
function read(path) {
  const file = join(repository, path);
  return existsSync(file) ? readFileSync(file, 'utf-8') : '';
}

// The skill is a thin wrapper, like the role wrappers: what the human types, a description, the switch that keeps
// the model from starting a release by itself, and one instruction. A step added here would be one an agent in
// another harness never sees, so the whole text is compared.
const frontmatter = `---
name: release
description: >-
  Makes a release of the kit, on the host: bumps the pinned harness versions and checks them in a sandbox, drafts the
  release notes, on the human's word commits both, and names the commands the human runs to finish it.
disable-model-invocation: true
---
`;
const instruction =
  'Read `RELEASING.md` in the repository root and follow it, from its first step. It is your instruction; this file ' +
  'holds\nnone of its own.';

test('the release skill is its frontmatter and one instruction, which sends the agent to RELEASING.md', () => {
  const text = read(skill);
  assert.ok(text.startsWith(frontmatter), `${skill} opens with the frontmatter`);
  assert.equal(text.slice(frontmatter.length).trim(), instruction);
});

test('RELEASING.md exists', () => {
  assert.ok(existsSync(join(repository, releasing)));
});

for (const path of [skill, 'AGENTS.md', 'README.md', 'deploy.sh']) {
  test(`${path} names RELEASING.md`, () => {
    assert.ok(read(path).includes(releasing));
  });
}

// What a release bumps. The release edits these two lines by hand, so each is there once, as a plain version, and
// RELEASING.md names the arguments and the packages by the names the Dockerfile has.
const pins = [
  { argument: 'CLAUDE_CODE_VERSION', npmPackage: '@anthropic-ai/claude-code' },
  { argument: 'OPENCODE_VERSION', npmPackage: 'opencode-ai' },
];

for (const { argument, npmPackage } of pins) {
  test(`the Dockerfile pins ${argument} on one line, as a three-part version, and RELEASING.md names it`, () => {
    const dockerfile = read(join('container', 'Dockerfile'));
    const pinned = dockerfile.match(new RegExp(`^ARG ${argument}=\\d+\\.\\d+\\.\\d+$`, 'gm')) ?? [];
    assert.equal(pinned.length, 1, `one line is ARG ${argument}=<version>`);
    assert.ok(dockerfile.includes(`"${npmPackage}@\${${argument}}"`), `the image installs ${npmPackage}`);
    const text = read(releasing);
    assert.ok(text.includes(argument), `${releasing} names ${argument}`);
    assert.ok(text.includes(npmPackage), `${releasing} names ${npmPackage}`);
  });
}
