---
kind: feature
status: draft
timestamp: 2026-11-02T13:31:59Z
---

# 0090 A stop names the refused permissions

## Log

- 2026-11-02T13:31:59Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `df64a71`, on the human's request for a feature that makes the end report of a run say when a step was
  refused tool calls for lack of permission, limited to a harness that reports them. Numbered 0090: the highest number
  in `changes/`, on every branch, is 0089. Read `endLine` and `lastStepLines` of `scripts/agentrite-orchestrate.mjs`,
  `HEADLESS` of `scripts/agentrite-headless.mjs`, `harnessCommand` of `scripts/agentrite-run.mjs`, and "The
  orchestrator" of `README.md`. Ran Claude Code 2.1.316 headless, with `stream-json` and without
  `--dangerously-skip-permissions`, on a prompt to write a file, and saw the refused `Write` in `permission_denials`
  of its `result` event. Did not check OpenCode. Wrote `spec.md`. The status is `draft`
