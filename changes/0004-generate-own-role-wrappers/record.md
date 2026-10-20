---
kind: task
status: implemented
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
- 2026-10-02T11:47:22Z [human] decided that this unit is not done on its own. The kit is being renamed to AgentRite in
  0011, and the wrappers are generated with the renamed command once that is released
- 2026-10-02T11:47:22Z [Claude Code, anthropic/claude-opus-5-5] superseded by `0012-depend-on-released-agentrite`,
  which names this unit in its `supersedes` field and does its work. This unit is not implemented and stays `draft`,
  the process having no status for a unit that is dropped. Its description is left as written, naming the command as
  it was called then
- 2026-10-20T12:35:02Z [human] decided that this unit is set `implemented`, so that it is no longer listed among the
  open units. Its work was done by `0012-depend-on-released-agentrite`, which supersedes it and is `implemented`
- 2026-10-20T12:35:02Z [Claude Code, anthropic/claude-opus-5-5] set the status to `implemented` on the human's
  decision, from `draft`, without `approved` and `in-progress` between, since nothing was built under this unit. The
  status is `implemented`

## Amendments
