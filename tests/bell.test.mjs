import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { listEntries } from './compose-entries.mjs';
import { skipReason } from './skip-reason.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const ringBell = fileURLToPath(new URL('../container/bell/ring-bell.sh', import.meta.url));

const BEL = '\x07';

// True when `command` is on the PATH and runs with `args`.
function runs(command, args) {
  return spawnSync(command, args, { stdio: 'ignore' }).status === 0;
}

// `script` of util-linux, which runs a command in a pseudo-terminal of its own and prints what the command wrote to
// it. That of BSD and macOS takes other arguments.
const scriptLacking = !spawnSync('script', ['--version'], { encoding: 'utf-8' }).stdout?.includes('util-linux');
const setsidLacking = !runs('setsid', ['true']);
const terminalSkip =
  scriptLacking || setsidLacking ? skipReason('needs script of util-linux and setsid, which the host lacks') : false;

// What a shell command printed to the pseudo-terminal that `script` gave it.
function inTerminal(command) {
  const result = spawnSync('script', ['--quiet', '--return', '--command', command, '/dev/null'], {
    encoding: 'utf-8',
    input: '',
  });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

// R3
test('with no terminal of its own and pipes for its streams, the script exits 0 and prints nothing', {
  skip: setsidLacking ? skipReason('needs setsid, which the host lacks') : false,
}, () => {
  for (const input of ['', '{"hook_event_name":"Stop"}\n']) {
    const result = spawnSync('setsid', ['sh', ringBell], { encoding: 'utf-8', input });

    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stdout, '');
    assert.equal(result.stderr, '');
  }
});

// R4
test('in a terminal, the script writes the one byte BEL to it and nothing else', { skip: terminalSkip }, () => {
  assert.equal(inTerminal(`sh ${quoted(ringBell)}`), BEL);
});

// R1
test('with no controlling terminal, it rings the terminal its parent writes to', { skip: terminalSkip }, () => {
  // The outer shell stands for the harness, whose standard streams are the terminal. The inner one gives the script
  // streams that are no terminal and replaces itself with it, so that the outer one is the parent, as a harness is
  // of a hook. The `; true` keeps the outer one from replacing itself in the same way. The script's path is given to
  // each shell as its `$0` rather than written into the text, so that a space in it is not split two shells deep.
  const command = `sh -c 'sh -c "exec setsid sh \\"\\$0\\" </dev/null >/dev/null 2>&1" "$0"; true' ${quoted(ringBell)}`;
  assert.equal(inTerminal(command), BEL);
});

// R1, R3
test('with JSON on its standard input, as a hook of Claude Code is given, it does the same', {
  skip: terminalSkip,
}, () => {
  assert.equal(inTerminal(`echo '{"hook_event_name":"Notification"}' | sh ${quoted(ringBell)}`), BEL);
});

const RING = 'sh /etc/agentrite/bell/ring-bell.sh';

// R1
test("Claude Code's managed settings of the bell hold the hooks of Notification and Stop, and nothing else", () => {
  const settings = JSON.parse(readFileSync(new URL('../container/bell/claude-managed-settings.json', import.meta.url)));
  const hook = [{ hooks: [{ type: 'command', command: RING }] }];
  assert.deepEqual(settings, { hooks: { Notification: hook, Stop: hook } });
});

// The plugin of OpenCode copied into a directory of its own, beside a stand-in for the script that appends a line to
// a file and then exits with `status`.
function pluginBeside(testContext, status) {
  const base = temporaryDirectory(testContext, 'bell-plugin-');
  const plugin = join(base, 'opencode-plugin.js');
  const rang = join(base, 'rang');
  copyFileSync(new URL('../container/bell/opencode-plugin.js', import.meta.url), plugin);
  writeFileSync(join(base, 'ring-bell.sh'), `echo rang >> '${rang}'\nexit ${status}\n`);
  const times = () => (existsSync(rang) ? readFileSync(rang, 'utf-8').split('\n').length - 1 : 0);
  return { plugin, times };
}

// R1
test(
  "OpenCode's plugin runs the script beside it at an idle session and at a permission asked",
  async (testContext) => {
    const { plugin, times } = pluginBeside(testContext, 0);
    const module = await import(pathToFileURL(plugin).href);
    assert.deepEqual(Object.keys(module), ['RingBell']);
    const hooks = await module.RingBell();

    await hooks.event({ event: { type: 'session.idle', properties: {} } });
    assert.equal(times(), 1);
    await hooks.event({ event: { type: 'permission.asked', properties: {} } });
    assert.equal(times(), 2);
    for (const type of ['message.updated', 'permission.updated', 'session.updated']) {
      await hooks.event({ event: { type, properties: {} } });
    }
    assert.equal(times(), 2);
  },
);

// R3
test("OpenCode's plugin resolves and prints nothing when the script fails", (testContext) => {
  const { plugin, times } = pluginBeside(testContext, 1);
  const run = [
    `const { RingBell } = await import(${JSON.stringify(pathToFileURL(plugin).href)});`,
    'const hooks = await RingBell();',
    "await hooks.event({ event: { type: 'session.idle', properties: {} } });",
    "await hooks.event({ event: { type: 'permission.asked', properties: {} } });",
  ].join('\n');

  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', run], { encoding: 'utf-8' });

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout + result.stderr, '');
  assert.equal(times(), 2);
});

const compose = readFileSync(new URL('../container/compose.yml', import.meta.url), 'utf-8');
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');

const dockerLacking = !runs('docker', ['info']);

// A word of a command line of `sh`, in single quotes.
function quoted(word) {
  return `'${word.replaceAll("'", "'\\''")}'`;
}

// The bell reaches the host only because the sandbox's terminal passes it through. The test starts a container with
// the settings of the compose file that confine it and the drop to the agent's user that the entrypoint makes, on
// the image the kit's Dockerfile builds on, in a pseudo-terminal as `docker compose run` is, and has the agent write
// a bell between two letters to its terminal.
test(
  "a bell the agent writes to the sandbox's terminal comes out on the host's side unchanged",
  {
    skip: dockerLacking
      ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
      : terminalSkip,
  },
  () => {
    for (const setting of ['    init: true', '    tty: true', '    read_only: true']) {
      assert.ok(compose.split('\n').includes(setting), `the sandbox service holds ${setting.trim()}`);
    }
    const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
    assert.ok(image, 'the Dockerfile has a base stage');
    const run = [
      'docker', 'run', '--rm', '--tty', '--init', '--read-only',
      ...listEntries('cap_drop').flatMap((capability) => ['--cap-drop', capability]),
      ...listEntries('cap_add').flatMap((capability) => ['--cap-add', capability]),
      ...listEntries('security_opt').flatMap((option) => ['--security-opt', option]),
      image,
      'setpriv', '--reuid=1000', '--regid=1000', '--clear-groups', '--', 'sh', '-c', "printf 'x\\ay' > /dev/tty",
    ];

    assert.ok(inTerminal(run.map(quoted).join(' ')).includes(`x${BEL}y`));
  },
);

// R1
test('the Dockerfile makes the agent a member of the group tty', () => {
  const useradd = dockerfile.split('\n').find((line) => /\buseradd\b.* agent \\$/.test(line.trim()));
  assert.ok(useradd, 'the Dockerfile adds the agent with useradd');
  assert.match(useradd, / -G tty /);
});

// A hook of Claude Code runs in a session of its own, with no controlling terminal, and the script then writes to
// the terminal by its path. The terminal is root's, and of the group tty with mode 0620, so the agent reaches it
// only as a member of that group. The case without the group holds that the group is what carries the bell, so that
// the test notices when a base image gives the terminal another owner or mode. The command is shaped as in the test
// of the script with no controlling terminal above, so that the outer shell, whose streams are the terminal, is the
// script's parent.
test(
  'with no controlling terminal, the agent rings the sandbox\'s terminal as a member of tty, and not without it',
  {
    skip: dockerLacking
      ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
      : terminalSkip,
  },
  () => {
    const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
    assert.ok(image, 'the Dockerfile has a base stage');
    const bell = fileURLToPath(new URL('../container/bell', import.meta.url));
    const rings = (groups) => {
      const run = [
        'docker', 'run', '--rm', '--tty', '--init', '--read-only',
        ...listEntries('cap_drop').flatMap((capability) => ['--cap-drop', capability]),
        ...listEntries('cap_add').flatMap((capability) => ['--cap-add', capability]),
        ...listEntries('security_opt').flatMap((option) => ['--security-opt', option]),
        '--volume', `${bell}:/etc/agentrite/bell:ro`,
        image,
        'setpriv', '--reuid=1000', '--regid=1000', ...groups, '--',
        'sh', '-c', 'sh -c "exec setsid sh /etc/agentrite/bell/ring-bell.sh </dev/null >/dev/null 2>&1"; true',
      ];
      return inTerminal(run.map(quoted).join(' ')).includes(BEL);
    };

    assert.equal(rings(['--groups', 'tty']), true);
    assert.equal(rings(['--clear-groups']), false);
  },
);

// R1
test('the hooks and the plugin name the files where container/sandbox.sh mounts container/bell/', () => {
  const wrapper = readFileSync(new URL('../container/sandbox.sh', import.meta.url), 'utf-8');
  const mountPoint = /--volume "\$here\/bell:([^"]+):ro"/.exec(wrapper)?.[1];
  assert.equal(mountPoint, '/etc/agentrite/bell');
  assert.equal(RING, `sh ${mountPoint}/ring-bell.sh`);
  assert.ok(wrapper.includes(`"plugin":["file://${mountPoint}/opencode-plugin.js"]`));
});
