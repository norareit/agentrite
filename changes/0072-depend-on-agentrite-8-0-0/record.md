---
kind: task
status: draft
timestamp: 2026-10-21T20:46:38Z
---

# 0072 Depend on AgentRite 8.0.0

## Description

This repository installs its own release, so that work on the kit follows the released process and `./sandbox.sh`
runs the released sandbox. It is on 7.3.0. Release 8.0.0 is published, and step 6 of `RELEASING.md` could not move
this repository to it: `npm run kit -- refresh` of 8.0.0 refuses the root `agentrite.json`, which lacks the key
`orchestrator` that 8.0.0 requires. Move the devDependency to it:

* Run `npm install --save-dev --save-exact agentrite@8.0.0`. The diff of `package.json` is the one version
* Add `"orchestrator": "node_modules/agentrite/orchestrator.json",` to the root `agentrite.json`, after
  `standards`, as "Worth knowing when you update" of 8.0.0 gives it. The file is then the default file of 8.0.0
  with the role `spec-reviewer` of this repository added to `roles` after the four, and differs from it in
  nothing else
* Run `npm run kit -- refresh`. It refreshes the reviewer's wrappers of Claude Code and OpenCode, whose description
  8.0.0 changed, and prints `up to date` for every other file it writes
* Run `npm test`, `npm run check-changes` and `./sandbox.sh --in-place --rebuild true`

Afterwards `npm run kit -- refresh` prints `up to date` for every file it writes; `npm test` passes, including the
tests that judge the root's files against the installed release; `npm run check-changes` exits 0; and
`./sandbox.sh --in-place --rebuild true` exits 0. Once this is done, `npx agentrite orchestrate` reads the root
`agentrite.json` again, and this repository can run its own orchestrator.

The record says how each instruction of "Worth knowing when you update" of 8.0.0 was settled. As the dry run below
found them: the key of `agentrite.json` and the `refresh` are done by the steps above; the status of
`./sandbox.sh`, the directory `.orchestrator`, the reviewer's own commit and the branches whose name holds `--` ask
nothing here; the limits of the checks by hand ask nothing; and no rebuild is needed, which the start above does all
the same.

Not part of this task: moving any other project to 8.0.0, and the order of step 6 of `RELEASING.md`, which unit
0073 takes up.

## Log

- 2026-10-21T20:46:38Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `3301f72`, on the human's request after step 6 of the release of 8.0.0 stopped. Made the unit as a task:
  one dependency, one line of the settings and the files `refresh` writes, with no decision left open, as 0062 was.
  Numbered 0072: the highest number in `changes/` is 0071. Step 6 ran on this host on `master` at `3301f72`: `npm
  install --save-dev --save-exact agentrite@8.0.0` exited 0, and `npm run kit -- refresh` printed `agentrite:
  agentrite.json: orchestrator is missing` and exited 1; the tree was put back with `git restore .` and `npm ci`.
  Checked before writing, in a clone of `master` outside the repository with 8.0.0 from the registry unpacked under
  `node_modules/agentrite`: with the line added, the root `agentrite.json` without `spec-reviewer` was the default file
  of 8.0.0; its `refresh` exited 0, refreshed `.claude/agents/reviewer.md` and `.opencode/agents/reviewer.md`, printed
  `up to date` for every other file, and changed nothing else. Not run there: `npm test` and the sandbox. The status is
  `draft`

## Amendments
