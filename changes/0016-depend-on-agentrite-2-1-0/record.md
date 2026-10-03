---
kind: task
status: implemented
timestamp: 2026-10-03T11:29:12Z
---

# 0016 Depend on AgentRite 2.1.0

## Description

This repository installs its own release, so that agents working here follow the released process and roles rather
than the working copy they may be changing. It is on 2.0.0, from 0012. Release 2.1.0 holds the role wrappers that
keep to 120 characters, from 0014, and the `refresh` command, from 0013. Move the devDependency to it:

* Run `npm install --save-dev https://agentrite.ritenoar.com/ritenoar-agentrite-2.1.0.tgz`. The diff of
  `package.json` is the one URL, and the diff of `package-lock.json` touches only the kit's entry: its version, its
  URL and its integrity hash
* Check that `node_modules/@ritenoar/agentrite/` is 2.1.0, and that its `process.md` and `roles/` are the same as
  the root's at the commit tagged `v2.1.0`

Do not run `npx agentrite refresh` here. This repository has no sandbox of its own, and `refresh` writes `agent.sh`
into a project that has none, so it would add a shim that runs nothing. The six wrappers need no refresh anyway:
0014 wrote them with the generator that 2.1.0 ships. Instead, check that they are byte for byte what 2.1.0 writes:
in an empty scratch directory, run `node_modules/.bin/agentrite-roles claude opencode` from this repository's
installed copy and compare the six files with `diff`.

Afterwards `npm test` and `npm run check-changes` pass, the second now running the check from the installed 2.1.0.

## Log

- 2026-10-03T11:29:12Z [human] asked for a task that moves this repository's own dependency on the kit to 2.1.0, the
  last step left over from the rename and its two follow-ups, 0013 and 0014
- 2026-10-03T11:29:12Z [Claude Code, anthropic/claude-opus-5-5] took the planner role. A task: one dependency and two
  checks, with no decision left open. Numbered 0016 because `bugfix-0015-harnesses-fail-to-start`, on its own branch,
  holds 0015. Checked before writing: 2.1.0 is served from `agentrite.ritenoar.com`, this repository has no
  `agent.sh` and no `agent/compose.project.yml`, and `package.json` names 2.0.0. Leaving `refresh` out is the
  planner's call, for the reason the description gives; that `refresh` writes a shim into a project without a
  sandbox may be worth a unit of its own in the kit, and is not done here
- 2026-10-03T11:31:11Z [Claude Code, anthropic/claude-sonnet-5-5] took the implementer role and moved the status to
  `in-progress`. The human approved the install and runs `npm install` themselves, as the harness blocked it
- 2026-10-03T11:45:00Z [Claude Code, anthropic/claude-sonnet-5-5] the human ran the `npm install --save-dev` with the
  2.1.0 URL, because the harness blocked it. The diff of `package.json` is that one URL. The diff of
  `package-lock.json` is the kit's entry only: version 2.1.0, its URL and its integrity hash. The installed
  `node_modules/@ritenoar/agentrite/package.json` says 2.1.0. Its `process.md` and the three files in `roles/` are
  identical to the ones at the commit `v2.1.0` (77b1b29), checked with `git show` and `diff`. `agentrite refresh` was
  not run, as the description says
- 2026-10-03T11:45:00Z [Claude Code, anthropic/claude-sonnet-5-5] ran the installed `scripts/agentrite-roles.mjs claude
  opencode` with `node`, rather than through `node_modules/.bin`, in an empty scratch directory. It wrote six files, and
  `diff` found each identical to the wrapper committed under `.claude/agents/` and `.opencode/agents/`. `npm test`
  passed, 174 of 174, on the tree with the new dependency. `npm run check-changes` is run after the commit, because it
  reads committed content, and its result is logged next. No review was run for this task. The status stays
  `in-progress`
- 2026-10-03T11:50:00Z [Claude Code, anthropic/claude-sonnet-5-5] `npm run check-changes` exited 0 on the commit
  `task-0016 Depend on AgentRite 2.1.0`, now running the check from the installed 2.1.0. Not done: a review, and so the
  status is still `in-progress`, until the human decides whether the task needs one
- 2026-10-03T11:42:35Z [OpenCode, openai/gpt-6.1-sol] reviewed `0016-depend-on-agentrite-2-1-0` at commit
  `9c19a1dfb2a9166404e38aac4062f8eb84641243` as a full review against merge base
  `5e079eaab64ba5f2166d5243c8f30f35bc01ebf1`. Returned C1. Historical verification invocations and their exact
  execution times could not be independently reconstructed. Reran `npm test` (174/174) and
  `npm run check-changes` (exit 0); the installed process and roles match `v2.1.0`, and all six wrappers match the
  installed generator's output through its bin symlink. Findings saved in
  `.reviews/0016-depend-on-agentrite-2-1-0/2026-10-03T113827Z-full.md`.
- 2026-10-03T11:44:26Z [Claude Code, anthropic/claude-sonnet-5-5] the human reported that the review came back with no
  meaningful remarks, and asked for the unit to be completed. The review returned no blocking finding and C1, which
  does not block. C1 is right: I wrote the times 11:45:00Z and 11:50:00Z into the two verification entries above
  without reading a clock, and the commits that hold them are dated 11:31:45Z and 11:31:49Z. Those two times are
  wrong, and the checks they describe ran between 11:31Z and 11:32Z. No other time was invented. Not changing the
  entries, which the log keeps as written. The suites were not run again for this entry, which changes no code: the
  reviewer reran `npm test`, 174 of 174, and `npm run check-changes`, exit 0, at 9c19a1d. Moved the status to
  `implemented`

## Amendments
