# 0079 A run of the orchestrator shows that it is alive

## Approach

All of the work is in `scripts/agentrite.mjs`, which owns the effects of `orchestrateCommand`: it makes the run's
directory and writes every file in it. `scripts/agentrite-orchestrate.mjs` stays pure and does not change. No new
module is made, so `package.json` and the table "What is here" of `README.md` do not change.

Three pieces are added to `scripts/agentrite.mjs`, each exported for the tests, as the file already exports
functions that the tests import:

* `instantOf(time)`, a pure function that gives the instant of `time`, milliseconds since the epoch, in UTC to the
  second, as `2026-10-23T10:00:05Z`: `new Date(time).toISOString().replace(/\.\d+Z$/, 'Z')`. `makeRunDirectory`
  already names the run's directory by this form, so it is extracted from there first, in a commit of its own that
  changes no behavior, and the heartbeat then takes it rather than repeating it. `heartbeatText(time)` gives
  `` `${instantOf(time)}\n` ``, the content of `heartbeat` by requirement 1
* `writeWhole(path, content, files)`, which writes `content` to `.<name>` in the directory of `path`, where `<name>`
  is the last part of `path`, and then renames it to `path`. A rename within one directory replaces the file in one
  step, so a reader sees the old content or the new. When the write or the rename throws, it removes `.<name>` with
  `{ force: true }`, ignoring a failure of that removal, and throws the error it caught, so that no file whose name
  opens with `.` is left by a failed write. `files` is `{ writeFileSync, renameSync, rmSync }`, the three functions of
  `node:fs` it calls, which `orchestrateCommand` passes from its imports. They are taken as a parameter so that a
  unit test can record the order of the calls, and make one of them fail, which no observation of a real directory
  can show
* `startHeartbeat(write)`, which calls `write(heartbeatText(Date.now()))` at once and then every
  `HEARTBEAT_MILLISECONDS`, a constant of `10_000`, by `setInterval`, and returns a function `stop` that clears the
  interval. Each call of `write` is wrapped in `try`/`catch` that drops what it throws, with a comment that the
  heartbeat is a sign for readers and not a part of the run, by requirement 4. Nothing is printed for a failed beat,
  and the interval goes on, so the next beat comes at its time. The interval is a constant and not a parameter: the
  unit tests move time with `mock.timers` of `node:test`, which mocks `setInterval` and `Date` together, and the
  command's tests wait the real 10 seconds

In `orchestrateCommand`, the `write` closure calls `writeWhole(resolve(root, runDirectory, name), content, {
writeFileSync, renameSync, rmSync })` in place of `writeFileSync`, so that `definition.json`, `state.json`, the outcome
and response files and `heartbeat` are all written whole (R5, R6). The heartbeat starts directly after
`makeRunDirectory`, before `definition.json` is written and so before the step at index 0 starts, with
`startHeartbeat((text) => write('heartbeat', text))` (R2). The body from there on stands in a `try` whose `finally`
calls `stop`, so that a step whose harness cannot be started, which throws out of the command as before, leaves no
interval behind. On the normal path `stop` is called directly before `writeState({ status, line })`, so that no beat
comes after the end is in `state.json` (R3). Calling `stop` a second time in the `finally` does nothing. The
`.orchestrator/.gitignore` file is outside a run's directory and keeps being written as it is.

The beats need no guard against the writes of `state.json`: every write is synchronous, and the timer runs only
when the event loop is free, while a step's harness runs or between the callbacks, so two writes never interleave.
Each file has its own temporary name, `.heartbeat` and `.state.json` among them. A run ended by a signal goes on
ending as before: `passSignalsOn` ends the process by the signal, and the interval goes with it.

Nothing else of the command changes: `state.json` keeps its keys and its moments, nothing is printed for the
heartbeat, and the exit statuses are those of `exitStatus` (R7). Every file the command writes is in the run's
directory (R8).

`SANDBOX.md` does not change. A developer does nothing new with the sandbox, and "What the sandbox defends against"
already says that a file under `.orchestrator` is what an agent may have written, which covers `heartbeat`.

## Files

- `scripts/agentrite.mjs`: `instantOf`, `heartbeatText`, `HEARTBEAT_MILLISECONDS`, `startHeartbeat` and
  `writeWhole`; `makeRunDirectory` by `instantOf`; `orchestrateCommand` writing whole, starting and stopping the
  heartbeat, and its doc comment
- `tests/agentrite-orchestrate.test.mjs`: unit tests of the four functions, the command's test of the heartbeat, and
  `heartbeat` among the files of the run's directory in the tests that list them
- `README.md`: "What .orchestrator holds" of "The orchestrator"

## Tasks

- [x] In `tests/agentrite-orchestrate.test.mjs`, import `instantOf` from `../scripts/agentrite.mjs`, and add a test
  that `instantOf(Date.UTC(2026, 9, 23, 10, 0, 5, 900))` gives `2026-10-23T10:00:05Z` and `instantOf(Date.UTC(2026,
  0, 2, 3, 4, 5))` gives `2026-01-02T03:04:05Z`. Run `npm test` and see it fail. In `scripts/agentrite.mjs`, add and
  export `instantOf(time)` of the approach, with a doc comment, and make `makeRunDirectory` name the run by
  `instantOf(Date.now())`. Run `npm test`: it passes, and `runDirectoryOf` still finds the directory by its form
  (R1, R2)
- [x] In `tests/agentrite-orchestrate.test.mjs`, add unit tests of `writeWhole`, each in a directory of
  `temporaryDirectory`: (R5, R6, R12)
  - with `files` that records each call and then makes it with the real function of `node:fs`, writing `{}` to
    `state.json` calls `writeFileSync` with `.state.json` in the same directory and the content, then `renameSync`
    from `.state.json` to `state.json`, in that order, and no `rmSync`
  - writing `second` over a `state.json` that holds `first` leaves `state.json` holding `second`, and the directory
    holds `state.json` alone
  - with a `writeFileSync` that writes `par` to the temporary file and then throws, over a `state.json` that holds
    `first`: `writeWhole` throws that error, `state.json` still holds `first`, and the directory holds `state.json`
    alone
  - with the real functions, writing `heartbeat` where `heartbeat` is a directory that holds a file, so that the
    rename fails: `writeWhole` throws, and no name in the directory but `heartbeat` is left
  Run `npm test` and see them fail
- [x] In `scripts/agentrite.mjs`, import `renameSync` from `node:fs`, and add and export `writeWhole(path, content,
  files)` of the approach, with a doc comment that says why `files` is a parameter. Run `npm test`: the tests of the
  previous task pass (R5, R6)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add unit tests of `heartbeatText` and `startHeartbeat`, the second
  with `testContext.mock.timers.enable({ apis: ['setInterval', 'Date'], now: Date.UTC(2026, 9, 23, 10, 0, 5) })`
  and a `write` that collects what it is given: (R1, R2, R3, R4, R12)
  - `heartbeatText(Date.UTC(2026, 9, 23, 10, 0, 5, 900))` gives `2026-10-23T10:00:05Z\n`, and matches
    `/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z\n$/` with nothing after the line break
  - `startHeartbeat` writes `2026-10-23T10:00:05Z\n` once before it returns; after `tick(9_999)` nothing more; after
    `tick(1)` a second write of `2026-10-23T10:00:15Z\n`; after `tick(10_000)` a third of `2026-10-23T10:00:25Z\n`
  - after `stop()` and `tick(60_000)` nothing more is written, and a second `stop()` throws nothing
  - with a `write` that throws at its first and second call and collects after that: `startHeartbeat` returns, a
    `tick(10_000)` throws nothing, and after a second `tick(10_000)` the collected write is
    `2026-10-23T10:00:25Z\n`, the instant of that beat
  Run `npm test` and see them fail
- [ ] In `scripts/agentrite.mjs`, add `HEARTBEAT_MILLISECONDS`, with a doc comment that gives the 10 seconds and the
  60 seconds of the decision, and add and export `heartbeatText(time)` and `startHeartbeat(write)` of the approach,
  with the comment on the dropped error. Run `npm test`: the tests of the previous task pass (R1, R2, R3, R4)
- [ ] In `tests/agentrite-orchestrate.test.mjs`, add `'heartbeat'` to the lists of the run's directory in `a run
  whose every item ends runs the default definition`, `a run whose steps leave items for after the run`, `a step
  past its limit is ended by SIGTERM` and `a run with --follow ends, writes its directory and exits as the same run
  without it`. In the last, compare the contents of the two runs' files but `heartbeat`, whose instant differs from
  run to run, and check that each run's `heartbeat` matches the form of requirement 1. Add a command's test: a
  one-step definition, `ONE_STEP`, whose fake prints a done outcome and then `waits(1, 12)`, started with
  `started`; once `pidOf(1)` gives the harness, the run's directory holds `heartbeat` of the form of requirement 1,
  at most 5 seconds from `Date.now()`, and `state.json` holds `ended` `null`; polling every 100 milliseconds for up
  to 15 seconds, `heartbeat` comes to hold a later instant while the harness's process is still alive; once the
  command ended, it exited 0, `heartbeat` holds an instant no earlier than that later one, the directory holds
  `00-implementer.outcome.json`, `definition.json`, `heartbeat` and `state.json` and no name that opens with `.`,
  and `state.json` holds the end of a complete run. Run `npm test` and see the changed and the new tests fail on the
  missing `heartbeat` (R2, R3, R6, R7, R13)
- [ ] In `scripts/agentrite.mjs`, make `orchestrateCommand` write by `writeWhole`, start the heartbeat directly after
  `makeRunDirectory`, stop it directly before the end is written into `state.json` and in a `finally`, as the
  approach says, and say in its doc comment that the run's directory holds a heartbeat while the run lasts and that
  every file of it is written whole. Run `npm test`: every test passes, those of the run's output, its exit statuses,
  its `state.json`, its signals and its time limits among them, and `a run writes nothing outside .orchestrator`
  (R2, R3, R5, R6, R7, R8, R13)
- [ ] In `README.md`, "What .orchestrator holds": add `heartbeat` to the list of a run's directory, as one instant in
  UTC to the second, as `2026-10-23T10:00:05Z`, followed by a line break; written when the directory is made, before
  the first step, and then every 10 seconds while the run lasts, between steps and while a step runs, with
  `--follow` and without it, each write replacing the instant before it; on the clock of the machine the command runs
  on, which in a unit run is the container's; written no more once the end is in `state.json`, and left holding its
  last instant. Say that every file of a run's directory is written whole, under a name that opens with `.` in the
  same directory until it takes its own, so that a program that reads one reads what it held before a write or what
  the write gives it, and that no such file is left once the run ended (R9)
- [ ] In `README.md`, after that list, say how a program that reads the directory tells a run's state: a run whose
  `state.json` holds an end has ended, whatever `heartbeat` holds; a run without an end whose `heartbeat` is at most
  60 seconds old has a sign of life; any other run without an end, one without a `heartbeat` among them, has had none
  for over 60 seconds, and is called stale. Then say what a stale run can be: one whose process ended without writing
  its end, a signal among the ways; one on a machine that sleeps, which gives signs of life again once it wakes; one
  whose clock is behind the reader's by more than the margin, as a container's in a virtual machine can be. Say that
  the harness of a step can still be running when the command's own process was killed, and that the run then shows
  as stale. Write it as what there is and how to read it, with no why of the change (R10, R11)

## Verification

- [ ] `npm test` passes
- [ ] Every line of the changed files is at most 120 characters, as `awk 'length > 120'` on each shows nothing
- [ ] A run on the host of a one-step definition shows `heartbeat` changing every 10 seconds while the step runs,
  read with `cat` from a second terminal, and no name that opens with `.` in the run's directory once it ended
- [ ] `npm run check-changes` passes on the committed branch
- [ ] Each requirement of the spec, R1 to R13, is delivered by a ticked task above

## Commit Points

- [x] `feature-0079 Name a run's instant in one place`: the first task, which changes no behavior
- [x] `feature-0079 Write a file of a run's directory whole`: the second and third tasks
- [ ] `feature-0079 Beat a heartbeat`: the fourth and fifth tasks
- [ ] `feature-0079 Keep a heartbeat in a run's directory`: the sixth and seventh tasks
- [ ] `feature-0079 Document the heartbeat and whole files`: the two tasks of `README.md`
