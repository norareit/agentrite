---
kind: bug
status: in-progress
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
- 2026-11-18T11:37:21Z [human] approved the spec. The status is `approved`
- 2026-11-18T11:40:03Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a session on the Linux host, cut
  `bugfix-0108-review-place-and-entry-times` from `master` at `cc989d1`. The fix takes several steps, a regression
  test, three rules in `process.md` and the wording of four role files, so it gets a plan. Found that no file of
  `process.md`, `roles/` or `extra-roles/` names `.reviews/changes/` today, so that half of the regression test
  passes before the fix and keeps R2 after it. Wrote `plan.md`. The status stays `approved`
- 2026-11-18T11:43:10Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  on `bugfix-0108-review-place-and-entry-times` at `64c13f7`, began the work. The status is `in-progress`
- 2026-11-18T11:48:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, wrote `tests/process-rules.test.mjs`
  and saw its test on the timestamp fail and its test on `.reviews/changes/` pass before the fix, then added the three
  rules to `process.md` and saw both pass, committed as `a39eb0a`. Named the place of a unit's reviews as `process.md`
  defines it in `roles/reviewer.md`, `roles/implementer.md`, `extra-roles/spec-reviewer.md` and
  `extra-roles/security-reviewer.md`, and read every line of `process.md`, `roles/` and `extra-roles/` that holds
  `.reviews`: each place of a unit is written `.reviews/<unit-directory>/`
- 2026-11-18T11:48:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran `npm test` on the final tree of
  the role files: 1899 of 1900 tests pass. The one that fails, in `tests/package-documents.test.mjs`, expects the
  `homepage` of `package.json` to be `https://github.com/norareit/agentrite#readme`, which `be11220` on `master` changed
  to `https://agentrite.dev`. It fails on `master` as well, is outside this unit and is left as it is, so the box of
  `npm test` under "Verification" stays open. The two greps of "Verification" show what it expects, and every changed
  line is at most 120 characters
- 2026-11-18T11:48:12Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, added the commit point `bugfix-0108
  Record the change check` to `plan.md`: `npm run check-changes` reads committed content, so it can run only after the
  last commit of the work, and its result is recorded in a commit of its own
- 2026-11-18T11:48:30Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, found that the first lines of its
  three entries above were longer than 120 characters in `5c068fc`, and that the second of them said every changed line
  was at most 120 characters, which held for `process.md`, the test and the role files and not for those entries.
  Wrapped the three entries again and narrowed that sentence to the files it was checked on
- 2026-11-18T11:48:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran `npm run check-changes` on
  `5c068fc`, the last commit of the work, and it passed. Ticked it under "Verification" and widened the commit point
  `bugfix-0108 Record the change check` to hold the wrapping of the entries above. The box of `npm test` stays open for
  the failure that `master` has as well. The work is handed over for review. The status stays `in-progress`

## Amendments
