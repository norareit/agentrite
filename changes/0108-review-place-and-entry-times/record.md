---
kind: bug
status: draft
timestamp: 2026-11-15T23:30:08Z
---

# 0108 Where reviews are saved and when log entries were written are left to each agent's guess

## Log

- 2026-11-15T23:30:08Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `be11220`, on the human's request for one bug unit for two problems a developer reported from runs of
  the orchestrator: reviews saved in `.reviews/changes/<unit>/` and read from `.reviews/<unit>/`, and timestamps of
  log entries and commit dates that are not the time of writing. Numbered 0108: the highest number in `changes/`, on
  every local branch, is 0107. Read `process.md`, the role files under `roles/` and `extra-roles/` and the end report
  of `scripts/agentrite-orchestrate.mjs`. The human chose the rule in `process.md` over a check of the timestamps.
  Wrote `spec.md`. The status is `draft`

## Amendments
