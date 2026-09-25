---
kind: task
status: draft
timestamp: 2026-09-25T00:35:00Z
---

# 0004 Generate the kit's own role wrappers

## Description

Once 0002's `agent-kit-roles` command is released, update this repository's own dependency on the kit, from 0003, to
that release, and run `npx agent-kit-roles claude opencode` at the root, so that the kit registers its three roles
with both harnesses using its released command. Commit the six wrappers it writes and the dependency update.

This waits for two things: 0002 implemented, and a release that contains it, which the human makes. Until then it
stays `draft`.

## Log

- 2026-09-25T00:35:00Z [human] asked for the kit to create its own role wrappers with the released command, after
  0002 is released
- 2026-09-25T00:35:00Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: an update and one
  command, with no decision left open. Blocked on 0002 and on its release
