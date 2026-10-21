# 0069 A time limit on a step of the orchestrator

## Approach

Written against `4d70368` on `feature-0069-a-time-limit-on-a-step-of-the-orchestrator`. Before the work, `npm test`
on the Linux host reports 921 tests, all of which pass and none skipped. Every commit point below keeps the suite
green.

Today the command runs a step with `spawnSync`, which blocks the event loop: while a step runs, the command can
neither keep a time nor act on a signal. Both requirements of the unit need the step started with `spawn` and
waited on, so the work opens with a refactoring that makes the running of a step asynchronous and changes nothing
else. The rest is built on it in four steps, each a commit of its own:

1. **Asynchronous steps.** `orchestrate` awaits `effects.run`, `runStep` of `scripts/agentrite.mjs` uses `spawn`,
   and the command's `run` may return a promise. A refactoring, with no change of behavior
2. **A group of its own, and the signals passed on** (R9, R10, R12)
3. **The key** `timeoutMinutes` of a step (R1, R2, R10, R11)
4. **The time limit**: the clock, `SIGTERM` and `SIGKILL`, the stop of its own, its line and its end report (R3 to
   R8, R10 to R12)
5. **The check by hand** with real harnesses, which the spec leaves to the plan (R9)

### Verified while planning

On the Linux host, with Node.js as the suite runs it, a probe in the scratch directory showed the two mechanics the
plan is built on:

* A child started with `spawn(..., { detached: true })` is the leader of a group of its own, and
  `process.kill(-pid, signal)` reaches it. A `sh -c "trap '' TERM; exec sleep 30"` in that group was still alive
  half a second after `SIGTERM` to the group, so an ignored `SIGTERM` survives `exec`, and `process.kill(-pid, 0)`
  tells that the group still has a process. `SIGKILL` to the group then ended it
* A listener added with `process.once('SIGTERM', ...)` that sends `SIGTERM` to its own process ends the process by
  that signal, exit status 143 in the shell: once the listener is gone, Node.js restores the signal's default

### Decided here, so that the implementer does not re-derive it

**How the command ends on a signal (R9).** After it sends the signal on to the step's group, the command sends the
same signal to itself, with no listener left, so that it ends by that signal as it did before this unit. It writes
nothing more to `state.json` and prints no end report, as before. Between two steps, where no step runs, the
listener only sends the signal to the command itself.

**What a step that ran out of time is read as (R5).** `orchestrate` gives it the reading `{ kind: 'none' }`,
whatever it printed. That is what makes the effect `ended` write its final response as `response.md` and no
`outcome.json`, and what makes the end report give the path of the response, or that there was none, as for a step
without an outcome. `judgeStep` judges `timedOut` before everything, so the reading is never judged for it.

**When the step's promise settles (R3, R4).** The time of a step, `milliseconds`, is taken at the `exit` event of its
`agentrite run`. The promise settles at `close`, once its standard output is read. For a step that ran out of time,
it settles no earlier than the end of the grace, unless the group has no process left at `close`: a harness that
ignores `SIGTERM` keeps the pipe open, and the command must not end before it sends `SIGKILL`. The timers are
cleared when the promise settles.

**The wording of the lines (R6).** The line after the step gives `ran out of time` in the place of its outcome, as
`step 1, implementer, claude, claude-sonnet-5-5: ran out of time after 30m 00s`. The line of the end report is
`Step 1 stopped the run: it ran past its time limit of 30 minutes.`, with `minute` for a limit of exactly 1, and the
number as JavaScript writes it, so `0.05 minutes` for a fraction.

**A fake harness that waits.** The fake of the end-to-end tests gets two files per call: `wait-<n>`, the seconds it
waits, and `ignore-term-<n>`, whose presence makes it ignore `SIGTERM`. It writes its process id to `pid-<n>` and
then `exec`s `sleep`, so that the harness is one process whose id the test knows, and an ignored `SIGTERM` holds for
the `sleep` too. The PATH of the tests holds only the fakes, so `project()` links `bin/sleep` to the `sleep` that
`command -v sleep` gives in the suite's own environment. `exec` rather than `sleep &` is needed: a job a
non-interactive `sh` starts in the background ignores `SIGINT`, and would survive a Ctrl-C that the harness would not.

**When a process is gone.** A test takes the harness's process as gone when `process.kill(pid, 0)` throws `ESRCH`,
or `/proc/<pid>/stat` gives it the state `Z`, a zombie not yet reaped by whatever adopted it. It polls for up to 5
seconds, since the reaping is not instant.

**`SANDBOX.md` stays as it is.** Nothing a developer does with the sandbox changes: a unit run of the orchestrator is
stopped as before, and the key is described where the definition is, in `README.md`.

## Files

- `scripts/agentrite-orchestrate.mjs`: `orchestrate` asynchronous; `Result` gains
  `timedOut`, `Stop` gains `'timeout'`; `judgeStep`, `stepResult` and `endLine` judge and word it
- `scripts/agentrite-definition.mjs`: `timeoutMinutes` among the keys of a step, judged
- `scripts/agentrite.mjs`: `runStep` with `spawn`, a group of its own, the time limit and its grace; the signals
  passed on in `orchestrateCommand`; `Command.run` may return a promise, awaited at the entry point
- `tests/agentrite-orchestrate.test.mjs`: the unit tests awaited and extended, the fake that waits, the end-to-end
  tests of R12
- `tests/agentrite-definition.test.mjs`: the judging of `timeoutMinutes`
- `README.md`: "The orchestrator" and "agentrite orchestrate"
- `changes/0069-a-time-limit-on-a-step-of-the-orchestrator/record.md`: the log

## Tasks

### 1. Asynchronous steps

- [x] In `scripts/agentrite-orchestrate.mjs`, make `orchestrate` and `runRepeat` `async`, with `run` of `Effects`
  typed as `(planned: Planned) => Promise<Result>` and awaited in the inner `runStep`, and `orchestrate` returning
  `Promise<{ ran: Ran[], end: End }>`. Nothing else of the file changes (R9)
- [x] In `tests/agentrite-orchestrate.test.mjs`, make `runWith` `async`, its `run` return a promise, and every test
  that calls it `async` and await it. The suite passes unchanged otherwise (R9)
- [x] In `scripts/agentrite.mjs`, rewrite `runStep` with `spawn` of `node:child_process`, with the same arguments,
  `cwd` and `stdio: ['ignore', 'pipe', 'inherit']`, collecting standard output as UTF-8, and returning a promise of
  the same `Result`: `status` and `signal` from `close`, `milliseconds` taken at `exit`, and a rejection on `error`.
  `orchestrateCommand` becomes `async` and awaits `orchestrate`. The `Command` typedef's `run` returns
  `number | Promise<number>`, and the entry point awaits it inside the `try` that already prints a failure and exits
  1. The end-to-end tests pass unchanged (R9)

### 2. A group of its own, and the signals passed on

- [x] Add the end-to-end test first: for each of `SIGINT`, `SIGTERM` and `SIGHUP`, start `agentrite orchestrate`
  with `spawn` on a definition of one step whose fake waits 60 seconds, wait until `pid-1` exists, send the signal to
  the command's process alone, and assert that the command ended by that signal and that the harness's process is
  gone, as "When a process is gone" above says. This needs the fake that waits, and the `bin/sleep` link in
  `project()`, as the Approach decides (R9, R12)
- [x] In `runStep`, start the step with `detached: true`, so that its `agentrite run` and the harness are a group of
  their own, for every step (R9)
- [x] In `scripts/agentrite.mjs`, add `signalGroup(group, signal)`, which sends `signal` to `-group` and ignores
  `ESRCH`, and `groupAlive(group)`, true while `process.kill(-group, 0)` does not throw `ESRCH` (R4, R9)
- [x] In `orchestrateCommand`, keep the group of the step that runs, which `runStep` sets when it starts the step and
  clears when its promise settles, and add, for `SIGINT`, `SIGTERM` and `SIGHUP`, a listener with `process.once`
  that sends the signal on to that group, when there is one, and then to the command itself, as the Approach decides
  (R9)
- [x] In "agentrite orchestrate" of `README.md`, say that every step runs in a process group of its own, and that
  `SIGINT`, `SIGTERM` and `SIGHUP` sent to the command, as Ctrl-C on the terminal and `kill <pid>` do, are sent on to
  the step that runs, after which the command ends by the same signal (R10)

### 3. The key

- [x] In `tests/agentrite-definition.test.mjs`, change `STEP_KEYS` to the new sentence, and add tests that a step
  with `timeoutMinutes` of `0.05`, `1`, `30` and `1440` is taken with the value, in a repeat and outside one, that a
  step without it has no such key, and that `0`, `-1`, `1440.5`, `1441`, `"30"`, `true`, `null`, `[]` and `{}` are
  refused with `steps[0].timeoutMinutes is <value>. It must hold a number greater than 0 and at most 1440`, also at
  `steps[0].repeat.steps[0].timeoutMinutes` (R1, R2, R11)
- [x] In `scripts/agentrite-definition.mjs`, add `timeoutMinutes?: number` to the `Step` typedef, `timeoutMinutes`
  after `stopWhen` to the keys of `PLACES.step`, with the sentence `A step holds role, harness and model, and may
  hold prompt, stopWhen and timeoutMinutes`, and judge it in `parseStep` after `stopWhen`, with `valueAt` and a
  `holds` that takes a `number` greater than 0 and at most 1440 (R1, R2)
- [x] In "The orchestrator" of `README.md`, add `timeoutMinutes` to the bullet of what a step may hold, and a bullet
  of its own: a number greater than 0 and at most 1440, the minutes of a day, that a fraction is taken, and that a
  step without it has no time limit (R1, R2, R10)

### 4. The time limit

- [x] In `tests/agentrite-orchestrate.test.mjs`, give the results of `runWith` `timedOut: false` by default, and add
  unit tests: `judgeStep` gives `'timeout'` for a result that ran out of time, before a status other than 0, a
  `SIGTERM`, and every case of an outcome; a run whose step runs out of time with a done outcome in its response
  stops there with `by: 'timeout'`, the reading `{ kind: 'none' }` and nothing run after it, in a repeat too; the
  line after it reads `ran out of time after <duration>`; `endReport` gives the line of the Approach, for `30`, `1`
  and `0.05` minutes, then the path of the response, or that the harness gave none, and no summary (R5, R6, R11)
- [x] In `scripts/agentrite-orchestrate.mjs`, add `timedOut: boolean` to `Result` and `'timeout'` to `Stop`. In
  `judgeStep`, return `'timeout'` first. In `orchestrate`'s inner `runStep`, read `{ kind: 'none' }` for a step that
  ran out of time, with a comment that says why. In `stepResult`, give `ran out of time` first. In `endLine`, add the
  case `timeout` with the limit of `end.ran.planned.step`, as the Approach words it. Update the doc comment of
  `judgeStep` (R5, R6, R8)
- [x] Add the end-to-end tests, each on a definition written into the project and given with `--definition`: a step
  with `timeoutMinutes` of `0.02` whose fake prints a done outcome and waits 60 seconds ends by the time limit, exits
  3, its line after it says it ran out of time, the end report has the line of the case, the path of its
  `response.md`, which is written, and no summary, no `outcome.json` is written, `state.json` holds its session and
  `ended.status` 3, and no step after it ran; the same with `ignore-term-1` is ended by `SIGKILL`, taking at least
  10 seconds after the limit, and its harness is gone; a step with `timeoutMinutes` of `1` whose fake does not wait
  ends as it would without the key, and the run exits 0 (R3 to R8, R12)
- [x] In `runStep` of `scripts/agentrite.mjs`, for a step with `timeoutMinutes`, start a timer of that many minutes
  when the step starts. When it fires, set `timedOut`, send `SIGTERM` to the group, and start the grace of 10
  seconds, after which `SIGKILL` is sent when `groupAlive` holds. Settle the promise as the Approach decides, clear
  both timers, and return `timedOut` in the `Result`, `false` for a step without the key. Keep the grace of 10
  seconds in a named constant (R3, R4, R7)
- [x] In "The orchestrator" of `README.md`: in the bullet of `timeoutMinutes`, that when the step's time, from the
  start of its `agentrite run` to its end, reaches the limit, the command sends `SIGTERM` to the step's process
  group, and `SIGKILL` when a process of it is left 10 seconds later, and stops the run; in "The run stops ... when",
  the case as the first item, that it is judged before the others and that nothing is taken from the step's outcome;
  in the paragraph of the end report, that for a step that ran out of time it gives the limit and the path of the
  final response, or that there was none. The exit status 3 is already said of every stopped run (R10)

### 5. The check by hand

- [x] Run, on the host, in a project made for the check under the scratch directory, with the kit of this branch
  installed from the tarball of `npm pack` and an approved unit made for the check, `npx agentrite orchestrate <unit>
  --definition <file>` on a pseudo-terminal, as from an interactive shell, on a definition of one planner step with
  `timeoutMinutes`, once with `claude` and once with `opencode`, and see: that the harness's standard error is the
  terminal and the harness works headless, without being stopped by the terminal, in a group that is not the
  foreground one; that the run stops by the time limit; and, on a second run of each without the key, that Ctrl-C
  written to the terminal ends the run and `pgrep -f` finds no process of the harness after it. Log what was seen in
  `record.md` (R9)

### 6. The findings of the review

- [x] S1: in `tests/agentrite-orchestrate.test.mjs`, give the fake `linger-<n>`, a sleep of that many seconds left in
  the background holding its standard output, and add the end-to-end test that a step with `timeoutMinutes` of
  `0.02` whose fake exits at once and lingers 3 seconds keeps its outcome, and the run goes on and exits 0. In
  `runGrouped` of `scripts/agentrite.mjs`, clear the timer of the limit at `exit`, and keep a grace already started
  (R3, R4)
- [ ] C1: in `gone` of `tests/agentrite-orchestrate.test.mjs`, read `/proc` for the state `Z` on Linux only, and
  take the process as gone elsewhere only when `process.kill(pid, 0)` throws `ESRCH` (R12)

## Verification

- [x] `npm test` passes, with the tests of the unit among them, and none skipped on the host
- [x] `npm run check-changes` passes after the last commit
- [x] Every requirement 1 to 12 is traced by a task above, and the README sections of task groups 2 to 4 read as
  "The documents" of `AGENTS.md` asks: complete for the command, nothing of why, lines within 120 characters

## Commit Points

Each commit is made once `npm test` is green.

- [x] Before the work: `feature-0069 Plan the unit`
- [x] After task group 1: `feature-0069 Run the steps of the orchestrator asynchronously`
- [x] After task group 2: `feature-0069 Run each step in a process group of its own, and pass the signals on`
- [x] After task group 3: `feature-0069 Take timeoutMinutes on a step of a definition`
- [x] After task group 4: `feature-0069 End a step that runs past its time limit, and stop the run`
- [x] After the check by hand: `feature-0069 Log the check by hand of the time limit`
- [x] After S1: `feature-0069 End the time limit of a step when its agentrite run exits`
- [ ] After C1: `feature-0069 Take a process as gone by /proc on Linux only`
