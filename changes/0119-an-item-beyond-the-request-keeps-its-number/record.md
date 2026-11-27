---
kind: task
status: approved
timestamp: 2026-11-22T13:27:16Z
---

# 0119 An item beyond the request keeps its number

## Log

- 2026-11-22T13:27:16Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master`, on the
  human's request for a rule on what becomes of an item of "Beyond the request" once the human decides on it: a taken
  item moves into the requirements and says which item it was, an item left out stays, and the numbers never change,
  a taken item leaving a line in its place. Numbered 0119: the highest number in `changes/` is 0118. Made it a
  task, as 0060, 0070 and 0118 were for rules of the kit's text, with `spec.md` kept for its decisions. Read
  `process.md`, the standards, the role files of the specifier and the spec-reviewer, the spec and record
  templates, and the documents of 0116 and 0117, and searched the kit for "Beyond the request" and `BTR`: outside
  `changes/` and `CHANGELOG.md` only `process.md`, the specifier's and the spec-reviewer's role files and the
  spec template name it. `wc -w` prints 2406 for `process.md` and 1205 for `standards.md` at `ed8c644`. Wrote
  `spec.md`. The status is `draft`
- 2026-11-22T13:54:29Z [Claude Code, anthropic/claude-opus-5-5] on `master`, on the human's request moved the commit of
  this unit after those of 0117, when the commits of 0117 were folded. The commit the entry above named for the word
  counts no longer exists, and is replaced by `ed8c644`, where `process.md` and `standards.md` are the same. The status
  stays `draft`
- 2026-11-23T00:02:24Z [human] approved the record. The status is `approved`
- 2026-11-27T13:34:54Z [Claude Code, anthropic/claude-opus-5-5] as the planner, wrote `plan.md` against `f1b26ac`,
  the head of `master` the branch is cut from, with the wording of the three changed files, so that the role files
  grow by no more than the change needs. The three files are as they were at `ed8c644`; `process.md` changed since,
  and still holds the sentence on `BTR<n>` that R6 relies on. The plan has the word counts of R7 logged at
  `f1b26ac`, where `process.md` now has 2562 words, and also counts `roles/specifier.md`, which `AGENTS.md` counts
  among the kit's instructions. The status stays `approved`

## Amendments
