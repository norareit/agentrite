---
kind: task
status: in-progress
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

## Log

- 2026-09-27T22:30:21Z [human] asked for the change check's setup step in the README to show an example, under a
  generic README cleanup unit that further items will be added to
- 2026-09-27T22:30:21Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: the items are small
  documentation edits with no decision left open. Numbered 0009, because 0008 is taken by
  `bugfix-0008-shared-node-modules` on its own branch
- 2026-09-27T22:30:21Z [human] approved the unit, in the same request that asked for it
- 2026-09-27T22:30:21Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`

## Changes
