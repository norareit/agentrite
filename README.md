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

## The name

A rite is a prescribed way of doing something, and that is what this kit is at its core. `process.md` lays down how
a change is specified, planned, recorded and frozen, and the roles and the sandbox exist so that agents follow it.

The name reads three ways, and all three are meant:

* a **rite** for agents: the process they work by
* agents done **right**
* agents that **write**

The "rite" is also Ritenoar's, whose projects carry it.

## The sandbox

The sandbox is a Docker container that a harness is run in, with a clone of a unit's branch or the project mounted
read-write at `/work`. `./sandbox.sh` starts it, in the forms "Commands" of `COMMANDS.md` gives. The reference is
[`SANDBOX.md`](SANDBOX.md), which in a project is at `node_modules/agentrite/SANDBOX.md`.

## The components

![The components of the kit: ./sandbox.sh runs agentrite orchestrate, which runs agentrite run, which starts a harness,
Claude Code, OpenCode or Codex; the harness reads the role wrappers, which point at the roles, which follow process.md
and the standards, the kit's or the project's own; and the harness reads and writes the units in
changes/](https://raw.githubusercontent.com/norareit/agentrite/master/diagrams/components.svg)

## Quick start

Install the kit into the project, and set the project up from its root, naming only the harnesses it uses:

```sh
npm install --save-dev agentrite
npx agentrite init claude opencode
```

Commit what the two wrote on the default branch, the dependency in `package.json` and `package-lock.json` and the
files `init` wrote, once `git status` shows nothing else. The sandbox works on a clone of what is committed, and
without them the clone has neither the kit nor the project's settings:

```sh
git status
git add -A
git commit -m "Install AgentRite"
```

Then take a first unit from its spec to the merge:

1. Specify it on the default branch, in a session of the harness with the specifier as its agent, and ask for the
   change. The specifier writes the unit's `spec.md` and `record.md` under `changes/`, here `changes/0001-...`:

   ```sh
   claude --agent specifier
   ```

2. Read the spec, have it corrected where needed, and approve it:

   ```sh
   npx agentrite approve 0001
   ```

3. Start the sandbox on the unit. It cuts the unit's branch and opens a shell in the container:

   ```sh
   ./sandbox.sh 0001
   ```

4. In the sandbox, plan, implement and review the unit, one role at a time:

   ```sh
   npx agentrite run planner claude 0001
   npx agentrite run implementer claude 0001
   npx agentrite run reviewer opencode 0001
   ```

   Or have the orchestrator take it through the three:

   ```sh
   npx agentrite orchestrate 0001 --skip-permissions
   ```

5. Leave the sandbox with `exit`. The unit's branch on the host is brought up to date with the work of the sandbox
6. Merge the unit's branch on the default branch, once the unit is `implemented`:

   ```sh
   git merge feature-0001-...
   ```

Everything else about installing the kit, configuring it and keeping it up to date is in [`SETUP.md`](SETUP.md).

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

A unit moves through these statuses, as `process.md` gives them:

| Status        | Set by                                  | When                                                                           |
|---------------|-----------------------------------------|--------------------------------------------------------------------------------|
| `draft`       | The specifier                           | It wrote the spec, or a task's record                                          |
| `approved`    | The human, with `npx agentrite approve` | The human approved the spec, or a task's record                                |
| `in-progress` | The implementer                         | It began the work                                                              |
| `implemented` | The implementer, or the human           | The human decided every blocking finding, and every task of the plan is ticked |
| `cancelled`   | The human, with `npx agentrite cancel`  | From `draft`, `approved` or `in-progress`, for a unit that will not be done    |

![The workflow: on the default branch you specify the unit with the specifier and approve it; ./sandbox.sh starts the
sandbox on the unit's branch, where the planner creates the plan, the implementer implements the changes and a reviewer
of another model family reviews against the spec and the plan, back to the implementer for its findings, or agentrite
orchestrate runs all three at once; you then exit the sandbox, which brings the branch back, and merge
it](https://raw.githubusercontent.com/norareit/agentrite/master/diagrams/workflow.svg)

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

## The documents

* [`COMMANDS.md`](COMMANDS.md): what does a command take, what does it do and how does it exit?
* [`ORCHESTRATOR.md`](ORCHESTRATOR.md): how does the orchestrator take a unit through its roles, and what does a run
  keep?
* [`SETUP.md`](SETUP.md): how is the kit installed into a project, or the sandbox alone without the change process,
  configured, given other roles and updated?
* [`SANDBOX.md`](SANDBOX.md): how is an agent run in the sandbox, and what does the sandbox keep it from?
* [`CHANGELOG.md`](CHANGELOG.md): what did a release change, and what is to be done when updating to it?
* [`CONTRIBUTING.md`](CONTRIBUTING.md): how is the kit itself worked on?

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
