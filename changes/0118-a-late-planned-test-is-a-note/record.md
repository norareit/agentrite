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
- 2026-11-22T14:39:48Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `0bba533`, revised
  `spec.md` after the human took BTR2 into the unit and left BTR1 and BTR3 out. BTR2 is now R12, a line of
  `templates/changes/plan.md` for the planned tests' own commit point, and its place in "Beyond the request" says so.
  The decision on the kind and the non-goal on the templates agree with it, and no requirement is renumbered. The
  findings of the spec review are not taken up in this revision. The status stays `draft`
- 2026-11-22T14:46:29Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `0c9f620`, revised
  `spec.md` for F1 to F7 of `.reviews/0118-a-late-planned-test-is-a-note/spec-review-2026-11-22T143031Z.md`, as the
  human decided them, keeping the role files as short as the change allows. F1: a project whose hooks refuse a commit
  with failing tests is a recorded limitation, in a decision of its own, and R1 and R8 say that the role files add
  nothing for it. F2: R1 and R8 have a planned test of new or changed behavior fail first, and one that pins existing
  behavior go first and pass. F3: R2, R7 and the decision on regression tests show the failure on a commit, the
  tests' own commit point or the commit before the fix with the test file added, and no longer on an uncommitted
  tree. F4: R5 has a review report the note only when the late test shows in the diff it covers, in place of once
  for the unit. F5: R6 exempts only when a test found during the work was written, and the decision on such tests
  says that it excuses no missing proof of a regression test. F6: a decision on R12 says that a plan without the
  commit point is no note by itself, and the non-goal on a log of each planned test names the projects whose hooks
  allow the commit. BTR1 and BTR3 stay as written. F7: the decision on 0117 says that it is approved, that it also
  changes "Re-reviewing a unit", that this unit adds nothing to that section's rules for findings, and that the
  implementer of the unit that lands second keeps 0117's rules while adding the note. The status stays `draft`
- 2026-11-22T14:49:11Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, reviewed `spec.md` and `record.md` at
  `37239a477e2a` on `master` as a delta from `0a84557d2960`. Checked F1 to F7. Findings F3, F4 and F8 are in
  `.reviews/0118-a-late-planned-test-is-a-note/spec-review-2026-11-22T144840Z.md`. Did not independently verify the
  32-unit project sample or live harness handling of note-only responses

## Amendments
