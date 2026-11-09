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

## Amendments
