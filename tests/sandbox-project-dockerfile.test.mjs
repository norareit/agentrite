// Unit 0059: a project's sandbox/Dockerfile, built on the kit's image. The tests build real images, on a stand-in for
// the kit's image that `dockerHost` builds without the network, so they need Docker.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { dockerHost, hostVersions, installKitPackage, standInLabel, writeCommand } from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const wrapper = fileURLToPath(new URL('../container/sandbox.sh', import.meta.url));
const unitClone = fileURLToPath(new URL('../container/unit-clone.sh', import.meta.url));
const shim = fileURLToPath(new URL('../sandbox-dev.sh', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const skip = dockerLacking
  ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
  : false;

const projectLabel = 'com.ritenoar.agentrite.project-dockerfile';
const claudeLabel = 'com.ritenoar.agentrite.claude-code-version';
const opencodeLabel = 'com.ritenoar.agentrite.opencode-version';

// The two lines a project's file opens with, as SANDBOX.md gives them.
const opening = 'ARG AGENTRITE_IMAGE\nFROM ${AGENTRITE_IMAGE}\n';
// A project's file that adds the file `added` of the project root to the image, and `more` after it.
const adding = (more = '') => `${opening}COPY added /added\n${more}`;

// A version of Claude Code the host reports after an image was built, which no release has.
const newClaude = '99.5.0';

let images = 0;

function docker(...args) {
  return execFileSync('docker', args, { encoding: 'utf-8' }).trim();
}

const label = (image, name) => docker('image', 'inspect', '--format', `{{ index .Config.Labels "${name}" }}`, image);
const exists = (image) => spawnSync('docker', ['image', 'inspect', image], { stdio: 'ignore' }).status === 0;

// Whether the image holds a file at `path`, asked of a container that is created and never started.
function holds(image, path) {
  const container = docker('create', image);
  try {
    return spawnSync('docker', ['cp', `${container}:${path}`, '-'], { stdio: 'ignore' }).status === 0;
  } finally {
    docker('rm', container);
  }
}

const digest = (content) => `sha256:${createHash('sha256').update(content).digest('hex')}`;

// A project whose kit is laid out as `layout` says, under the image name `image` unique to the test, on the host of
// `dockerHost`, with an empty home of its own and an agentrite.json that holds `"bell": false` alone. The kit lies
// at node_modules/agentrite/ with the wrapper and its git functions in its container/ and the readers of
// agentrite.json in its scripts/, or, for `dev`, as in this repository, with the dev shim at the root. `start` runs
// the wrapper, through the shim for `dev`, with `args`, and forgets the calls of earlier starts first. `builds`,
// `tags` and `runs` read the calls of the last start. The images are removed when the test ends, and so are the
// earlier builds of the test that later ones left without a name.
function setUp(t, layout = 'installed') {
  const base = temporaryDirectory(t, 'sandbox-project-dockerfile-');
  const root = join(base, 'project');
  const image = `agentrite-project-dockerfile-test-${process.pid}-${(images += 1)}`;
  t.after(() => {
    spawnSync('docker', ['image', 'rm', '--force', image, `${image}-base`], { stdio: 'ignore' });
    spawnSync('docker', ['image', 'prune', '--force', '--filter', `label=${standInLabel}`], { stdio: 'ignore' });
  });
  mkdirSync(join(root, 'sandbox'), { recursive: true });
  writeFileSync(join(root, 'sandbox', 'compose.project.yml'), `name: ${image}\n`);
  writeFileSync(join(root, 'agentrite.json'), '{"bell": false}\n');
  writeFileSync(join(root, 'added'), 'the project\n');
  const kit = layout === 'dev' ? root : join(root, 'node_modules', 'agentrite');
  mkdirSync(join(kit, 'container'), { recursive: true });
  mkdirSync(join(kit, 'scripts'));
  for (const [from, to] of [
    [wrapper, join(kit, 'container', 'sandbox.sh')],
    [unitClone, join(kit, 'container', 'unit-clone.sh')],
    ...(layout === 'dev' ? [[shim, join(root, 'sandbox-dev.sh')]] : []),
  ]) {
    copyFileSync(from, to);
    chmodSync(to, 0o755);
  }
  for (const file of ['agentrite-settings.mjs', 'agentrite-roles.mjs']) {
    copyFileSync(join(kitScripts, file), join(kit, 'scripts', file));
  }
  installKitPackage(kit);
  const home = join(base, 'home');
  mkdirSync(home);
  const host = dockerHost(base, []);
  const command = layout === 'dev' ? [join(root, 'sandbox-dev.sh')] : [join(kit, 'container', 'sandbox.sh'), root];
  const start = (...args) => {
    rmSync(join(base, 'docker-calls'), { force: true });
    return spawnSync(command[0], [...command.slice(1), ...args], {
      encoding: 'utf-8',
      env: { HOME: home, PATH: host.bin },
    });
  };
  const calls = (pattern) => () => host.dockerCalls().filter((call) => pattern.test(call));
  const projectFile = join(root, 'sandbox', 'Dockerfile');
  return {
    ...host,
    base,
    root,
    home,
    image,
    projectFile,
    start,
    writeProjectFile: (content) => writeFileSync(projectFile, content),
    kitBuilds: calls(/^ ?docker compose .* build$/),
    projectBuilds: calls(/^ ?docker build /),
    tags: calls(/^ ?docker tag /),
    runs: calls(/^ ?docker compose .* run /),
  };
}

// Asserts that a start succeeded and that it built the kit's image, the project's file, or both, as `kit` and
// `project` say, and ran the command once.
function assertStarted(project, result, { kit: kitBuilt, project: projectBuilt }) {
  assert.equal(result.status, 0, result.stderr);
  assert.equal(project.kitBuilds().length, kitBuilt ? 1 : 0, 'the builds of the kit image');
  assert.equal(project.projectBuilds().length, projectBuilt ? 1 : 0, "the builds of the project's file");
  assert.equal(project.runs().length, 1, 'the runs');
}

const builtNothing = { kit: false, project: false };
const builtBoth = { kit: true, project: true };

test(
  "a project's file is built on the kit's image, kept under -base, and is not built again unchanged",
  { skip },
  (t) => {
    const project = setUp(t);
    const { root, image, projectFile } = project;
    project.writeProjectFile(adding());
    const first = project.start('--in-place', 'echo', 'hi');
    assertStarted(project, first, builtBoth);
    assert.deepEqual(project.tags(), [` docker tag ${image} ${image}-base`]);
    assert.doesNotMatch(first.stderr, /InvalidDefaultArgInFrom/);
    assert.deepEqual(project.projectBuilds(), [
      ` docker build --build-arg AGENTRITE_IMAGE=${image}-base ` +
        '--build-arg BUILDKIT_DOCKERFILE_CHECK=skip=InvalidDefaultArgInFrom ' +
        `--label ${projectLabel}=${digest(readFileSync(projectFile))} --file ${projectFile} --tag ${image} ${root}`,
    ]);
    assert.ok(holds(image, '/added'), "the image holds the project's file");
    assert.ok(holds(image, '/kit-marker'), "the image holds the kit's");
    assert.ok(holds(`${image}-base`, '/kit-marker'), "the kit's image is kept under -base");
    assert.ok(!holds(`${image}-base`, '/added'), "the kit's image holds nothing of the project's file");
    assert.equal(label(image, projectLabel), digest(readFileSync(projectFile)));

    assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtNothing);
  },
);

test("without a project's file, a start builds the kit's image under the image's name and no -base", { skip }, (t) => {
  const project = setUp(t);
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), { kit: true, project: false });
  assert.deepEqual(project.tags(), []);
  assert.ok(holds(project.image, '/kit-marker'));
  assert.ok(!exists(`${project.image}-base`));
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtNothing);
});

test("a project's file changed after a build is built again, and the kit's image is not", { skip }, (t) => {
  const project = setUp(t);
  project.writeProjectFile(adding());
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
  project.writeProjectFile(adding('COPY added /added-again\n'));
  const result = project.start('--in-place', 'echo', 'hi');
  assertStarted(project, result, { kit: false, project: true });
  assert.match(
    result.stderr,
    /sandbox\.sh: sandbox\/Dockerfile is not the file the image was built from\. Rebuilding\./,
  );
  assert.equal(label(project.image, projectLabel), digest(readFileSync(project.projectFile)));
  assert.ok(holds(project.image, '/added-again'));
});

test("a project's file added after a build without one is built, and then not again", { skip }, (t) => {
  const project = setUp(t);
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), { kit: true, project: false });
  project.writeProjectFile(adding());
  const result = project.start('--in-place', 'echo', 'hi');
  assertStarted(project, result, builtBoth);
  assert.match(result.stderr, /sandbox\/Dockerfile is not the file the image was built from\. Rebuilding\./);
  assert.ok(holds(project.image, '/added'));
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtNothing);
});

test("a project's file removed after a build leaves the kit's image, built anew, and then not again", { skip }, (t) => {
  const project = setUp(t);
  project.writeProjectFile(adding());
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
  rmSync(project.projectFile);
  const result = project.start('--in-place', 'echo', 'hi');
  assertStarted(project, result, { kit: true, project: false });
  assert.match(
    result.stderr,
    /sandbox\.sh: the image was built from a sandbox\/Dockerfile that is no longer there\. Rebuilding\./,
  );
  const labels = JSON.parse(docker('image', 'inspect', '--format', '{{json .Config.Labels}}', project.image));
  assert.ok(!(projectLabel in labels), "the image holds no label of a project's file");
  assert.ok(!holds(project.image, '/added'));
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtNothing);
});

test("--rebuild builds the kit's image and the project's file on it", { skip }, (t) => {
  const project = setUp(t);
  project.writeProjectFile(adding());
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
  assertStarted(project, project.start('--rebuild', '--in-place', 'echo', 'hi'), builtBoth);
});

test("a kit's image built anew for another harness version has the project's file built on it", { skip }, (t) => {
  const project = setUp(t);
  project.writeProjectFile(adding());
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
  writeCommand(project.bin, 'claude', `echo '${newClaude} (Claude Code)'`);
  const result = project.start('--in-place', 'echo', 'hi');
  assertStarted(project, result, builtBoth);
  assert.match(result.stderr, new RegExp(`the image holds Claude Code ${hostVersions.claude} and ${newClaude}`));
  assert.equal(label(project.image, claudeLabel), newClaude);
  assert.ok(holds(project.image, '/added'));
});

test("a project's file that fails to build ends the start with Docker's output, and runs nothing", { skip }, (t) => {
  const project = setUp(t);
  project.writeProjectFile(`${opening}COPY not-there /not-there\n`);
  const result = project.start('--in-place', 'echo', 'hi');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /not-there/);
  assert.equal(project.projectBuilds().length, 1);
  assert.deepEqual(project.runs(), []);
});

test("a kit's build that fails ends the start before the project's file is built", { skip }, (t) => {
  const project = setUp(t);
  project.writeProjectFile(adding());
  writeFileSync(project.buildFails, '');
  const result = project.start('--in-place', 'echo', 'hi');
  assert.equal(result.status, 17);
  assert.match(result.stderr, /failed to solve: no network/);
  assert.deepEqual(project.projectBuilds(), []);
  assert.deepEqual(project.tags(), []);
  assert.deepEqual(project.runs(), []);
});

// What the kit's stand-in holds of how a container starts, as the refusal writes it.
const kitStart = {
  entrypoint: '["/usr/local/bin/entrypoint.sh"]',
  command: '["bash"]',
  user: 'none',
  'working directory': '/work',
};

for (const { instruction, line, differs } of [
  {
    instruction: 'ENTRYPOINT',
    line: 'ENTRYPOINT ["/bin/sh"]',
    // A file that sets the entrypoint empties the command it inherits.
    differs: { entrypoint: '["/bin/sh"]', command: 'none' },
  },
  { instruction: 'CMD', line: 'CMD ["sh"]', differs: { command: '["sh"]' } },
  { instruction: 'USER', line: 'USER nobody', differs: { user: 'nobody' } },
  { instruction: 'WORKDIR', line: 'WORKDIR /elsewhere', differs: { 'working directory': '/elsewhere' } },
]) {
  test(
    `an image whose project's file sets ${instruction} is refused at every start until the file drops it`,
    { skip },
    (t) => {
      const project = setUp(t);
      const { image } = project;
      project.writeProjectFile(adding(`${line}\n`));
      const assertRefused = (result) => {
        assert.equal(result.status, 1, result.stderr);
        assert.deepEqual(project.runs(), []);
        for (const [what, value] of Object.entries(differs)) {
          assert.ok(
            result.stderr.includes(
              `sandbox.sh: the image ${image} has the ${what} ${value}, and the kit's image ${image}-base has ` +
                `${kitStart[what]}.\n`,
            ),
            result.stderr,
          );
        }
        const named = (result.stderr.match(/^sandbox\.sh: the image /gm) ?? []).length;
        assert.equal(named, Object.keys(differs).length, result.stderr);
        assert.match(result.stderr, /installs the firewall and drops to the agent/);
        assert.match(result.stderr, new RegExp(`[Rr]emove from sandbox/Dockerfile .*${instruction}`));
      };
      const first = project.start('--in-place', 'echo', 'hi');
      assertRefused(first);
      assert.equal(project.projectBuilds().length, 1);
      const second = project.start('--in-place', 'echo', 'hi');
      assertRefused(second);
      assert.deepEqual(project.kitBuilds(), []);
      assert.deepEqual(project.projectBuilds(), []);

      project.writeProjectFile(adding());
      assertStarted(project, project.start('--in-place', 'echo', 'hi'), { kit: false, project: true });
    },
  );
}

test(
  "a unit run of an image whose project's file sets ENTRYPOINT is refused before its clone is made",
  { skip },
  (t) => {
    const project = setUp(t);
    const { root, home } = project;
    writeFileSync(join(root, '.gitignore'), 'node_modules/\n');
    const git = (...args) =>
      execFileSync('git', ['-c', 'user.name=Tester', '-c', 'user.email=tester@example.com', ...args], { cwd: root });
    git('init', '--quiet', '--initial-branch', 'master');
    git('add', '.');
    git('commit', '--quiet', '--message', 'the project');
    git('branch', 'task-0001-doc');
    project.writeProjectFile(adding('ENTRYPOINT ["/bin/sh"]\n'));
    const result = project.start('task-0001-doc', 'echo', 'hi');
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /installs the firewall and drops to the agent/);
    assert.deepEqual(project.runs(), []);
    assert.ok(!existsSync(join(home, '.local', 'state')), 'no clone was made');
  },
);

for (const [name, labelled] of [
  [claudeLabel, 'Claude Code'],
  [opencodeLabel, 'OpenCode'],
  [projectLabel, "a project's file"],
]) {
  test(`a project's file that sets the label of ${labelled} does not have the next start build`, { skip }, (t) => {
    const project = setUp(t);
    const value = name === projectLabel ? `sha256:${'0'.repeat(64)}` : '1.0.0';
    project.writeProjectFile(adding(`LABEL ${name}=${value}\n`));
    assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
    assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtNothing);
  });
}

for (const [name, harness, command, printed] of [
  [claudeLabel, 'Claude Code', 'claude', `${newClaude} (Claude Code)`],
  [opencodeLabel, 'OpenCode', 'opencode', '98.5.0'],
]) {
  test(
    `a label of ${harness} in a project's file that names the host's new version does not stop a build`,
    { skip },
    (t) => {
      const project = setUp(t);
      const version = printed.split(' ')[0];
      project.writeProjectFile(adding(`LABEL ${name}=${version}\n`));
      assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
      writeCommand(project.bin, command, `echo '${printed}'`);
      const result = project.start('--in-place', 'echo', 'hi');
      assertStarted(project, result, builtBoth);
      const rebuilding = new RegExp(`the image holds ${harness} \\S+ and ${version.replaceAll('.', '\\.')} is wanted`);
      assert.match(result.stderr, rebuilding);
      assert.equal(label(`${project.image}-base`, name), version);
    },
  );
}

test('the dev shim builds both images at every start, and --connect builds nothing', { skip }, (t) => {
  const project = setUp(t, 'dev');
  project.writeProjectFile(adding());
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
  assertStarted(project, project.start('--in-place', 'echo', 'hi'), builtBoth);
  const connect = project.start('--connect', 'task-0001-doc', 'echo', 'hi');
  assert.notEqual(connect.status, 0);
  assert.deepEqual(project.kitBuilds(), []);
  assert.deepEqual(project.projectBuilds(), []);
  assert.deepEqual(project.tags(), []);
});
