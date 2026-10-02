---
kind: task
status: draft
timestamp: 2026-10-02T10:06:16Z
supersedes: 0004-generate-own-role-wrappers
---

# 0012 Depend on the released AgentRite and generate the role wrappers

## Description

Once 0011 is implemented and the human has released 2.0.0 from it, move this repository's own dependency on the kit
from `@ritenoar/agent-kit` 1.0.3 to `@ritenoar/agentrite` 2.0.0, so that the last places holding the old name go:

* Run `npm uninstall @ritenoar/agent-kit`, then
  `npm install --save-dev https://agentrite.ritenoar.com/ritenoar-agentrite-2.0.0.tgz`, on the host: a sandbox built
  from the old kit does not admit the new host
* Change the `check-changes` script in `package.json` to
  `node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs`
* In `AGENTS.md`, change both occurrences of `node_modules/@ritenoar/agent-kit/process.md` to
  `node_modules/@ritenoar/agentrite/process.md`, and "this project uses the agent kit" to "this project uses
  AgentRite"
* In `README.md`, in "The kit's own copy of the kit", change the path to `node_modules/@ritenoar/agentrite/` and
  remove the sentence 0011 added about the copy still being the last release under the old name

Then do what the draft 0004 was for, which this unit supersedes: run `npx agentrite-roles claude opencode` at the
root, so that the kit registers its three roles with both harnesses using its released command, and commit the six
wrappers it writes under `.claude/agents/` and `.opencode/agents/`. Neither directory exists here yet, so nothing is
in the command's way. The wrappers point at `node_modules/@ritenoar/agentrite/roles/`.

Afterwards `git grep -n -i -E 'agent[-_ ]?kit' -- . ':!changes'` prints nothing, and `npm test` and
`npm run check-changes` pass.

This waits for two things: 0011 implemented, and the 2.0.0 release, which the human makes. Until then it stays
`draft`.

## Log

- 2026-10-02T10:06:16Z [human] asked for the kit to be renamed to AgentRite, in 0011
- 2026-10-02T10:06:16Z [Claude Code, anthropic/claude-opus-5-5] took the planner role, while planning 0011. A task:
  one dependency and four edits, with no decision left open. Blocked on 0011 and on its release, as 0003 was on the
  first release
- 2026-10-02T11:47:22Z [human] decided that 0004 is folded into this unit instead of being done before the rename
- 2026-10-02T11:47:22Z [Claude Code, anthropic/claude-opus-5-5] added the role wrappers to the description and set
  `supersedes` to 0004. Still a task: one more command, with no decision left open

## Amendments
