// The steps by which a project that an earlier release set up gets its agentrite.json, end to end: the commands
// refuse until the file is there, and do what they did once it is written, checked and committed.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import {
  chmodSync,
  copyFileSync,
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { agentsListNotice, claudeRefreshNotice, opencodeRefreshNotice } from '../scripts/agentrite-instructions.mjs';
import { plannedFiles } from '../scripts/agentrite-roles.mjs';
import { copyKitInstructions, installKit, KIT_ROLES } from './installed-kit.mjs';
import { fakeHost } from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const kit = join(import.meta.dirname, '..');
const agentrite = join(kit, 'scripts', 'agentrite.mjs');
const checker = join(kit, 'scripts', 'check-changes.mjs');
const TEMPLATE = readFileSync(join(kit, 'templates', 'project', 'agentrite.json'), 'utf-8');
const SHIM = readFileSync(join(kit, 'templates', 'project', 'sandbox.sh'), 'utf-8');
const LIST = '.agentrite/instructions.md';
const NAMES_CONFIG = /the project has no agentrite\.json\. Run: npx agentrite config, which writes one/;

// The lines refresh prints for the files, without the notices, which follow an empty line.
function linesOf(result) {
  return result.stdout.split('\n\n')[0].trimEnd().split('\n');
}

// A project directory with the wrappers of `harnesses` as the kit writes them, and no agentrite.json.
function project(t, harnesses) {
  const base = temporaryDirectory(t, 'settings-update-');
  const root = join(base, 'project');
  const write = (path, content) => {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  };
  for (const file of plannedFiles(harnesses, KIT_ROLES)) write(file.path, file.content);
  const command = (...args) => spawnSync(process.execPath, [agentrite, ...args], { cwd: root, encoding: 'utf-8' });
  const edit = (from, to) => {
    const settings = readFileSync(join(root, 'agentrite.json'), 'utf-8');
    assert.ok(settings.includes(from), `agentrite.json holds no ${from}`);
    writeFileSync(join(root, 'agentrite.json'), settings.replace(from, to));
  };
  return { base, root, write, command, edit };
}

test('a project with the wrappers, the sandbox and no agentrite.json gets one in the four steps', (t) => {
  const { base, root, write, command, edit } = project(t, ['claude', 'opencode']);
  // The files of the sandbox, the kit as a project installs it, and a repository on main that holds a unit.
  write('sandbox.sh', SHIM);
  chmodSync(join(root, 'sandbox.sh'), 0o755);
  write('sandbox/compose.project.yml', '');
  write('.gitignore', 'node_modules\n.reviews\n');
  write('changes/0001-a-unit/record.md', '---\nkind: feature\nstatus: approved\n---\n');
  const installed = join(root, 'node_modules', 'agentrite');
  mkdirSync(join(installed, 'container'), { recursive: true });
  for (const file of ['sandbox.sh', 'unit-clone.sh']) {
    copyFileSync(join(kit, 'container', file), join(installed, 'container', file));
  }
  chmodSync(join(installed, 'container', 'sandbox.sh'), 0o755);
  cpSync(join(kit, 'scripts'), join(installed, 'scripts'), { recursive: true });
  copyKitInstructions(installed);
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const host = fakeHost(base, []);
  const git = (...args) =>
    execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: { HOME: home, PATH: process.env.PATH } }).trim();
  git('init', '--quiet', '--initial-branch', 'main');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the project');
  // A master beside the default branch, which holds no unit.
  git('branch', 'master');
  const check = () => spawnSync(process.execPath, [checker, root], { encoding: 'utf-8' });
  const unitRun = () =>
    spawnSync(join(root, 'sandbox.sh'), ['0001', 'echo', 'hi'], {
      cwd: root,
      encoding: 'utf-8',
      env: { HOME: home, PATH: host.bin },
    });
  const tracked = () => git('status', '--porcelain');

  // Until the file is there, the three refuse, each naming the command that writes it.
  const refreshBefore = command('refresh');
  assert.equal(refreshBefore.status, 1);
  assert.match(refreshBefore.stderr, NAMES_CONFIG);
  const checkBefore = check();
  assert.equal(checkBefore.status, 1);
  assert.match(checkBefore.stderr, NAMES_CONFIG);
  const runBefore = unitRun();
  assert.equal(runBefore.status, 1);
  // Unit 0058: a start reads bell first, and says so.
  assert.match(
    runBefore.stderr,
    /the project has no agentrite\.json, so bell is missing\. .*Run: npx agentrite config, which writes one/,
  );
  assert.deepEqual(host.dockerCalls(), []);
  assert.equal(git('for-each-ref', '--format=%(refname:short)', 'refs/heads'), 'main\nmaster');
  assert.equal(tracked(), '');

  // 2. config, what it printed read, and the file edited where the project differs.
  const configured = command('config');
  assert.equal(configured.status, 0, configured.stderr);
  assert.ok(configured.stdout.includes(TEMPLATE), configured.stdout);
  edit('"master"', '"main"');

  // 3. refresh, which has nothing to change in a project whose files are the release's but writes the list of the
  // files in use, which a project set up before the list lacks.
  const refreshed = command('refresh');
  assert.equal(refreshed.status, 0, refreshed.stderr);
  const wrappers = plannedFiles(['claude', 'opencode'], KIT_ROLES).map((file) => `up to date ${file.path}`);
  assert.deepEqual(linesOf(refreshed), [...wrappers, `wrote ${LIST}`, 'up to date sandbox.sh']);
  // A project set up before the release that loads the kit's instructions has neither file that loads them, nor an
  // AGENTS.md that names the list, and is told so.
  const paths = ['node_modules/agentrite/process.md', 'node_modules/agentrite/standards.md'];
  const claude = claudeRefreshNotice(true, [...paths.map((path) => `@${path}`), '@AGENTS.md']);
  const opencode = opencodeRefreshNotice('it is missing', paths);
  const agents = agentsListNotice(true);
  assert.ok(refreshed.stdout.endsWith(`\n\n${claude}\n\n${opencode}\n\n${agents}\n`), refreshed.stdout);
  assert.equal(tracked(), '?? .agentrite/\n?? agentrite.json');

  // 4. the file and the list committed on the default branch.
  git('add', 'agentrite.json', LIST);
  git('commit', '--quiet', '--message', 'the settings');
  const commit = git('rev-parse', '--short', 'main');

  const checked = check();
  assert.equal(checked.status, 0, checked.stderr);
  const ran = unitRun();
  assert.equal(ran.status, 0, ran.stderr);
  assert.ok(
    ran.stderr.includes(`sandbox.sh: cut feature-0001-a-unit from main at ${commit}, for changes/0001-a-unit.\n`),
    ran.stderr,
  );
  assert.equal(git('rev-parse', 'refs/heads/feature-0001-a-unit'), git('rev-parse', 'refs/heads/main'));
  assert.equal(host.dockerCalls().filter((call) => / run /.test(call)).length, 1);
});

test('a project without the sandbox and with one harness edits both keys, and refresh has its four wrappers', (t) => {
  const { root, command, edit } = project(t, ['opencode']);
  installKit(root);
  assert.equal(command('refresh').status, 1);

  assert.equal(command('config').status, 0);
  edit('["claude", "opencode"]', '["opencode"]');
  edit('"sandbox": true', '"sandbox": false');
  const refreshed = command('refresh');

  assert.equal(refreshed.status, 0, refreshed.stderr);
  const wrappers = plannedFiles(['opencode'], KIT_ROLES).map((file) => file.path);
  assert.equal(wrappers.length, 4);
  assert.deepEqual(linesOf(refreshed), [...wrappers.map((path) => `up to date ${path}`), `wrote ${LIST}`]);
  assert.equal(existsSync(join(root, 'sandbox.sh')), false);
  assert.equal(existsSync(join(root, '.claude')), false);
});
