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
- 2026-10-25T12:30:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on the unit's branch
  at `7af520c`. The status is `in-progress`
- 2026-10-25T12:31:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built the unit in two commits, the
  printers with the behaviour of today and then the frames. Verified: `node --test tests/agentrite-orchestrate.test.mjs`
  reports 116 passing, and `npm run check-changes` passes. `npm test` reports 20 failing tests, all of the commit-msg
  hook, `init`, `refresh` and the sandbox, and the same 20 fail on `7af520c`, before the unit's work, in this
  environment. A run of the command piped to `cat -A` was not made against a fake harness: the printer alone was
  piped, which showed the rules plain with no escape sequence. The output without `--follow` was not compared with
  `diff` against `master`: it is checked by the unchanged test of a run without it, which now also asserts no rule
  line. Not checked: `SANDBOX.md`, which was read and left as it is as the plan says
- 2026-10-25T12:03:04Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0085 at
  `99bf78b6f188755a347fe1604324f24575d317d9`. Returned P1 and C1 in
  `.reviews/0085-the-orchestrators-own-output-stands-out-when-followed/review-round-1.md`. The orchestrator suite
  passed 116 tests and the change check passed; the full suite had 19 failures and 33 skips. Could not independently
  verify the reported pre-unit baseline of 20 failures or the omitted command-level manual comparisons.

## Amendments
