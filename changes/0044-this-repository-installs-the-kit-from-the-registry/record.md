---
kind: feature
status: in-progress
timestamp: 2026-10-09T18:42:52Z
---

# 0044 This repository installs the kit from the npm registry

## Log

- 2026-10-09T18:32:07Z [human] in a session of Claude Code on the host, after release 6.0.0 was published on the npm
  registry, `agentrite@1.0.0` was marked as deprecated and `agentrite-roles@2.0.1` was published, which are human steps
  1 to 4 of unit 0043. Asked for the unit of step 5, which moves this repository to the release
- 2026-10-09T18:32:07Z [Claude Code, anthropic/claude-opus-5-5] as the specifier, in the main session on the Linux host,
  on `master` at `209efdd`, which holds the release 6.0.0. Read `process.md` and `roles/specifier.md` of the installed
  release 5.0.0. Made the unit as a feature, for the reason its spec gives. Numbered 0044: the plain directories run
  from 0001 to 0043 without a gap, and the `history-` directories do not count. Wrote `spec.md`, from requirement 5 and
  human step 5 of unit 0043. Added to them: the comment in `sandbox/compose.project.yml` that names the kit's release
  host, and `npm ci` inside the working copy's sandbox as something to see. Not checked: that the working copy of
  `scripts/` is what 6.0.0 shipped, which the spec leaves to the planner. The status is `draft`
- 2026-10-09T18:40:39Z [human] approved the spec. The status is `approved`
- 2026-10-09T18:41:40Z [Claude Code, anthropic/claude-opus-5-5] as the planner, in the main session on the Linux host.
  Cut `feature-0044-this-repository-installs-the-kit-from-the-registry` from `master` at `f00617f`, where `npm test`
  passes with 426 tests. Read `roles/planner.md` and `process.md` of the installed release 5.0.0. Wrote `plan.md`: the
  move in one commit, which is the install, what `refresh` writes and the path in the project's own files, then the
  comment above `ALLOWLIST` and the sentence of `CONTRIBUTING.md` in a second, then the verification, of which the two
  commands of requirement 9 need Docker on the host. Checked what the spec left to the planner: the tarball of
  `agentrite@6.0.0` from `registry.npmjs.org`, with the shasum that `npm view` gives, has 29 files, and `diff -r` of
  each against the tree shows no difference, so `npx agentrite` at this root writes what the release writes. Tried tasks
  1 to 6 in a scratch copy made with `git archive`, with npm 11.19.1 and node 26.9.0: the uninstall and the install exit
  0 in a package itself named `agentrite`, `refresh` rewrites the eight wrappers and `sandbox.sh`, the `git grep` of
  requirement 7 finds nothing, and `npm ci`, `npm test` with 426 tests and `npm run check-changes` pass. Not run:
  anything that builds or starts a container. The test of "Beyond the request" is in no task. The status is `planned`
- 2026-10-09T18:42:52Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, in the main session on the Linux
  host, on `feature-0044-this-repository-installs-the-kit-from-the-registry` at `b7e073f`, with npm 11.19.1, node
  26.9.0 and Docker 28.4.0. Read `process.md` and `roles/implementer.md` of the installed release 5.0.0, and the three
  documents of the unit. Set the status to `in-progress`
- 2026-10-09T18:44:34Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, built tasks 1 to 8 of the plan as
  written, in two commits. `2d1b3b1` is the move. `npm uninstall @ritenoar/agentrite` and
  `npm install --save-dev --save-exact agentrite@6.0.0` both exited 0, and the entry of `package-lock.json` is the one
  the plan gives: version `6.0.0`, resolved from `https://registry.npmjs.org/agentrite/-/agentrite-6.0.0.tgz`, with the
  integrity the plan names and the line `"license": "MIT"`. `git diff v6.0.0 -- scripts roles templates` printed
  nothing, and `npx agentrite refresh claude opencode` printed `refreshed` for the eight wrappers and `sandbox.sh` and
  changed no other file. The path was replaced in `AGENTS.md`, `.dockerignore`, `sandbox/compose.project.yml` and the
  `check-changes` script. `e5cee39` is the comment above `ALLOWLIST` and the sentence of `CONTRIBUTING.md`. The ticks
  of `plan.md` are in the commit of this entry and not in those two, so each holds the files its commit point names
- 2026-10-09T18:44:34Z [Claude Code, anthropic/claude-opus-5-5] as the implementer, "Verification", on the tree of
  `e5cee39` with the ticks of `plan.md` not yet committed, on the host:
  * R1: `git diff master -- package.json` shows the devDependency and the `check-changes` script, and no other line
  * R2: `rm -rf node_modules && npm ci` exited 0, `node_modules/agentrite/package.json` has the version `6.0.0`,
    `node_modules/@ritenoar` does not exist, and `git grep -n '@ritenoar' -- package-lock.json` finds nothing
  * R3: `npx agentrite refresh claude opencode`, run again, printed `up to date` for the nine files and changed none
  * R4: `git diff master --stat` names the files of "Files" and `plan.md`, which the list leaves out and which is the
    unit's own. The diff of `AGENTS.md` and of `.dockerignore` is one line each
  * R5: `git diff master -- sandbox/compose.project.yml` shows the two comment lines and no other
  * R6: `git diff master -- CONTRIBUTING.md` shows the two lines of task 8 and no other
  * R7: `git grep -n -e '@ritenoar/agentrite' -e 'agentrite\.ritenoar\.com' -- ':!changes' ':!CHANGELOG.md'` finds
    nothing
  * R8: `npm test` passes with 426 tests and none failing. `npm run check-changes` exited 0 and printed
    `node node_modules/agentrite/scripts/check-changes.mjs` as its command. It reads committed content, and was run
    before the commit of this entry
  * R9, with Docker 28.4.0: `./sandbox.sh --in-place --rebuild true` exited 0. Its build took 11 steps from the cache
    and ended with `ritenoar-agentrite-sandbox  Built`, and the entrypoint ended with
    `firewall verified; dropping to the agent user`. Then `./sandbox-dev.sh --in-place npm ci` exited 0: the same last
    line of the entrypoint, then `added 1 package, and audited 2 packages` and `found 0 vulnerabilities`. Afterwards
    `node_modules/agentrite/package.json` has the version `6.0.0` and `git status --short` shows no file but `plan.md`
  * No line of a changed file but `package-lock.json` passes 120 characters, checked with `awk` over the files that
    `git diff master --name-only` names, before this entry was written
  Not checked: a unit run of `./sandbox-dev.sh`, which the spec names as waiting for this unit and no requirement
  asks for. The status stays `in-progress` until the review

## Amendments
