---
kind: feature
status: in-progress
timestamp: 2026-10-23T14:24:42Z
---

# 0081 The runs of a project can be listed

## Log

- 2026-10-23T14:24:42Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `9a53305`, on the human's request for a command `agentrite runs` that lists the runs of the orchestrator
  with their state, for a graphical interface of its own project, the third of three units after 0079 and 0080. Made
  the unit as a feature. Numbered 0081: the highest number in `changes/` is 0080. Read "agentrite units", "The
  orchestrator" and "Exit statuses" of `README.md`, the spec of 0077, and how `orchestrateCommand` writes `state.json`
  and `stepLine` and `endLine` name a step and an end. Wrote `spec.md`. The status is `draft`
- 2026-10-23T14:53:09Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question how the runs
  of the variants of a unit are told apart, and the human's choice to have both the variant in the name of a run's
  directory and the branch in `state.json`, and to fold this into this unit. Read "Two implementations of one unit" of
  `SANDBOX.md`. Added requirements 1 to 5 on the branch and the variant of a run, the variant in the listing and in
  the JSON document, its documents and tests, its decisions and a filter by variant as item 2 of "Beyond the
  request", and renumbered the rest. The status is `draft`
- 2026-10-23T15:47:23Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's question how the
  followed output of unit 0080 is found from the listing, and the human's choice of the path of the current step's
  file over the files of every step. Added `followed` to the JSON document, what the command reads of the file, its
  tests and decision, and the files of every step as item 4 of "Beyond the request". The status is `draft`
- 2026-10-23T16:30:14Z [human] approved the spec. The status is `approved`
- 2026-10-23T17:14:02Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0081-the-runs-of-a-project-can-be-listed` at `d01d9ae`, wrote `plan.md`. Read the branch with
  `git symbolic-ref`, and planned a git that cannot be run as a failure that exits 1 before anything is written, since
  requirement 1 gives `null` only for a detached `HEAD` and a root in no repository. The status is `approved`
- 2026-10-23T17:18:45Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on
  `feature-0081-the-runs-of-a-project-can-be-listed`. The status is `in-progress`
- 2026-10-23T17:29:28Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built every task of `plan.md` in
  the five commit points, the last of them `28023da`. Two things the plan left to the build, neither a change of it:
  `runLine` is not exported, its work being done inside `runsListing`, since the columns need the widest value of the
  listing; and `parseDefinition` takes `roles` and `harnesses` as optional and judges a step's role and harness as
  non-empty strings without them. `npm test` reported 1135 passing and 0 failing on `28023da`, and `npm run
  check-changes` passed. Every line of the changed files was checked to fit 120 characters. Not checked: the sandbox's
  unit run of an orchestrator on a variant's branch, which the tests stand in for with a git repository in a temporary
  directory
- 2026-10-23T17:31:59Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on the human's request, removed
  the Co-Authored-By trailer that the first commit of the branch carried, by rewriting the nine commits of the branch
  from it on. The commits were `f13c1da` to `aef3ed5`, and the hashes of this record were updated to them. The status is
  `in-progress`
- 2026-10-23T17:36:00Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0081 at
  `352c8108e4fe4d075ddb9efc230bbe57ea42f83e`, against merge base `d01d9ae` with `origin/master`. Returned S1 in
  `.reviews/0081-the-runs-of-a-project-can-be-listed/review-20261023T173600Z.md`. `npm test` reported 1135 passing,
  0 failing and 30 Docker-dependent skips; `npm run check-changes` and `git diff --check` passed. Docker-backed
  sandbox execution, real model-provider sessions and historical test-first ordering were not verified.
- 2026-10-23T17:50:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, accepted S1 of
  `.reviews/0081-the-runs-of-a-project-can-be-listed/review-20261023T173600Z.md` and fixed it in `a6b6233`: `readRuns`
  leaves out a run only when `state.json` is absent (`ENOENT`), and refuses a `state.json` that is a directory or
  whose stat fails otherwise, naming the path. Added a test for a directory and for a symbolic link loop (`ELOOP`).
  `npm test` reported 1136 passing, 0 failing and 30 skipped on `a6b6233`. Not checked: a real `EACCES`. The status is
  `in-progress`
