import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  digestOf,
  judgeRecord,
  recordDirectory,
  recordName,
  recordText,
} from '../scripts/agentrite-run-records.mjs';

// Unit 0103, R8, R9: the record of a run, kept outside `.orchestrator`.

const sha256 = (text) => createHash('sha256').update(text).digest('hex');
const DEFINITION = Buffer.from('{"steps":[]}\n');
const STATE = Buffer.from('{"unit":"0029-x"}\n');

test('the records are in $XDG_STATE_HOME when it is set and not empty, and in ~/.local/state otherwise', () => {
  assert.equal(recordDirectory({ XDG_STATE_HOME: '/state' }, '/home/dev'), '/state/agentrite/.orchestrator-runs');
  for (const environment of [{}, { XDG_STATE_HOME: '' }]) {
    assert.equal(
      recordDirectory(environment, '/home/dev'),
      join('/home/dev', '.local', 'state', 'agentrite', '.orchestrator-runs'),
    );
  }
});

test('a record is named by the SHA-256 in hexadecimal of the path of its run, followed by .json', () => {
  const path = '/work/project/.orchestrator/0029-x/2026-10-21T10:00:00Z';

  assert.equal(recordName(path), `${sha256(path)}.json`);
  assert.match(recordName(path), /^[0-9a-f]{64}\.json$/);
});

test('the digest is the SHA-256 in hexadecimal of the bytes given', () => {
  assert.equal(digestOf(DEFINITION), sha256(DEFINITION));
  const notText = Buffer.from([0xff, 0x00]);
  assert.equal(digestOf(notText), sha256(notText));
});

test('the text of a record holds the digests of the two files as one line of JSON', () => {
  assert.equal(recordText(DEFINITION, STATE), `{"definition":"${sha256(DEFINITION)}","state":"${sha256(STATE)}"}\n`);
});

test('the judgement takes the two files whose digests the record holds, and refuses each other case', () => {
  const record = recordText(DEFINITION, STATE);
  const otherwise = Buffer.from('{"steps":[1]}\n');

  assert.equal(judgeRecord(record, DEFINITION, STATE), undefined);
  assert.equal(judgeRecord(undefined, DEFINITION, STATE), 'has no record where it is resumed');
  for (const malformed of [
    '{',
    '[]',
    '{"definition":"x","state":"y"}\n',
    `{"definition":"${sha256(DEFINITION)}"}\n`,
    `{"definition":"${sha256(DEFINITION)}","state":"${sha256(STATE)}","extra":1}\n`,
  ]) {
    assert.equal(
      judgeRecord(malformed, DEFINITION, STATE),
      'has a record that is not of the form the command writes',
      malformed,
    );
  }
  assert.equal(judgeRecord(record, otherwise, STATE), 'has a definition.json that is not as the run left it');
  assert.equal(judgeRecord(record, DEFINITION, otherwise), 'has a state.json that is not as the run left it');
});
