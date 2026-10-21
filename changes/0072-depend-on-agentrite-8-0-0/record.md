---
kind: task
status: in-progress
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
- 2026-10-21T21:09:47Z [human] approved the record. The status is `approved`
- 2026-10-21T21:15:01Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  cut `task-0072-depend-on-agentrite-8-0-0` from `master` at `fce1406` and began the work. The status is
  `in-progress`
- 2026-10-21T21:16:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, made the move in `b386a3f`. `npm
  install --save-dev --save-exact agentrite@8.0.0` changed the one version in `package.json` and, with it, the entry
  of `agentrite` in `package-lock.json`. The line of `orchestrator` went into the root `agentrite.json` after
  `standards`. `npm run kit -- refresh` exited 0, printed `refreshed` for `.claude/agents/reviewer.md` and
  `.opencode/agents/reviewer.md` and `up to date` for the ten other files it writes; run again, it printed `up to
  date` for all twelve. On `b386a3f`: the first `npm test` failed one test of 934, `a unit run and its variants run
  at once, each on its own clone, and land on their own branches` in `tests/sandbox-variant.test.mjs`, which found a
  variant's container still running while other suites had containers up; that file alone then passed 5 of 5, and
  the whole of `npm test` run again passed 934 of 934. The failure was not looked into further and is not touched by
  this task. `npm run check-changes` exited 0, and `./sandbox.sh --in-place --rebuild true` rebuilt the image,
  verified the firewall and exited 0. Not run: `npx agentrite orchestrate`
- 2026-10-21T21:16:44Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, settled "Worth knowing when you
  update" of 8.0.0 item by item. The key `orchestrator` of `agentrite.json`: added as above. The status `1` of the
  refusals of `./sandbox.sh`: `sandbox-dev.sh`, the one script of the root that runs it, reads no status of it, and
  the tests run the working tree's sandbox, which is 8.0.0's already, so it asks nothing. The
  directory `.orchestrator`: the start with `--in-place` made none, and the command writes its own `.gitignore` of
  `*` into it, so it asks nothing of `.gitignore`. The reviewer's own commit and the branches whose name holds `--`:
  they change how a unit is run and ask nothing of the files here. The limits of the checks by hand: noted, and ask
  nothing. The reviewer's wrappers: refreshed and committed as above. No rebuild needed: the rebuild was run all the
  same, as the task asks

## Amendments
