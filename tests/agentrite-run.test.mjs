import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { HARNESS_NAMES, plannedFiles, ROLES } from '../scripts/agentrite-roles.mjs';
import {
  harnessCommand,
  parseRunArgs,
  resolveUnit,
  rolesListing,
  runUsage,
  unitPrompt,
} from '../scripts/agentrite-run.mjs';

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

// R12: the usage of `run`.

const RUN_USAGE = `
usage: agentrite run <role> <harness> [--model <id>] [--headless] [--skip-permissions] <unit> [text...]
                     [-- <harness arguments...>]

  <role>              planner | implementer | reviewer
  <harness>           claude | opencode
  <unit>              a directory of changes/, by its name or by the four digits its name opens with
  [text...]           added to the prompt, after the unit
  --model <id>        the harness's own id of a model, such as claude-sonnet-5-5 or openai/gpt-6.1-sol.
                      Without it the harness decides: the role's wrapper may pin one
  --headless          run without a session: the harness works on the prompt and ends
  --skip-permissions  the harness asks no permission: --dangerously-skip-permissions for claude, which
                      bypasses every check, and --auto for opencode, which approves what is not denied.
                      Meant for the sandbox
  -- <harness arguments...>
                      given to the harness as written, after everything else it gets. The command reads
                      none of them`.slice(1);

test('the usage of run is the text of the plan, with the roles and the harnesses the kit has', () => {
  assert.equal(runUsage(), RUN_USAGE);
  assert.match(runUsage(), new RegExp(`^  <role> +${ROLES.map((role) => role.name).join(' \\| ')}$`, 'm'));
  assert.match(runUsage(), new RegExp(`^  <harness> +${HARNESS_NAMES.join(' \\| ')}$`, 'm'));
  for (const line of runUsage().split('\n')) assert.ok(line.length <= 120, line);
});

// R2, R3, R13: the arguments of `run`.

const PLAIN = { model: undefined, headless: false, skipPermissions: false, harnessArguments: [] };

test('run takes the role, the harness and the unit, in that order', () => {
  assert.deepEqual(parseRunArgs(['reviewer', 'opencode', '0007']), {
    role: 'reviewer',
    harness: 'opencode',
    unit: '0007',
    text: [],
    ...PLAIN,
  });
  for (const role of ROLES) {
    for (const harness of HARNESS_NAMES) {
      const parsed = parseRunArgs([role.name, harness, '0007-a-unit']);
      assert.deepEqual([parsed.role, parsed.harness, parsed.unit], [role.name, harness, '0007-a-unit']);
    }
  }
});

test('the options of run are taken before, between and after the three positions', () => {
  const expected = {
    role: 'implementer',
    harness: 'claude',
    unit: '0007',
    text: [],
    model: 'claude-sonnet-5-5',
    headless: true,
    skipPermissions: true,
    harnessArguments: [],
  };
  for (const args of [
    ['--model', 'claude-sonnet-5-5', '--headless', '--skip-permissions', 'implementer', 'claude', '0007'],
    ['implementer', '--headless', 'claude', '--model', 'claude-sonnet-5-5', '0007', '--skip-permissions'],
    ['implementer', 'claude', '0007', '--skip-permissions', '--headless', '--model=claude-sonnet-5-5'],
    ['--skip-permissions', 'implementer', '--model', 'claude-sonnet-5-5', 'claude', '--headless', '0007'],
  ]) {
    assert.deepEqual(parseRunArgs(args), expected, args.join(' '));
  }
});

test('each option of run is taken alone, and a model id is taken as it is written', () => {
  const base = ['reviewer', 'opencode', '0007'];
  const parsed = { role: 'reviewer', harness: 'opencode', unit: '0007', text: [] };
  assert.deepEqual(parseRunArgs([...base, '--headless']), { ...parsed, ...PLAIN, headless: true });
  assert.deepEqual(parseRunArgs([...base, '--skip-permissions']), { ...parsed, ...PLAIN, skipPermissions: true });
  assert.deepEqual(parseRunArgs([...base, '--model', 'openai/gpt-6.1-sol']), {
    ...parsed,
    ...PLAIN,
    model: 'openai/gpt-6.1-sol',
  });
});

test('what follows the unit is the text, word by word, with options among the words taken out', () => {
  assert.deepEqual(parseRunArgs(['reviewer', 'opencode', '0007', 'look', 'at', 'the tests']).text, [
    'look',
    'at',
    'the tests',
  ]);
  const parsed = parseRunArgs(['reviewer', 'opencode', '0007', 'look', '--headless', 'again']);
  assert.deepEqual(parsed.text, ['look', 'again']);
  assert.equal(parsed.headless, true);
});

// R21, R22, R23: the `--`.

test('what follows a -- is returned apart, as written and in order, and none of it is text', () => {
  const parsed = parseRunArgs(['reviewer', 'opencode', '0007', 'why', '--', '--session', 'ses_1', 'a b', '--', '-x']);

  assert.deepEqual(parsed, {
    role: 'reviewer',
    harness: 'opencode',
    unit: '0007',
    text: ['why'],
    ...PLAIN,
    harnessArguments: ['--session', 'ses_1', 'a b', '--', '-x'],
  });
});

test('an option of the command own name after the -- is the harness own, and is not read', () => {
  const parsed = parseRunArgs([
    'reviewer',
    'claude',
    '0007',
    '--model',
    'ours',
    '--',
    '--model',
    'theirs',
    '--headless',
    '--skip-permissions',
    '--verbose',
    '--model',
  ]);

  assert.equal(parsed.model, 'ours');
  assert.equal(parsed.headless, false);
  assert.equal(parsed.skipPermissions, false);
  assert.deepEqual(parsed.text, []);
  assert.deepEqual(parsed.harnessArguments, [
    '--model',
    'theirs',
    '--headless',
    '--skip-permissions',
    '--verbose',
    '--model',
  ]);
});

test('no -- and a -- with nothing after it give the harness nothing more', () => {
  assert.deepEqual(parseRunArgs(['reviewer', 'claude', '0007', 'why']).harnessArguments, []);
  assert.deepEqual(parseRunArgs(['reviewer', 'claude', '0007', 'why', '--']), {
    role: 'reviewer',
    harness: 'claude',
    unit: '0007',
    text: ['why'],
    ...PLAIN,
  });
});

test('a word before the -- that opens with a dash is refused as an option the command does not know', () => {
  for (const [args, named] of [
    [['reviewer', 'claude', '0007', 'why', '--first', '--', '--resume', 'x'], 'unknown option: --first'],
    [['reviewer', 'claude', '0007', '-x', '--'], 'unknown option: -x'],
    [['reviewer', 'claude', '0007', '--resume', 'x'], 'unknown option: --resume'],
  ]) {
    assert.throws(() => parseRunArgs(args), { message: `${named}\n${RUN_USAGE}` }, args.join(' '));
  }
});

test('a quoted argument that holds a word with a dash after another word is text', () => {
  const parsed = parseRunArgs(['reviewer', 'claude', '0007', 'look at --first', 'and', 'not -x', '--', '--resume']);

  assert.deepEqual(parsed.text, ['look at --first', 'and', 'not -x']);
  assert.deepEqual(parsed.harnessArguments, ['--resume']);
});

test('a role, a harness or a unit missing before the -- is named, whatever follows the --', () => {
  for (const [args, named] of [
    [['--', 'reviewer', 'claude', '0007'], 'no role given'],
    [['--'], 'no role given'],
    [['reviewer', '--', 'claude', '0007'], 'no harness given'],
    [['reviewer', 'claude', '--', '0007'], 'no unit given'],
    [['reviewer', 'claude', '--headless', '--', '0007', '--resume', 'x'], 'no unit given'],
    [['auditor', '--', 'claude', '0007'], 'unknown role: auditor'],
  ]) {
    assert.throws(() => parseRunArgs(args), { message: `${named}\n${RUN_USAGE}` }, args.join(' '));
  }
});

test('run with no argument at all throws its usage alone', () => {
  assert.throws(() => parseRunArgs([]), { message: RUN_USAGE });
});

test('each argument run does not take is named, followed by the usage of run', () => {
  for (const [args, named] of [
    [['auditor', 'claude', '0007'], 'unknown role: auditor'],
    [['toString', 'claude', '0007'], 'unknown role: toString'],
    [['reviewer', 'codex', '0007'], 'unknown harness: codex'],
    [['reviewer', 'constructor', '0007'], 'unknown harness: constructor'],
    [['claude', 'reviewer', '0007'], 'unknown role: claude'],
    [['reviewer', 'claude'], 'no unit given'],
    [['reviewer', 'claude', '--headless'], 'no unit given'],
    [['reviewer'], 'no harness given'],
    [['--headless'], 'no role given'],
    [['reviewer', 'claude', '0007', '--verbose'], 'unknown option: --verbose'],
    [['reviewer', 'claude', '0007', '-p'], 'unknown option: -p'],
    [['reviewer', 'claude', '0007', '--model'], '--model takes an id, and none was given'],
    [['reviewer', 'claude', '--model', '--headless', '0007'], '--model takes an id, and none was given'],
    [['reviewer', 'claude', '0007', '--model='], '--model takes an id, and none was given'],
    [['reviewer', 'claude', '0007', '--headless=yes'], '--headless takes no value'],
    [['reviewer', 'claude', '0007', '--skip-permissions=1'], '--skip-permissions takes no value'],
  ]) {
    assert.throws(() => parseRunArgs(args), { message: `${named}\n${RUN_USAGE}` }, args.join(' '));
  }
});

// R4: the unit.

const DIRECTORIES = [
  '0001-first',
  '0007-run-a-role',
  '0012-twice',
  '0012-twice-again',
  'history-0036-install-the-agent-kit',
];

test('a unit is given by its name, with or without changes/ before it and a slash after it', () => {
  for (const given of [
    '0007-run-a-role',
    '0007-run-a-role/',
    'changes/0007-run-a-role',
    'changes/0007-run-a-role/',
  ]) {
    assert.equal(resolveUnit(given, DIRECTORIES), '0007-run-a-role', given);
  }
  assert.equal(resolveUnit('0012-twice', DIRECTORIES), '0012-twice');
  assert.equal(
    resolveUnit('changes/history-0036-install-the-agent-kit/', DIRECTORIES),
    'history-0036-install-the-agent-kit',
  );
});

test('a unit is given by the four digits its name opens with', () => {
  assert.equal(resolveUnit('0007', DIRECTORIES), '0007-run-a-role');
  assert.equal(resolveUnit('0001', DIRECTORIES), '0001-first');
});

test('digits that a name holds but does not open with name no unit', () => {
  assert.throws(() => resolveUnit('0036', DIRECTORIES), { message: 'changes/ holds no directory for the unit 0036' });
});

test('a unit that changes/ does not hold is said to be missing, as it was given', () => {
  for (const given of ['0099', '7', '007', '00070', '0007-run', 'run-a-role', 'changes/0099-nothing/', '../0007']) {
    assert.throws(
      () => resolveUnit(given, DIRECTORIES),
      { message: `changes/ holds no directory for the unit ${given}` },
      given,
    );
  }
  assert.throws(() => resolveUnit('0007', []), { message: 'changes/ holds no directory for the unit 0007' });
});

test('digits that open more than one name are refused, and the directories are named', () => {
  assert.throws(() => resolveUnit('0012', DIRECTORIES), {
    message:
      'the digits 0012 open more than one directory of changes/, so give the unit by its name:\n' +
      '- changes/0012-twice\n' +
      '- changes/0012-twice-again',
  });
});

// R5: the prompt.

test('the prompt names the unit directory, and nothing else when no text is given', () => {
  assert.equal(unitPrompt('0007-run-a-role', []), 'The unit is changes/0007-run-a-role/.');
});

test('the prompt holds the text after an empty line, its words joined by single spaces', () => {
  assert.equal(
    unitPrompt('0007-run-a-role', ['look', 'at', 'the tests', '--first']),
    'The unit is changes/0007-run-a-role/.\n\nlook at the tests --first',
  );
});

// R5 to R9, R21: the harness's argument list, which is exactly the row of the plan's table.

const P = 'The unit is changes/0007-run-a-role/.';
const ROWS = {
  claude: {
    command: 'claude',
    skip: '--dangerously-skip-permissions',
    interactive: (options, extra) => [...options, P, ...extra],
    headless: (options, extra) => ['--print', ...options, P, ...extra],
  },
  opencode: {
    command: 'opencode',
    skip: '--auto',
    interactive: (options, extra) => [...options, '--prompt', P, ...extra],
    headless: (options, extra) => ['run', ...options, P, ...extra],
  },
};
const EXTRA = ['--resume', 'an id', '--model', 'theirs'];

test('every harness the kit has holds a row for each mode', () => {
  assert.deepEqual(Object.keys(ROWS).sort(), [...HARNESS_NAMES].sort());
  for (const harness of HARNESS_NAMES) {
    for (const headless of [false, true]) {
      const started = harnessCommand({ ...PLAIN, harness, role: 'reviewer', headless, prompt: P });
      assert.equal(typeof started.command, 'string');
      assert.ok(started.args.includes(P));
    }
  }
});

test('the argument list of each harness in each mode is the row of the table, option by option', () => {
  for (const [harness, row] of Object.entries(ROWS)) {
    for (const mode of ['interactive', 'headless']) {
      for (const model of [undefined, 'openai/gpt-6.1-sol']) {
        for (const skipPermissions of [false, true]) {
          for (const harnessArguments of [[], EXTRA]) {
            const options = [
              '--agent',
              'reviewer',
              ...(model === undefined ? [] : ['--model', model]),
              ...(skipPermissions ? [row.skip] : []),
            ];
            assert.deepEqual(
              harnessCommand({
                harness,
                role: 'reviewer',
                model,
                headless: mode === 'headless',
                skipPermissions,
                prompt: P,
                harnessArguments,
              }),
              { command: row.command, args: row[mode](options, harnessArguments) },
              `${harness} ${mode} ${model} ${skipPermissions} ${harnessArguments.length}`,
            );
          }
        }
      }
    }
  }
});

test('what the caller gave after the -- is last in the argument list, in every row', () => {
  for (const harness of HARNESS_NAMES) {
    for (const headless of [false, true]) {
      const { args } = harnessCommand({
        harness,
        role: 'reviewer',
        model: 'm',
        headless,
        skipPermissions: true,
        prompt: P,
        harnessArguments: EXTRA,
      });
      assert.deepEqual(args.slice(-EXTRA.length), EXTRA, `${harness} ${headless}`);
      assert.equal(args.at(-EXTRA.length - 1), P, `${harness} ${headless}`);
    }
  }
});

test('with nothing after a --, the harness gets nothing beyond the arguments of the command own', () => {
  const all = { role: 'implementer', model: 'm', skipPermissions: true, prompt: P, harnessArguments: [] };
  assert.deepEqual(harnessCommand({ ...all, harness: 'claude', headless: false }).args, [
    '--agent',
    'implementer',
    '--model',
    'm',
    '--dangerously-skip-permissions',
    P,
  ]);
  assert.deepEqual(harnessCommand({ ...all, harness: 'claude', headless: true }).args, [
    '--print',
    '--agent',
    'implementer',
    '--model',
    'm',
    '--dangerously-skip-permissions',
    P,
  ]);
  assert.deepEqual(harnessCommand({ ...all, harness: 'opencode', headless: false }).args, [
    '--agent',
    'implementer',
    '--model',
    'm',
    '--auto',
    '--prompt',
    P,
  ]);
  assert.deepEqual(harnessCommand({ ...all, harness: 'opencode', headless: true }).args, [
    'run',
    '--agent',
    'implementer',
    '--model',
    'm',
    '--auto',
    P,
  ]);
});

// `run` as a command, in a project with the wrappers refresh writes, one unit, and a PATH that holds nothing but a
// fake of each harness.

// Prints its own name and then its arguments, one to a line, and ends as the test's environment says.
const FAKE_HARNESS = `#!/bin/sh
printf '%s\\n' "\${0##*/}"
for argument in "$@"; do printf '%s\\n' "$argument"; done
printf 'the harness, on standard error\\n' >&2
if [ -n "$FAKE_READS" ]; then IFS= read -r line; printf 'read: %s\\n' "$line"; fi
if [ -n "$FAKE_SIGNAL" ]; then kill -s "$FAKE_SIGNAL" $$; fi
exit "\${FAKE_STATUS:-0}"
`;
const UNIT = '0007-run-a-role';
const UNIT_PROMPT = `The unit is changes/${UNIT}/.`;

function project(t, harnesses = ['claude', 'opencode']) {
  const base = emptyDirectory(t);
  const write = (path, content) => {
    mkdirSync(dirname(join(base, path)), { recursive: true });
    writeFileSync(join(base, path), content);
  };
  const read = (path) => readFileSync(join(base, path), 'utf-8');
  for (const harness of harnesses) {
    write(`bin/${harness}`, FAKE_HARNESS);
    chmodSync(join(base, 'bin', harness), 0o755);
  }
  const agentrite = (args, options = {}) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: base,
      encoding: 'utf-8',
      input: options.input,
      env: { PATH: join(base, 'bin'), ...options.env },
    });
  assert.equal(agentrite(['refresh', 'claude', 'opencode']).status, 0);
  write(`changes/${UNIT}/record.md`, '# 0007\n');
  return { base, write, read, agentrite };
}

// What a fake prints for the arguments it got.
function started(command, args) {
  return `${[command, ...args].join('\n')}\n`;
}

const WRAPPER_DIRECTORIES = { claude: '.claude/agents', opencode: '.opencode/agents' };

test('run starts each harness in each mode with the arguments of its row, and its output is the command own', (t) => {
  const { agentrite } = project(t);
  for (const [args, command, expected] of [
    [['reviewer', 'claude', '0007'], 'claude', ['--agent', 'reviewer', UNIT_PROMPT]],
    [['reviewer', 'claude', '0007', '--headless'], 'claude', ['--print', '--agent', 'reviewer', UNIT_PROMPT]],
    [['reviewer', 'opencode', '0007'], 'opencode', ['--agent', 'reviewer', '--prompt', UNIT_PROMPT]],
    [['reviewer', 'opencode', '0007', '--headless'], 'opencode', ['run', '--agent', 'reviewer', UNIT_PROMPT]],
  ]) {
    const result = agentrite(['run', ...args]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, started(command, expected), args.join(' '));
    assert.equal(result.stderr, 'the harness, on standard error\n');
  }
});

test('run gives the harness the model, the permission flag and the text, and nothing beyond them', (t) => {
  const { agentrite } = project(t);
  const text = `${UNIT_PROMPT}\n\nlook at the tests --first`;

  const claude = agentrite([
    'run',
    '--model',
    'claude-sonnet-5-5',
    'implementer',
    'claude',
    `changes/${UNIT}/`,
    '--skip-permissions',
    'look',
    'at',
    'the tests --first',
  ]);
  const opencode = agentrite([
    'run',
    'planner',
    'opencode',
    UNIT,
    '--headless',
    '--skip-permissions',
    '--model=openai/gpt-6.1-sol',
  ]);

  assert.equal(claude.status, 0, claude.stderr);
  assert.equal(
    claude.stdout,
    started('claude', [
      '--agent',
      'implementer',
      '--model',
      'claude-sonnet-5-5',
      '--dangerously-skip-permissions',
      text,
    ]),
  );
  assert.equal(opencode.status, 0, opencode.stderr);
  assert.equal(
    opencode.stdout,
    started('opencode', ['run', '--agent', 'planner', '--model', 'openai/gpt-6.1-sol', '--auto', UNIT_PROMPT]),
  );
});

test('each harness in each mode gets what follows the -- after its prompt, as it is written', (t) => {
  const { agentrite } = project(t);
  const extra = ['--resume', 'an id with spaces', '--model', 'theirs', '--', '--headless', ''];
  for (const [args, command, expected] of [
    [['reviewer', 'claude', '0007'], 'claude', ['--agent', 'reviewer', UNIT_PROMPT]],
    [['reviewer', 'claude', '0007', '--headless'], 'claude', ['--print', '--agent', 'reviewer', UNIT_PROMPT]],
    [['reviewer', 'opencode', '0007'], 'opencode', ['--agent', 'reviewer', '--prompt', UNIT_PROMPT]],
    [['reviewer', 'opencode', '0007', '--headless'], 'opencode', ['run', '--agent', 'reviewer', UNIT_PROMPT]],
  ]) {
    const result = agentrite(['run', ...args, '--', ...extra]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, started(command, [...expected, ...extra]), args.join(' '));
  }
});

test('text before the -- stays in the prompt, and a -- with nothing after it adds nothing', (t) => {
  const { agentrite } = project(t);
  const prompt = `${UNIT_PROMPT}\n\nwhich word`;

  const run = ['run', 'reviewer', 'opencode', '0007', '--headless', 'which', 'word'];

  const resumed = agentrite([...run, '--', '--session', 'ses_1']);
  const bare = agentrite([...run, '--']);

  assert.equal(resumed.stdout, started('opencode', ['run', '--agent', 'reviewer', prompt, '--session', 'ses_1']));
  assert.equal(bare.stdout, started('opencode', ['run', '--agent', 'reviewer', prompt]));
});

test('the standard input of run is the harness own', (t) => {
  const { agentrite } = project(t);

  const result = agentrite(['run', 'reviewer', 'claude', '0007'], { input: 'typed\n', env: { FAKE_READS: '1' } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${started('claude', ['--agent', 'reviewer', UNIT_PROMPT])}read: typed\n`);
});

test('run exits with the status the harness exited with', (t) => {
  const { agentrite } = project(t);
  for (const harness of HARNESS_NAMES) {
    for (const status of [0, 7]) {
      const result = agentrite(['run', 'reviewer', harness, '0007'], { env: { FAKE_STATUS: String(status) } });
      assert.equal(result.status, status, `${harness} ${status}`);
      assert.equal(result.signal, null);
    }
  }
});

test('run exits with a status other than 0 when a signal ended the harness', (t) => {
  const { agentrite } = project(t);
  for (const signal of ['TERM', 'KILL']) {
    const result = agentrite(['run', 'reviewer', 'opencode', '0007', '--headless'], {
      env: { FAKE_SIGNAL: signal, FAKE_STATUS: '0' },
    });
    assert.equal(result.signal, null, signal);
    assert.notEqual(result.status, 0, signal);
    assert.match(result.stdout, /^opencode\n/);
  }
});

// The usage of `run`, as the command prints it after a line that names what it does not take.
function namedWithUsage(named) {
  return `${named}\n${RUN_USAGE}\n`;
}

test('a wrapper that is missing, or is not what refresh would leave, stops the run before a harness starts', (t) => {
  for (const harness of HARNESS_NAMES) {
    const path = `${WRAPPER_DIRECTORIES[harness]}/reviewer.md`;
    const { base, agentrite, read, write } = project(t);
    const asWritten = read(path);
    const changed = {
      'a key of the project own': asWritten.replace('\n---\n', '\nsteps: 5\n---\n'),
      'an earlier package name': asWritten.replace('@ritenoar/agentrite', '@ritenoar/agent-kit'),
      'no frontmatter': 'Review it.\n',
      // The wrappers of the other harness hold no mode, and this one is then left out below.
      'mode: subagent': asWritten.replace('mode: all\n', 'mode: subagent\n'),
    };
    if (harness === 'opencode') assert.match(asWritten, /^mode: all$/m);

    for (const [why, content] of Object.entries(changed).filter(([, content]) => content !== asWritten)) {
      write(path, content);

      const result = agentrite(['run', 'reviewer', harness, '0007']);

      assert.equal(result.status, 1, `${harness}, ${why}`);
      assert.equal(result.stdout, '', `${harness}, ${why}`);
      assert.equal(
        result.stderr,
        `agentrite: ${path} is not the file refresh would leave there. Run: npx agentrite refresh ${harness}\n`,
      );
    }

    rmSync(join(base, path));
    const missing = agentrite(['run', 'reviewer', harness, '0007', '--headless']);

    assert.equal(missing.status, 1, harness);
    assert.equal(missing.stdout, '', harness);
    assert.equal(
      missing.stderr,
      `agentrite: the project has no file ${path}. Run: npx agentrite refresh ${harness}\n`,
    );
  }
});

test('only the wrapper of the role and the harness that are run is looked at', (t) => {
  const { base, agentrite, write } = project(t);
  rmSync(join(base, '.opencode'), { recursive: true });
  write('.claude/agents/planner.md', 'Ours.\n');

  const result = agentrite(['run', 'reviewer', 'claude', '0007']);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /^claude\n/);
});

test('a wrapper with a pinned model does not stop the run, and the harness gets no model', (t) => {
  for (const harness of HARNESS_NAMES) {
    const path = `${WRAPPER_DIRECTORIES[harness]}/reviewer.md`;
    const { agentrite, read, write } = project(t);
    // Where refresh puts a pin: at the end of the frontmatter.
    const pinned = read(path).replace('\n---\n', '\nmodel: some/model\n---\n');
    write(path, pinned);
    assert.equal(agentrite(['refresh', harness]).stdout.includes(`up to date ${path}`), true);

    const result = agentrite(['run', 'reviewer', harness, '0007', '--headless']);

    assert.equal(result.status, 0, result.stderr);
    assert.match(result.stdout, new RegExp(`^${harness}\n`));
    assert.doesNotMatch(result.stdout, /--model|some\/model/);
  }
});

test('a PATH without the command of the harness stops the run and names the command', (t) => {
  for (const [absent, present] of [
    ['claude', 'opencode'],
    ['opencode', 'claude'],
  ]) {
    const { agentrite } = project(t, [present]);

    const result = agentrite(['run', 'reviewer', absent, '0007']);

    assert.equal(result.status, 1, absent);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, `agentrite: the command ${absent} was not found on the PATH\n`);
  }
});

test('run with no argument prints its usage on standard error, exits 2 and starts nothing', (t) => {
  const { agentrite } = project(t);

  const result = agentrite(['run']);

  assert.equal(result.status, 2);
  assert.equal(result.stdout, '');
  assert.equal(result.stderr, `${RUN_USAGE}\n`);
});

test('what run does not take is named before its usage, with exit 2 and nothing started', (t) => {
  const { agentrite } = project(t);
  for (const [args, named] of [
    [['auditor', 'claude', '0007'], 'unknown role: auditor'],
    [['reviewer', 'codex', '0007'], 'unknown harness: codex'],
    [['reviewer', 'claude'], 'no unit given'],
    [['reviewer', 'claude', '0007', '--verbose'], 'unknown option: --verbose'],
    [['reviewer', 'claude', '0007', '--model'], '--model takes an id, and none was given'],
    [['reviewer', 'claude', '0007', '--resume', 'an-id'], 'unknown option: --resume'],
    [['reviewer', 'claude', '--', '0007'], 'no unit given'],
  ]) {
    const result = agentrite(['run', ...args]);

    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '', args.join(' '));
    assert.equal(result.stderr, namedWithUsage(named));
  }
});

test('a unit that changes/ does not hold exits 1 and starts nothing', (t) => {
  const { base, agentrite, write } = project(t);
  write('changes/0007-a-file', 'not a directory\n');
  write('changes/0012-twice/record.md', '');
  write('changes/0012-twice-again/record.md', '');

  const none = agentrite(['run', 'reviewer', 'claude', '0099']);
  const file = agentrite(['run', 'reviewer', 'claude', '0007-a-file']);
  const two = agentrite(['run', 'reviewer', 'claude', '0012']);
  rmSync(join(base, 'changes'), { recursive: true });
  const noChanges = agentrite(['run', 'reviewer', 'claude', '0007']);

  for (const result of [none, file, two, noChanges]) {
    assert.equal(result.status, 1, result.stderr);
    assert.equal(result.stdout, '');
  }
  assert.equal(none.stderr, 'agentrite: changes/ holds no directory for the unit 0099\n');
  assert.equal(file.stderr, 'agentrite: changes/ holds no directory for the unit 0007-a-file\n');
  assert.equal(noChanges.stderr, 'agentrite: changes/ holds no directory for the unit 0007\n');
  assert.match(two.stderr, /^agentrite: the digits 0012 open more than one directory of changes\//);
  assert.match(two.stderr, /^- changes\/0012-twice$/m);
  assert.match(two.stderr, /^- changes\/0012-twice-again$/m);
});

test('a file beside the unit whose name opens with the same digits does not make the digits name two', (t) => {
  const { agentrite, write } = project(t);
  write('changes/0007-notes.md', 'a file\n');

  const result = agentrite(['run', 'reviewer', 'claude', '0007']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, started('claude', ['--agent', 'reviewer', UNIT_PROMPT]));
});

// R14

test('agentrite alone and with a command it does not know print the usage of every command and exit 2', (t) => {
  const { agentrite } = project(t);
  const usage =
    'usage: agentrite init claude | opencode\n' +
    '       agentrite refresh claude | opencode\n' +
    '       agentrite roles\n' +
    '       agentrite run <role> <harness> [--model <id>] [--headless] [--skip-permissions] <unit> [text...]\n' +
    '                     [-- <harness arguments...>]\n';

  const alone = agentrite([]);
  const unknown = agentrite(['list-roles']);

  assert.equal(alone.status, 2);
  assert.equal(alone.stdout, '');
  assert.equal(alone.stderr, usage);
  assert.equal(unknown.status, 2);
  assert.equal(unknown.stdout, '');
  assert.equal(unknown.stderr, `unknown command: list-roles\n${usage}`);
});
