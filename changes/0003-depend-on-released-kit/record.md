---
kind: task
status: draft
timestamp: 2026-09-25T00:35:00Z
---

# 0003 Depend on the released kit

## Description

`AGENTS.md` makes `node_modules/@ritenoar/agent-kit/process.md` required reading, but this repository does not
install the kit, so the path does not exist here. Add the current release, 1.0.1, as a devDependency by its URL,
`https://agent-kit.ritenoar.com/ritenoar-agent-kit-1.0.1.tgz`, so that agents working on the kit read the released
process and roles rather than the working copy they may be changing.

It is a devDependency, so nothing is added to the tarball, and `node_modules/` is already ignored. The README's
section on the kit's own tests gains a paragraph saying that the kit installs its own latest release, that changes
are made at the root and never under `node_modules`, and that the installed copy moves only by a deliberate update,
as in a project.

## Log

- 2026-09-25T00:35:00Z [human] asked for the kit to install its own current release rather than its working copy, so
  that it can run its own commands and agents can follow its instructions from the path `AGENTS.md` names
- 2026-09-25T00:35:00Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: one dependency and
  one README paragraph, with no decision left open. Checked in a scratch package named `@ritenoar/agent-kit` that
  npm installs the 1.0.1 tarball by URL into a package of the same name
