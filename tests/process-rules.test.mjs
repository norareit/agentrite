import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const repositoryRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const processDocument = join(repositoryRoot, 'process.md');

function markdownFilesIn(directory) {
  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
    .map((entry) => join(directory, entry.name));
}

// R3 and R5 of unit 0108: an agent that is told only the format of a timestamp writes the time it estimates.
test('process.md states where the timestamp of an entry comes from', () => {
  assert.ok(
    readFileSync(processDocument, 'utf-8').includes('date -u +%Y-%m-%dT%H:%M:%SZ'),
    'process.md no longer states where the timestamp of an entry in record.md comes from',
  );
});

// R2 and R5 of unit 0108: a role that reads its input `changes/<number>-<kebab-name>/` into a place under `.reviews`
// saves findings where the other roles do not look for them.
test('no document of the process or the roles names a place under .reviews/changes/', () => {
  const documents = [
    processDocument,
    ...markdownFilesIn(join(repositoryRoot, 'roles')),
    ...markdownFilesIn(join(repositoryRoot, 'extra-roles')),
  ];
  const offenders = documents
    .filter((file) => readFileSync(file, 'utf-8').includes('.reviews/changes/'))
    .map((file) => relative(repositoryRoot, file));
  assert.deepEqual(
    offenders,
    [],
    `${offenders.join(', ')} name a place under .reviews/changes/. A place under .reviews takes the name of the ` +
      "unit's directory without changes/",
  );
});
