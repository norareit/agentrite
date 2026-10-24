import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { test } from 'node:test';
import { temporaryDirectory } from './temporary-directory.mjs';
import { containerProject, containerUnitBranch as unitBranch, writeCommand } from './wrapper-fixture.mjs';

const dockerLacking = spawnSync('docker', ['info'], { stdio: 'ignore' }).status !== 0;
const skip = dockerLacking
    ? 'needs Docker, which the host lacks. The sandbox holds no Docker, so run npm test on a host that has it'
    : false;

const variantNames = ['opus', 'gpt-6-1'];
// Named after the process, because Docker's container names are shared by every suite that runs on the host.
const project = `project-sandbox-${process.pid}`;
const containerOf = (branch) => `${project}-${branch}`;
// The labels of the file are `unit` and the names of the variants.
const branchOf = (label) => (label === 'unit' ? unitBranch : `${unitBranch}--${label}`);

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

// The names of the containers that `docker ps` lists as running, by the command `docker`.
function runningContainers(docker) {
    const listing = spawnSync(docker, ['ps', '--format', '{{.Names}}'], { encoding: 'utf-8' });
    return listing.stdout.split('\n').filter(Boolean);
}

// Waits until the run `label` has touched its ready file in `gate` and `docker ps` lists its `container`. The ready
// file comes first, and `docker ps` leaves out a container for a moment after its process has started, so a test
// that read Docker as soon as the file was there would sometimes find the container missing. Docker is asked only
// once the file is there.
async function waitForRun({ label, gate, container, docker = 'docker', timeout = 60000 }) {
    const bound = timeout === 60000 ? 'a minute' : `${timeout} milliseconds`;
    const ready = join(gate, `ready-${label}`);
    const deadline = Date.now() + timeout;
    let listed = [];
    while (true) {
        if (existsSync(ready)) {
            listed = runningContainers(docker);
            if (listed.includes(container)) return;
        }
        if (Date.now() >= deadline) break;
        await sleep(100);
    }
    assert.fail(
        existsSync(ready)
            ? `the run ${label} touched its ready file, but docker ps did not list its container ${container} ` +
                  `within ${bound}. It listed: ${listed.join(', ') || 'none'}`
            : `the run ${label} did not touch ${ready} within ${bound}`,
    );
}

// The project of `containerProject`, with a directory `gate` mounted in every run. `start` runs the wrapper for a
// run named `label` in the background, with `args` before the command, and returns what it ends with; `wait` waits
// for the run to be in its container and for Docker to list the container, and `release` lets it end. Every
// container is removed when the test ends.
function setUp(testContext) {
    const { base, root, git, state, clone, wrapper, environment } = containerProject(
        testContext,
        'sandbox-variant-',
        project,
    );
    const gate = join(base, 'gate');
    mkdirSync(gate);
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
    const wait = (label) => waitForRun({ label, gate, container: containerOf(branchOf(label)) });
    const release = (label) => writeFileSync(join(gate, `release-${label}`), '');
    const runningNames = () => runningContainers('docker');
    // What a branch holds that the unit's branch did at the start does not.
    const startCommit = git('rev-parse', unitBranch);
    const added = (branch) => git('diff', '--name-only', startCommit, branch).split('\n').filter(Boolean);
    testContext.after(() => {
        for (const child of running) child.kill('SIGKILL');
        for (const branch of [unitBranch, ...variantNames.map((name) => `${unitBranch}--${name}`)]) {
            spawnSync('docker', ['rm', '-f', containerOf(branch)], { stdio: 'ignore' });
        }
    });
    return { root, git, state, clone, gate, wrapper, environment, start, wait, release, runningNames, added };
}

// Each run of a unit is a unit run of a branch of its own. The unit run of `task-0026-doc` and its variants run in
// containers named after their branches, on clones of their own, and each brings its commit back to its own branch.
test(
    'a unit run and its variants run at once, each on its own clone, and land on their own branches',
    { skip },
    async (testContext) => {
        const host = setUp(testContext);
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

test(
    'a variant started beside the unit run, and one started alone, both run and land',
    { skip },
    async (testContext) => {
        const host = setUp(testContext);

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
    },
);

test(
    'a variant that ends while the unit run still runs leaves the unit run as it was',
    { skip },
    async (testContext) => {
        const host = setUp(testContext);
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
    },
);

test(
    'a second run of a variant whose container is running is refused, and the first runs on',
    { skip },
    async (testContext) => {
        const host = setUp(testContext);
        const first = host.start([unitBranch, '--variant', 'opus'], 'opus');
        await host.wait('opus');

        const second = spawnSync(host.wrapper, [host.root, unitBranch, '--variant', 'opus', 'echo', 'hi'], {
            encoding: 'utf-8',
            env: host.environment,
        });

        assert.equal(second.status, 1, second.stderr);
        assert.ok(
            second.stderr.includes(`the container ${containerOf(`${unitBranch}--opus`)} is running`),
            second.stderr,
        );
        assert.ok(host.runningNames().includes(containerOf(`${unitBranch}--opus`)), 'the first run is still running');
        host.release('opus');
        assert.equal((await first).status, 0);
        assert.deepEqual(host.added(`${unitBranch}--opus`), ['opus.txt']);
    },
);

test("--connect with --variant runs its command in the variant's container alone", { skip }, async (testContext) => {
    const host = setUp(testContext);
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

// A `docker` that answers `ps` with `other-container` alone on its first `leftOut` calls, and with `run-container` as
// well from then on, or never when `leftOut` is huge. It counts its calls in `calls`, beside it.
function fakeDocker(testContext, leftOut) {
    const directory = temporaryDirectory(testContext, 'wait-for-run-');
    const calls = join(directory, 'calls');
    writeCommand(
        directory,
        'docker',
        `count=$(cat "${calls}" 2>/dev/null || echo 0)
count=$((count + 1))
echo "$count" > "${calls}"
echo other-container
[ "$count" -gt ${leftOut} ] && echo run-container
exit 0`,
    );
    return { docker: join(directory, 'docker'), callCount: () => Number(readFileSync(calls, 'utf-8')) };
}

test('waitForRun goes on while docker ps leaves the container out, and ends once it lists it', async (testContext) => {
    const { docker, callCount } = fakeDocker(testContext, 3);
    const gate = temporaryDirectory(testContext, 'wait-for-run-gate-');
    writeFileSync(join(gate, 'ready-opus'), '');

    await waitForRun({ label: 'opus', gate, container: 'run-container', docker });

    assert.equal(callCount(), 4);
});

test('waitForRun fails naming the container and the ones listed when docker ps never lists it', async (testContext) => {
    const { docker } = fakeDocker(testContext, 1000000);
    const gate = temporaryDirectory(testContext, 'wait-for-run-gate-');
    writeFileSync(join(gate, 'ready-opus'), '');

    await assert.rejects(
        waitForRun({ label: 'opus', gate, container: 'run-container', docker, timeout: 300 }),
        (error) =>
            error.message.includes('the run opus touched its ready file') &&
            error.message.includes('docker ps did not list its container run-container within 300 milliseconds') &&
            error.message.includes('It listed: other-container'),
    );
});

test('waitForRun fails naming the ready file when it is missing, and does not ask docker', async (testContext) => {
    const { docker } = fakeDocker(testContext, 0);
    const gate = temporaryDirectory(testContext, 'wait-for-run-gate-');

    await assert.rejects(
        waitForRun({ label: 'opus', gate, container: 'run-container', docker, timeout: 300 }),
        (error) =>
            error.message.includes(`the run opus did not touch ${join(gate, 'ready-opus')} within 300 milliseconds`),
    );
    assert.equal(existsSync(join(docker, '..', 'calls')), false, 'docker was never called');
});
