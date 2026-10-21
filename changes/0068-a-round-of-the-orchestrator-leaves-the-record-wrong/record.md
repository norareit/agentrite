---
kind: bug
status: in-progress
timestamp: 2026-10-21T14:10:24Z
---

# 0068 A round of the orchestrator leaves the record wrong

## Log

- 2026-10-21T14:10:24Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `8b1b4ec`, on the human's request after the check by hand of a second round that the amendment of 0065
  records: that the default definition's implementer prompt be fixed so that the record names the definition's
  acceptance and the status stays `in-progress`, and that the reviewer's role file have it commit its record entry.
  Made the unit as a bug. Numbered 0068: the highest number in `changes/` is 0067. Read the run's outcomes and the
  record it left in the scratch project, `roles/reviewer.md`, "Finishing" of `roles/implementer.md`, `outcomeRequest` of
  `scripts/agentrite-outcome.mjs`, the orchestrator's section of `README.md`, and the records of 0030 and 0034,
  where the implementer committed a reviewer's entry later. Wrote `spec.md`. The status is `draft`
- 2026-10-21T14:23:33Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decision to take item 1
  of "Beyond the request" into the unit: added requirement 5, that the reviewer commits nothing and says so when
  `record.md` holds uncommitted changes besides its entry, renumbered the requirements after it, recorded why under
  "Decisions", and left "Beyond the request" with none. The status is `draft`
- 2026-10-21T14:23:43Z [human] approved the spec. The status is `approved`
- 2026-10-21T14:27:48Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `bugfix-0068-a-round-of-the-orchestrator-leaves-the-record-wrong` from `master` at `5178eab` and wrote `plan.md`
  against it. The fix takes more than a couple of steps: three tests that pin the old prompt, the request and its
  tests, the README, the reviewer's role file, and a check by hand. The reviewer's new description also changes the
  two reviewer fixtures under `tests/fixtures/`, which the suite compares with the role file's description, while
  the wrappers at the root stay as the installed release writes them. The status is `approved`
- 2026-10-21T14:30:25Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `bugfix-0068-a-round-of-the-orchestrator-leaves-the-record-wrong` at `3e3c638`, began the work. The status is
  `in-progress`
- 2026-10-21T14:33:56Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did the first five tasks. The three
  tests that pin the default implementer prompt failed on the old prompt, and the new test of the request, with the
  request's expected text, failed on the old `outcomeRequest` of `3e3c638`; all of them pass after the change.
  `npm test` passes on the tree of this commit, 921 tests. One run before it, on a tree between tasks, failed once in
  `tests/sandbox-variant.test.mjs` (`a unit run and its variants run at once`) on a container still running from
  another test, and passed on the next run; it touches nothing of this unit. "A run neither sets the unit's status nor
  commits" in "How a run ends" still holds beside the new paragraph, since the request asks the step and the command
  itself sets nothing
- 2026-10-21T14:36:29Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, did the reviewer's tasks: the
  description, "Output", "You change nothing under review", "Saving them is where your writing stops" and "Record
  that you reviewed" of `roles/reviewer.md`, and the description of both reviewer fixtures. The example of a prefix in
  the role file is `feature-0012`, as `process.md` gives it, and not this unit's, since the file serves every project.
  The description is folded as `plannedFiles` folds it, filling each line to 120 characters, which
  `plannedFiles of both harnesses, from the kit role files, is the eight fixtures byte for byte` checks besides the
  test the plan names. `npm test` passes on the tree of this commit, 921 tests

## Amendments
