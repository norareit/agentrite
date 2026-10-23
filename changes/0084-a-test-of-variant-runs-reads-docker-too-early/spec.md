# 0084 A test of variant runs reads Docker too early

## Context

`tests/sandbox-variant.test.mjs` starts unit runs and variant runs of a project in real containers, through the
wrapper and the fake `docker` of `tests/wrapper-fixture.mjs`, which runs a real `docker run --rm --name <name>`. Each
run's command commits a file, touches `ready-<label>` in a directory the test mounts, and waits for the test to touch
`release-<label>`. The test's `wait` waits for the ready file, and then the test reads which containers are running
with `docker ps`, or starts a second wrapper, which asks `docker ps` itself whether the run's container is running.

The test has failed now and then for several units: 0072, 0076 (2 of 8 runs of the whole suite), 0077 (twice), and
the first `npm test` of the release of 8.1.0. Each time, a run of it alone or of the whole suite again passed.

## The bug

**Observed.** On `master` at `9f8dbb5`, on the Linux host with Docker 28.4.0, the first `npm test` of the release of
8.1.0 failed one test of 1235, `a unit run and its variants run at once, each on its own clone, and land on their own
branches`, at `tests/sandbox-variant.test.mjs:93`, with
`project-sandbox-2848455-task-0026-doc--opus is running: project-sandbox-2848455-task-0026-doc,` followed by the
containers of other suites. The variant's run had touched `ready-opus` from inside its container, and `docker ps` did
not list the container.

**Expected.** A container whose run has touched its ready file is found running by every check the test then makes,
by its own `docker ps` and by the wrapper's, in every run of the suite.

**Steps to reproduce.** The test's failure was not reproduced in 14 runs of `npm test` on this host, 8 of them with
every CPU busy. The race beneath it was reproduced on its own: a script started a container of the image the tests
use, `node:26-bookworm`, with `docker run --rm --name <name>`, whose command touched a file in a mounted directory at
once, and as soon as the file appeared on the host it asked `docker ps --format '{{.Names}}'` for the container.
Started twelve at a time, 23 of 36 containers were missing from `docker ps`; started one at a time, 6 of 10 were.
For each container that was missing, `docker inspect --format '{{.State.Status}}'`, asked right after, said
`running`.

**Root cause.** Docker starts a container's process before `docker ps` lists the container as running, so for a short
time after the process has begun, its work can be seen while `docker ps` leaves the container out. The test takes the
ready file as the sign that the container is running, and reads `docker ps`, or has the wrapper read it, once, at
once. Before that read, the run's command commits a file, and the test polls for the ready file every 100
milliseconds, which mostly outlasts the window; on a host under load, as when other suites start containers, the
window is longer, and the read can fall into it. The two tests that start a second wrapper right after `wait`, the
refusal of a second run of a variant and `--connect` with `--variant`, depend on the same timing, since the wrapper
learns whether the run's container is running from `docker ps`.

**Fix.** The test's `wait` for a run goes on until Docker lists the run's container as running, after its ready file
is there, so that every check after it finds the container as every later read of Docker will.

## Requirements

1. In `tests/sandbox-variant.test.mjs`, waiting for a run ends only once the run's ready file is there and `docker
   ps` lists the run's container as running. Every test of the file that waits for a run waits this way before it
   reads which containers run, starts a second wrapper for the run, or releases it
2. The wait fails when the two do not both hold within a minute, the bound the wait for the ready file has today,
   with a message that names the run and which of the two did not hold. A failure names the container Docker did not
   list, and the containers it did
3. The tests of the file assert what they asserted before this unit, and no assertion is removed or made weaker. A
   check that a container is still running after another run ended reads `docker ps` once, as today, since the wait
   of requirement 1 has seen the container listed before
4. A test shows that the wait of requirement 1 goes on while `docker ps` leaves the run's container out, and ends once
   it lists it, by a `docker` that leaves the container out of its first answers, and that it fails with the message
   of requirement 2 when `docker ps` never lists it. The test needs no Docker
5. Nothing outside the tests changes: not the wrapper, the fixture's fake `docker` for the other suites, nor any
   document of the package

## Decisions

* **The kind is bug.** A test of the suite fails by a fault of its own, with nothing wrong in the product, and the
  human asked for a bug
* **The test waits for Docker, rather than the run touching its ready file later.** A command in the container cannot
  know when Docker lists its container, so no delay in the run's script closes the window, and a delay long enough
  for a loaded host would slow every run of the suite. Waiting for the listing itself ends as soon as it holds.
  Rejected: a sleep after the ready file, which only makes the window rarer; and `docker inspect` in place of
  `docker ps`, which would make the test's checks pass while the wrapper, which reads `docker ps`, still could not
  see the container
* **The wait is in the one `wait` of the file.** All five tests wait through it before they read Docker or start a
  second wrapper, so one change covers the three that read `docker ps` themselves and the two whose wrapper reads it.
  The checks after a run ended read `docker ps` once, since the container they look for was listed before and
  nothing they do stops it
* **The regression test fakes Docker's answers.** The race depends on the timing of the daemon and could not be made
  to fail the test on demand: 14 runs of the suite passed. A `docker` that leaves the container out of its first
  answers puts the test in the window every time, and needs no Docker, so it runs on every host and in the sandbox
* **The window is Docker's, and is not worked around in the wrapper.** What the wrapper does with a run that is
  started while another run's container is in the window is item 1 of "Beyond the request". The suite's tests start
  their second wrapper after the first run is in its container by its own word, which a human does not do within the
  window

## Non-goals

* Changing the wrapper, the fake `docker` of `tests/wrapper-fixture.mjs` as the other suites use it, or the image
* Making the suite's tests that need Docker faster, or running them apart from the rest
* Other tests that fail now and then, of which none is known
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. **The wrapper's lock in Docker's window.** The wrapper refuses a second run of a branch when `docker ps` lists the
   branch's container, and before it runs removes a stopped container of the name with `docker rm`. Two runs of one
   branch started within the window would both pass the refusal; what happens then was not reproduced, and Docker's
   refusal of a second container of one name may already stop the second run. The wrapper would ask
   `docker inspect` for the container's state, which knows of it from its creation, in place of `docker ps`. It costs
   a change to the wrapper's lock, the reading of its states, and tests that need Docker. Without it, a human who
   starts two runs of one branch within a fraction of a second of each other may see Docker's error, or a run that
   behaves in a way not yet known
