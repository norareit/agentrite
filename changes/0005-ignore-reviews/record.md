---
kind: task
status: implemented
timestamp: 2026-09-25T00:41:12Z
---

# 0005 Ignore the reviews directory

## Description

`process.md` has the reviewer save its findings in the ignored `.reviews/<unit-directory>/` directory, but this
repository's `.gitignore` does not list `.reviews/`, so the first review left it untracked in the working tree. Add
`.reviews/` to `.gitignore`.

## Log

- 2026-09-25T00:41:12Z [human] asked for `.reviews/` to be added to `.gitignore`
- 2026-09-25T00:41:12Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: one line in
  `.gitignore`, with no decision left open
- 2026-09-25T00:41:12Z [human] approved the unit, in the same request that asked for it
- 2026-09-25T00:41:12Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role, moved the status to
  `in-progress`, and appended `.reviews/` to `.gitignore`. `git status --untracked-files=all` then listed nothing
  under `.reviews/`, which holds the 0003 review. No tests were affected and none were run; no review was run for
  this task. Moved the status to `implemented`

## Changes

Added `.reviews/` to `.gitignore`.
