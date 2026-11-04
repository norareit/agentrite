# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `agentrite` and keep only what is
specific to them.

By default the kit holds:

* the process, in `process.md`: how a change is specified, planned, built, reviewed, recorded and frozen
* the standards, in `standards.md`: the rules on how text, documentation, commits, code and tests are written
* four opinionated roles, the specifier, the planner, the implementer and the reviewer, each a file under `roles/`
* the sandbox, a container that an agent runs in

The process is the same in every project. A project can replace the standards, and each of the roles, with a file of its
own, named in its `agentrite.json`. See [Replacing a role or the standards](SETUP.md#replacing-a-role-or-the-standards).
A project can add roles of its own as well. See [Adding a role](SETUP.md#adding-a-role).

* [The name](#the-name)
* [What is here](#what-is-here)
* [How it works](#how-it-works)
* [Commands](COMMANDS.md#commands)
* [The orchestrator](ORCHESTRATOR.md)
* [Setting up a project](SETUP.md)
* [The sandbox](#the-sandbox)

## The name

A rite is a prescribed way of doing something, and that is what this kit is at its core. `process.md` lays down how
a change is specified, planned, recorded and frozen, and the roles and the sandbox exist so that agents follow it.

The name reads three ways, and all three are meant:

* a **rite** for agents: the process they work by
* agents done **right**
* agents that **write**

The "rite" is also Ritenoar's, whose projects carry it.

## What is here

| Path                 | What it holds                                                                             |
|----------------------|-------------------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the roles, the commit prefixes                     |
| `standards.md`       | The rules on how text, documentation, commits, code and tests are written                 |
| `orchestrator.json`  | The orchestrator's default definition, which a project may copy and change                |
| `CHANGELOG.md`       | What each release changed, and what is worth knowing when updating to it                  |
| `README.md`          | What the kit is and how a project uses it                                                 |
| `LICENSE`            | The MIT License, which the kit is open source under                                       |
| `SANDBOX.md`         | The reference of the sandbox                                                              |
| `COMMANDS.md`        | Every command a project runs, with every argument and option, and the exit statuses       |
| `ORCHESTRATOR.md`    | The orchestrator: its definition, how a run ends and what it keeps                        |
| `SETUP.md`           | Installing the kit into a project, its settings, its roles and updating it                |
| `package.json`       | The package's name, its version and the commands it installs                              |
| `roles/`             | The specifier, planner, implementer and reviewer instructions                             |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit                       |
| `templates/project/` | The files `agentrite init` writes, its `commit-msg` hook among them, and `config`'s       |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agentrite` command                        |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, Compose file, wrapper, commit checker |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## How it works

A change is worked as a unit, a directory under `changes/`, by four roles in this order:

| Role        | Is given                      | Produces                                                             |
|-------------|-------------------------------|----------------------------------------------------------------------|
| Specifier   | A request                     | What the unit must make true: its `spec.md`, or a task's `record.md` |
| Planner     | An approved unit              | The unit's `plan.md`: the ordered tasks the implementer then follows |
| Implementer | An approved unit and its plan | The implementation, with the plan ticked and the record kept         |
| Reviewer    | An implemented unit           | Its findings, which it returns and does not apply                    |

A task has no plan, and a bug may have none, which its record then says; the implementer is given such a unit
without one. The rules each role works by are in `process.md`, the project's standards and the role's own file: the
kit's `standards.md` and the files under `roles/`, unless the project replaced them.

Each of the four roles covers one stage of the process and moves the unit through the statuses. A project can add
roles that run just before or just after one of the four, within its stage, and that move it through none. See
[Adding a role](SETUP.md#adding-a-role).

The writers current workflow:

1. Use Claude Code with Opus as the `specifier` role and ask it to refine a feature (or bug or task) together
2. Read the `spec.md` that comes out of this, ask for a few clarifications or corrections if necessary and approve it
3. Run the `sandbox.sh 0007` where `0007` is the change number. This cuts the branch and starts the container
4. Run Claude Code with Opus as the `planner` role and ask it to create a plan for feature 0007
5. Run Claude Code with Sonnet or OpenCode with Qwen 3.8 27b as the `implementer` role and ask it to implement the
   plan
6. Run OpenCode with GPT Sol as the `reviewer` role and ask it to review the code
7. Reopen Claude (`claude -c`) and ask the implementer to check the review and see which changes need to be made
8. Repeat step 6 and 7 until no more issues arise
9. Exit the container. This will fast-forward the branch on the host to the one from the container (which was a
   separate checkout!). At this point it is up to you how to handle the rest. You can create a pull request and check
   the changes yourself, or you can simply mark the change `implemented` and merge it back to the default branch

## The sandbox

The sandbox is a Docker container that a harness is run in, with a clone of a unit's branch or the project mounted
read-write at `/work`. `./sandbox.sh` starts it, in the forms "Commands" of `COMMANDS.md` gives. The reference is
[`SANDBOX.md`](SANDBOX.md), which in a project is at `node_modules/agentrite/SANDBOX.md`.

What a run needs:

* The host needs Docker: Desktop on macOS, Engine on Linux
* Never run it with `sudo`. The wrapper refuses to run with uid or gid 0, because the agent inside the sandbox would
  then be root too. When Docker needs elevated permissions on the machine, add the user to the `docker` group instead
* A run says what it mounts at `/work`, and there is no default. A command that names no unit, and gives no
  `--in-place`, no `--workdir` and no `--connect` either, starts nothing and names the forms

What a run does:

* A unit run, as `./sandbox.sh 0029`, mounts a clone of that unit's branch. It is the way to implement and to review a
  unit. A number that no branch holds and that is a unit on the default branch gets its branch first. See "Running
  a unit" of `SANDBOX.md`
* A run with `--in-place` mounts the project as it is on the host, so the agent works in the developer's own
  checkout, `.git` and `node_modules` included. It is the way to run something on the tree as it is, such as the
  suite
* Either builds the image on first use and opens a shell in the container. A command appended to it runs instead of
  the shell, as in `./sandbox.sh 0029 claude` and `./sandbox.sh --in-place npm test`
* `./sandbox.sh --in-place --rebuild` builds the image again before running
* `./sandbox.sh --connect 0029` mounts and starts nothing: it runs a command in the container of the unit run that is
  under way for the unit, beside what runs there. See "Two agents on one unit" of `SANDBOX.md`
* `./sandbox.sh 0029 --variant opus claude` is a variant of the unit: a unit run of the branch
  `feature-0029-sandbox-clone-of-the-branch--opus`, in a container and on a clone of its own, beside the unit's run and
  other variants. See "Two implementations of one unit" of `SANDBOX.md`
* In a project whose `agentrite.json` holds `"bell": true`, Claude Code and OpenCode in the sandbox ring the
  terminal's bell when they need the developer or stop, with nothing to set in the home volume or on the host. See
  "The bell" of `SANDBOX.md`

What it confines:

* The container's root filesystem is read-only. The agent writes the working directory, its home volume, the
  project's log directory on the host and `/tmp`
* `/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
  that runs what it writes to the temporary directory works as on the host
* Egress is bounded by hostname: HTTPS on port 443 to the allowlisted hosts, and little else. See "Reaching more
  hosts" of `SANDBOX.md`
* Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`

Nothing of the host is reachable but what is mounted at `/work`, with these exceptions:

| Of the host                                       | Mounted    | In `SANDBOX.md`                     |
|---------------------------------------------------|------------|-------------------------------------|
| The developer's `~/.gitconfig`                    | Read-only  |                                     |
| The developer's Claude Code status line           | Read-only  | "The status line"                   |
| The project's log directory                       | Read-write | "Where things are kept on the host" |
| The local model server's port                     |            | "The local model server"            |
| The project's `.reviews`, in a unit run only      | Read-write | "Running a unit"                    |
| The project's `.orchestrator`, in a unit run only | Read-write | "Running a unit"                    |

The `~/.gitconfig` makes commits from inside carry the same name and email as on the host.

A project configures the sandbox with two files, and may add a third:

* `sandbox.sh` at the project root, a shim that execs `node_modules/agentrite/container/sandbox.sh` with the
  project root as its first argument
* `sandbox/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument
* `sandbox/Dockerfile`, which the project may add for software it needs in the sandbox, such as a JDK, and which
  the wrapper builds on the kit's image. `init` and `refresh` do not write it. See "Adding software to the sandbox"
  in [`SANDBOX.md`](SANDBOX.md#adding-software-to-the-sandbox)
