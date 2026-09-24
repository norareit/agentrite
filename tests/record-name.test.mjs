import assert from 'node:assert/strict';
import { test } from 'node:test';
import { recordNameFor } from '../infra/lib/record-name.ts';

test('recordNameFor gives the record name of a subdomain inside the zone', () => {
  assert.equal(recordNameFor('agent-kit.ritenoar.com', 'ritenoar.com'), 'agent-kit');
});

test('recordNameFor keeps every label left of the zone', () => {
  assert.equal(recordNameFor('a.b.ritenoar.com', 'ritenoar.com'), 'a.b');
});

test('recordNameFor refuses a subdomain of another zone, naming both', () => {
  assert.throws(
    () => recordNameFor('agent-kit.example.com', 'ritenoar.com'),
    /agent-kit\.example\.com is not inside zone ritenoar\.com/,
  );
});

test('recordNameFor refuses a host that only ends in the zone name, without the dot', () => {
  assert.throws(() => recordNameFor('notritenoar.com', 'ritenoar.com'), /not inside zone/);
});

test('recordNameFor refuses the zone apex itself', () => {
  assert.throws(() => recordNameFor('ritenoar.com', 'ritenoar.com'), /not inside zone/);
});
