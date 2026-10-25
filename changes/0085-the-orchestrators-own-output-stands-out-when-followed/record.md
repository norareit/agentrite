---
kind: feature
status: in-progress
timestamp: 2026-10-24T13:41:05Z
---

# 0085 The orchestrator's own output stands out when followed

## Log

- 2026-10-24T13:41:05Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `2455c05`, on the human's request, made while trying the orchestrator of 8.1.0 in another project, that
  with `--follow` the command's own output is set apart by lines around it. Made the unit as a feature, since the form
  and placement of the frames are decisions. Numbered 0085: the highest number in `changes/` is 0084. Read "How a run
  ends" of `README.md`, `orchestrateCommand`, `endReport` and `followPrinter`. Wrote `spec.md`. The status is `draft`
- 2026-10-25T11:45:43Z [human] approved the spec. The status is `approved`
- 2026-10-25T11:50:29Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a run of the orchestrator, on
  the unit's branch at `7dc6ca0`, wrote `plan.md`. Read R3 and R6 the one way that works: the first item of a step
  may be a tool call, which opens with no blank line, so the blank line after a closing rule is the frame's, and
  `followPrinter` starts as though one was just written. The status stays `approved`

## Amendments
