---
kind: feature
status: in-progress
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
- 2026-11-18T17:30:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a run of the orchestrator, on
  `feature-0110-report-a-harness-failure-that-stops-a-run` at `040c714`, began the work. The status is `in-progress`
- 2026-11-18T18:10:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a run of the orchestrator, on
  `feature-0110-report-a-harness-failure-that-stops-a-run`, built every task of `plan.md` in the five commits of its
  commit points. The existing tests that the new lines of a stop by a harness changed were updated: the report of a
  harness that exited 1, the `ended` of `state.json` now holding `error`, and the `Result` of the tests holding
  `errors`. The sample of the error in the command's tests is cut to 100 characters in `state.json`, as R8 says. The
  documents say the line of the resume command is one line, wrapped, since it is longer than 120 characters. The
  three commits of the command's files hold files, not the tests of each step, so the tests of the orchestrator and
  `state.json` stand in the second commit and those of `runs` in the third. `npm test` was run on the tree of
  `2061b67` before the record was written and reported 1900 passed, 0 failed and 34 skipped. No formatter is installed
  in the repository, so the line limit was checked with a script of line lengths, for the files this unit changed. Not
  checked: a real outage of a provider, and the forms of the errors beyond the samples the plan holds. The status is
  `in-progress`
- 2026-11-18T17:15:24Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, made a full review of unit 0110 at
  `e08dcfe19af4aec6a478e50a185070ba66070ea6`. Returned C1 in
  `.reviews/0110-report-a-harness-failure-that-stops-a-run/review-2026-11-18T171524Z.md`. `npm test` reported 1900
  passed, 0 failed and 34 skipped; `npm run check-changes` and the diff whitespace and added-line length checks
  passed. Live outages, historical harness-output captures and historical failing-test runs were not independently
  verified; Docker-dependent tests could not run in this sandbox. The status remains `in-progress`
- 2026-11-18T18:40:00Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, in a run of the orchestrator, on
  `feature-0110-report-a-harness-failure-that-stops-a-run`, took the review of `review-2026-11-18T171524Z.md`. C1, which
  names the one-character test context `t` in the new tests of the command, is accepted by the definition of the
  orchestrator, and not as a decision of the human. Renamed it `testContext` in the new tests, and shortened two titles
  to keep the line limit. `npm test` on the tree before this entry reported 1900 passed, 0 failed and 34 skipped. The
  status is `in-progress`

## Amendments
