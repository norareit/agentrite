---
kind: task
status: in-progress
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
- 2026-10-02T13:30:51Z [human] released 2.0.0, which this unit waited for, and handed it over to be done, which is its
  approval
- 2026-10-02T13:30:51Z [Claude Code, anthropic/claude-opus-5-5] took the implementer role and moved the status to
  `in-progress`
- 2026-10-02T13:31:27Z [Claude Code, anthropic/claude-opus-5-5] ran `npm uninstall @ritenoar/agent-kit` and `npm
  install --save-dev` with the 2.0.0 URL, on the host. The lockfile now pins `@ritenoar/agentrite` 2.0.0 from
  `agentrite.ritenoar.com` with its integrity hash, and holds nothing from the old host. Changed the `check-changes`
  script, the two paths and the sentence in `AGENTS.md`, and the path in the README section on the installed copy, and
  removed the two sentences 0011 had added there
- 2026-10-02T13:31:27Z [Claude Code, anthropic/claude-opus-5-5] ran `npx agentrite-roles claude opencode`, which wrote
  the six wrappers under `.claude/agents/` and `.opencode/agents/` and exited 0. Each points at
  `node_modules/@ritenoar/agentrite/roles/`. Committed only those six files
- 2026-10-02T13:31:27Z [Claude Code, anthropic/claude-opus-5-5] verified on 82a346d: `git grep -n -i -E 'agent[-_
  ]?kit' -- . ':!changes'` prints nothing; `npm test` passed, 144 of 144; `npx tsc -p infra` exited 0; `npm run
  check-changes` exited 0, now running the check from the installed 2.0.0. Not checked: whether either harness picks
  the wrappers up, which takes a new session. No review was run for this task. Moved the status to `implemented`
- 2026-10-02T13:37:16Z [Claude Code, anthropic/claude-opus-5-5] moved the status back to `in-progress`. Setting
  `implemented` was premature: the human had not said so, and asked whether the unit needs a review. It waits for the
  review and for the human's decision on what it returns. Nothing else changed, and the branch is not merged
- 2026-10-02T13:43:54Z [OpenCode, openai/gpt-6.1-sol] took the reviewer role and performed a full review of
  `0012-depend-on-released-agentrite` at `36fd76540ed38e83cae5ea9feee8d1c479170cdc`, against merge base
  `5f0705d10ff7e71a97ce77d2c1b007d6171e0ac6`. Returned C1. Findings saved in
  `.reviews/0012-depend-on-released-agentrite/review-20261002T134143Z-36fd765-gpt-6.1-sol.md`.
  Ran `npm test`, `npm run check-changes`, `npx --no-install tsc -p infra`, diff/search checks, release integrity
  verification and generated-wrapper comparisons. Not verified: fresh-session harness discovery, historical host
  command execution, and the AWS deployment/pointer publication actions recorded in 0011

## Changes

Replaced the devDependency on `@ritenoar/agent-kit` 1.0.3 with `@ritenoar/agentrite` 2.0.0 by its URL, and pointed
the `check-changes` script, `AGENTS.md` and the README's section on the installed copy at it. Added the six role
wrappers that `agentrite-roles` writes, which is what the draft 0004 was for. Nothing outside `changes/` holds the
old name any more.
- 2026-10-02T14:03:26Z [human] asked the implementer to read the review
- 2026-10-02T14:03:26Z [Claude Code, anthropic/claude-opus-5-5] the review returned no blocking finding and one that
  does not block, C1: the six wrappers hold lines longer than the 120 characters `AGENTS.md` sets, twelve in all, the
  description and the pointer line of each. Proposed decline, for the human to decide. The wrappers are committed
  exactly as the released command writes them, which the unit asks for and the reviewer confirmed byte for byte.
  Wrapping them by hand would make them differ from the generator, and the refresh command drafted in 0013 would write
  the long lines back. The same lines are already tracked in `tests/fixtures/claude-agents/`, and Norareit holds the
  same files. If the human agrees, the outcome is an exception to the line limit for files a kit command generates,
  recorded here; writing that exception into `AGENTS.md` as well, or having the generator emit shorter lines, would
  each be work of its own
- 2026-10-02T14:13:37Z [human] decided C1: accepted. No tracked file is to hold a line over 120 characters, whatever
  wrote it, so the proposed decline is not taken
- 2026-10-02T14:13:37Z [Claude Code, anthropic/claude-opus-5-5] applied C1. Rewrote the six wrappers so that no line
  is over 120 characters: the description as a folded YAML scalar, `>-`, and the pointer sentence broken after a word.
  Checked with a YAML parser that each wrapper's frontmatter parses to the same keys and values as before, and that
  each body is the same words. Checked that the harnesses read the folded form, in a scratch project with one such
  wrapper: `opencode agent list` listed it as a subagent, and a fresh `claude -p` session returned its description in
  full. In this repository `opencode agent list` lists all three roles as subagents; Claude Code was not started here.
  The wrappers now differ from what release 2.0.0 writes, so they are no longer what the description of this unit
  says, on purpose: the generator still writes the long lines, and so do the fixtures in
  `tests/fixtures/claude-agents/`, which a change to the generator has to deal with in a unit of its own.
  `package-lock.json` holds five lines over 120 characters, which npm writes and which cannot be wrapped. `npm test`
  passed, 144 of 144

## Amendments
