---
kind: feature
status: in-progress
timestamp: 2026-11-09T13:08:29Z
---

# 0103 The kit's code on the host and what a unit run brings back

## Log

- 2026-11-09T13:08:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `fa0f21f`, on the
  human's request to specify how the kit's code on the host treats what a unit run brings back, as a feature by
  "Security findings" of `AGENTS.md`. Read "What the sandbox defends against" and "Where things are kept on the host"
  of `SANDBOX.md`, "What .orchestrator holds" and "On the host and in the sandbox" of `ORCHESTRATOR.md`, "agentrite
  orchestrate" of `COMMANDS.md`, the run, resume and file-writing code of `scripts/agentrite.mjs`, the parsing of a
  run in `scripts/agentrite-runs.mjs`, the session arguments of the three harnesses, and the landing of a clone in
  `container/unit-clone.sh`. Wrote `spec.md`. The status is `draft`
- 2026-11-09T17:36:52Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `c2c262d`, on the
  human's decision to keep the record of runs rather than rely on the form of a session alone, added to requirement
  12 that `ORCHESTRATOR.md` and "The home volume" of `SANDBOX.md` say that removing the project's home volume
  leaves no run that stopped in the sandbox before it to resume. The status is `draft`
- 2026-11-09T17:38:51Z [OpenCode, openai/gpt-6.1-sol] as the spec-reviewer, fully reviewed `spec.md` and
  `record.md` at `9153572b56a4eeca1554f51e1a79a43a19152863`. Findings: F1 and F2, saved in
  `.reviews/0103-host-code-and-what-a-unit-run-brings-back/spec-review-2026-11-09T173851Z.md`.
  Could not independently verify the session IDs emitted by live runs of all three harnesses against the pattern.
- 2026-11-09T17:41:42Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `ba8d32f`, took F2 of
  the spec review: requirement 12 now has `COMMANDS.md` list `XDG_STATE_HOME` among what `agentrite orchestrate`
  reads. F1 is put to the human. The status is `draft`
- 2026-11-09T17:43:43Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `e1f979f`, took F1 of
  the spec review as the human decided: requirement 1 now keeps a value from being an option by where it stands
  or by an exact pattern, and lets a prompt reach a harness only out of a file the record vouches for;
  requirement 10 has `agentrite run` pass the model as `--model=<model>`, requirement 12 documents it, and
  requirement 16 tests it; a new decision says why the model and the prompt are not given a pattern, and the
  decision on reading the definition no longer claims to cover them. The status is `draft`
- 2026-11-09T18:05:43Z [OpenCode, openai/gpt-6.1-sol] as the spec-reviewer, reviewed `spec.md` and `record.md`
  at `f557abb5176d78cd3ab905aab07ca59ac7de8312` as a delta from `9153572b56a4eeca1554f51e1a79a43a19152863`.
  No findings, saved in
  `.reviews/0103-host-code-and-what-a-unit-run-brings-back/spec-review-2026-11-09T180543Z.md`.
  Could not verify live model selection in every harness mode; model syntax was checked through help only.
- 2026-11-09T23:34:53Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `f557abb`, on the
  human's request, made two points of the record explicit: requirement 8 takes each digest of the bytes the
  command writes and never of a file read back, and requirement 9 has a resume read each file once and compare
  and parse the same bytes. The status is `draft`
- 2026-11-09T23:35:00Z [human] approved the spec. The status is `approved`
- 2026-11-09T23:41:16Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0103-host-code-and-what-a-unit-run-brings-back` cut from `master` at `88de2df`, wrote `plan.md`. Confirmed,
  as the decisions ask, that the session ids of Claude Code, OpenCode and Codex match the pattern of requirement 11,
  and that Claude Code 2.1.321, OpenCode 1.19.3 and Codex 0.167.0 each take `--model=<model>`. Read the sentence of
  requirement 13 that the wrapper runs no program but git as covering what reads the clone's files, so the scratch
  directory of the comparison is still made with `mktemp` and removed with `rm`. The status is `approved`
- 2026-11-09T23:46:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on
  `feature-0103-host-code-and-what-a-unit-run-brings-back` at `058902f`, corrected the spec as the human decided:
  requirement 14 now lists a regular file whose executable bit differs from the commit, unless `core.fileMode` of the
  host's repository is `false`, requirement 16 tests it, and a new decision says why. `plan.md` still says that a mode
  change alone is not listed, and is the planner's to bring in line. The status is `approved`
- 2026-11-09T23:48:53Z [Claude Code, anthropic/claude-opus-5-5] as the planner, on
  `feature-0103-host-code-and-what-a-unit-run-brings-back` at `db10ee8`, brought `plan.md` in line with the corrected
  requirement 14: the comparison checks the executable bit of a regular file unless `core.fileMode` of the host's
  repository is `false`, and the test task of requirement 14 covers it. The status is `approved`
- 2026-11-09T23:57:11Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, began the work on
  `feature-0103-host-code-and-what-a-unit-run-brings-back` at `bb80a57`. The status is `in-progress`
- 2026-11-10T00:26:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, put a session that is not of the
  form aside in the `run` effect of `runPrepared` and not in its `ended` effect, as the plan had it: `orchestrate` keeps
  the session of a result for later steps before `ended` is called, so only the `run` effect keeps it from them. Such a
  result now gives `null`, which also puts aside an earlier session of the same role and harness, so the next step
  starts a session of its own as requirement 11 says. Added that work to `plan.md` as a task of its own
- 2026-11-10T00:26:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, read the plan's reads of a resume as
  the one reading that works with its line that `agentrite runs` keeps its reads: the resume reads `state.json`,
  `definition.json` and `heartbeat` through `readRunBytes` and `readRunHeartbeat`, and `runTexts` and `readHeartbeat`
  stay as they were for `agentrite runs`
- 2026-11-10T00:26:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, gave `hash-object --stdin-paths` the
  absolute paths of the clone's files, which never open with `"`, so only a path that holds a line break is hashed by a
  call of its own. The comparison now lists the committed paths in the order of the tree and then the files not
  committed, and prints a path that holds a control character quoted by `printf %q`, as git's own quoting printed such a
  path before. The fake harness of `tests/agentrite-orchestrate.test.mjs` gained `before-<n>`, by which the test of
  requirement 7 replaces the run's directory while its step runs
- 2026-11-10T00:26:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, checked that the test of a filter
  fails against the comparison it replaces, with the old `container/unit-clone.sh` in the tree, and that the tests of
  the executable bit pass on both, since the old comparison listed a mode change too. `npm test` passes on `4b90528`,
  1793 tests and none failing, and `npm run check-changes` passes there. No test wrote a record outside its own state
  directory. Not checked: a run of a real harness, and the wrapper on macOS and its bash 3.2, which the comparison
  avoids features beyond. Nothing of the unit is pushed. Handed over for review. The status is `in-progress`
- 2026-11-10T00:33:42Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, fully reviewed unit 0103 at
  `37a2593376ace41a2ef2f4cf4d35bca133e023c4` against merge base `88de2dfc3198758971a3ed8d351632f32e64602b`.
  Returned S1, saved in
  `.reviews/0103-host-code-and-what-a-unit-run-brings-back/review-2026-11-10T003342Z.md`.
  Ran `npm test`, `npm run check-changes` and `git diff --check master...HEAD`; all passed. Could not independently
  verify live model requests through the three harnesses or the wrapper on macOS and bash 3.2.
- 2026-11-10T00:43:20Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, reproduced S1 of the review: with a
  harness that ignores `SIGTERM`, the test of requirement 7 ended only when the harness's 30 second sleep did. The
  human accepted S1, and the fix is added to `plan.md` as a task. The status is `in-progress`

## Amendments
