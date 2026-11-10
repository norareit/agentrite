---
kind: task
status: implemented
timestamp: 2026-11-10T10:31:21Z
---

# 0105 The root agentrite.json ahead of a release

## Description

The bullet of "The kit's own copy of the kit" in `CONTRIBUTING.md` that opens with "The root is a project of the
installed release" says three things that no longer hold:

* That the root's `agentrite.json` is the installed release's default file with this repository's own roles added,
  and differs from it in nothing else. Unit 0095 added `process` to the root's file before a release had the key,
  and it had to: in this repository `npx agentrite` runs the working tree's command, which refuses a file that lacks
  a key it requires
* That the suite checks both the root's file and the `refresh` of the installed release. Task 0096 dropped the check
  of the root's file against the installed release's default file, and only the check of `refresh` is left
* That a unit that changes what a project holds changes the root's files only when the repository moves to the
  release that holds it, with no exception for a required key of `agentrite.json`

So a unit that adds a required key reads, against that bullet, as if it should keep the key out of the root's file
until the release. That would leave this repository refused by the working tree's `npx agentrite`, by `units` and
`approve` among it, from the moment the unit is implemented.

The human decided the rule: a unit that adds a required key to `agentrite.json` adds it to the root's
`agentrite.json` in the same unit. The installed release ignores a key it does not know, so `npm run kit`, `npm run
check-changes`, `./sandbox.sh` and the check of `refresh` go on as before.

The change, to that bullet of `CONTRIBUTING.md`, and to nothing else:

* The root's `agentrite.json` is the installed release's default file,
  `node_modules/agentrite/templates/project/agentrite.json`, with the roles of this repository's own added to
  `roles` after the four, and with each required key that a unit added after that release, which the installed
  release ignores
* A unit that adds a required key to `agentrite.json` adds it to the root's file in the same unit, with the value
  this repository uses, because the working tree's `npx agentrite` reads the whole file and refuses it without the
  key
* The installed release's `refresh`, run at the root with no argument as `npm run kit -- refresh`, prints `up to
  date` for every file it writes and changes none, and the suite checks it. The sentence that the suite checks both
  goes
* Apart from such a key, a unit that changes what a project holds changes the root's files only when the repository
  moves to the release that holds it

The other text of the section stays as it is, and so does the bullet of "Adding a harness" that names this
repository's own files and refers to the section for a new harness: a harness is not a key, and the installed
release refuses a harness in `harnesses` that it does not know.

Afterwards no line of `CONTRIBUTING.md` but the rows of a Markdown table is longer than 120 characters, `npm test`
passes, and `npm run check-changes` exits 0.

Not part of this task: a test that the root's file holds every key the working tree's template holds, and any
change to `AGENTS.md`, which states nothing of the root's files.

## Log

- 2026-11-10T10:31:21Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, on `master` at `ca112f6`, on the
  human's request to correct the bullet of "The kit's own copy of the kit" in `CONTRIBUTING.md` on the root's
  `agentrite.json`, after the planning of a unit that adds a required key stopped on it. Read that section and the
  bullet of "Adding a harness" that refers to it, the record of task 0096, the commit of unit 0095 that added
  `process` to the root's file, and "npm run kit" of `CONTRIBUTING.md` on what `npx agentrite` runs here. Made the
  unit as a task: one bullet of one document, with the one decision made by the human. Numbered 0105: the highest
  number in `changes/` is 0104. Wrote `record.md`. The status is `draft`
- 2026-11-10T14:51:47Z [human] approved the record. The status is `approved`
- 2026-11-10T14:52:16Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, cut
  `task-0105-the-root-agentrite-json-ahead-of-a-release` from `master` at `0c9bdee` and began the work. The status is
  `in-progress`
- 2026-11-10T14:58:02Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, rewrote the bullet of "The kit's
  own copy of the kit" in `CONTRIBUTING.md` that opens with "The root is a project of the installed release" in
  `38217a5`, as the four points of the description say, and changed no other text. Kept the bullet as prose rather
  than sub-bullets, since `CONTRIBUTING.md` has no nested list. On `38217a5`: no line of `CONTRIBUTING.md` outside a
  table row is longer than 120 characters, checked with `awk`; `npm test` passes, 1898 tests and none failing; `npm
  run check-changes` exits 0; `npm run kit -- refresh` prints `up to date` for every file and leaves the tree clean.
  The root's `agentrite.json` holds `modelServer`, which the installed release's default file does not, as the
  rewritten bullet now allows. Handed over for review. The status stays `in-progress`
- 2026-11-10T14:59:20Z [OpenCode, openai/gpt-6.1-sol] as the reviewer, reviewed unit 0105 at `e7448f4` in a full
  review against the merge base `0c9bdee` with `master`. No findings on any of the three axes. Saved the review in
  `.reviews/0105-the-root-agentrite-json-ahead-of-a-release/review-2026-11-10T145920Z.md`. Ran `npm test`: 1898
  passed, none failed or skipped; `npm run check-changes` and `git diff --check master...HEAD` exited 0. Checked
  every non-table line of `CONTRIBUTING.md` against the 120-character limit; none exceeds it. The status stays
  `in-progress`
- 2026-11-10T15:01:35Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, on the human's word that the
  review found nothing: the review of `e7448f4` returned no finding, so none blocks, and the task has no `plan.md`.
  On `1b4f32c`, `npm test` passes, 1898 tests and none failing. The status is `implemented`

## Amendments
