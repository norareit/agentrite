import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formattedLike } from '../scripts/agentrite-json.mjs';

// R4, R10

test('the indentation of two spaces is kept', () => {
  const original = '{\n  "name": "my-app"\n}\n';
  const laidOut = formattedLike(original, { name: 'my-app', added: [1] });
  assert.equal(laidOut, '{\n  "name": "my-app",\n  "added": [\n    1\n  ]\n}\n');
});

test('the indentation of a tab is kept', () => {
  const original = '{\n\t"name": "my-app"\n}\n';
  const laidOut = formattedLike(original, { name: 'my-app', added: true });
  assert.equal(laidOut, '{\n\t"name": "my-app",\n\t"added": true\n}\n');
});

test('the indentation of four spaces is kept', () => {
  const original = '{\n    "name": "my-app"\n}';
  assert.equal(formattedLike(original, { name: 'my-app' }), '{\n    "name": "my-app"\n}');
});

test('a final line break is kept, and its absence is kept', () => {
  assert.ok(formattedLike('{\n  "a": 1\n}\n', { a: 1 }).endsWith('}\n'));
  assert.ok(formattedLike('{\n  "a": 1\n}', { a: 1 }).endsWith('}'));
  assert.ok(!formattedLike('{\n  "a": 1\n}', { a: 1 }).endsWith('\n'));
});

test('the keys come in the order the value gives them', () => {
  const laidOut = formattedLike('{\n  "a": 1,\n  "b": 2\n}\n', { b: 2, c: 3, a: 1 });
  assert.equal(laidOut, '{\n  "b": 2,\n  "c": 3,\n  "a": 1\n}\n');
});

test('an original with no indented line is laid out with two spaces', () => {
  assert.equal(formattedLike('{}\n', { a: 1 }), '{\n  "a": 1\n}\n');
  assert.equal(formattedLike('{"a": 1}', { a: 1 }), '{\n  "a": 1\n}');
});
