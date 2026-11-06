import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { HARNESS_NAMES, HARNESSES } from '../scripts/agentrite-harness.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite-sandbox.mjs');

const USAGE = 'usage: node agentrite-sandbox.mjs start <project root> <home> | version <harness>\n';

function helper(args, input = '') {
  return spawnSync(process.execPath, [script, ...args], { encoding: 'utf-8', input });
}

// Every list of names of `names`, the empty one among them, each in the order of `names`.
function allSubsets(names) {
  if (names.length === 0) return [[]];
  const rest = allSubsets(names.slice(1));
  return [...rest.map((subset) => [names[0], ...subset]), ...rest];
}

// Every list of one or more names of `names`, each in the order of `names`.
function subsets(names) {
  return allSubsets(names).filter((subset) => subset.length > 0);
}

test('the subsets of the harnesses are every list of one or more of them, each once', () => {
  assert.deepEqual(subsets(['a', 'b']), [['a', 'b'], ['a'], ['b']]);
  assert.deepEqual(subsets(['a', 'b', 'c']).length, 7);
  assert.deepEqual(subsets(HARNESS_NAMES).length, 2 ** HARNESS_NAMES.length - 1);
  for (const name of HARNESS_NAMES) assert.ok(subsets(HARNESS_NAMES).some((subset) => subset.join() === name), name);
});

// A project whose agentrite.json holds `bell` and `harnesses`, and a home that holds what `homeFiles` maps a path
// relative to it to.
function setUp(testContext, { bell, harnesses, homeFiles = {} }) {
  const base = temporaryDirectory(testContext, 'agentrite-sandbox-');
  const root = join(base, 'project');
  const home = join(base, 'home');
  mkdirSync(root);
  mkdirSync(home);
  writeFileSync(join(root, 'agentrite.json'), JSON.stringify({ bell, harnesses }));
  for (const [path, content] of Object.entries(homeFiles)) {
    mkdirSync(join(home, path, '..'), { recursive: true });
    writeFileSync(join(home, path), content);
  }
  return { root, home };
}

// The line of a mount, with a path of the kit relative to the kit's container/.
function mountLine(name, { from, path, target }) {
  return ['mount', from, from === 'kit' ? `harnesses/${name}/${path}` : path, target].join('\t');
}

// What the helper prints for the harnesses named `names`, built from the list, with what each is given of a home
// that is `given` of its name.
function expected(names, bell, given = () => ({ environment: [], mounts: [], files: [] })) {
  const harnesses = HARNESSES.filter((harness) => names.includes(harness.name));
  const lines = [`bell\t${bell}`];
  for (const { name, title, start, sandbox } of harnesses) {
    lines.push(['harness', name, title, start.command, sandbox.package, sandbox.versionArgument].join('\t'));
  }
  for (const { sandbox } of harnesses) lines.push(...sandbox.logDirectories.map((path) => `directory\t${path}`));
  for (const { sandbox } of harnesses) {
    lines.push(...sandbox.hosts.map(({ host, reason }) => `allow\t${host}\t${reason}`));
  }
  const groups = [
    ...harnesses.map(({ name, sandbox }) => ({ name, ...sandbox.updates })),
    ...harnesses.map(({ name }) => ({ name, ...given(name) })),
    ...(bell ? harnesses.map(({ name, sandbox }) => ({ name, ...sandbox.bell })) : []),
  ];
  for (const group of groups) lines.push(...group.environment.map((entry) => `env\t${entry}`));
  for (const [index, group] of groups.entries()) {
    if (bell && index === 2 * harnesses.length) {
      lines.push('mount\tkit\tbell/ring-bell.sh\t/etc/agentrite/bell/ring-bell.sh');
    }
    lines.push(...group.mounts.map((mount) => mountLine(group.name, mount)));
  }
  for (const group of groups) {
    lines.push(...(group.files ?? []).map(({ name, content, target }) => ['file', name, content, target].join('\t')));
  }
  return `${lines.join('\n')}\n`;
}

// 0097 R1, R10, R14, R18

for (const names of subsets(HARNESS_NAMES)) {
  for (const bell of [true, false]) {
    test(`start prints what the sandbox needs of ${names.join(' and ')}, with "bell": ${bell}`, (testContext) => {
      const { root, home } = setUp(testContext, { bell, harnesses: names });
      const result = helper(['start', root, home]);
      assert.equal(result.stderr, '');
      assert.equal(result.status, 0);
      assert.equal(result.stdout, expected(names, bell));
    });
  }

  test(`start of ${names.join(' and ')} named in another order, and twice, keeps the order of the list`, (context) => {
    const { root, home } = setUp(context, { bell: true, harnesses: [...names].reverse().concat(names) });
    const result = helper(['start', root, home]);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, expected(names, true));
  });
}

test('start gives a harness what its host member reads of the home', (testContext) => {
  const homeFiles = {
    '.claude/statusline-command.sh': 'echo status\n',
    '.claude/settings.json': '{"cleanupPeriodDays": 9}',
  };
  const { root, home } = setUp(testContext, { bell: true, harnesses: HARNESS_NAMES, homeFiles });
  const read = (path) => ({ found: true, text: homeFiles[path] ?? '' });
  const given = (name) => {
    const harness = HARNESSES.find((entry) => entry.name === name);
    return harness.sandbox.host(home, (path) => (path in homeFiles ? read(path) : { found: false }));
  };
  const result = helper(['start', root, home]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expected(HARNESS_NAMES, true, given));
  assert.match(result.stdout, /^mount\thost\t.*\/\.claude\/statusline-command\.sh\t/m);
  assert.match(result.stdout, /^file\tclaude-cleanup-period-9\.json\t\{"cleanupPeriodDays": 9\}\t/m);
});

test('start with an empty home asks no harness of the host', (testContext) => {
  const homeFiles = {
    '.claude/statusline-command.sh': 'echo status\n',
    '.claude/settings.json': '{"cleanupPeriodDays": 9}',
  };
  const { root } = setUp(testContext, { bell: false, harnesses: HARNESS_NAMES, homeFiles });
  const result = helper(['start', root, '']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout, expected(HARNESS_NAMES, false));
});

test("start refuses with the reader's message, on standard error alone, and exits 1", (testContext) => {
  for (const [text, message] of [
    ['{"harnesses": ["claude"]}', 'agentrite.json: bell is missing. It must hold true or false'],
    [
      '{"bell": true}',
      `agentrite.json: harnesses is missing. It must hold a list of one or more of ${HARNESS_NAMES.map((name) =>
        JSON.stringify(name),
      ).join(' and ')}`,
    ],
    ['{"bell": true, "harnesses": ["nothing"]}', 'agentrite.json: harnesses is ["nothing"]. It must hold a list'],
  ]) {
    const { root, home } = setUp(testContext, { bell: true, harnesses: ['claude'] });
    writeFileSync(join(root, 'agentrite.json'), text);
    const result = helper(['start', root, home]);
    assert.equal(result.status, 1, text);
    assert.equal(result.stdout, '', text);
    assert.ok(result.stderr.startsWith(`agentrite: ${message}`), result.stderr);
  }
});

test("start refuses a home whose Claude Code settings are at fault, with the reader's message", (testContext) => {
  const homeFiles = { '.claude/settings.json': '{"cleanupPeriodDays": 0}' };
  const { root, home } = setUp(testContext, { bell: false, harnesses: HARNESS_NAMES, homeFiles });
  const result = helper(['start', root, home]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.equal(
    result.stderr,
    `agentrite: ${join(home, '.claude', 'settings.json')}: cleanupPeriodDays is 0. It must be a whole number of 1 ` +
      'or more. Correct the file, or remove the key cleanupPeriodDays from it\n',
  );
});

test('start refuses a field that would hold a tab or a line break', (testContext) => {
  const base = temporaryDirectory(testContext, 'agentrite-sandbox-');
  const root = join(base, 'project');
  const home = join(base, 'home\twith a tab');
  mkdirSync(root);
  mkdirSync(join(home, '.claude'), { recursive: true });
  writeFileSync(join(root, 'agentrite.json'), JSON.stringify({ bell: false, harnesses: HARNESS_NAMES }));
  writeFileSync(join(home, '.claude', 'statusline-command.sh'), 'echo status\n');
  const result = helper(['start', root, home]);
  assert.equal(result.status, 1);
  assert.equal(result.stdout, '');
  assert.match(result.stderr, /^agentrite: .*holds a tab or a line break/);
});

for (const harness of HARNESSES) {
  test(`version prints what ${harness.name}'s readVersion reads of its input, or nothing`, () => {
    for (const printed of ['1.2.3\n', '1.2.3 (something)\n', '']) {
      const result = helper(['version', harness.name], printed);
      assert.equal(result.status, 0, result.stderr);
      const version = harness.sandbox.readVersion(printed);
      assert.equal(result.stdout, version === undefined ? '' : `${version}\n`);
    }
  });
}

test('with arguments it does not take, it prints its usage and exits 2', () => {
  for (const args of [[], ['start'], ['start', '/x'], ['start', '/x', '/y', 'z'], ['version'], ['version', 'nothing'],
    ['version', 'claude', 'more'], ['other']]) {
    const result = helper(args);
    assert.equal(result.status, 2, args.join(' '));
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, USAGE);
  }
});

test('imported, the module prints nothing', () => {
  const importing = `await import(${JSON.stringify(script)});`;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', importing], { encoding: 'utf-8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout + result.stderr, '');
});
