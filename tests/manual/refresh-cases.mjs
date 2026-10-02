#!/usr/bin/env node
// The node half of frontmatter-vs-yaml.py: refreshes each frontmatter in the JSON file named as the argument, as
// the wrapper of each harness, and prints what came of it as JSON.
import { readFileSync } from 'node:fs';
import { plannedFiles } from '../../scripts/agentrite-roles.mjs';
import { refreshedWrapper } from '../../scripts/wrapper-frontmatter.mjs';

function frontmatter(wrapper) {
  const lines = wrapper.split('\n');
  return lines.slice(1, lines.indexOf('---', 1)).join('\n');
}

const cases = JSON.parse(readFileSync(process.argv[2], 'utf-8'));
const results = [];
for (const harness of ['claude', 'opencode']) {
  const release = plannedFiles([harness]).find((file) => file.path.endsWith('/reviewer.md')).content;
  for (const existing of cases) {
    const first = refreshedWrapper(`---\n${existing}\n---\n\nAn older body.\n`, release);
    const again = 'content' in first ? refreshedWrapper(first.content, release) : undefined;
    results.push({
      harness,
      existing,
      release: frontmatter(release),
      result: 'content' in first ? frontmatter(first.content) : null,
      problem: 'problem' in first ? first.problem : null,
      stable: again === undefined ? null : 'content' in again && again.content === first.content,
    });
  }
}
console.log(JSON.stringify(results));
