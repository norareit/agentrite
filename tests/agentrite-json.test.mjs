import assert from 'node:assert/strict';
import { test } from 'node:test';
import { formattedLike, jsonFault, jsonPath } from '../scripts/agentrite-json.mjs';

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

// Unit 0065, R9, R16: where a fault of a JSON value is, and how it is said.

test('jsonPath names a key from the root and below, and an index below', () => {
  assert.equal(jsonPath('', 'steps'), 'steps');
  assert.equal(jsonPath('steps', 1), 'steps[1]');
  assert.equal(jsonPath('steps[1]', 'repeat'), 'steps[1].repeat');
  assert.equal(jsonPath('steps[1].repeat.steps', 0), 'steps[1].repeat.steps[0]');
  assert.equal(jsonPath('', 0), '[0]');
});

test('jsonFault says what the place holds, or that it is missing, and what it must hold', () => {
  assert.equal(jsonFault('steps', undefined, 'a list'), 'steps is missing. It must hold a list');
  assert.equal(jsonFault('steps[0].model', '', 'a string'), 'steps[0].model is "". It must hold a string');
  assert.equal(jsonFault('times', null, 'a number'), 'times is null. It must hold a number');
  assert.equal(jsonFault('a', { b: [1] }, 'c'), 'a is {"b":[1]}. It must hold c');
});
