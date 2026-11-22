---
kind: feature
status: draft
timestamp: 2026-11-22T12:49:07Z
---

# 0117 Set a unit to implemented by a rule the record shows, and by a command

## Log

- 2026-11-22T12:49:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `ed8c644`, on the
  human's request for a feature unit that changes the rule for `implemented` so that the human decides only proposed
  declines, and adds a command that sets the status by that rule. Numbered 0117: the highest number in `changes/` is
  0116. Read `process.md`, `roles/reviewer.md`, `roles/implementer.md`, `ORCHESTRATOR.md`, the sections of
  `agentrite approve`, `agentrite cancel`, the change check and "Exit statuses" of `COMMANDS.md`, the statuses and
  the quick start of `README.md`, `SETUP.md`, the workflow diagram, and the record of 0116 for the entries of the
  reviewer and the implementer as they are written now. `wc -w process.md` prints 2406 at `ed8c644`. Wrote
  `spec.md`, with the name `complete`, which the human may still change. The status is `draft`
- 2026-11-22T12:58:02Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed
  `spec.md` and `record.md` in full. Findings F1 to F6 are in
  `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T125710Z.md`. Did not verify live harness
  resume behavior or model handling of the draft entry forms
- 2026-11-22T13:15:40Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, revised `spec.md` for
  F1 to F6 of `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T125710Z.md`, which the human
  took, and for the human's decisions. The human left BTR1 to BTR4 out, and "Beyond the request" says none. F1: a
  delta review verifies every finding of the review before it, a finding the human declined is settled, and
  `Blocking findings:` lists every blocking finding still open (R4, R7), with a decision that a declined blocking
  finding still needs one review after the decision. F2: the human's decision on a variant's branch names the
  variant after `[human]`, and decisions are read by run (R6, R9, R14). F3: a finding decided to be fixed is reviewed
  after the decision as a condition of the rule (R1), and the reviewed commit need not be an ancestor (R14). F4:
  `SANDBOX.md` says to check out the unit's or the variant's branch to complete it (R11). F5: R21 tests a run with no
  controlling terminal. F6: the example entry of R15 is on one line. R3 sets no limit on `process.md` any more: its
  word count before and after is logged, and a growth is put to the human under `**Needed from you**` of the review,
  and not as a finding. The status stays `draft`
- 2026-11-22T13:19:54Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, restored BTR1 to BTR4
  in "Beyond the request" of `spec.md`, with their text as first written, since an item the human leaves out stays in
  the spec. They were removed on a hand-over that was wrong. The human left all four out, and the decisions on a
  declined blocking finding and on records written before the forms name BTR1 and BTR3 as left out. No
  cross-reference of the four needed a change. The status stays `draft`
- 2026-11-22T13:23:12Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed the working-tree
  `spec.md` and `record.md` as a delta from its previous review, including the restored items beyond the request.
  Checked F1 to F6. Findings F1 and F7 to F10 are in
  `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T132223Z.md`. Did not verify live harness
  resume or model handling of the draft entry forms
- 2026-11-22T13:34:24Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, revised `spec.md` for
  `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T132223Z.md` and the human's decisions.
  F1: every review of a run after its first, a delta or a full one, accounts for every finding of the review before
  it (R4, R7). F7: a label is never used twice in a run, a review continues the numbering of each axis and a carried
  finding keeps its label, so a proposed decline and the human's decision name the finding by its label alone (R4,
  R8, R9, R14), with a decision on why. F8: a decision that `to be fixed` asks for a fix and a review of it and does
  not make a finding blocking, so a non-blocking finding still open passes. F9: a decision, and the text of
  `SANDBOX.md` in R11, that a completed variant is taken by moving the unit's branch to it or by a fast-forward, and
  that merging it into a unit's branch with work of its own is outside the supported usage. F10: the reason for
  keeping the growth of `process.md` out of the findings is restated. A missing full stop in R11 is put back.
  BTR1 to BTR4 stay, not taken. The status stays `draft`
- 2026-11-22T13:39:23Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed
  the working-tree `spec.md` and `record.md` as a delta from its previous review. Checked F1 to F10. Findings F11 to F13
  are in `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T133828Z.md`. Did not verify live
  harness resume or model handling of the draft entry forms
- 2026-11-22T13:47:09Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, revised `spec.md` for
  `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T133828Z.md` and the human's decisions.
  F11: R11 has `SETUP.md` say that a project's own reviewer and implementer files also follow the two rules the
  command relies on, that every review after the first of a run accounts for every finding still open of the review
  before it and that a label is never used for two findings within a run, and the decision on the supported usage
  names both, with no check of them in the command. F12: R5 has the implementer act on a recorded decision of the
  human, proposing no decline again of a finding decided `declined`, in `record.md` or in `declines`, and applying a
  finding decided `to be fixed`, with the stop of the orchestrator as it is. The human left F13 out, since it
  concerns a case the unit leaves outside its supported usage. BTR1 to BTR4 stay, not taken. The status stays
  `draft`
- 2026-11-22T13:50:57Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed
  the working-tree `spec.md` and `record.md` as a delta from its previous review. Checked F11 to F13 and the affected
  earlier findings. No new findings. The review is in
  `.reviews/0117-set-a-unit-implemented-by-a-command/spec-review-2026-11-22T135023Z.md`. Did not verify live harness
  resume or model handling of the draft entry forms
- 2026-11-22T13:54:29Z [Claude Code, anthropic/claude-opus-5-5] on `master`, on the human's request folded the unit's
  commits on `master` into two: the first holds the spec as first written, and the second every revision for the
  findings of the three spec reviews with their entries, the restoring of the items beyond the request and the entry of
  the fourth spec review, which returned no findings. The commits of 0118 and 0119 now follow both. The names of the
  commits the fold removed are taken out of the entries above. The status stays `draft`

## Amendments
