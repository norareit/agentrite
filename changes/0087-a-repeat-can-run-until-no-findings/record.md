---
kind: feature
status: approved
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
