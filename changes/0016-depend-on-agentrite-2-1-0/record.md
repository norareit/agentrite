---
kind: task
status: draft
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

## Amendments
