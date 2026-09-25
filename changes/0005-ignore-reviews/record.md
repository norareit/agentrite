---
kind: task
status: draft
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
