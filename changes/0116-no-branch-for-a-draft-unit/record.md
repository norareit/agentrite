---
kind: bug
status: approved
timestamp: 2026-11-21T12:04:21Z
---

# 0116 The sandbox cuts a branch for a unit that is not approved

## Log

- 2026-11-21T12:04:21Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `f8e970c`, on the
  human's request for a bug unit for a problem a developer reported from a unit run in a project of their own: the
  wrapper cut the branch of a unit that was `draft` on the default branch, and the orchestrator's refusal in the
  clone gave no hint of the cause, also once the unit was approved. Numbered 0116: the highest number in `changes/`
  is 0115. Read `cut_unit_branch` of `container/unit-clone.sh`, `checkApproved` and `checkResumable` of
  `scripts/agentrite.mjs`, "Running a unit" and "When something goes wrong" of `SANDBOX.md`, and the refusals of
  "agentrite orchestrate" and "sandbox.sh" of `COMMANDS.md`. Wrote `spec.md`, which leaves the refusal of
  `--resume` as it is. The status is `draft`
- 2026-11-21T12:08:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, revised `spec.md` after
  the human took BTR1 into the unit and left BTR2 out. A unit that is `implemented` on the default branch now gets
  no branch either, with a message of its own that says its work is done and that undoing or correcting it is a new
  unit that names it in `supersedes` (R2). The variant, documents and tests requirements
  cover it, the decision on which statuses refuse a cut says why, the requirements are renumbered, and the former
  BTR2 is the one item of "Beyond the request". The status stays `draft`
- 2026-11-21T12:11:33Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` in full. Findings F1 to F8 are in
  `.reviews/0116-no-branch-for-a-draft-unit/spec-review-2026-11-21T121024Z.md`. Did not check the reporting
  project's environment or its end-to-end Docker run
- 2026-11-21T12:18:21Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, revised `spec.md` for F1
  to F8 of
  `.reviews/0116-no-branch-for-a-draft-unit/spec-review-2026-11-21T121024Z.md`, which the human took into the spec.
  R5 keeps every status but `draft`, `implemented` and `cancelled` cutting as now, and states the variant cut from
  an existing unit's branch. R4 speaks of a new clone. R6 names the branch to update, the cut anew by the number and
  a kept clone. R8 has every description of the cut agree, the forms the wrapper prints among them. The new R10 is
  an entry of "When something goes wrong" of `SANDBOX.md`, and R11 adds the reported retry to the tests. A decision
  says that R6 holds for a clone whose kit holds the fix, and the decision that the wrapper moves no branch is
  limited to the start of a run. The steps run the orchestrator by `npx agentrite orchestrate`, and the spec names
  no source files. The cause is at `f8e970c` in `container/unit-clone.sh`: `cut_unit_branch` from line 27 refuses
  only `cancelled`, at line 63, `resolve_variant_branch` from line 223 cuts a variant from the unit's branch as it
  is, and `prepare_clone` from line 272 resumes a kept clone. The message is that of `checkApproved` in
  `scripts/agentrite.mjs` from line 1569. The status stays `draft`
- 2026-11-21T12:20:27Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` as a delta from its previous review. Checked prior findings F1 to F8. Findings F9 to F13 are in
  `.reviews/0116-no-branch-for-a-draft-unit/spec-review-2026-11-21T121925Z.md`. Did not check the reporting
  project's environment or its end-to-end Docker run
- 2026-11-21T12:26:48Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, revised `spec.md` for F9
  to F13 of
  `.reviews/0116-no-branch-for-a-draft-unit/spec-review-2026-11-21T121925Z.md`, by simplifying as the human decided.
  R6 and R10 give no git steps per case: the refusal says that the record read in this checkout is `draft`, how to
  approve a unit that is not, and one remedy for one approved on the default branch, merging the default branch into
  the branch the run is on, on the host, after bringing back the work of a kept clone. The deletion route and the
  naming of the branch checked out are dropped, with a decision on why (F9, F11, F13). R8 scopes the status guard to
  a missing unit's branch cut from the default branch and updates the row of the table at the top of `COMMANDS.md`
  (F10). The no-moves decision and the kept-clone non-goal are limited to the start of a run and to automatic
  recovery (F12). The status stays `draft`
- 2026-11-21T12:31:26Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, corrected R8: the row
  of the table at the top of `COMMANDS.md` says that a missing unit's branch is cut for a unit that is approved or in
  progress, since R5 keeps the cut for `in-progress`. On the human's request the unit's commits on `master` were
  squashed into one, and the names of the commits the squash removed are taken out of the entries above. The status
  stays `draft`
- 2026-11-21T12:32:49Z [human] approved the spec. The status is `approved`
- 2026-11-21T12:39:02Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in a step of the orchestrator, on
  `bugfix-0116-no-branch-for-a-draft-unit` at `4b17595`, wrote `plan.md`, since the fix takes more than a couple of
  steps: regression tests first, then a `case` on the status in `cut_unit_branch` of `container/unit-clone.sh` that
  refuses `draft` and `implemented` beside `cancelled` with `3`, which the wrapper turns into `1` without the forms,
  a longer message of `checkApproved` in `scripts/agentrite.mjs` for `draft` alone, the forms and comments of
  `container/sandbox.sh`, and `SANDBOX.md` and `COMMANDS.md`. BTR1 is not taken. The status stays `approved`

## Amendments
