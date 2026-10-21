---
kind: feature
status: implemented
timestamp: 2026-10-21T14:18:50Z
---

# 0069 A time limit on a step of the orchestrator

## Log

- 2026-10-21T14:18:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `8a85e9c`, on the human's request to specify the time limit on a step that 0065 left for a later unit,
  with a brief that the implementer of 0065 wrote of where it fits in the code and what was open. Made the unit as a
  feature. Numbered 0069: the highest number in `changes/` is 0068, which the brief did not know of. Read the non-goals
  of 0065, `judgeStep` and `endLine` of `scripts/agentrite-orchestrate.mjs`, `runStep` and `run` of
  `scripts/agentrite.mjs`, and "Stopping a run" of "Running a role" in `README.md`. Found that a step in a process group
  of its own, which ending its harness takes, no longer gets the terminal's Ctrl-C, and specified that the command
  passes the signals on. Wrote `spec.md`. The status is `draft`
- 2026-10-21T15:03:35Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decisions that
  `timeoutMinutes` is bounded and that both items of "Beyond the request" stay out of the unit: bounded the key at
  1440 minutes, a day, in requirements 1 and 2, and recorded why under "Decisions". The status is `draft`
- 2026-10-21T17:33:22Z [human] approved the spec. The status is `approved`
- 2026-10-21T17:37:41Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `feature-0069-a-time-limit-on-a-step-of-the-orchestrator` from `master` at `4d70368` and wrote `plan.md`. Found
  that a step runs with `spawnSync`, which blocks the command while the step runs, so the plan opens with a
  refactoring that runs the steps asynchronously. Showed on the host, with a probe, that an ignored `SIGTERM`
  survives `exec` in a group of its own and that a re-sent signal ends Node.js by that signal once its listener is
  gone, which the plan's approach records. The plan has the command end by the signal it passed on, as it did
  before the unit, and leaves `SANDBOX.md` as it is. The status is `approved`
- 2026-10-21T17:40:21Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host, on
  `feature-0069-a-time-limit-on-a-step-of-the-orchestrator` at `d48b0e5`, began the work. The status is
  `in-progress`
- 2026-10-21T17:58:32Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built task groups 1 to 4 of the
  plan, a commit each, up to `fe0beca`. The end-to-end test of the signals failed before a step had a group of its
  own, with the harness left running, and the two of the time limit failed before the clock, with the step running
  its full 60 seconds; all pass after. `runStep` hands the process to a function of its own, `runGrouped`, which
  keeps the clock and the grace, so that `runStep` stays at one level. `detached: true`, which the plan chose, makes
  the step's `agentrite run` the leader of a session of its own on Linux, and so of a group of its own, and leaves
  the harness with no controlling terminal; the check by hand covers whether a harness works so. The time of a step
  that ran out ends when its `agentrite run` ends, which `SIGTERM` ends at once, so the line of a harness that ignores
  `SIGTERM` gives about the limit and not the grace, as requirement 3 says. "How a run ends" of `README.md` also says
  that the line after a step gives that it ran out of time. `npm test` on the tree of `fe0beca` reports 931 tests, all
  of which pass and none skipped, and `npm run check-changes` passes on it. In two of the runs of the whole suite
  before it, `a unit run and its variants run at once` of `tests/sandbox-variant.test.mjs` failed once, and once in
  three runs of that file alone on this branch; it passed in six more runs of that file alone, on this branch and on
  `master` each. It loads no file this unit changes, and was not looked into further
- 2026-10-21T19:33:05Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's decision that the
  check by hand is the implementer's, as that of 0065 was, and not the human's, made it so in task 5 of `plan.md` and
  ran it. A project under the scratch directory held the kit of `852d9b2` from the tarball of `npm pack`, the
  harnesses of `init --no-sandbox claude opencode` and the approved unit `0001-check`. Each run was
  `npx agentrite orchestrate 0001 --definition <file>`, started by a script on a pseudo-terminal of its own, as an
  interactive shell starts it, with Claude Code 2.1.306 and OpenCode 1.19.3. With a planner step of `timeoutMinutes`
  of `0.25`, on `claude-opus-5-5` and on `openai/gpt-6.1-sol`, each run exited 3 after 15 seconds, the line after the
  step and the end report saying that it ran out of time and past its limit of 0.25 minutes, that the harness gave
  no final response, and `pgrep -f` found no process of the harness after it. Three seconds into each step, the
  harness was in state `S` in the session and group of its `agentrite run`, with no controlling terminal, and its
  standard error was the pseudo-terminal, which the command held as its controlling terminal. The Claude Code
  session of the run that ran out of time is in `state.json` and in the harness's own logs, with 11 tool uses, and
  OpenCode lists sessions of its runs, titled from the unit. Without the key, Ctrl-C written to the terminal 12
  seconds into the step ended the run by `SIGINT` with each harness, and `pgrep -f` found no process of the harness
  after it. `npm test` on the tree of this entry, with its own code that of `852d9b2`, reports 931 tests, all of
  which pass and none skipped
- 2026-10-21T19:40:43Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, performed a full review of unit 0069 at
  `06f80571363b719dabd418b9624fddf03d1b48f6`, against merge base `4d703688b1ec7c3da5bf1335f6372291daa31f51` with
  `master`, and returned S1 and C1. Saved the complete findings in
  `.reviews/0069-a-time-limit-on-a-step-of-the-orchestrator/2026-10-21T19-39-38Z-opencode.md`. Ran `npm test`: 931
  tests passed, none skipped; `npm run check-changes` and `git diff --check master...HEAD` passed. An in-memory
  process-lifecycle probe reproduced S1. Did not replay or independently verify the historical real-harness
  pseudo-terminal observations, and did not run the suite on macOS
- 2026-10-21T19:45:37Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, applied both findings of the
  review, and added them to `plan.md` as task group 6. S1: the timer of the limit kept running after the step's
  `agentrite run` exited, while a process it left held its output open, so that a step that ended in time could be
  taken as one that ran out of time, against requirement 3. The new end-to-end test, a step with a limit of `0.02`
  minutes whose fake exits at once and leaves a sleep of 3 seconds holding its output, failed with `ran out of time
  after 0m 00s`; `runGrouped` now clears the timer at `exit` and keeps a grace already started, and the test passes,
  in `315716d`. C1: `gone` took a missing `/proc` entry as a process gone, which on macOS holds for every process;
  it now reads `/proc` on Linux only, in `1455dc4`. Not run on macOS. `npm test` on the tree of `1455dc4` reports
  932 tests, all of which pass and none skipped. The human decides S1, which blocks
- 2026-10-21T19:50:38Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, performed a delta review of unit 0069 at
  `e47b7e42f1cc7d251164367711ed2161d66a76b9`, from the previous review's commit
  `06f80571363b719dabd418b9624fddf03d1b48f6`, covering the corrections for S1 and C1 and the intervening diff.
  Returned no new findings. Saved the complete review in
  `.reviews/0069-a-time-limit-on-a-step-of-the-orchestrator/2026-10-21T19-50-08Z-opencode.md`. Ran `npm test`: 932
  tests passed, none skipped; `npm run check-changes` and `git diff --check 06f8057..HEAD` passed. Did not run on
  macOS or replay the historical real-harness terminal checks
- 2026-10-21T19:53:17Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's decision after the
  re-review that S1 is fixed by `315716d` and the unit is implemented, with every task of `plan.md` ticked. The
  status is `implemented`

## Amendments
