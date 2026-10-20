import assert from 'node:assert/strict';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { chmodSync, copyFileSync, cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { copyKitInstructions, kitSettingsText } from './installed-kit.mjs';
import { containerHost } from './wrapper-fixture.mjs';
import { temporaryDirectory } from './temporary-directory.mjs';

const kitContainer = fileURLToPath(new URL('../container/', import.meta.url));
const kitScripts = fileURLToPath(new URL('../scripts/', import.meta.url));
const dockerfile = readFileSync(new URL('../container/Dockerfile', import.meta.url), 'utf-8');
const kitPath = 'node_modules/agentrite/container';

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const skip = dockerLacking
    ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
    : false;

const unitBranch = 'task-0026-doc';
const variantNames = ['opus', 'gpt-6-1'];
// Named after the process, because Docker's container names are shared by every suite that runs on the host.
const project = `project-sandbox-${process.pid}`;
const containerOf = (branch) => `${project}-${branch}`;

// What a run does in its container: commits a file named after the run in /work, says so by creating a file in the
// directory mounted from the test, and waits until the test creates the run's release file there.
const runScript = `
echo "$1" > "$1.txt"
git add "$1.txt"
git -c user.name=Agent -c user.email=agent@example.com commit --quiet --message "$1"
touch "/mnt/gate/ready-$1"
while [ ! -e "/mnt/gate/release-$1" ]; do sleep 0.1; done
`;

async function sleep(milliseconds) {
    await new Promise((resolve) => setTimeout(resolve, milliseconds));
}

// A project that is a git repository on `master`, with `task-0026-doc` one commit ahead, the kit's wrapper installed
// under its ignored `node_modules`, and the host of `containerHost`, whose containers are of the image the kit's
// Dockerfile builds on. `start` runs the wrapper for a run named `label` in the background, with `args` before the
// command, and returns what it ends with; `wait` waits for the run to be in its container, and `release` lets it
// end. Every container is removed when the test ends.
function setUp(t) {
    const base = temporaryDirectory(t, 'sandbox-variant-');
    const root = join(base, 'project');
    const container = join(root, kitPath);
    mkdirSync(container, { recursive: true });
    for (const file of ['sandbox.sh', 'unit-clone.sh']) copyFileSync(join(kitContainer, file), join(container, file));
    chmodSync(join(container, 'sandbox.sh'), 0o755);
    cpSync(kitScripts, join(container, '..', 'scripts'), { recursive: true });
    copyKitInstructions(join(container, '..'));
    writeFileSync(
        join(root, 'agentrite.json'),
        kitSettingsText({ defaultBranch: 'master', harnesses: ['claude'], sandbox: true, bell: false }),
    );
    mkdirSync(join(root, 'sandbox'));
    writeFileSync(join(root, 'sandbox', 'compose.project.yml'), `name: ${project}\n`);
    writeFileSync(join(root, '.gitignore'), 'node_modules\n.reviews\n.env\n');
    const home = join(base, 'home');
    mkdirSync(home);
    writeFileSync(join(home, '.gitconfig'), '[user]\n\tname = Tester\n\temail = tester@example.com\n');
    const gate = join(base, 'gate');
    mkdirSync(gate);
    const image = /^FROM (\S+) AS base$/m.exec(dockerfile)?.[1];
    assert.ok(image, 'the Dockerfile has a base stage');
    const host = containerHost(base, [], image);

    const git = (...args) =>
        execFileSync('git', args, { cwd: root, encoding: 'utf-8', env: { HOME: home, PATH: process.env.PATH } }).trim();
    git('init', '--quiet', '--initial-branch', 'master');
    git('add', '.');
    git('commit', '--quiet', '--message', 'the project');
    git('checkout', '--quiet', '-b', unitBranch);
    writeFileSync(join(root, 'unit.md'), 'the unit\n');
    git('add', '.');
    git('commit', '--quiet', '--message', 'the unit');
    git('checkout', '--quiet', 'master');

    const state = join(home, '.local', 'state', 'agentrite', project);
    const wrapper = join(container, 'sandbox.sh');
    const environment = { HOME: home, PATH: host.bin };
    const running = [];
    const start = (args, label) => {
        const child = spawn(wrapper, [root, '--mount', gate, ...args, 'sh', '-c', runScript, 'sh', label], {
            env: environment,
            stdio: ['ignore', 'ignore', 'pipe'],
        });
        let stderr = '';
        child.stderr.on('data', (chunk) => (stderr += chunk));
        const ended = new Promise((resolve) => child.on('close', (status) => resolve({ status, stderr })));
        running.push(child);
        return ended;
    };
    const wait = async (label) => {
        for (let waited = 0; !existsSync(join(gate, `ready-${label}`)); waited += 100) {
            assert.ok(waited < 60000, `the run ${label} was not in its container within a minute`);
            await sleep(100);
        }
    };
    const release = (label) => writeFileSync(join(gate, `release-${label}`), '');
    const runningNames = () =>
        spawnSync('docker', ['ps', '--format', '{{.Names}}'], { encoding: 'utf-8' }).stdout.split('\n').filter(Boolean);
    // What a branch holds that the unit's branch did at the start does not.
    const startCommit = git('rev-parse', unitBranch);
    const added = (branch) => git('diff', '--name-only', startCommit, branch).split('\n').filter(Boolean);
    t.after(() => {
        for (const child of running) child.kill('SIGKILL');
        for (const branch of [unitBranch, ...variantNames.map((name) => `${unitBranch}--${name}`)]) {
            spawnSync('docker', ['rm', '-f', containerOf(branch)], { stdio: 'ignore' });
        }
    });
    const clone = (branch) => join(state, branch);
    return { root, git, state, clone, gate, wrapper, environment, start, wait, release, runningNames, added };
}

// Each run of a unit is a unit run of a branch of its own. The unit run of `task-0026-doc` and its variants run in
// containers named after their branches, on clones of their own, and each brings its commit back to its own branch.
test(
    'a unit run and its variants run at once, each on its own clone, and land on their own branches',
    { skip },
    async (t) => {
        const host = setUp(t);
        const variants = { opus: `${unitBranch}--opus`, 'gpt-6-1': `${unitBranch}--gpt-6-1` };
        const ended = {
            unit: host.start([unitBranch], 'unit'),
            opus: host.start([unitBranch, '--variant', 'opus'], 'opus'),
            'gpt-6-1': host.start(['0026', '--variant=gpt-6-1'], 'gpt-6-1'),
        };
        for (const label of Object.keys(ended)) await host.wait(label);

        const names = host.runningNames();
        for (const branch of [unitBranch, ...Object.values(variants)]) {
            assert.ok(names.includes(containerOf(branch)), `${containerOf(branch)} is running: ${names}`);
            assert.ok(existsSync(host.clone(branch)), `${branch} has a clone of its own`);
        }
        assert.equal(new Set([unitBranch, ...Object.values(variants)].map(host.clone)).size, 3);

        for (const label of Object.keys(ended)) {
            host.release(label);
            const result = await ended[label];
            assert.equal(result.status, 0, result.stderr);
        }
        assert.deepEqual(host.added(unitBranch), ['unit.txt']);
        assert.deepEqual(host.added(variants.opus), ['opus.txt']);
        assert.deepEqual(host.added(variants['gpt-6-1']), ['gpt-6-1.txt']);
        for (const branch of [unitBranch, ...Object.values(variants)]) {
            assert.equal(existsSync(host.clone(branch)), false, `the clone of ${branch} is gone`);
        }
        assert.equal(host.git('for-each-ref', 'refs/remotes/sandbox'), '');
    },
);

test('a variant started beside the unit run, and one started alone, both run and land', { skip }, async (t) => {
    const host = setUp(t);

    const alone = host.start([unitBranch, '--variant', 'opus'], 'opus');
    await host.wait('opus');
    host.release('opus');
    assert.equal((await alone).status, 0);

    const unitRun = host.start([unitBranch], 'unit');
    await host.wait('unit');
    const beside = host.start([unitBranch, '--variant', 'gpt-6-1'], 'gpt-6-1');
    await host.wait('gpt-6-1');
    assert.ok(host.runningNames().includes(containerOf(unitBranch)));
    host.release('gpt-6-1');
    assert.equal((await beside).status, 0);
    host.release('unit');
    assert.equal((await unitRun).status, 0);

    assert.deepEqual(host.added(`${unitBranch}--opus`), ['opus.txt']);
    assert.deepEqual(host.added(`${unitBranch}--gpt-6-1`), ['gpt-6-1.txt']);
    assert.deepEqual(host.added(unitBranch), ['unit.txt']);
});

test('a variant that ends while the unit run still runs leaves the unit run as it was', { skip }, async (t) => {
    const host = setUp(t);
    const unitRun = host.start([unitBranch], 'unit');
    const variant = host.start([unitBranch, '--variant', 'opus'], 'opus');
    await host.wait('unit');
    await host.wait('opus');
    const unitBefore = host.git('rev-parse', unitBranch);

    host.release('opus');
    assert.equal((await variant).status, 0);

    assert.ok(host.runningNames().includes(containerOf(unitBranch)), 'the unit run is still running');
    assert.ok(existsSync(host.clone(unitBranch)), 'its clone is still there');
    assert.equal(host.git('rev-parse', unitBranch), unitBefore, 'its branch has not moved');
    assert.deepEqual(host.added(`${unitBranch}--opus`), ['opus.txt']);

    host.release('unit');
    assert.equal((await unitRun).status, 0);
    assert.deepEqual(host.added(unitBranch), ['unit.txt']);
    assert.deepEqual(host.added(`${unitBranch}--opus`), ['opus.txt']);
});

test('a second run of a variant whose container is running is refused, and the first runs on', { skip }, async (t) => {
    const host = setUp(t);
    const first = host.start([unitBranch, '--variant', 'opus'], 'opus');
    await host.wait('opus');

    const second = spawnSync(host.wrapper, [host.root, unitBranch, '--variant', 'opus', 'echo', 'hi'], {
        encoding: 'utf-8',
        env: host.environment,
    });

    assert.equal(second.status, 2, second.stderr);
    assert.ok(second.stderr.includes(`the container ${containerOf(`${unitBranch}--opus`)} is running`), second.stderr);
    assert.ok(host.runningNames().includes(containerOf(`${unitBranch}--opus`)), 'the first run is still running');
    host.release('opus');
    assert.equal((await first).status, 0);
    assert.deepEqual(host.added(`${unitBranch}--opus`), ['opus.txt']);
});

test("--connect with --variant runs its command in the variant's container alone", { skip }, async (t) => {
    const host = setUp(t);
    const unitRun = host.start([unitBranch], 'unit');
    const variant = host.start([unitBranch, '--variant', 'opus'], 'opus');
    await host.wait('unit');
    await host.wait('opus');

    const connected = spawnSync(
        host.wrapper,
        [host.root, '--connect', '0026', '--variant', 'opus', 'touch', '/work/connected.txt'],
        { encoding: 'utf-8', env: host.environment },
    );

    assert.equal(connected.status, 0, connected.stderr);
    assert.ok(existsSync(join(host.clone(`${unitBranch}--opus`), 'connected.txt')), 'the file is in the variant clone');
    assert.equal(existsSync(join(host.clone(unitBranch), 'connected.txt')), false, 'and not in the unit run clone');
    host.release('opus');
    host.release('unit');
    await variant;
    await unitRun;
});
