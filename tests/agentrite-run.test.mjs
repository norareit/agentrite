import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { HARNESS_NAMES, plannedFiles, ROLE_NAMES } from '../scripts/agentrite-roles.mjs';
import {
  harnessCommand,
  parseRunArgs,
  resolveUnit,
  rolesJson,
  rolesListing,
  runUsage,
  unitPrompt,
} from '../scripts/agentrite-run.mjs';
import { installKit, KIT_ROLES } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

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
  const base = temporaryDirectory(t, 'agentrite-run-');
  return base;
}

// R1: the roles.

test('the listing holds every role the kit has, in the order the kit holds them', () => {
  const blocks = rolesListing(KIT_ROLES).trimEnd().split('\n\n');

  assert.ok(KIT_ROLES.length > 0);
  assert.deepEqual(
    blocks.map((block) => block.split('\n')[0]),
    KIT_ROLES.map((role) => role.name),
  );
});

test('each role is listed with its description as the wrappers hold it, indented by two spaces', () => {
  const wrappers = plannedFiles(['claude'], KIT_ROLES);
  const blocks = rolesListing(KIT_ROLES).trimEnd().split('\n\n');

  blocks.forEach((block, index) => {
    const [name, ...lines] = block.split('\n');
    const wrapper = wrappers.find((file) => file.path === `.claude/agents/${name}.md`);
    assert.ok(wrapper, `no wrapper for ${name}`);
    for (const line of lines) assert.match(line, /^ {2}\S/);
    assert.equal(lines.map((line) => line.slice(2)).join(' '), wrapperDescription(wrapper.content));
    assert.equal(lines.map((line) => line.slice(2)).join(' '), KIT_ROLES[index].description);
  });
});

test('no line of the listing is over 120 characters, and it ends with one line break', () => {
  const listing = rolesListing(KIT_ROLES);

  for (const line of listing.split('\n')) assert.ok(line.length <= 120, `a line of ${line.length} characters`);
  assert.equal(listing, `${listing.trimEnd()}\n`);
});

test('agentrite roles prints the listing of the kit roles and exits 0 in a project that names them', (t) => {
  const { agentrite } = project(t);

  const result = agentrite(['roles']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, rolesListing(KIT_ROLES));
});

test('agentrite roles with an argument that is not --json prints its usage on standard error and exits 2', (t) => {
  const cwd = emptyDirectory(t);
  for (const args of [['claude'], ['--json', 'claude'], ['claude', '--json'], ['--json', '--json'], ['--yaml']]) {
    const result = spawnSync(process.execPath, [script, 'roles', ...args], { cwd, encoding: 'utf-8' });

    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '', args.join(' '));
    assert.equal(result.stderr, 'usage: agentrite roles [--json]\n', args.join(' '));
  }
});

// R20: the roles as JSON.

test('the JSON of the roles reads back as the roles the kit has, in order, by name and description', () => {
  const document = JSON.parse(rolesJson(KIT_ROLES));

  assert.deepEqual(Object.keys(document), ['roles']);
  assert.deepEqual(
    document.roles,
    KIT_ROLES.map((role) => ({ name: role.name, description: role.description, path: role.path })),
  );
  for (const role of document.roles) {
    assert.deepEqual(Object.keys(role), ['name', 'description', 'path']);
    assert.doesNotMatch(role.description, /\n/);
  }
});

test('each description in the JSON is the one the wrappers hold, as one line', () => {
  const wrappers = plannedFiles(['claude'], KIT_ROLES);

  for (const role of JSON.parse(rolesJson(KIT_ROLES)).roles) {
    const wrapper = wrappers.find((file) => file.path === `.claude/agents/${role.name}.md`);
    assert.ok(wrapper, `no wrapper for ${role.name}`);
    assert.equal(role.description, wrapperDescription(wrapper.content));
  }
});

test('the JSON is indented by two, each key of a role on a line of its own, and ends with one line break', () => {
  const json = rolesJson([{ name: 'a', description: 'One "quoted" line.', path: 'rules/a.md' }]);

  assert.equal(
    json,
    '{\n  "roles": [\n    {\n      "name": "a",\n      "description": "One \\"quoted\\" line.",\n' +
      '      "path": "rules/a.md"\n    }\n  ]\n}\n',
  );
  assert.equal(rolesJson(KIT_ROLES), `${JSON.stringify(JSON.parse(rolesJson(KIT_ROLES)), null, 2)}\n`);
});

test('agentrite roles --json prints the JSON of the kit roles and exits 0 in a project that names them', (t) => {
  const { agentrite } = project(t);

  const result = agentrite(['roles', '--json']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, '');
  assert.equal(result.stdout, rolesJson(KIT_ROLES));
  assert.deepEqual(
    JSON.parse(result.stdout).roles.map((role) => role.name),
    ROLE_NAMES,
  );
});

// R12: the usage of `run`.

const RUN_USAGE = `
usage: agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] [--skip-permissions]
                     [-- <harness arguments...>]

  <role>              a role that agentrite.json names, as agentrite roles lists them
  <harness>           claude | opencode
  <unit>              a directory of changes/, by its name or by the four digits its name opens with
  --prompt <text>     added to the prompt, after the unit, as it is written
  --model <id>        the harness's own id of a model, such as claude-sonnet-5-5 or openai/gpt-6.1-sol.
                      Without it the harness decides: the role's wrapper may pin one
  --headless          run without a session: the harness works on the prompt and ends
  --skip-permissions  the harness asks no permission: --dangerously-skip-permissions for claude, which
                      bypasses every check, and --auto for opencode, which approves what is not denied.
                      Meant for the sandbox
  -- <harness arguments...>
                      given to the harness as written, before the prompt. The command reads none of
                      them`.slice(1);

test('the usage of run is the text of the plan, with the roles and the harnesses the kit has', () => {
  assert.equal(runUsage(), RUN_USAGE);
  for (const role of ROLE_NAMES) assert.doesNotMatch(runUsage().split('\n')[2], new RegExp(role));
  assert.match(runUsage(), new RegExp(`^  <harness> +${HARNESS_NAMES.join(' \\| ')}$`, 'm'));
  for (const line of runUsage().split('\n')) assert.ok(line.length <= 120, line);
});

// R2, R3, R13: the arguments of `run`.

const PLAIN = { text: undefined, model: undefined, headless: false, skipPermissions: false, harnessArguments: [] };
const REVIEW = { role: 'reviewer', harness: 'opencode', unit: '0007' };

test('run takes the role, the harness and the unit, in that order', () => {
  assert.deepEqual(parseRunArgs(['reviewer', 'opencode', '0007']), { ...REVIEW, ...PLAIN });
  for (const role of ROLE_NAMES) {
    for (const harness of HARNESS_NAMES) {
      const parsed = parseRunArgs([role, harness, '0007-a-unit']);
      assert.deepEqual([parsed.role, parsed.harness, parsed.unit], [role, harness, '0007-a-unit']);
    }
  }
});

test('the options of run are taken before, between and after the three positions', () => {
  const expected = {
    role: 'implementer',
    harness: 'claude',
    unit: '0007',
    text: 'look at the tests',
    model: 'claude-sonnet-5-5',
    headless: true,
    skipPermissions: true,
    harnessArguments: [],
  };
  const prompt = ['--prompt', 'look at the tests'];
  const model = ['--model', 'claude-sonnet-5-5'];
  for (const args of [
    [...prompt, ...model, '--headless', '--skip-permissions', 'implementer', 'claude', '0007'],
    ['implementer', '--headless', 'claude', ...model, '0007', '--skip-permissions', ...prompt],
    ['implementer', 'claude', '0007', '--skip-permissions', '--headless', '--model=claude-sonnet-5-5', ...prompt],
    ['--skip-permissions', 'implementer', ...prompt, ...model, 'claude', '--headless', '0007'],
    ['implementer', 'claude', '--prompt=look at the tests', '0007', '--headless', ...model, '--skip-permissions'],
  ]) {
    assert.deepEqual(parseRunArgs(args), expected, args.join(' '));
  }
});

test('each option of run is taken alone, and a model id is taken as it is written', () => {
  const base = ['reviewer', 'opencode', '0007'];
  assert.deepEqual(parseRunArgs([...base, '--headless']), { ...REVIEW, ...PLAIN, headless: true });
  assert.deepEqual(parseRunArgs([...base, '--skip-permissions']), { ...REVIEW, ...PLAIN, skipPermissions: true });
  assert.deepEqual(parseRunArgs([...base, '--model', 'openai/gpt-6.1-sol']), {
    ...REVIEW,
    ...PLAIN,
    model: 'openai/gpt-6.1-sol',
  });
  assert.deepEqual(parseRunArgs([...base, '--prompt', 'why']), { ...REVIEW, ...PLAIN, text: 'why' });
});

// R5, R23: the text.

test('the text of --prompt is returned as it is written, whatever words it holds', () => {
  for (const text of ['look', 'look at  the tests', 'start with --headless in the tests', 'a\n\nb', ' -x']) {
    assert.equal(parseRunArgs(['reviewer', 'opencode', '0007', '--prompt', text]).text, text, text);
  }
});

test('a text that opens with a dash is taken when it is given as --prompt=<text>', () => {
  const parsed = parseRunArgs(['reviewer', 'opencode', '0007', '--prompt=--headless is what I mean']);

  assert.equal(parsed.text, '--headless is what I mean');
  assert.equal(parsed.headless, false);
});

test('of two --prompt the last one counts', () => {
  assert.equal(parseRunArgs(['reviewer', 'opencode', '--prompt', 'one', '0007', '--prompt=two']).text, 'two');
});

// R21, R22, R23: the `--`.

test('what follows a -- is returned apart, as written and in order', () => {
  const parsed = parseRunArgs([
    'reviewer',
    'opencode',
    '0007',
    '--prompt',
    'why',
    '--',
    '--session',
    'ses_1',
    'a b',
    '--',
    '-x',
  ]);

  assert.deepEqual(parsed, {
    ...REVIEW,
    ...PLAIN,
    text: 'why',
    harnessArguments: ['--session', 'ses_1', 'a b', '--', '-x'],
  });
});

test('an option of the command own name after the -- is the harness own, and is not read', () => {
  const after = ['--model', 'theirs', '--headless', '--skip-permissions', '--prompt', 'theirs', '--verbose', '--model'];
  const parsed = parseRunArgs(['reviewer', 'claude', '0007', '--model', 'ours', '--', ...after]);

  assert.equal(parsed.model, 'ours');
  assert.equal(parsed.headless, false);
  assert.equal(parsed.skipPermissions, false);
  assert.equal(parsed.text, undefined);
  assert.deepEqual(parsed.harnessArguments, after);
});

test('no -- and a -- with nothing after it give the harness nothing more', () => {
  assert.deepEqual(parseRunArgs(['reviewer', 'opencode', '0007', '--prompt', 'why']).harnessArguments, []);
  assert.deepEqual(parseRunArgs(['reviewer', 'opencode', '0007', '--prompt', 'why', '--']), {
    ...REVIEW,
    ...PLAIN,
    text: 'why',
  });
});

test('a word before the -- that opens with a dash is refused as an option the command does not know', () => {
  for (const [args, named] of [
    [['reviewer', 'claude', '0007', '--first', '--', '--resume', 'x'], 'unknown option: --first'],
    [['reviewer', 'claude', '0007', '-x', '--'], 'unknown option: -x'],
    [['reviewer', 'claude', '0007', '--resume', 'x'], 'unknown option: --resume'],
    [['reviewer', 'claude', '0007', '-p', 'why'], 'unknown option: -p'],
  ]) {
    assert.throws(() => parseRunArgs(args), { message: `${named}\n${RUN_USAGE}` }, args.join(' '));
  }
});

test('a role, a harness or a unit missing before the -- is named, whatever follows the --', () => {
  for (const [args, named] of [
    [['--', 'reviewer', 'claude', '0007'], 'no role given'],
    [['--'], 'no role given'],
    [['reviewer', '--', 'claude', '0007'], 'no harness given'],
    [['reviewer', 'claude', '--', '0007'], 'no unit given'],
    [['reviewer', 'claude', '--headless', '--', '0007', '--resume', 'x'], 'no unit given'],
  ]) {
    assert.throws(() => parseRunArgs(args), { message: `${named}\n${RUN_USAGE}` }, args.join(' '));
  }
});

test('run takes any word as the role, whatever it is', () => {
  for (const role of ['auditor', 'toString', 'security-reviewer']) {
    const parsed = parseRunArgs([role, 'claude', '0007']);
    assert.deepEqual([parsed.role, parsed.harness, parsed.unit], [role, 'claude', '0007']);
  }
});

test('run with no argument at all throws its usage alone', () => {
  assert.throws(() => parseRunArgs([]), { message: RUN_USAGE });
});

test('each argument run does not take is named, followed by the usage of run', () => {
  const noText = '--prompt takes a text, and none was given';
  const noId = '--model takes an id, and none was given';
  for (const [args, named] of [
    [['reviewer', 'codex', '0007'], 'unknown harness: codex'],
    [['reviewer', 'constructor', '0007'], 'unknown harness: constructor'],
    [['claude', 'reviewer', '0007'], 'unknown harness: reviewer'],
    [['reviewer', 'claude'], 'no unit given'],
    [['reviewer', 'claude', '--headless'], 'no unit given'],
    [['reviewer'], 'no harness given'],
    [['--headless'], 'no role given'],
    [['reviewer', 'claude', '0007', 'look'], 'unexpected argument: look'],
    [['reviewer', 'claude', '0007', 'look', 'at', 'it'], 'unexpected argument: look'],
    [['reviewer', 'claude', '0007', 'look at it', '--', '--resume'], 'unexpected argument: look at it'],
    [['reviewer', 'claude', '0007', '--verbose'], 'unknown option: --verbose'],
    [['reviewer', 'claude', '0007', '--model'], noId],
    [['reviewer', 'claude', '--model', '--headless', '0007'], noId],
    [['reviewer', 'claude', '0007', '--model='], noId],
    [['reviewer', 'claude', '0007', '--prompt'], noText],
    [['reviewer', 'claude', '0007', '--prompt', '--'], noText],
    [['reviewer', 'claude', '0007', '--prompt', ''], noText],
    [['reviewer', 'claude', '0007', '--prompt='], noText],
    [['reviewer', 'claude', '--prompt', '--headless', '0007'], noText],
    [['reviewer', 'claude', '0007', '--prompt', '-x why'], noText],
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
  assert.equal(unitPrompt('0007-run-a-role', undefined), 'The unit is changes/0007-run-a-role/.');
});

test('the prompt holds the text after an empty line, as it is written', () => {
  assert.equal(
    unitPrompt('0007-run-a-role', 'look at  the tests,\n--first'),
    'The unit is changes/0007-run-a-role/.\n\nlook at  the tests,\n--first',
  );
});

// R5 to R9, R21: the harness's argument list, which is exactly the row of the plan's table.

const P = 'The unit is changes/0007-run-a-role/.';
const ROWS = {
  claude: {
    command: 'claude',
    skip: '--dangerously-skip-permissions',
    interactive: (options, extra) => [...options, ...extra, '--', P],
    headless: (options, extra) => ['--print', ...options, ...extra, '--', P],
  },
  opencode: {
    command: 'opencode',
    skip: '--auto',
    interactive: (options, extra) => [...options, ...extra, '--prompt', P],
    headless: (options, extra) => ['run', ...options, ...extra, '--', P],
  },
};
const EXTRA = ['--resume', 'an id', '--allowedTools', 'Read', 'Grep'];
const START = { model: undefined, headless: false, skipPermissions: false, harnessArguments: [] };

test('every harness the kit has holds a row for each mode', () => {
  assert.deepEqual(Object.keys(ROWS).sort(), [...HARNESS_NAMES].sort());
  for (const harness of HARNESS_NAMES) {
    for (const headless of [false, true]) {
      const started = harnessCommand({ ...START, harness, role: 'reviewer', headless, prompt: P });
      assert.equal(typeof started.command, 'string');
      assert.equal(started.args.at(-1), P);
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

test('the prompt is last in every row, and what the caller gave stands in front of it, behind the options', () => {
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
      const at = args.indexOf(EXTRA[0]);
      assert.equal(args.at(-1), P, `${harness} ${headless}`);
      assert.deepEqual(args.slice(at, at + EXTRA.length), EXTRA, `${harness} ${headless}`);
      assert.equal(args.length, at + EXTRA.length + 2, `${harness} ${headless}`);
      assert.ok(args.indexOf('m') < at && args.indexOf('--agent') < at, `${harness} ${headless}`);
    }
  }
});

test('the four rows with nothing of the caller, written out', () => {
  const all = { role: 'implementer', model: 'm', skipPermissions: true, prompt: P, harnessArguments: [] };
  assert.deepEqual(harnessCommand({ ...all, harness: 'claude', headless: false }).args, [
    '--agent',
    'implementer',
    '--model',
    'm',
    '--dangerously-skip-permissions',
    '--',
    P,
  ]);
  assert.deepEqual(harnessCommand({ ...all, harness: 'claude', headless: true }).args, [
    '--print',
    '--agent',
    'implementer',
    '--model',
    'm',
    '--dangerously-skip-permissions',
    '--',
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
    '--',
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

const SETTINGS = readFileSync(new URL('../templates/project/agentrite.json', import.meta.url), 'utf-8');
const REMEDY = 'Run: npx agentrite refresh, which writes the wrappers of the harnesses that agentrite.json names';

function project(t, harnesses = ['claude', 'opencode']) {
  const base = emptyDirectory(t);
  installKit(base);
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
  // Every harness has its wrappers, whichever of them has a command on the PATH.
  write('agentrite.json', SETTINGS);
  assert.equal(agentrite(['refresh']).status, 0);
  write(`changes/${UNIT}/record.md`, '# 0007\n');
  return { base, write, read, agentrite };
}

// What a fake prints for the arguments it got.
function started(command, args) {
  return `${[command, ...args].join('\n')}\n`;
}

const WRAPPER_DIRECTORIES = { claude: '.claude/agents', opencode: '.opencode/agents' };

// The arguments each fake is expected to get, for the reviewer: what stands before the prompt, and the prompt.
const STARTED = {
  claude: (before, prompt) => ['--agent', 'reviewer', ...before, '--', prompt],
  'claude --headless': (before, prompt) => ['--print', '--agent', 'reviewer', ...before, '--', prompt],
  opencode: (before, prompt) => ['--agent', 'reviewer', ...before, '--prompt', prompt],
  'opencode --headless': (before, prompt) => ['run', '--agent', 'reviewer', ...before, '--', prompt],
};

// The arguments of `run` for one of the keys of STARTED.
function reviewerRun(key) {
  const [harness, ...mode] = key.split(' ');
  return ['run', 'reviewer', harness, '0007', ...mode];
}

test('run starts each harness in each mode with the arguments of its row, and its output is the command own', (t) => {
  const { agentrite } = project(t);
  for (const [key, expected] of Object.entries(STARTED)) {
    const result = agentrite(reviewerRun(key));

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, started(key.split(' ')[0], expected([], UNIT_PROMPT)), key);
    assert.equal(result.stderr, 'the harness, on standard error\n');
  }
});

test('run specifier starts each harness as the specifier, in a project that has its wrapper', (t) => {
  const { agentrite, read } = project(t);
  for (const harness of HARNESS_NAMES) {
    assert.ok(read(`${WRAPPER_DIRECTORIES[harness]}/specifier.md`).includes('roles/specifier.md'), harness);

    const result = agentrite(['run', 'specifier', harness, '0007']);

    assert.equal(result.status, 0, result.stderr);
    const prompt = harness === 'claude' ? '--' : '--prompt';
    assert.equal(result.stdout, started(harness, ['--agent', 'specifier', prompt, UNIT_PROMPT]), harness);
  }
});

test('run gives the harness the model, the permission flag and the text, and nothing beyond them', (t) => {
  const { agentrite } = project(t);
  const text = 'look at  the tests,\nand start with --headless';

  const claude = agentrite([
    'run',
    '--model',
    'claude-sonnet-5-5',
    'implementer',
    'claude',
    `changes/${UNIT}/`,
    '--skip-permissions',
    '--prompt',
    text,
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
      '--',
      `${UNIT_PROMPT}\n\n${text}`,
    ]),
  );
  assert.equal(opencode.status, 0, opencode.stderr);
  assert.equal(
    opencode.stdout,
    started('opencode', ['run', '--agent', 'planner', '--model', 'openai/gpt-6.1-sol', '--auto', '--', UNIT_PROMPT]),
  );
});

test('each harness in each mode gets what follows the -- before its prompt, as it is written', (t) => {
  const { agentrite } = project(t);
  const extra = ['--resume', 'an id with spaces', '--model', 'theirs', '--', '--headless', ''];
  const prompt = `${UNIT_PROMPT}\n\nwhich word`;
  for (const [key, expected] of Object.entries(STARTED)) {
    const result = agentrite([...reviewerRun(key), '--prompt', 'which word', '--', ...extra]);

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, started(key.split(' ')[0], expected(extra, prompt)), key);
  }
});

test('a -- with nothing after it adds nothing, and the text stays in the prompt', (t) => {
  const { agentrite } = project(t);
  const prompt = `${UNIT_PROMPT}\n\nwhich word`;

  const bare = agentrite(['run', 'reviewer', 'opencode', '0007', '--headless', '--prompt', 'which word', '--']);

  assert.equal(bare.status, 0, bare.stderr);
  assert.equal(bare.stdout, started('opencode', STARTED['opencode --headless']([], prompt)));
});

test('the standard input of run is the harness own', (t) => {
  const { agentrite } = project(t);

  const result = agentrite(['run', 'reviewer', 'claude', '0007'], { input: 'typed\n', env: { FAKE_READS: '1' } });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, `${started('claude', STARTED.claude([], UNIT_PROMPT))}read: typed\n`);
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
      'an earlier package name': asWritten.replace('node_modules/agentrite', 'node_modules/@ritenoar/agent-kit'),
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
        `agentrite: ${path} is not the file refresh would leave there. ${REMEDY}\n`,
      );
    }

    rmSync(join(base, path));
    const missing = agentrite(['run', 'reviewer', harness, '0007', '--headless']);

    assert.equal(missing.status, 1, harness);
    assert.equal(missing.stdout, '', harness);
    assert.equal(missing.stderr, `agentrite: the project has no file ${path}. ${REMEDY}\n`);
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
    assert.equal(agentrite(['refresh']).stdout.includes(`up to date ${path}`), true);

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
    [['reviewer', 'codex', '0007'], 'unknown harness: codex'],
    [['reviewer', 'claude'], 'no unit given'],
    [['reviewer', 'claude', '0007', '--verbose'], 'unknown option: --verbose'],
    [['reviewer', 'claude', '0007', '--model'], '--model takes an id, and none was given'],
    [['reviewer', 'claude', '0007', '--resume', 'an-id'], 'unknown option: --resume'],
    [['reviewer', 'claude', '0007', 'look', 'at', 'it'], 'unexpected argument: look'],
    [['reviewer', 'claude', '0007', '--prompt'], '--prompt takes a text, and none was given'],
    [['reviewer', 'claude', '0007', '--prompt', '--', '--resume'], '--prompt takes a text, and none was given'],
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
  assert.equal(result.stdout, started('claude', STARTED.claude([], UNIT_PROMPT)));
});

// R14

test('agentrite alone and with a command it does not know print the usage of every command and exit 2', (t) => {
  const { agentrite } = project(t);
  const usage =
    'usage: agentrite init [--no-sandbox] [--no-orchestrator] [--default-branch <name>] claude | opencode\n' +
    '       agentrite init\n' +
    '       agentrite config\n' +
    '       agentrite refresh\n' +
    '       agentrite roles [--json]\n' +
    '       agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] ' +
    '[--skip-permissions]\n' +
    '                     [-- <harness arguments...>]\n' +
    '       agentrite orchestrate <unit> [--definition <file>] [--skip-permissions]\n';

  const alone = agentrite([]);
  const unknown = agentrite(['list-roles']);

  assert.equal(alone.status, 2);
  assert.equal(alone.stdout, '');
  assert.equal(alone.stderr, usage);
  assert.equal(unknown.status, 2);
  assert.equal(unknown.stdout, '');
  assert.equal(unknown.stderr, `unknown command: list-roles\n${usage}`);
});

// Unit 0054, R10: run and roles read agentrite.json and the role files it names.

const OWN_REVIEWER = '---\ndescription: Reviews as this project does.\n---\n\n# Our reviewer\n';

// `project` with its reviewer's file replaced by one of its own, as agentrite.json names it.
function withOwnReviewer(made) {
  made.write('rules/reviewer.md', OWN_REVIEWER);
  const settings = JSON.parse(made.read('agentrite.json'));
  const roles = { ...settings.roles, reviewer: 'rules/reviewer.md' };
  made.write('agentrite.json', JSON.stringify({ ...settings, roles }));
}

test('roles and roles --json list the descriptions of the files the settings give, a replaced role included', (t) => {
  const made = project(t);
  withOwnReviewer(made);
  const own = { name: 'reviewer', path: 'rules/reviewer.md', description: 'Reviews as this project does.' };
  const roles = KIT_ROLES.map((role) => (role.name === 'reviewer' ? own : role));

  const listing = made.agentrite(['roles']);
  const json = made.agentrite(['roles', '--json']);

  assert.equal(listing.status, 0, listing.stderr);
  assert.equal(listing.stdout, rolesListing(roles));
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.stdout, rolesJson(roles));
  assert.ok(listing.stdout.endsWith('reviewer\n  Reviews as this project does.\n'), listing.stdout);
});

const FRONT_MATTER_REFUSAL =
  'agentrite: rules/reviewer.md has no front matter that a role file must open with. It must be a line ---, then ' +
  'either the line description: <text>, or the line description: >- followed by the text on lines indented by two ' +
  'spaces, then a line ---\n';

// Each project a command that reads the settings refuses, with what it says on standard error.
const REFUSED = [
  {
    what: 'no agentrite.json',
    arrange: (made) => rmSync(join(made.base, 'agentrite.json')),
    says: (stderr) =>
      assert.equal(
        stderr,
        'agentrite: the project has no agentrite.json. Run: npx agentrite config, which writes one\n',
      ),
  },
  {
    what: 'an agentrite.json that is not valid',
    arrange: (made) => made.write('agentrite.json', 'not json'),
    says: (stderr) => assert.match(stderr, /^agentrite: agentrite\.json is not JSON: /),
  },
  {
    what: 'a path that names no file',
    arrange: (made) => rmSync(join(made.base, 'node_modules'), { recursive: true }),
    says: (stderr) =>
      assert.equal(
        stderr,
        'agentrite: agentrite.json: standards is "node_modules/agentrite/standards.md", and there is no file at it. ' +
          "It must name a file in the project's working tree\n",
      ),
  },
  {
    what: 'a role file without front matter',
    arrange: (made) => {
      withOwnReviewer(made);
      made.write('rules/reviewer.md', '# Our reviewer\n');
    },
    says: (stderr) => assert.equal(stderr, FRONT_MATTER_REFUSAL),
  },
];

for (const { what, arrange, says } of REFUSED) {
  test(`roles and run refuse a project with ${what}, print nothing on standard output and start nothing`, (t) => {
    const made = project(t);
    arrange(made);

    for (const args of [['roles'], ['roles', '--json'], ['run', 'reviewer', 'claude', '0007']]) {
      const result = made.agentrite(args);

      assert.equal(result.status, 1, args.join(' '));
      assert.equal(result.stdout, '', args.join(' '));
      says(result.stderr);
    }
  });
}

test('run refuses the kit reviewer wrapper when roles names another file, and starts with the refreshed one', (t) => {
  const made = project(t);
  withOwnReviewer(made);

  const refused = made.agentrite(['run', 'reviewer', 'claude', '0007']);

  assert.equal(refused.status, 1);
  assert.equal(refused.stdout, '');
  assert.equal(
    refused.stderr,
    `agentrite: .claude/agents/reviewer.md is not the file refresh would leave there. ${REMEDY}\n`,
  );

  assert.equal(made.agentrite(['refresh']).status, 0);
  const result = made.agentrite(['run', 'reviewer', 'claude', '0007']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, started('claude', STARTED.claude([], UNIT_PROMPT)));
});

// Unit 0056, R5, R7, R8: a role of the project's own.

const SECURITY_REVIEWER = '---\ndescription: Reviews the security of a unit.\n---\n\n# Security reviewer\n';

// `project` with a role of its own, `security-reviewer`, after the four; its wrappers are written by `refresh`.
function withSecurityReviewer(made) {
  made.write('rules/security-reviewer.md', SECURITY_REVIEWER);
  const settings = JSON.parse(made.read('agentrite.json'));
  const roles = { ...settings.roles, 'security-reviewer': 'rules/security-reviewer.md' };
  made.write('agentrite.json', JSON.stringify({ ...settings, roles }));
  assert.equal(made.agentrite(['refresh']).status, 0);
}

test('roles and roles --json list a role of the projects own after the four, with its path in the JSON', (t) => {
  const made = project(t);
  withSecurityReviewer(made);
  const own = {
    name: 'security-reviewer',
    path: 'rules/security-reviewer.md',
    description: 'Reviews the security of a unit.',
  };

  const listing = made.agentrite(['roles']);
  const json = made.agentrite(['roles', '--json']);

  assert.equal(listing.status, 0, listing.stderr);
  assert.equal(listing.stdout, rolesListing([...KIT_ROLES, own]));
  assert.ok(listing.stdout.endsWith('security-reviewer\n  Reviews the security of a unit.\n'), listing.stdout);
  assert.equal(json.status, 0, json.stderr);
  assert.equal(json.stdout, rolesJson([...KIT_ROLES, own]));
  const roles = JSON.parse(json.stdout).roles;
  assert.deepEqual(
    roles.map((role) => role.name),
    [...ROLE_NAMES, 'security-reviewer'],
  );
  assert.deepEqual(roles.at(-1), own);
});

test('run starts the harness as a role of the projects own', (t) => {
  const made = project(t);
  withSecurityReviewer(made);

  const result = made.agentrite(['run', 'security-reviewer', 'claude', '0007']);

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, started('claude', ['--agent', 'security-reviewer', '--', UNIT_PROMPT]));
});

test('run refuses a role the settings do not name, naming the roles they do, and starts nothing', (t) => {
  const made = project(t);
  withSecurityReviewer(made);
  const roles = 'specifier, planner, implementer, reviewer and security-reviewer';

  for (const role of ['auditor', 'toString', 'Security-Reviewer']) {
    const result = made.agentrite(['run', role, 'claude', '0007']);

    assert.equal(result.status, 1, role);
    assert.equal(result.stdout, '', role);
    assert.equal(
      result.stderr,
      `agentrite: the project has no role ${role}. The roles agentrite.json names are ${roles}\n`,
    );
  }
});

// Unit 0058, R8, R11
test('agentrite roles refuses a file that lacks bell, or whose bell is a string, naming the key', (t) => {
  for (const [replacement, found] of [
    ['', 'missing'],
    ['  "bell": "true",\n', '"true"'],
  ]) {
    const { agentrite, write } = project(t);
    const text = SETTINGS.replace('  "bell": true,\n', replacement);
    assert.notEqual(text, SETTINGS);
    write('agentrite.json', text);

    const result = agentrite(['roles']);

    assert.notEqual(result.status, 0);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, new RegExp(`agentrite\\.json: bell is ${found}\\. It must hold true or false`));
  }
});

// Unit 0065, R3
test('agentrite roles refuses a file that lacks orchestrator, or whose orchestrator names no file, exiting 1', (t) => {
  const line = '  "orchestrator": "node_modules/agentrite/orchestrator.json",\n';
  for (const [replacement, message] of [
    ['', /agentrite\.json: orchestrator is missing\. It must hold false, for a project that does not use the/],
    ['  "orchestrator": "rules/missing.json",\n', /agentrite\.json: orchestrator is "rules\/missing\.json", and there/],
  ]) {
    const { agentrite, write } = project(t);
    const text = SETTINGS.replace(line, replacement);
    assert.notEqual(text, SETTINGS);
    write('agentrite.json', text);

    const result = agentrite(['roles']);

    assert.equal(result.status, 1);
    assert.equal(result.stdout, '');
    assert.match(result.stderr, message);
  }
});
