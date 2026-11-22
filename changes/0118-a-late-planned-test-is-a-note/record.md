---
kind: task
status: draft
timestamp: 2026-11-22T12:55:15Z
---

# 0118 A planned test written late is a note, and the planned tests have a commit of their own

## Log

- 2026-11-22T12:55:15Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the
  human's request for a unit that keeps the planned tests first, welcomes a test found during the work, judges a
  regression test by a run that shows it failing without the fix, has the reviewer note a late planned test once
  without a finding, and gives the planned tests a commit point of their own. Numbered 0118: the highest number in
  `changes/` is 0117. Made it a task, as 0060 and 0070 were for rules of the kit's text, with `spec.md` kept for its
  decisions. Read the role files of the implementer, the reviewer and the planner, `process.md`, the standards,
  `orchestrator.json`, "The outcome of a step" of `ORCHESTRATOR.md` and the spec of 0117, and searched the kit for
  other statements of the order of tests: only `process.md`, on `plan.md`, has one. `wc -w` prints 2406 for
  `process.md` and 1205 for `standards.md` at `ed8c644`. Wrote `spec.md`. The status is `draft`
- 2026-11-22T13:54:29Z [Claude Code, anthropic/claude-opus-5-5] on `master`, on the human's request moved the commit of
  this unit after those of 0117, when the commits of 0117 were folded. The commit the entry above named for the word
  counts no longer exists, and is replaced by `ed8c644`, where `process.md` and `standards.md` are the same. The status
  stays `draft`
- 2026-11-22T14:31:02Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, reviewed `spec.md` and `record.md` in
  full at `0a84557d2960` on `master`. Findings F1 to F7 are in
  `.reviews/0118-a-late-planned-test-is-a-note/spec-review-2026-11-22T143031Z.md`. Did not independently verify the
  32-unit project sample or live harness handling of note-only responses
- 2026-11-22T14:32:11Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `0a84557`, revised
  `spec.md` to weigh length as the human decided for 0117, in its R3 and its decision on the length of `process.md`.
  R10 no longer limits the word counts: the record logs `wc -w` of `process.md`, the standards and the three role
  files on the commit the branch is cut from and once the unit is done, says what added words are for, and the
  review puts a growth to the human under `**Needed from you**`, as `afterwards` in a step of the orchestrator, and
  not as a finding. The context gives the aim, and a decision gives the reasons. Corrected the reason of the decision
  that keeps the note out of the findings: under `"no-findings"` a non-blocking finding goes back to be applied, and
  stops a run only by a proposed decline, which a late planned test, that cannot be applied, would get. The
  findings F1 to F7 of the spec review are not taken up in this revision. The status stays `draft`

## Amendments
