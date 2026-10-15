---
kind: task
status: in-progress
timestamp: 2026-10-15T21:39:34Z
---

# 0053 Depend on AgentRite 7.0.0

## Description

This repository installs its own release, so that work on the kit follows the released process and `./sandbox.sh`
runs the released sandbox. It is on 6.0.0, from 0044. Release 7.0.0 is published, and step 6 of `RELEASING.md` could
not move this repository to it: the release asks for more than that step's five commands, because 0048 has the
harnesses load `process.md` through `CLAUDE.md` and `opencode.json`. Move the devDependency to it:

* Run the five commands of step 6, in its order: `npm install --save-dev --save-exact agentrite@7.0.0`,
  `npx agentrite refresh`, `npm test`, `npm run check-changes` and `./sandbox.sh --in-place --rebuild true`. The
  diff of `package.json` is the one version, and `refresh` changes no file
* Run `npx agentrite init` with no argument. It writes `opencode.json` at the root, whose `instructions` list holds
  `node_modules/agentrite/process.md`, and skips every other file
* Add the line `@node_modules/agentrite/process.md` to `CLAUDE.md`, on a line of its own above `@AGENTS.md`
* In "What the repository holds besides the package" of `CONTRIBUTING.md`, add a row for `opencode.json`, and say in
  the row of `CLAUDE.md` that it imports `process.md` as well as `AGENTS.md`

Afterwards `npx agentrite refresh` prints `up to date` for the eight role wrappers and `sandbox.sh` and no notice,
`npm test` passes, and `npm run check-changes` exits 0, running the check of the installed 7.0.0.

Not part of this task: the notice `init` prints for this repository's `AGENTS.md`, which is this repository's own and
not the one `init` writes, and moving any other project to 7.0.0.

## Log

- 2026-10-15T21:36:44Z [human] after release 7.0.0 and `agentrite-roles` 2.0.2 were published, and step 6 of
  `RELEASING.md` stopped, asked for a task unit that moves this repository to the release
- 2026-10-15T21:36:44Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the macOS host, on
  `master` at `3d32b2a`, which `npm version` tagged `v7.0.0`. Made the unit as a task: one dependency, two lines of
  wiring and one row, with no decision left open, after 0024 and 0044. Numbered 0053: the plain directories run from
  0001 to 0052. Read `process.md` and `roles/specifier.md` of the installed release 6.0.0, and `RELEASING.md`.
  Checked before writing: step 6 ran its five commands on this host, with Docker Desktop and the release 7.0.0 from
  the registry, and all five passed: `refresh` printed `up to date` for the nine files and the two notices of
  `CLAUDE.md` and `opencode.json`, `npm test` reported 572 tests, 555 passing, 17 skipped and none failing,
  `npm run check-changes` exited 0, and `./sandbox.sh --in-place --rebuild true` exited 0 with
  `allowed local model server at 192.168.65.254:11434` and `firewall verified; dropping to the agent user`. The
  tree held `package.json` and `package-lock.json` and nothing else, and was put back with `git restore .` and
  `npm ci`. `node scripts/agentrite.mjs init`, in a scratch copy of this tree outside the repository, wrote
  `opencode.json` as the description gives it, skipped every other file, and printed the notices of `AGENTS.md` and
  `CLAUDE.md`. The status is `draft`
- 2026-10-15T21:39:07Z [human] asked for the task to be implemented, which is its approval. The status is `approved`
- 2026-10-15T21:39:34Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the macOS host,
  with npm 11.19.1, node 26.9.0 and Docker 29.8.2. Cut `task-0053-depend-on-agentrite-7-0-0` from `master` at
  `6b3949f`. Read `process.md` and `roles/implementer.md` of the installed release 6.0.0, and `record.md`, which is
  the unit's one document. Set the status to `in-progress`
