---
kind: task
status: in-progress
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
- 2026-11-27T13:35:28Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, began the work on the unit's
  branch, cut from `f1b26ac`, in round 1 of the orchestrator's repeat, with no review of the unit in `.reviews`. The
  status is `in-progress`
- 2026-11-27T13:36:10Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, logged `wc -w` at `f1b26ac`, in
  the root of the repository: `process.md` 2562, `standards.md` 1205 and `roles/specifier.md` 863 (R7)
- 2026-11-27T13:37:02Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, put the wording of the plan into
  `roles/specifier.md`, `templates/changes/spec.md` and `extra-roles/spec-reviewer.md` (R1 to R4). Searched the
  repository outside `changes/`, `CHANGELOG.md` and `node_modules/`, SVG files and `package-lock.json` left out, with
  `git grep` for "beyond the request" and `BTR`, for "renumber" and "numbered again", and for "number" on a line that
  also holds "item", "remov", "again", "taken", "declin" or "left out": no text, code or prompt says that a taken or a
  declined item is removed from the list or that the items are numbered again, so nothing else was changed (R5).
  `git diff f1b26ac -- process.md standards.md templates/changes/record.md` prints nothing (R6)
- 2026-11-27T13:44:20Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, logged `wc -w` once the work is
  done, on `8fe98b6`: `process.md` 2562 and `standards.md` 1205, unchanged, and `roles/specifier.md` 954, 91 words more
  than the 863 at `f1b26ac`. The added words are the bullet that keeps the numbers of "Beyond the request", the rule of
  R1 and R2 (R7)
- 2026-11-27T13:44:50Z [Claude Code, anthropic/claude-sonnet-5-5] as the implementer, on `8fe98b6`, `awk` finds no line
  over 120 characters and `grep -nP '\x{2014}'` finds no em dash in the three changed files and `record.md`, and
  `npm run check-changes` exits 0. `npm test` reports 2055 tests, 2020 passed, 34 skipped and 1 failed: "package.json says
  what the package is, where it lives and under which license", whose expected keywords `b863835` on `master` left
  behind when it changed those of `package.json`. The branch changes neither `package.json` nor `tests/` since
  `f1b26ac`, so the failure is on `master` as well, and R8, that `npm test` passes, does not hold. The test is outside
  this unit and was not changed; the plan's box for `npm test` stays open. The status stays `in-progress`

## Amendments
