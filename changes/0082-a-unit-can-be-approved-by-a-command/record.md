---
kind: feature
status: draft
timestamp: 2026-10-23T15:12:33Z
---

# 0082 A unit can be approved by a command

## Log

- 2026-10-23T15:12:33Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `1ebe83b`, on the human's request for a command that approves a unit: it sets the status to
  `approved`, logs the entry and commits it, as the human and their agents have done by hand for every unit so far.
  Made the unit as a feature. Numbered 0082: the highest number in `changes/` is 0081. Read the statuses and the log
  format in `process.md`, the approval of 0078 in its history, "agentrite orchestrate" of `README.md`, and how
  `resolveUnit` reads a unit. Wrote `spec.md`. The status is `draft`
