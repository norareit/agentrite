---
kind: feature
status: draft
timestamp: 2026-10-21T14:18:50Z
---

# 0069 A time limit on a step of the orchestrator

## Log

- 2026-10-21T14:18:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `8a85e9c`, on the human's request to specify the time limit on a step that 0065 left for a later unit,
  with a brief that the implementer of 0065 wrote of where it fits in the code and what was open. Made the unit as a
  feature. Numbered 0069: the highest number in `changes/` is 0068, which the brief did not know of. Read the non-goals
  of 0065, `judgeStep` and `endLine` of `scripts/agentrite-orchestrate.mjs`, `runStep` and `run` of
  `scripts/agentrite.mjs`, and "Stopping a run" of "Running a role" in `README.md`. Found that a step in a process group
  of its own, which ending its harness takes, no longer gets the terminal's Ctrl-C, and specified that the command
  passes the signals on. Wrote `spec.md`. The status is `draft`
- 2026-10-21T15:03:35Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on the human's decisions that
  `timeoutMinutes` is bounded and that both items of "Beyond the request" stay out: bounded the key at 1440 minutes, a
  day, in requirements 1 and 2, recorded why under "Decisions", named the declined items among the non-goals, and
  left "Beyond the request" with none. The status is `draft`

## Amendments
