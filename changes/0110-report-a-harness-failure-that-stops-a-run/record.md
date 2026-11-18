---
kind: feature
status: approved
timestamp: 2026-11-15T23:30:08Z
---

# 0110 Report a harness failure that stops a run of the orchestrator

## Log

- 2026-11-15T23:30:08Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `be11220`, on the human's request for a feature unit that recognizes a usage limit of a harness, from a
  developer's report that a run stopped by one does not go on by itself. The human chose recognizing the limit and
  reporting when it resets and how to resume, without waiting or resuming. Numbered 0110: the highest number in
  `changes/`, on every local branch, is 0109. Read "How a run ends" and "What .orchestrator holds" of
  `ORCHESTRATOR.md`, the end report of `scripts/agentrite-orchestrate.mjs` and the headless reading of the harness
  modules in `scripts/harnesses/`. Wrote `spec.md`. The status is `draft`
- 2026-11-18T15:18:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `26438ef`, on the human's choice to make the unit general: any error a harness ends a step with, as an
  HTTP 500 of the provider or a usage limit, is given in the end report with the command that resumes the run.
  Renamed the directory from `0110-name-a-usage-limit-that-stops-a-run` and rewrote `spec.md`. Kept the kind
  `feature`, since the unit adds what the end report gives. Read `judgeStep`, `endLine`, `lastStepLines` and
  `refusedLines` of `scripts/agentrite-orchestrate.mjs`, how a step is spawned in `scripts/agentrite.mjs`, and the
  reading of the final response in `scripts/harnesses/`. The behavior of a step under a real outage was not
  reproduced, and the spec says so. The status is `draft`
- 2026-11-18T16:18:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `8523b8e`, on the human's choices. The reading of the error is a member of the harness contract, which
  its check holds every harness to, R2, so that a harness added later needs it and the orchestrator names none. The
  human took item 3 of "Beyond the request", the first line of the error in `state.json` and shown by
  `npx agentrite runs`, now R8 and R9, and did not take items 1 and 2. Read "agentrite runs" of `COMMANDS.md` and
  how `scripts/agentrite-runs.mjs` gives the line of an end. Renumbered the requirements. The status is `draft`
- 2026-11-18T16:20:44Z [human] approved the spec. The status is `approved`
- 2026-11-18T16:55:18Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a run of the orchestrator, on
  `feature-0110-report-a-harness-failure-that-stops-a-run` at `08dc86f`, wrote `plan.md`. The forms of the errors
  were established from the real output of Claude Code 2.1.327, OpenCode 1.19.6 and Codex 0.167.0 against a local
  server that answered with 500 and 429, and with 500 before a valid answer, and the reading of OpenCode was
  checked against its own `run` command. Each of the three reports an error that ends a step on standard output, so
  none is put to the human. The status is `approved`

## Amendments
