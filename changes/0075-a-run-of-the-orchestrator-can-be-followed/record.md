---
kind: feature
status: approved
timestamp: 2026-10-22T13:15:49Z
---

# 0075 A run of the orchestrator can be followed

## Log

- 2026-10-22T13:15:49Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `262a16c`, on the human's request for an option `--follow` of `agentrite orchestrate` that prints a
  step's messages and tool calls while it runs, with the option, its default, the form of the output, the harnesses it
  covers and the limitation that it is chosen at the start decided by the human. Made the unit as a feature. Numbered
  0075: the highest number in `changes/` is 0074. Read "agentrite orchestrate" of "Commands" and "The orchestrator" of
  `README.md`, the orchestrator in a unit run in `SANDBOX.md`, item 1 of "Beyond the request" of unit 0065, the
  command's printing of its step lines and its parsing of options, and how `agentrite-headless.mjs` runs each harness.
  Left to the plan whether the output comes from the harness's standard output or from its session logs. Wrote
  `spec.md`. The status is `draft`
- 2026-10-22T14:06:55Z [human] approved the spec. The status is `approved`
