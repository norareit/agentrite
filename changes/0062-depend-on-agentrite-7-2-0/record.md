---
kind: task
status: in-progress
timestamp: 2026-10-20T16:09:25Z
---

# 0062 Depend on AgentRite 7.2.0

## Description

This repository installs its own release, so that work on the kit follows the released process and `./sandbox.sh`
runs the released sandbox. It is on 7.1.0. Release 7.2.0 is published, and step 6 of `RELEASING.md` could not move
this repository to it: `npm run kit -- refresh` of 7.2.0 refuses the root `agentrite.json`, which lacks the keys
`bell`, `standards` and `roles` that 7.2.0 requires, and the instruction of "Worth knowing when you update" that adds
them is no exact one, since the line of `sandbox` gains a comma. Move the devDependency to it:

* Run `npm install --save-dev --save-exact agentrite@7.2.0`. The diff of `package.json` is the one version
* Make the root `agentrite.json` the default file of 7.2.0 byte for byte, as
  `node_modules/agentrite/templates/project/agentrite.json` holds it: the three keys of 7.1.0, then `bell` as
  `true`, `standards` and `roles` naming the kit's files
* Run `npm run kit -- refresh`. It writes `.agentrite/instructions.md`, prints `up to date` for the eight role
  wrappers and `sandbox.sh`, and prints the notice that `AGENTS.md` does not name `.agentrite/instructions.md`
* Make the opening paragraph of `AGENTS.md` call the files that `.agentrite/instructions.md` names required reading,
  with a link to the list, in the place of the links to the kit's `process.md` and `standards.md`, and say what the
  process and the standards hold, as the `AGENTS.md` that 7.2.0's `init` writes does. The rest of `AGENTS.md`, which
  is this repository's own, is unchanged
* In "What the repository holds besides the package" of `CONTRIBUTING.md`, add a row for `.agentrite/`, the list of
  the instruction files in use, which `refresh` writes
* Run `npm test`, `npm run check-changes` and `./sandbox.sh --in-place --rebuild true`. The rebuild makes the agent a
  member of the group `tty`, which Claude Code needs to ring the bell in the sandbox

Afterwards `npm run kit -- refresh` prints `up to date` for the eight role wrappers, `.agentrite/instructions.md` and
`sandbox.sh`, and no notice; `npm test` passes, including the test that the root `agentrite.json` is the installed
release's default file; `npm run check-changes` exits 0; and `./sandbox.sh --in-place --rebuild true` exits 0.

The record says how each instruction of "Worth knowing when you update" of 7.2.0 was settled. As the dry run below
found them: the keys of `agentrite.json`, the notice of `AGENTS.md` and the rebuild are done by the steps above; what
the sandbox newly admits and that it rings by default ask nothing; and the one on `sandbox/Dockerfile` does not hold
here, since `sandbox/` holds `compose.project.yml` alone.

Not part of this task: moving any other project to 7.2.0, and the wording of `RELEASING.md` on an instruction that
adds a key to `agentrite.json`.

## Log

- 2026-10-20T16:09:25Z [human] after release 7.2.0 was published and pushed, and step 6 of `RELEASING.md` stopped,
  asked for a task unit that moves this repository to the release
- 2026-10-20T16:09:25Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in a session on the Linux host, on
  `master` at `d5227e5`. Made the unit as a task: one dependency, the default file, one paragraph and one row, with
  no decision left open, after 0053. Numbered 0062: the highest number in `changes/` is 0061. Read
  `roles/specifier.md` and `process.md` of the installed release 7.1.0. Step 6 of the release ran on this host on
  `master` at `6008319`: `npm install --save-dev --save-exact agentrite@7.2.0` exited 0, and
  `npm run kit -- refresh` printed `agentrite: agentrite.json: bell is missing. It must hold true or false` and
  exited 1; the tree was put back with `git restore .` and `npm ci`. Checked before writing, in a clone of `master`
  outside the repository with 7.2.0 from the registry unpacked under `node_modules/agentrite`: with the default file
  of 7.2.0 as `agentrite.json`, its `refresh` exited 0, printed `up to date` for the eight wrappers and `sandbox.sh`,
  `wrote .agentrite/instructions.md`, and the notice of `AGENTS.md`, and changed no other file; its `init` with no
  argument skipped every file and printed the notice of `AGENTS.md` with the sections it writes. Not run there:
  `npm test` and the sandbox. The status is `draft`
- 2026-10-20T17:26:22Z [human] approved the record. The status is `approved`
- 2026-10-20T17:26:40Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in a session on the Linux host,
  cut `task-0062-depend-on-agentrite-7-2-0` from `master` at `e768458` and began the work. Read
  `roles/implementer.md` of the installed release 7.1.0. The status is `in-progress`
- 2026-10-20T17:29:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built the task in `a6d2f9a`.
  `npm install --save-dev --save-exact agentrite@7.2.0` changed the version in `package.json` and the lockfile with
  it. The root `agentrite.json` is now byte for byte `templates/project/agentrite.json` of 7.2.0, checked with
  `diff`. `npm run kit -- refresh` then exited 0, printed `up to date` for the eight role wrappers and `sandbox.sh`,
  `wrote .agentrite/instructions.md`, and the notice that `AGENTS.md` does not name it. The opening paragraph of
  `AGENTS.md` now calls the files `.agentrite/instructions.md` names required reading, with a link to it, in the
  wording of the `AGENTS.md` that 7.2.0's `init` writes; the rest of `AGENTS.md` is unchanged. "What the repository
  holds besides the package" of `CONTRIBUTING.md` has a row for `.agentrite/`
- 2026-10-20T17:29:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, settled the instructions of
  "Worth knowing when you update" of 7.2.0: the keys of `agentrite.json`, the notice of `AGENTS.md` and the rebuild
  are done by the steps of the task, as above and below; what the sandbox newly admits and that it rings by default
  ask nothing; the one on `sandbox/Dockerfile` does not hold here, since `sandbox/` holds `compose.project.yml` alone
- 2026-10-20T17:29:24Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, ran on `a6d2f9a`: `npm run kit
  -- refresh` printed `up to date` for the eight role wrappers, `.agentrite/instructions.md` and `sandbox.sh`, and no
  notice, and changed no file; `npm test` passed 745 of 745 tests, including the one that the root `agentrite.json`
  is the installed release's default file; `npm run check-changes` exited 0; `./sandbox.sh --in-place --rebuild
  true` exited 0, its entrypoint verifying the firewall. Not checked: that the agent in the rebuilt sandbox is a
  member of the group `tty`, or that the bell rings there

## Amendments
