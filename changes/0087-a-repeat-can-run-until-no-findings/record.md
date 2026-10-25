---
kind: feature
status: in-progress
timestamp: 2026-10-25T00:11:13Z
---

# 0087 A repeat can run until no findings

## Log

- 2026-10-25T00:11:13Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `3617c51`, on the
  human's request that a repeat use its rounds to fix non-blocking findings too, after the orchestrator run of unit
  0084 ended its repeat on a review with only a non-blocking finding. Made the unit as a feature, since how a repeat
  ends and what the end report holds are decisions. Numbered 0087: the highest number in `changes/` is 0086. Read the
  validation of `until` in `scripts/agentrite-definition.mjs`, `runRepeat`, `endLine` and `lastStepLines` in
  `scripts/agentrite-orchestrate.mjs`, the tests of both, and "The definition" and "How a run ends" of `README.md`.
  Wrote `spec.md`. The status is `draft`
- 2026-10-25T00:11:13Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, read requirement 6 as naming the
  step whose outcome holds the open findings, and as listing them however the run ends after the repeat, since items
  may follow the repeat and the end report otherwise takes only the last step's outcome. Added requirement 11, a
  test of the command, since the standards ask for end-to-end coverage of a feature that can be tested end to end
- 2026-10-25T11:05:22Z [human] approved the spec. The status is `approved`
- 2026-10-25T11:08:59Z [Claude Code, anthropic/claude-opus-5-5] as the planner, cut
  `feature-0087-a-repeat-can-run-until-no-findings` from `master` at `3837f99` and wrote `plan.md`. Found the tests
  that rely on the default ending its repeat at a review with only a non-blocking finding by a probe of the change on
  a scratch copy of the tree, and listed them in the plan. Placed the non-blocking findings still open after the
  lines of the last step and before `After the run:`, which requirement 9 leaves to the README to state. The status
  stays `approved`
- 2026-10-25T11:10:25Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `feature-0087-a-repeat-can-run-until-no-findings` at `f9451eb`, began the work. Ticked the plan's first commit
  point, which the planner made as `f9451eb`. The status is `in-progress`
- 2026-10-25T11:10:25Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote the two tests of the first
  task and saw them fail with `node --test tests/agentrite-definition.test.mjs`, 19 passed and 2 failed, then took
  both values of `until` in `scripts/agentrite-definition.mjs`, after which the file reported 21 passed, 0 failed
- 2026-10-25T11:14:10Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote the unit tests of the
  repeat for both values of `until` and of the end report, through `untilRepeat`, which builds `UNTIL_NO_FINDINGS` and
  `UNTIL_NO_BLOCKING`, and `reportOf` passing `run.unfixed`. With `node --test` on the test file and only the tests
  of `until` and of the report selected, 20 failed and 6 passed: the new tests, and the earlier tests of the report,
  which failed on the new parameter of `endReport`. The run-out case of the report is tested on `UNTIL_NO_FINDINGS`
  rather than on the default, so that it does not depend on the default's `until`. Then made `runRepeat`, with
  `untilHolds`, `orchestrate`, `findingLine`, `unfixedLines`, `lastStepLines` and `endReport` as the plan gives, and
  passed `unfixed` in `scripts/agentrite.mjs`. The test of the command was written after the code, as the plan orders
  it, and was seen failing afterwards by running it against the two scripts as committed at `1b350e5`, which made 1
  call where 2 were expected; with the change it passes. The orchestrate and definition test files reported 131
  passed, 0 failed
