import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import {
  DEFAULT_LIMIT,
  isUnitDirectory,
  KINDS,
  parseUnitsArgs,
  selectUnits,
  STATUSES,
  unitFrom,
  unitsJson,
  unitsListing,
  UNITS_FORM,
} from '../scripts/agentrite-units.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const NO_FILTER = {
  number: undefined,
  open: false,
  status: undefined,
  kind: undefined,
  limit: DEFAULT_LIMIT,
  json: false,
};

function unit(number, overrides = {}) {
  const digits = String(number).padStart(4, '0');
  return {
    number: digits,
    directory: `${digits}-unit`,
    status: 'draft',
    kind: 'feature',
    title: `Unit ${digits}`,
    ...overrides,
  };
}

test('parseUnitsArgs reads no argument as no number, no filter, the default limit and no JSON', () => {
  assert.deepEqual(parseUnitsArgs([]), NO_FILTER);
  assert.equal(DEFAULT_LIMIT, 50);
});

test('parseUnitsArgs reads each argument', () => {
  assert.equal(parseUnitsArgs(['0077']).number, '0077');
  assert.equal(parseUnitsArgs(['--open']).open, true);
  assert.equal(parseUnitsArgs(['--status', 'draft']).status, 'draft');
  assert.equal(parseUnitsArgs(['--status=draft']).status, 'draft');
  assert.equal(parseUnitsArgs(['--kind', 'bug']).kind, 'bug');
  assert.equal(parseUnitsArgs(['--limit', '5']).limit, 5);
  assert.equal(parseUnitsArgs(['--limit', '0']).limit, 0);
  assert.equal(parseUnitsArgs(['--json']).json, true);
});

test('parseUnitsArgs reads the options in any place among the arguments', () => {
  const expected = { ...NO_FILTER, number: '0077', open: true, kind: 'task', json: true };

  assert.deepEqual(parseUnitsArgs(['0077', '--open', '--kind', 'task', '--json']), expected);
  assert.deepEqual(parseUnitsArgs(['--json', '--kind', 'task', '--open', '0077']), expected);
  assert.deepEqual(parseUnitsArgs(['--kind', 'task', '0077', '--json', '--open']), expected);
});

test('parseUnitsArgs takes --kind with --open and with --status', () => {
  assert.deepEqual(parseUnitsArgs(['--open', '--kind', 'bug']), { ...NO_FILTER, open: true, kind: 'bug' });
  assert.deepEqual(parseUnitsArgs(['--status', 'draft', '--kind', 'bug']), {
    ...NO_FILTER,
    status: 'draft',
    kind: 'bug',
  });
});

const WRONG_ARGUMENTS = [
  [['77'], 'a number'],
  [['00777'], 'a number'],
  [['abcd'], 'a number'],
  [['0077-x'], 'a number'],
  [['0077', '0078'], 'unexpected argument: 0078'],
  [['--status'], '--status takes a status, and none was given'],
  [['--status', '--json'], '--status takes a status, and none was given'],
  [['--kind'], '--kind takes a kind, and none was given'],
  [['--limit'], '--limit takes a count, and none was given'],
  [['--status', 'draft', '--status', 'approved'], '--status was given twice'],
  [['--kind', 'bug', '--kind', 'task'], '--kind was given twice'],
  [['--limit', '1', '--limit', '2'], '--limit was given twice'],
  [['--status', 'done'], 'unknown status: done. --status takes draft, approved, in-progress, implemented or cancelled'],
  [['--kind', 'chore'], 'unknown kind: chore. --kind takes feature, bug or task'],
  [['--limit', '-1'], '--limit'],
  [['--limit', '1.5'], '--limit takes a whole number of zero or more, not 1.5'],
  [['--limit', 'many'], '--limit takes a whole number of zero or more, not many'],
  [['--open', '--status', 'draft'], '--open and --status cannot be given together'],
  [['--limit', '5', '0077'], '--limit cannot be given with a number'],
  [['--all'], 'unknown option: --all'],
  [['--open=yes'], '--open takes no value'],
];

for (const [args, message] of WRONG_ARGUMENTS) {
  test(`parseUnitsArgs refuses ${args.join(' ')}`, () => {
    assert.throws(
      () => parseUnitsArgs(args),
      (error) => error.message.includes(message) || (message === 'a number' && error.message.includes(args[0])),
    );
    assert.throws(() => parseUnitsArgs(args), (error) => error.message.endsWith(`\n${UNITS_FORM}`));
  });
}

test('isUnitDirectory takes four digits, a hyphen and at least one character more', () => {
  for (const name of ['0077-the-units', '0001-a']) assert.equal(isUnitDirectory(name), true, name);
  for (const name of ['0077-', '0077', '077-a', '00777-a', 'history-0036-install-the-agent-kit', '_template']) {
    assert.equal(isUnitDirectory(name), false, name);
  }
});

const RECORD =
  '---\nkind: feature\nstatus: in-progress\ntimestamp: 2026-10-22T18:58:24Z\n---\n\n# 0077 The units\n\n## Log\n';

test('unitFrom gives the number, directory, status, kind and title', () => {
  assert.deepEqual(unitFrom('0077-the-units', RECORD), {
    number: '0077',
    directory: '0077-the-units',
    status: 'in-progress',
    kind: 'feature',
    title: 'The units',
  });
});

test('unitFrom keeps a title without the number as written', () => {
  const record = RECORD.replace('# 0077 The units', '# A title without a number');

  assert.equal(unitFrom('0077-the-units', record).title, 'A title without a number');
});

test('unitFrom takes the status and the kind as written, whatever they are', () => {
  const record = RECORD.replace('kind: feature', 'kind: chore').replace('in-progress', 'doing');

  assert.deepEqual([unitFrom('0077-a', record).kind, unitFrom('0077-a', record).status], ['chore', 'doing']);
});

test('unitFrom does not take a comment of the front matter for the heading', () => {
  const record = RECORD.replace('timestamp:', '# a comment\ntimestamp:');

  assert.equal(unitFrom('0077-a', record).title, 'The units');
});

test('unitFrom refuses a record without a status, a kind or a heading, naming the file', () => {
  assert.throws(() => unitFrom('0077-a', RECORD.replace('status: in-progress\n', '')), {
    message: 'changes/0077-a/record.md is missing a status field',
  });
  assert.throws(() => unitFrom('0077-a', RECORD.replace('kind: feature\n', '')), {
    message: 'changes/0077-a/record.md is missing a kind field',
  });
  assert.throws(() => unitFrom('0077-a', RECORD.replace('# 0077 The units\n', '')), {
    message: 'changes/0077-a/record.md is missing a # heading',
  });
});

test('selectUnits lists the highest number first, equal numbers by directory name, and keeps its input', () => {
  const given = [unit(1), unit(3, { directory: '0003-b' }), unit(3, { directory: '0003-a' }), unit(2)];
  const copy = [...given];

  const { units } = selectUnits(given, NO_FILTER);

  assert.deepEqual(units.map((listed) => listed.directory), ['0003-a', '0003-b', '0002-unit', '0001-unit']);
  assert.deepEqual(given, copy);
});

const STATUSES_IN_ORDER = ['draft', 'approved', 'in-progress', 'implemented', 'cancelled'];
const ONE_OF_EACH = STATUSES_IN_ORDER.map((status, index) => unit(index + 1, { status }));

test('selectUnits keeps every unit without a filter', () => {
  assert.equal(selectUnits(ONE_OF_EACH, NO_FILTER).units.length, 5);
});

test('selectUnits with --open leaves out the end statuses', () => {
  const { units, total } = selectUnits(ONE_OF_EACH, { ...NO_FILTER, open: true });

  assert.deepEqual(units.map((listed) => listed.status).sort(), ['approved', 'draft', 'in-progress']);
  assert.equal(total, 3);
});

test('selectUnits with --status keeps that status only, and with --kind that kind only', () => {
  const units = [unit(1, { kind: 'bug' }), unit(2, { kind: 'task' }), unit(3, { status: 'approved' })];

  const numbers = (filter) => selectUnits(units, { ...NO_FILTER, ...filter }).units.map((listed) => listed.number);

  assert.deepEqual(numbers({ status: 'approved' }), ['0003']);
  assert.deepEqual(numbers({ kind: 'bug' }), ['0001']);
});

test('selectUnits with --kind goes with --open and with --status', () => {
  const units = [
    unit(1, { kind: 'bug', status: 'draft' }),
    unit(2, { kind: 'bug', status: 'implemented' }),
    unit(3, { kind: 'task', status: 'draft' }),
  ];

  const open = selectUnits(units, { ...NO_FILTER, open: true, kind: 'bug' });
  const draft = selectUnits(units, { ...NO_FILTER, status: 'implemented', kind: 'bug' });

  assert.deepEqual(open.units.map((listed) => listed.number), ['0001']);
  assert.deepEqual(draft.units.map((listed) => listed.number), ['0002']);
});

test('selectUnits limits to 50 by default, to a count, and not at all with 0', () => {
  const units = Array.from({ length: 53 }, (_, index) => unit(index + 1));

  assert.equal(selectUnits(units, NO_FILTER).units.length, 50);
  assert.equal(selectUnits(units, NO_FILTER).total, 53);
  assert.equal(selectUnits(units, { ...NO_FILTER, limit: 5 }).units.length, 5);
  assert.equal(selectUnits(units, { ...NO_FILTER, limit: 0 }).units.length, 53);
});

test('selectUnits counts the limit after the filters', () => {
  const units = [unit(1), unit(2), unit(3), unit(4, { status: 'implemented' }), unit(5, { status: 'cancelled' })];

  const { units: listed, total } = selectUnits(units, { ...NO_FILTER, open: true, limit: 2 });

  assert.deepEqual(listed.map((each) => each.number), ['0003', '0002']);
  assert.equal(total, 3);
});

test('selectUnits with a number keeps the units that open with it, filters them and does not limit them', () => {
  const units = [unit(77, { directory: '0077-a' }), unit(77, { directory: '0077-b', status: 'implemented' }), unit(78)];
  const directories = (filter, from) =>
    selectUnits(from, { ...NO_FILTER, number: '0077', ...filter }).units.map((listed) => listed.directory);

  assert.deepEqual(directories({}, units), ['0077-a', '0077-b']);
  assert.deepEqual(directories({ open: true }, units), ['0077-a']);
  const many = Array.from({ length: 60 }, (_, index) => {
    return unit(77, { directory: `0077-${String(index).padStart(2, '0')}` });
  });
  assert.equal(directories({}, many).length, 60);
});

test('unitsListing gives one line a unit, with the columns lined up', () => {
  const units = [
    unit(2, { status: 'in-progress', kind: 'bug', title: 'Second' }),
    unit(1, { status: 'draft', kind: 'feature', title: 'First' }),
  ];

  assert.equal(
    unitsListing({ units, total: 2 }, NO_FILTER),
    '0002  in-progress  bug      Second\n0001  draft        feature  First\n',
  );
});

test('unitsListing ends with the closing line only when the limit left units out', () => {
  const units = [unit(2), unit(1)];

  assert.equal(
    unitsListing({ units, total: 5 }, NO_FILTER),
    '0002  draft  feature  Unit 0002\n' +
      '0001  draft  feature  Unit 0001\n' +
      'showing 2 of 5 units, --limit 0 shows them all\n',
  );
  assert.ok(!unitsListing({ units, total: 2 }, NO_FILTER).includes('showing'));
});

test('unitsListing says there are no units when nothing is shown and nothing was given', () => {
  assert.equal(unitsListing({ units: [], total: 0 }, NO_FILTER), 'no units\n');
});

test('unitsListing names the number and each filter given, in order, when nothing is shown', () => {
  const empty = { units: [], total: 0 };

  assert.equal(unitsListing(empty, { ...NO_FILTER, number: '0077', open: true }), 'no units with 0077, --open\n');
  assert.equal(
    unitsListing(empty, { ...NO_FILTER, status: 'draft', kind: 'bug' }),
    'no units with --status draft, --kind bug\n',
  );
  assert.equal(unitsListing(empty, { ...NO_FILTER, limit: 5 }), 'no units\n');
});

test('unitsListing leaves no space at the end of a line', () => {
  const listing = unitsListing({ units: [unit(1, { title: 'T' })], total: 1 }, NO_FILTER);

  assert.ok(listing.split('\n').every((line) => line === line.trimEnd()));
});

test('unitsJson gives the units and the total, each unit with its keys in order', () => {
  const text = unitsJson({ units: [unit(1)], total: 4 });

  assert.deepEqual(Object.keys(JSON.parse(text)), ['units', 'total']);
  assert.deepEqual(Object.keys(JSON.parse(text).units[0]), ['number', 'directory', 'status', 'kind', 'title']);
  assert.equal(JSON.parse(text).units[0].number, '0001');
  assert.equal(JSON.parse(text).total, 4);
  assert.ok(text.endsWith('}\n') && !text.endsWith('\n\n'));
});

test('unitsJson gives an empty array and a total of 0 when nothing is shown', () => {
  assert.deepEqual(JSON.parse(unitsJson({ units: [], total: 0 })), { units: [], total: 0 });
});

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');

function record({ kind, status, title }) {
  return `---\nkind: ${kind}\nstatus: ${status}\ntimestamp: 2026-10-22T18:58:24Z\n---\n\n# ${title}\n\n## Log\n`;
}

function writeUnit(root, directory, fields) {
  mkdirSync(join(root, 'changes', directory), { recursive: true });
  writeFileSync(join(root, 'changes', directory, 'record.md'), record(fields));
}

// A project of 53 units, numbered 0001 to 0053, with each status and each kind among them. Two share the number
// 0040, and 0053 is implemented, so that it is the highest of its number and has ended. A directory of an older
// naming sits beside them. The project has no agentrite.json and is no git repository.
function projectWithUnits(t) {
  const root = temporaryDirectory(t, 'agentrite units');
  for (let number = 1; number <= 53; number += 1) {
    const digits = String(number).padStart(4, '0');
    writeUnit(root, `${digits}-unit-${digits}`, {
      kind: KINDS[number % KINDS.length],
      status: number === 53 ? 'implemented' : STATUSES[number % STATUSES.length],
      title: `${digits} Unit ${digits}`,
    });
  }
  writeUnit(root, '0040-twin', { kind: 'bug', status: 'draft', title: '0040 Twin' });
  writeUnit(root, 'history-0036-old', { kind: 'task', status: 'draft', title: 'Old' });
  return root;
}

function units(root, ...args) {
  return spawnSync(process.execPath, [script, 'units', ...args], { cwd: root, encoding: 'utf-8' });
}

function numbersOf(result) {
  return result.stdout.split('\n').filter((line) => /^\d{4} /.test(line)).map((line) => line.slice(0, 4));
}

test('agentrite units lists 50 units, the highest first, and ends with the closing line', (t) => {
  const result = units(projectWithUnits(t));

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(numbersOf(result).length, 50);
  assert.equal(numbersOf(result)[0], '0053');
  assert.ok(result.stdout.endsWith('showing 50 of 54 units, --limit 0 shows them all\n'), result.stdout);
  assert.ok(!result.stdout.includes('Old'));
});

test('agentrite units --open leaves out the units that have ended', (t) => {
  const result = units(projectWithUnits(t), '--open', '--limit', '0');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes('implemented') && !result.stdout.includes('cancelled'), result.stdout);
  assert.ok(!numbersOf(result).includes('0053'));
  assert.ok(numbersOf(result).includes('0001'));
});

test('agentrite units --status and --kind list the units of that status and that kind', (t) => {
  const root = projectWithUnits(t);
  const byStatus = units(root, '--status', 'in-progress', '--limit', '0');
  const byKind = units(root, '--kind', 'bug', '--limit', '0');

  assert.equal(byStatus.status, 0, byStatus.stderr);
  assert.ok(byStatus.stdout.split('\n').filter(Boolean).every((line) => line.includes('  in-progress  ')));
  assert.equal(byKind.status, 0, byKind.stderr);
  assert.ok(byKind.stdout.split('\n').filter(Boolean).every((line) => line.includes('  bug  ')));
  assert.ok(numbersOf(byKind).includes('0040'));
});

test('agentrite units <number> shows that unit, and both of two that share the number', (t) => {
  const root = projectWithUnits(t);
  const one = units(root, '0007');
  const twins = units(root, '0040');

  assert.equal(one.status, 0, one.stderr);
  assert.equal(numbersOf(one).length, 1);
  assert.ok(one.stdout.includes('Unit 0007'));
  assert.equal(twins.status, 0, twins.stderr);
  assert.deepEqual(numbersOf(twins), ['0040', '0040']);
  assert.ok(twins.stdout.indexOf('Twin') < twins.stdout.indexOf('Unit 0040'), 'ordered by directory name');
});

test('agentrite units <number> --open for a unit that has ended says there are no units', (t) => {
  const result = units(projectWithUnits(t), '0053', '--open');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, 'no units with 0053, --open\n');
  assert.equal(result.stderr, '');
});

test('agentrite units --json lists every unit with the total', (t) => {
  const result = units(projectWithUnits(t), '--limit', '0', '--json');
  const document = JSON.parse(result.stdout);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(document.total, 54);
  assert.equal(document.units.length, 54);
  assert.equal(document.units[0].number, '0053');
  assert.ok(document.units.every((listed) => !listed.directory.startsWith('history-')));
});

test('agentrite units --json gives an empty array when no unit matches', (t) => {
  const result = units(projectWithUnits(t), '--json', '--status', 'cancelled', '--kind', 'task');

  assert.equal(result.status, 0, result.stderr);
  assert.ok(JSON.parse(result.stdout).total >= 0);
  const none = units(projectWithUnits(t), '--json', '--status', 'draft', '--kind', 'bug', '0053');
  assert.deepEqual(JSON.parse(none.stdout), { units: [], total: 0 });
});

test('agentrite units refuses a directory with no changes/, naming it', (t) => {
  const root = temporaryDirectory(t, 'agentrite units');
  const result = units(root);

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `agentrite: ${root} holds no changes/ directory\n`);
});

test('agentrite units refuses a number that opens no directory', (t) => {
  const result = units(projectWithUnits(t), '0099');

  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, 'agentrite: changes/ holds no unit 0099\n');
});

test('agentrite units refuses a unit with no record, or a record with a field or the heading missing', (t) => {
  const cases = [
    [() => {}, 'changes/0100-broken/record.md does not exist'],
    [(root) => writeFileSync(join(root, 'changes', '0100-broken', 'record.md'), '---\nkind: bug\n---\n# A\n'),
      'changes/0100-broken/record.md is missing a status field'],
    [(root) => writeFileSync(join(root, 'changes', '0100-broken', 'record.md'), '---\nstatus: draft\n---\n# A\n'),
      'changes/0100-broken/record.md is missing a kind field'],
    [(root) => writeFileSync(join(root, 'changes', '0100-broken', 'record.md'), '---\nkind: bug\nstatus: draft\n---\n'),
      'changes/0100-broken/record.md is missing a # heading'],
  ];
  for (const [prepare, message] of cases) {
    const root = projectWithUnits(t);
    mkdirSync(join(root, 'changes', '0100-broken'));
    prepare(root);

    const result = units(root);

    assert.equal(result.status, 1, message);
    assert.equal(result.stdout, '', message);
    assert.equal(result.stderr, `agentrite: ${message}\n`);
  }
});

test('agentrite units with a wrong argument prints the usage on standard error and exits 2', (t) => {
  const result = units(projectWithUnits(t), '--status', 'done');

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    `unknown status: done. --status takes draft, approved, in-progress, implemented or cancelled\n${UNITS_FORM}\n`,
  );
});
