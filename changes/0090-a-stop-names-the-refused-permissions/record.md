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
- 2026-11-02T19:06:26Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the human's request
  to check OpenCode and add it to the spec. Ran OpenCode 1.19.3 with `run --format json` on `openai/gpt-6.1-sol-fast`
  on the host, on a prompt to write a file, with its default settings, with `edit` at `ask` and with `edit` at
  `deny`. The default allowed the write; `ask` was refused, known only by the error text of the `tool_use` event,
  and the turn ended with no final response; `deny` took the tool away, with no call to see. One run with `ask`
  printed nothing for 240 seconds, and was not reproduced. Added OpenCode to the requirements, the reporting of the
  refusals of the step an ask again follows, and the decisions and non-goals for them. The status is `draft`
