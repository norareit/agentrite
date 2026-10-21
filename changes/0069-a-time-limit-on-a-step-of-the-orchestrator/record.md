---
kind: feature
status: in-progress
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

## Amendments
