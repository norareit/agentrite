// A sandbox-only project end to end: `init --sandbox-only` sets it up, and the shim it wrote starts the sandbox on a
// new branch, with nothing of the change process.
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { withoutGitEnvironmentConfiguration } from './git-environment.mjs';
import { copyKitInstructions } from './installed-kit.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';
import {
  fakeHost,
  hostVersions,
  imageLabelsText,
  installKitPackage,
  logDirectory,
  logMounts,
} from './wrapper-fixture.mjs';

const script = join(import.meta.dirname, '..', 'scripts', 'agentrite.mjs');
const kitContainer = join(import.meta.dirname, '..', 'container');
const kitScripts = join(import.meta.dirname, '..', 'scripts');
const kitPath = 'node_modules/agentrite/container';
const noHooks = '/usr/local/lib/agentrite/no-hooks';

// A git repository on `master` with a `package.json` of the package `my-app` and the kit installed under its ignored
// `node_modules`, as the wrapper tests install it, and the host of `fakeHost`. Every process gets an environment
// without git's environment configuration.
function setUp(testContext) {
  const base = temporaryDirectory(testContext, 'sandbox-only-setup-');
  const root = join(base, 'project');
  const installed = join(root, 'node_modules', 'agentrite');
  mkdirSync(join(installed, 'container'), { recursive: true });
  for (const file of ['sandbox.sh', 'unit-clone.sh', 'compose.yml']) {
    copyFileSync(join(kitContainer, file), join(installed, 'container', file));
  }
  chmodSync(join(installed, 'container', 'sandbox.sh'), 0o755);
  cpSync(kitScripts, join(installed, 'scripts'), { recursive: true });
  copyKitInstructions(installed);
  installKitPackage(installed);
  writeFileSync(join(root, 'package.json'), '{\n  "name": "my-app"\n}\n');
  writeFileSync(join(root, '.gitignore'), 'node_modules\n');
  const home = join(base, 'home');
  mkdirSync(home);
  writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
  const host = fakeHost(base, ['AGENTRITE_CONTAINER', 'SANDBOX_GIT_HOOKS_PATH']);
  // The image holds Claude Code alone, the harness the test sets the project up with.
  writeFileSync(host.imageLabels, imageLabelsText({ claude: hostVersions.claude }));
  const gitEnvironment = withoutGitEnvironmentConfiguration({ HOME: home, PATH: process.env.PATH });
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: gitEnvironment }).trim();
  git('init', '--quiet', '--initial-branch', 'master');
  git('add', '.');
  git('commit', '--quiet', '--message', 'the project');
  const agentrite = (...args) =>
    spawnSync(process.execPath, [script, ...args], {
      cwd: root,
      encoding: 'utf-8',
      env: withoutGitEnvironmentConfiguration(process.env),
    });
  const sandbox = (...args) =>
    spawnSync(join(root, 'sandbox.sh'), args, {
      cwd: root,
      encoding: 'utf-8',
      env: withoutGitEnvironmentConfiguration({ HOME: home, PATH: host.bin }),
    });
  return { base, root, home, git, agentrite, sandbox, ...host };
}

// R10, R12, R13, R17, R21
test('init --sandbox-only sets up a project whose shim runs a new branch on a clone cut from master', (testContext) => {
  const host = setUp(testContext);
  const init = host.agentrite('init', '--sandbox-only', 'claude');
  assert.equal(init.status, 0, init.stderr);
  host.git('add', '.');
  host.git('commit', '--quiet', '--message', 'set up the sandbox');
  const head = host.git('rev-parse', '--short', 'master');

  const result = host.sandbox('new-work', 'echo', 'hi');

  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stderr, `sandbox.sh: cut new-work from master at ${head}.\n`);
  assert.equal(host.git('rev-parse', 'new-work'), host.git('rev-parse', 'master'));
  const recorded = `AGENTRITE_CONTAINER=${kitPath} SANDBOX_GIT_HOOKS_PATH=${noHooks}`;
  const compose =
    `${recorded} docker compose --project-directory ${host.root} ` +
    `-f ${host.root}/${kitPath}/compose.yml -f ${host.root}/sandbox/compose.project.yml`;
  const clone = join(host.home, '.local', 'state', 'agentrite', 'my-app-sandbox', 'new-work');
  const logs = logDirectory(join(host.home, '.local', 'share'), host.root);
  const [removal, run, ...rest] = host.dockerCalls();
  assert.equal(removal, `${recorded} docker rm my-app-sandbox-new-work`);
  assert.deepEqual(rest, []);
  // The file init wrote rings the bell, whose mounts and environment stand among those of the run.
  assert.ok(run.startsWith(`${compose} run --rm --name my-app-sandbox-new-work `), run);
  assert.ok(run.includes(` --volume ${clone}:/work `), run);
  assert.ok(run.endsWith(` ${logMounts(logs, ['claude'])}sandbox echo hi`), run);
  assert.doesNotMatch(run, /\.reviews|\.orchestrator/);
  assert.equal(existsSync(join(host.root, '.reviews')), false);
  assert.equal(existsSync(join(host.root, '.orchestrator')), false);
});
