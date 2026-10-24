# 0084 A test of variant runs reads Docker too early

## Approach

The change is in one file, `tests/sandbox-variant.test.mjs`, and in nothing else (R5).

Today `setUp` defines `wait(label)` as a loop that polls for `ready-<label>` in the gate every 100 milliseconds for a
minute, and `runningNames()` as one `docker ps --format '{{.Names}}'`. The fix moves both readings into functions at
the top level of the file, so that the regression test can call the wait without Docker and without `setUp`, which
builds a real container project:

* `runningContainers(docker)`: the names `docker ps --format '{{.Names}}'` lists, run with the command `docker`, a
  name looked up on the `PATH` or a path. `runningNames()` of `setUp` calls it with `'docker'`, so that the wait and
  the tests' own checks read Docker by one and the same query
* `waitForRun({ label, gate, container, docker = 'docker', timeout = 60000 })`: polls every 100 milliseconds until
  `ready-<label>` is in `gate` and `runningContainers(docker)` holds `container`. It asks Docker only once the ready
  file is there. When `timeout` milliseconds pass with the two not both holding, it fails with a message that names
  the run and which of the two did not hold:
    * the ready file missing: `the run <label> did not touch <gate>/ready-<label> within a minute`
    * the container not listed: `the run <label> touched its ready file, but docker ps did not list its container
      <container> within a minute. It listed: <names, comma separated, or "none">`
  The minute in the message is written from `timeout`, so a test that passes a shorter bound reads its own bound
  (`within 300 milliseconds`), and the suite's own runs read `within a minute`

`wait(label)` of `setUp` becomes `waitForRun({ label, gate, container: containerOf(branchOf(label)) })`, with
`branchOf` a function at the top level. The labels of the file are `unit` and the variants' names, and the branch of
a label is `unitBranch` for `unit` and `` `${unitBranch}--${label}` `` for a variant, which is what each test passes
to `start` today. Every test of the file already waits through `wait` before it reads `runningNames()`, starts a
second wrapper or calls `release`, so with `wait` changed every test waits this way (R1), and no test changes beyond
that.

The assertions of the five tests stay as they are, the checks after a run ended included, which keep their one read
of `runningNames()` (R3).

The regression tests stand in the same file, without the file's `{ skip }`, so they run on every host and in the
sandbox (R4). Each writes a fake `docker` with `writeCommand` of `tests/wrapper-fixture.mjs` in a directory of
`temporaryDirectory` of `tests/temporary-directory.mjs`, touches the ready file in a gate of its own, and passes the
fake's path as `docker`. The fake keeps the count of its calls in a file beside it, so the test can tell how often it
was asked.

## Files

- `tests/sandbox-variant.test.mjs`: `runningContainers`, `waitForRun` and `branchOf` at the top level, `wait` and
  `runningNames` of `setUp` through them, and three regression tests that need no Docker

## Tasks

- [ ] Write the regression tests first, in `tests/sandbox-variant.test.mjs`, without `{ skip }`, against
  `waitForRun` as the approach gives it, each named with the prefix `waitForRun`, and see them fail because it does
  not exist yet (R4):
    * a fake `docker` that answers `ps` with `other-container` alone on its first three calls, and with
      `other-container` and the run's container from the fourth on: `waitForRun` resolves, and the fake was called
      four times, so the wait went on while the container was left out and ended once it was listed
    * a fake `docker` that never lists the run's container and lists `other-container`, with a `timeout` of 300: the
      wait rejects with a message that names the run's label, says that `docker ps` did not list the container,
      names the container and names `other-container` (R2)
    * no ready file in the gate, with a `timeout` of 300: the wait rejects with a message that names the run's label
      and its ready file, and the fake was never called (R2)
- [ ] Add `runningContainers(docker)` and `waitForRun` at the top level of the file as the approach gives them, and
  see the three regression tests pass (R1, R2)
- [ ] Add `branchOf(label)`, and make `wait(label)` of `setUp` call `waitForRun` with the gate and the container of
  the label's branch, and `runningNames()` call `runningContainers('docker')`. Change no assertion of the five tests
  that need Docker, and update the comment above `setUp` to say that `wait` waits for the run to be in its container
  and for Docker to list the container (R1, R3)
- [ ] Check that nothing outside `tests/sandbox-variant.test.mjs` changed in the unit's implementation commit, and
  that every line of the file fits 120 characters (R5)
- [ ] Log in `record.md` what was built, the runs of the suite below and their results

## Verification

- [ ] `node --test tests/sandbox-variant.test.mjs` passes on the Linux host with Docker, all eight tests run
- [ ] The three regression tests carry no `{ skip }` and call no `docker` but their fake, so that a host without
  Docker, as the sandbox, runs them: read in the diff, and run alone with `node --test --test-name-pattern
  '^waitForRun' tests/sandbox-variant.test.mjs`
- [ ] `npm test` passes on the Linux host with Docker
- [ ] `npm run check-changes` passes once the work is committed

## Commit Points

- [ ] `bugfix-0084 Plan waiting for Docker to list a variant test's container`: `plan.md` and the record's entry
- [ ] `bugfix-0084 Wait for Docker to list a variant test's container`: `tests/sandbox-variant.test.mjs`, with the
  regression tests and the wait together, since the tests do not pass before the wait exists
- [ ] `bugfix-0084 Record the implementation`: `record.md`
