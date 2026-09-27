---
kind: task
status: implemented
timestamp: 2026-09-27T22:30:21Z
---

# 0009 README cleanup

## Description

A collection of small clarifications to `README.md`, found while reading it for the first time. More items are
expected to be added to this unit before it is implemented.

* The setup step for the change check says only to wire `scripts/check-changes.mjs` to a command of the project's
  own. It does not show how, and the script has no shebang, so the path it names cannot be run without `node`. Show
  an npm script as an example, and say what the check reports and that it takes an optional repository root
* This repository follows the kit's own process but does not wire the change check itself. Add the same npm script to
  its `package.json`, so that the README example is the setup this repository uses
* "Sending an improvement back" is a remnant of the kit's git subtree days, when it held the `git subtree push`
  command. What is left of it is one point, that an improvement is made in the kit and not under `node_modules`,
  which belongs with updating a project to a newer kit. Under it sits `### Egress`, which is about the sandbox. Fold
  the section's text into "Updating a project to a newer kit", and move "Egress" under "Running the sandbox"
* The sections alternate between a project's reader and the kit's maintainer, and "Where to run it" serves both.
  Order the project's sections first, as the install lifecycle and then the sandbox, and the kit's after them, with
  releasing last and taking the host-only sentence from "Where to run it". Rejoin a sentence in "Releasing" that is
  broken over three lines

## Log

- 2026-09-27T22:30:21Z [human] asked for the change check's setup step in the README to show an example, under a
  generic README cleanup unit that further items will be added to
- 2026-09-27T22:30:21Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: the items are small
  documentation edits with no decision left open. Numbered 0009, because 0008 is taken by
  `bugfix-0008-shared-node-modules` on its own branch
- 2026-09-27T22:30:21Z [human] approved the unit, in the same request that asked for it
- 2026-09-27T22:30:21Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`
- 2026-09-27T22:30:21Z [Claude Code, anthropic/claude-opus-5-5] showed an npm script for the change check in the
  README's setup steps, added the same script to this repository's `package.json`, and documented it under the kit's
  own tests. `npm run check-changes` exited 0 and `npm test` passed 84 of 84. No review was run
- 2026-09-27T22:58:28Z [human] pointed out that "Sending an improvement back" is a remnant of an earlier version of
  the kit, and approved removing the section once its text is folded into "Updating a project to a newer kit", with
  "Egress" moved under "Running the sandbox"
- 2026-09-27T22:58:28Z [Claude Code, anthropic/claude-opus-5-5] folded the section into "Updating a project to a
  newer kit" as a closing paragraph keeping each of its statements, and moved "Egress" unchanged to follow "The home
  volume". No review was run
- 2026-09-27T23:01:45Z [human] asked whether the order of the sections made sense, and approved the proposed order
- 2026-09-27T23:01:45Z [Claude Code, anthropic/claude-opus-5-5] reordered the sections, moving each unchanged,
  split "Where to run it" so that its releasing sentence closes "Releasing", and rejoined the broken sentence. No
  review was run
- 2026-09-27T23:02:59Z [OpenCode, openai/gpt-6-sol] reviewed unit 0009 at commit
  `b113b2f46d7affb94d6e52da0b7f7f30cdee3f82` against merge base `c0e020ed2fd3a80d7b6c4ba65940c7a43a935bff` (full
  review). No findings. Review saved in `.reviews/0009-readme-cleanup/review-b113b2f.md`. The tests and change check
  passed on the working tree; an exact clean-checkout run of the reviewed commit was not verified because
  `package.json` and `package-lock.json` had pre-existing uncommitted dependency updates
- 2026-09-27T23:03:41Z [human] approved the unit as done, with the review returning no findings
- 2026-09-27T23:03:41Z [Claude Code, anthropic/claude-opus-5-5] rewrapped the review entry at 120 characters
  without changing its wording, and moved the status to `implemented`. The uncommitted update of the kit's own copy
  to 1.0.3 in `package.json` and `package-lock.json` is not part of this unit

## Changes

* `README.md`: the change check's setup step shows an npm script running it with `node`, what the check reports, and
  its optional repository root argument. The section on the kit's own tests shows `npm run check-changes`
* `README.md`: "Sending an improvement back" is removed, its text now a paragraph closing "Updating a project to a
  newer kit". "Egress" is a subsection of "Running the sandbox", after "The home volume"
* `README.md`: the sections run from the project's install lifecycle (installing, a fresh clone, updating, where to
  run it) to the sandbox, then the kit's own tests, its own copy of the kit, and releasing. "Where to run it" keeps
  the install paragraph; its releasing sentence closes "Releasing"
* `package.json`: a `check-changes` script running the check from the installed kit
