---
kind: feature
status: draft
timestamp: 2026-11-18T15:19:51Z
---

# 0112 Give a run of a harness an effort

## Log

- 2026-11-18T15:19:51Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `26438ef`, on the human's request for a feature unit that adds an optional effort to a run, and that
  makes how a harness takes it part of what adding a harness takes. Numbered 0112: the highest number in `changes/`,
  on every local branch, is 0111. Read the section of `agentrite run` of `COMMANDS.md`, "The definition" and "How a
  run ends" of `ORCHESTRATOR.md`, "Adding a harness" of `CONTRIBUTING.md`, `harnessCommand` of
  `scripts/agentrite-run.mjs`, the harness contract and the three modules of `scripts/harnesses/`, and the help of
  the installed `claude`, `opencode run` and `codex` for their options of an effort. Wrote `spec.md`. The status is
  `draft`
- 2026-11-18T16:18:33Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `8523b8e`, on the human's
  decisions on the spec: R4 now refuses `--effort` without `--model`, since a level is meant for a known model, with
  the decision that says why. The human took BTR1 with levels of their own, `medium` for the planner on Opus and the
  implementer on Sonnet and `high` for the reviewer on GPT Sol, which is now R14, with its decision, its place in R13
  and its test in R15, and the non-goal it contradicted removed. The human declined BTR2. The status is `draft`

## Amendments
