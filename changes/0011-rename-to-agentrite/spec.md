# 0011 Rename the kit to AgentRite

## Context

The kit is called `agent-kit`: the npm package `@ritenoar/agent-kit`, the commands `agent-kit` and
`agent-kit-roles`, the release host `agent-kit.ritenoar.com`, and the repository `ritenoar/agent-kit`. The name
suited a private kit used by its author's own projects. Several of those projects are to be open sourced, which makes
the kit public with them, and `agent-kit` is a name many unrelated projects already use. A public project needs a name
that identifies it.

The new name is AgentRite. One project depends on the kit today, Norareit, at release 1.0.3.

The name is not held anywhere on npm. The scope `@ritenoar` does not exist there, so anyone could create it and
publish `@ritenoar/agentrite`. The unscoped names matter for a second reason: `npx <command>` in a project where the
kit is not installed fetches the registry package of that name and runs it, so whoever publishes `agentrite` decides
what `npx agentrite init` runs for someone who has not installed the kit yet.

## Requirements

1. The package is named `@ritenoar/agentrite`. It stays `private`, so that `npm publish` refuses it
2. The kit ships the commands `agentrite`, with its `init` subcommand, and `agentrite-roles`, and no command named
   `agent-kit` or `agent-kit-roles`. Their usage lines and error messages name the new commands. They behave as
   before in every other respect
3. Everything the kit writes into a project or tells a project to write names the installed kit as
   `node_modules/@ritenoar/agentrite/`: the role wrappers, the generated `AGENTS.md`, `CLAUDE.md`, `agent.sh` and
   `agent/compose.project.yml`, the `check-changes` script `init` adds, and the `.dockerignore` exception `init`
   writes or appends
4. The wrapper passes the kit's `container/` directory to Compose and the Dockerfile as `AGENTRITE_CONTAINER`, and
   nothing reads `AGENT_KIT_CONTAINER`
5. The infrastructure code serves releases from `agentrite.ritenoar.com`, from two stacks named `AgentRiteCertStack`
   and `AgentRiteHostingStack` with a bucket of their own, and `deploy.sh` deploys and reads those two. The code
   defines nothing for `agent-kit.ritenoar.com` and no stack under the old names
6. `KIT_ALLOWLIST` holds `agentrite.ritenoar.com` and does not hold `agent-kit.ritenoar.com`
7. `README.md` opens with the name AgentRite and the tagline "A kit for running coding agents by a fixed process.",
   followed by a section that explains the name with both of these points:
   * a rite is a prescribed way of doing something, and the kit's core is exactly that: the process a change goes
     through, which the roles and the sandbox exist to make agents follow
   * the name reads three ways, all meant: a rite for agents, agents done right, and agents that write

   Everything the README said before is still there, with the names, paths, host and commands updated. Its example
   release URLs name versions that can exist on the new host, which starts at 2.0.0
8. No tracked file outside `changes/` holds the old name in any spelling, which covers `agent-kit`, `agent kit`,
   `AgentKit` and `AGENT_KIT`, except for the self-references of requirement 9. Prose that said "the agent kit"
   says "AgentRite" or "the kit"
9. This repository keeps depending on the released `@ritenoar/agent-kit` 1.0.3 until a release under the new name
   exists: its own `AGENTS.md`, its `check-changes` npm script and its devDependency still name the old package, so
   that the instructions `AGENTS.md` points at exist on disk throughout, and the README's description of that
   installed copy names the path it has on disk
10. The `spec.md` and `plan.md` of every implemented unit in `changes/`, and the directory names there, are
    unchanged
11. The repository holds two packages that are published to the npm registry, named `agentrite` and
    `agentrite-roles`. Each ships one command of its own name, which prints that the kit is the package
    `@ritenoar/agentrite`, that it is installed from a release URL and not from the registry, and the address of the
    repository whose README has the command, and then exits non-zero. Each has no dependencies and no install
    scripts. Neither is part of the kit's tarball
12. `npm test` passes, with the test files and fixtures named and worded after the new name

## Decisions

* **The name is AgentRite.** A rite is a prescribed way of doing something, which is what `process.md` is: the
  spec, the plan, the record, the status progression and the freeze. The name reads as a rite for agents, agents done
  right, and agents that write. It follows the author's other project names, which take "rite" from Ritenoar. On
  2026-10-02 `agentrite` was unclaimed on npm and returned no repository on GitHub. `AIKitRite` was considered and
  rejected: three stacked parts weaken the pun and its lowercase form is hard to read. `RiteKit` is an existing
  company, and `riteway` an existing npm package
* **The lowercase form is one word, `agentrite`, everywhere.** The package, the commands, the host, the tarball and
  the repository all spell it the same, without a hyphen. The display form, in prose and headings, is AgentRite
* **The word "kit" stays as the common noun.** The tagline calls AgentRite a kit, and the documents keep saying
  "the kit" where they did. Only "agent kit" used as the name is replaced. Names that describe a thing rather than
  carry the project's name, such as `KIT_ALLOWLIST` and `KIT_CONTAINER`, are left alone
* **The kit stays self-hosted, and the npm scope is reserved without publishing the kit.** `history-0037` chose a
  tarball host over the registry because a published version cannot be withdrawn, and named publishing as the
  fallback. The human confirmed that choice on 2026-10-02, knowing the kit is going public: the ability to delete a
  release is kept, and publishing later stays possible while the reverse does not. Creating the `ritenoar`
  organisation on npm is enough to keep anyone else from publishing under `@ritenoar/`
* **The unscoped names are held by pointer packages.** A name on npm is held only by publishing under it. A package
  whose command prints where the kit really is closes the `npx` hole described in the context, and has a working
  purpose, which a bare placeholder would not. Publishing the kit itself unscoped was rejected because it would end
  self-hosting and break the `@ritenoar/` convention. Leaving the names unclaimed was rejected because of the hole
* **There are two pointer packages, not one.** `npx agentrite-roles` resolves the registry package `agentrite-roles`,
  not a command inside `agentrite`, and the README documents both commands with `npx`. So each command name needs
  its own package. Folding `agentrite-roles` into a subcommand of `agentrite` would remove the second name, but it
  changes a command's interface, which a rename should not
* **The pointer names the repository, not a release URL.** A release URL carries a version and would be stale after
  the next release. The repository's README always has the current command
* **The new stacks are created beside the old ones, and the old ones are destroyed last.** The new stacks differ in
  name, host and bucket, so nothing collides. This repository's own `npm ci`, which `deploy.sh` runs before a
  release, and Norareit's both fetch 1.0.3 from the old host until they have moved, so the old host has to answer
  until then. Renaming the existing stacks in place was rejected: a stack cannot be renamed, and the retained bucket
  and the alias on the old distribution would be left behind
* **Old releases are not carried over.** The new bucket starts empty and its first release is 2.0.0. Nothing but
  Norareit and this repository pins a 1.x release, and both move. Once the old stacks are gone, commits of either
  repository from before the move can no longer run `npm ci`. The human accepted that on 2026-10-02
* **The first release under the new name is 2.0.0.** The package name, both commands and the installed path all
  change, which breaks every consumer, and 2.0.0 keeps the version history in one line. Starting again at 1.0.0 would
  not collide, since the name is new, but it would make two different releases answer to "1.0.0" in the records
* **History in `changes/` is not rewritten.** Implemented specs and plans are frozen and record what the kit was
  called when they were written. The one unit still open under the old name, the draft `0004`, would tell its
  implementer to run a command that no longer exists. It is not reworded here: 0012 supersedes it, and does its work
  with the new command
* **The self-dependency moves in a unit of its own, 0012.** The new package can only be installed once it is
  released, and a release should follow the review of what it contains. So this unit ends with the repository still
  reading its instructions from the old release, and 0012 moves it after the human has released 2.0.0, as 0003 did
  for the first release

## Non-goals

* Publishing the kit itself to the npm registry
* Making the repository public, moving it to another host, or choosing a licence. The pointer packages name the
  Bitbucket repository, which is where the project is; whether it is readable by others is the human's to decide
* Registering a domain. `agentrite.com` is held by a reseller, and the human decided against `agentrite.dev`
* A `latest` pointer on the release host, or any other way to learn that a newer release exists
* Moving Norareit to the new package. That is a unit in Norareit, listed in this unit's plan only as a step for the
  human
* Destroying the old stacks, renaming the Bitbucket repository and the working directories, and moving the
  per-machine state of Claude Code, OpenCode and IntelliJ. Those are the human's, and the plan lists them in order
* Changing what any command does
