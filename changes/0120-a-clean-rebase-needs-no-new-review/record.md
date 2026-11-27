---
kind: bug
status: in-progress
timestamp: 2026-11-23T00:03:55Z
supersedes: 0117-set-a-unit-implemented-by-a-command
---

# 0120 A clean rebase needs no new review

## Log

- 2026-11-23T00:03:55Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, wrote `spec.md` on the
  human's report that `npx agentrite complete` refuses a branch after a clean rebase, reproduced on a clone with 0117.
  `supersedes` names 0117 for its tree comparison and the refusals of the named commit only. `process.md` has 2562
  words at `9e2db59`, and the spec keeps it from growing. The status is `draft`
- 2026-11-27T13:45:23Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` in full at `f1b26ac1e5c6fcd79313fba8cff8a0b40d348ef1`. Findings F1 to F6 are in
  `.reviews/0120-a-clean-rebase-needs-no-new-review/spec-review-2026-11-27T134446Z.md`. Did not repeat the exact rebase
  with an added file or the trial across units 0100 to 0119, or verify live harness behavior
- 2026-11-27T14:00:50Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, settled the findings of the spec
  review with the human. F2, F3, F5 and F6 are accepted and corrected in `spec.md`: the refusal of a merge is the
  command's own, the commit that added the entry raises the count above each of its parents and the commits after it are
  defined, a fresh clone holds the default branch, and the row of `complete` in `COMMANDS.md` stays. F4 is accepted as a
  limitation, with R4 and R6 naming the commit that added the entry. F1 is declined, since the wording of R2 taken for
  F3 already keeps a removal from being taken. `process.md` stays at 2562 words. The status is `draft`
- 2026-11-27T14:03:19Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` at `1383f201beec30a2720dd24f78a0c1b0c0b6f6db` as a delta from `f1b26ac1e5c6fcd79313fba8cff8a0b40d348ef1`.
  Findings F4, F7 and F8 are in `.reviews/0120-a-clean-rebase-needs-no-new-review/spec-review-2026-11-27T140237Z.md`.
  Did not verify live harness behavior or run the proposed command, which is not yet implemented
- 2026-11-27T14:22:35Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, settled the findings of the delta spec
  review with the human. F4 is corrected by replacing the refusal of R3, which no branch can reach, with the statement
  that the commit that added the entry is always found and why, and by dropping its test. F7 is corrected by having R4
  name the parent of the review commit as the base of the new review. F8 is corrected by limiting the pass of Expected
  behavior and R15 to commits that include no merge. `process.md` stays at 2562 words. The status is `draft`
- 2026-11-27T14:24:51Z [OpenCode, openai/gpt-6.2-sol] as the spec-reviewer, on `master`, reviewed `spec.md` and
  `record.md` at `c1b503e250c151f25ba4d6ce7f7daba26945e134` as a delta from `1383f201beec30a2720dd24f78a0c1b0c0b6f6db`.
  Findings F9 to F11 are in `.reviews/0120-a-clean-rebase-needs-no-new-review/spec-review-2026-11-27T142420Z.md`.
  Did not verify live harness behavior or run the proposed command, which is not yet implemented
- 2026-11-27T14:28:22Z [human] approved the spec. The status is `approved`
- 2026-11-27T14:30:05Z [Claude Code, anthropic/claude-opus-5-5] as the planner, stopped before writing `plan.md`,
  since the spec leaves open two things the command must do, raised as F9 and F10 of the last spec review and not
  settled before the approval. R2 reads the opening of the review's entry literally on one line, while the form the
  command reads accepts an entry wrapped after who made it, so that R3's claim that the commit is always found fails
  for such an entry and the spec gives no behavior for it. R4 names the parent of the commit that added the entry,
  which a commit with no parent, as the oldest commit of a shallow clone, lacks, and the spec gives no message for
  it. The unit goes back to the specifier and the human. The status is `approved`
- 2026-11-27T14:47:30Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, corrected `spec.md` for F9 to F11 of
  the last spec review, as the human decided them after the planner stopped. F9: the opening of the reviewer's entry
  must stand whole on its first line, and an entry wrapped inside it is refused as not of the form, so that R3 holds.
  F10: when the commit that added the entry has no parent in the history held, the refusal of R4 says so and names
  fetching the full history, or another review, as the recovery. F11: the limitation on a delta review's base now
  promises only the commit that added the entry and those after it. R10, R12 and R15 follow, and `process.md` stays at
  2562 words. The status is `approved`
- 2026-11-27T14:53:14Z [Claude Code, anthropic/claude-opus-5-5] as the planner, wrote `plan.md` against `d77a689`,
  with F9 to F11 settled in `spec.md`. Every requirement R1 to R16 has a task, and every task names the requirements
  it delivers. The status is `approved`
- 2026-11-27T14:53:44Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work. `wc -w process.md`
  prints `2562` at `0b09add`, the commit the branch was cut from. The status is `in-progress`
- 2026-11-27T15:00:39Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, added two pure readers to
  `plan.md` before writing them: `parentsListed` for the output of `git rev-list --parents` and `batchContents` for
  that of `git cat-file --batch`, read by the size of each blob in bytes, since the plan's calls need both read and
  the standards put such reading in pure, unit tested functions. `addingCommit` returns the commit with its parents,
  so that the command reads the parents of R4 from it
- 2026-11-27T15:00:39Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, changed the test of
  `diff.relative=true` in `plan.md` to a project at the top of its repository. The change check, which `complete`
  runs before it reads the review, refuses every project in a subdirectory of its repository with `Unable to read
  changes/<unit>/record.md`, since it reads the records with `git show <revision>:changes/...` from the top of the
  repository. That was so before this unit, and this unit leaves the change check as it is. In such a project the
  setting is therefore not tested through the command, and `diff-tree` is given `--no-relative` as the plan says
- 2026-11-27T15:00:39Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, built these readings
  of the plan: R5 names the newest merge after the commit that added the entry, the first that `git rev-list` lists,
  and R4 names fetching the full history as the recovery when that commit has no parent in the history held
- 2026-11-27T15:02:22Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, stated the rule of
  `process.md` and the refusals of `complete` in `COMMANDS.md` by the commits from the review on. `wc -w process.md`
  prints `2562` once the work is done, as at `0b09add`. `git diff 0b09add` of `roles`, `extra-roles`,
  `standards.md`, `README.md`, `ORCHESTRATOR.md`, `SETUP.md`, `SANDBOX.md` and the documents of 0117 prints nothing

## Amendments
