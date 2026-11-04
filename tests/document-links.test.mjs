import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { headingAnchors, linkFaults, markdownLinks } from './document-links.mjs';

const root = join(import.meta.dirname, '..');

// The documents whose links to one another are judged, R26 of unit 0094.
const DOCUMENTS = ['README.md', 'COMMANDS.md', 'ORCHESTRATOR.md', 'SETUP.md', 'SANDBOX.md', 'CONTRIBUTING.md'];

test('a heading is anchored as GitHub anchors it', () => {
  const text = ["# The project's settings", '', '## What .orchestrator holds', '### `agentrite run`'].join('\n');
  assert.deepEqual(headingAnchors(text), ['the-projects-settings', 'what-orchestrator-holds', 'agentrite-run']);
});

test('a heading that repeats an earlier one is anchored with a number', () => {
  const text = ['## Options', '## Options', '## Options'].join('\n');
  assert.deepEqual(headingAnchors(text), ['options', 'options-1', 'options-2']);
});

test('a line inside a fenced code block is not a heading', () => {
  const text = ['## Git hooks', '```sh', '# agentrite: commit-msg hook', '```', '~~~', '# not either', '~~~'].join(
    '\n',
  );
  assert.deepEqual(headingAnchors(text), ['git-hooks']);
});

test('the links of a text are those outside fenced code and inline code', () => {
  const text = [
    'See [the sandbox](SANDBOX.md) and `[not a link](README.md)`.',
    '```md',
    '[nor this](COMMANDS.md)',
    '```',
    '[`SANDBOX.md`](SANDBOX.md#running-a-unit), and [a text that',
    'wraps](#the-name).',
  ].join('\n');
  assert.deepEqual(markdownLinks(text), [
    { text: 'the sandbox', target: 'SANDBOX.md' },
    { text: '`SANDBOX.md`', target: 'SANDBOX.md#running-a-unit' },
    { text: 'a text that\nwraps', target: '#the-name' },
  ]);
});

test('a link to a heading that the named document holds is no fault', () => {
  const documents = {
    'README.md': '# AgentRite\n\nSee [run](COMMANDS.md#agentrite-run) and [the name](#the-name).\n\n## The name\n',
    'COMMANDS.md': '# Commands\n\n### agentrite run\n\nBack to [the README](README.md).\n',
  };
  assert.deepEqual(linkFaults(documents, DOCUMENTS), []);
});

test('a link to another file or to an address is not judged', () => {
  const documents = {
    'README.md': '[releasing](RELEASING.md#steps) and [npm](https://www.npmjs.com/#nowhere) and ![x](d/x.svg)\n',
  };
  assert.deepEqual(linkFaults(documents, DOCUMENTS), []);
});

test('a fault names the document, the link and the heading not found', () => {
  const documents = {
    'README.md': '# AgentRite\n\n[run](COMMANDS.md#agentrite-ran) and [gone](#the-nam)\n',
    'COMMANDS.md': '# Commands\n\n### agentrite run\n',
  };
  assert.deepEqual(linkFaults(documents, DOCUMENTS), [
    'README.md: [run](COMMANDS.md#agentrite-ran) finds no heading agentrite-ran in COMMANDS.md',
    'README.md: [gone](#the-nam) finds no heading the-nam in README.md',
  ]);
});

test('a fault names a document of the set that does not exist', () => {
  const documents = { 'README.md': '[setting up](SETUP.md#on-a-fresh-clone) and [setup](SETUP.md)\n' };
  assert.deepEqual(linkFaults(documents, DOCUMENTS), [
    'README.md: [setting up](SETUP.md#on-a-fresh-clone) finds no document SETUP.md',
    'README.md: [setup](SETUP.md) finds no document SETUP.md',
  ]);
});

// R26 of unit 0094: a section renamed or moved leaves no link that leads to the top of a page or nowhere.
test('every link between the documents, and to a section of one, resolves', () => {
  const documents = Object.fromEntries(
    DOCUMENTS.filter((name) => existsSync(join(root, name))).map((name) => [
      name,
      readFileSync(join(root, name), 'utf-8'),
    ]),
  );
  const faults = linkFaults(documents, DOCUMENTS);
  assert.deepEqual(faults, [], faults.join('\n'));
});
