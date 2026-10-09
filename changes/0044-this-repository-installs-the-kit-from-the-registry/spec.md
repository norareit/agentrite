# 0044 This repository installs the kit from the npm registry

## Context

Unit 0043 put the kit on the npm registry as the package `agentrite`, and release 6.0.0 is its first version there.
A project that the release 5.0.0 set up moves to it by four steps, which requirement 5 of that unit gives and its
implementer tried in a scratch project.

This repository is such a project. It installs its own release as a devDependency, so that work on the kit follows
the released process and `./sandbox.sh` runs the released sandbox. It still installs 5.0.0, as `@ritenoar/agentrite`
from a URL on `agentrite.ritenoar.com`, and its `AGENTS.md`, role wrappers, `sandbox.sh`, `.dockerignore`,
`sandbox/compose.project.yml` and `check-changes` script name `node_modules/@ritenoar/agentrite`. Unit 0043 left all
of that as it was, because no version was on the registry before its release, and step 6 of `RELEASING.md` could
not make the move for 6.0.0: the move takes the four steps and not that step's five commands.

Two things wait for this unit. The host `agentrite.ritenoar.com` is taken down only when no repository installs
from it. And a unit run of `./sandbox-dev.sh` cannot run `npm ci`, because the working copy's sandbox no longer
admits that host while the lockfile still installs from it.

## Requirements

1. `package.json` has the devDependency `agentrite` with exactly `6.0.0` as its version, and no devDependency
   `@ritenoar/agentrite`. Its `check-changes` script is
   `node node_modules/agentrite/scripts/check-changes.mjs`. Nothing else in the file differs
2. `package-lock.json` has an entry `node_modules/agentrite` at version `6.0.0`, resolved from
   `registry.npmjs.org` with an integrity hash, and no entry `node_modules/@ritenoar/agentrite`. `npm ci` exits 0
   with it and installs the kit at `node_modules/agentrite/`
3. The eight role wrappers under `.claude/agents/` and `.opencode/agents/`, and `sandbox.sh`, are what
   `agentrite refresh claude opencode` of release 6.0.0 writes
4. `AGENTS.md`, `.dockerignore` and `sandbox/compose.project.yml` name `node_modules/agentrite` wherever they named
   `node_modules/@ritenoar/agentrite`. Nothing else in `AGENTS.md` and `.dockerignore` differs
5. The comment above `ALLOWLIST` in `sandbox/compose.project.yml` lists the hosts that release 6.0.0 admits itself,
   and so does not name the kit's release host. The file's `name`, its `image`, its limits and its `ALLOWLIST` are
   unchanged
6. "The kit's own copy of the kit" of `CONTRIBUTING.md` says that the kit is a devDependency of itself, installed
   from the npm registry at one pinned version, and that `node_modules/agentrite/` exists here too. Every other
   line of the section is unchanged
7. No tracked file names `@ritenoar/agentrite` or `agentrite.ritenoar.com`, apart from the files under `changes/`
   and `CHANGELOG.md`
8. `npm test` passes, and `npm run check-changes` exits 0 and runs the check of the installed release 6.0.0
9. On the host, `./sandbox.sh --in-place --rebuild true` exits 0, and `./sandbox-dev.sh --in-place npm ci` exits 0.
   The implementer runs both where the session has Docker, or asks the human to, and logs what was seen

## Decisions

* **The steps are those of requirement 5 of unit 0043.** `npm uninstall @ritenoar/agentrite` and the install, then
  `npx agentrite refresh claude opencode`, then the replacement of the path in the project's own files, then the
  rebuild of the sandbox. They were tried there, and this unit is their first use in a real project
* **The install pins one version.** It is `npm install --save-dev --save-exact agentrite@6.0.0`, the command that
  step 6 of `RELEASING.md` gives, so that `package.json` names the one release this repository follows and the diff
  of that step in the next release is one line. `npm install agentrite`, which a project uses, writes a range and a
  dependency and not a devDependency
* **`npx agentrite` here runs the working copy.** At the root of a package that has a `bin` named `agentrite`, npx
  runs that package's own file, which the planner of unit 0043 established. The working copy of `scripts/` is what
  6.0.0 shipped as long as no unit has changed it since, so `refresh` writes what the release writes. The planner
  checks that this holds on the tree the unit is built on
* **The Compose project keeps its name.** `ritenoar-agentrite-sandbox` names the home volume, which holds a login,
  as unit 0043 decided. Only the path of the kit and the comment of requirement 5 change in that file
* **The comment is corrected by hand.** `sandbox/compose.project.yml` is the project's own and `refresh` never
  touches it. Its comment lists the hosts the kit admits, and after the move it would name one that the installed
  release does not admit
* **`CHANGELOG.md` is unchanged.** The devDependency of the kit is not in the package, and the release notes do not
  name its move, as step 2 of `RELEASING.md` says
* **It is a feature and not a task.** It changes a dozen files in a fixed order, has a step that needs Docker on
  the host, and is the first proof of the four steps in a real project, so it gets a plan and a review

## Non-goals

* A release. Nothing in the package changes
* A change to `RELEASING.md`. Its step 6 names the devDependency `agentrite` already, and works from the next
  release on once this unit is on `master`
* Moving the other projects that use the kit, and taking down the host. They are human steps 7 and 8 of unit 0043
* Renaming the Compose project, the image, the home volume or the directories the sandbox keeps on the host
* A change to the records under `changes/` that name the old package

## Beyond the request

* A test that this repository's own setup names no old path: that no tracked file outside `changes/` and
  `CHANGELOG.md` holds `@ritenoar/agentrite`. It would cost one test that reads every tracked file. Without it the
  `git grep` of requirement 7 is run once by the implementer, and a later unit that brings the name back is found
  by whoever reads its diff
