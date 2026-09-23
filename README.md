# agent-kit

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install its files with `install.sh` and keep only what is specific to them.

## What is here

| Path                 | What it holds                                                                     |
|----------------------|-----------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards |
| `roles/`             | The planner, implementer and reviewer instructions                                |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit               |
| `scripts/`           | `check-changes.mjs`, which enforces the freeze on implemented units               |
| `tests/`             | The kit's own unit tests, run by node's built-in test runner                      |
| `container/`         | The agent sandbox: image, entrypoint, base Compose file and wrapper               |
| `install.sh`         | The installer, which copies the kit's files into a project                        |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## Installing it into a project

The kit is installed at `agent-kit/`, not `.agent-kit/`: agents read these files constantly and some search tools
skip dot directories. From a clone of this repository, with the project's root as the first argument:

```sh
path/to/agent-kit/install.sh --update path/to/project agent-kit
```

The installer copies in what a project needs, which is `process.md`, `roles/`, `templates/`,
`scripts/check-changes.mjs` and `container/`, and nothing else: not this repository's `changes/`, `tests/`,
`package.json` or this README. The list is `payload` in `install.sh`. It reads the files at a commit with
`git archive`, so the clone it runs from is never checked out and its working tree does not matter.

`--update` installs this clone's `master` and writes the project's `agent-kit.md`, whose first field is the commit
it installed. That file is tracked in the project; the installed directory is not. The installer also records the
commit inside the installed directory, in `.installed-commit`, so a project can tell a missing installation, a stale
one and a correct one apart.

Then, in the project:

* Add `agent-kit/` to `.gitignore`. An edit to an installed file is then never committed, and the next install
  replaces it, which is what makes editing it visibly pointless rather than quietly harmful
* Add a check, run ahead of the project's build and tests, that fails when `agent-kit/.installed-commit` is missing or
  differs from the commit in `agent-kit.md`, and names the install command. It has to belong to the project, because
  it runs when the kit may be entirely absent
* Point `AGENTS.md` at `agent-kit/process.md` and the three files in `agent-kit/roles/`, and keep in it only what is
  specific to the project
* Point the harness wrappers at the kit's role files: `.claude/agents/*.md` for Claude Code, and the `agent` block in
  `opencode.json` for OpenCode
* Wire the change check to a command of the project's own, running `agent-kit/scripts/check-changes.mjs`
* Add `agent/compose.project.yml` and an `agent.sh` shim, as the sandbox section below describes

## Running the sandbox

`container/agent.sh` layers a project's compose file over the kit's base and runs the container. A project gives it
two files:

* `agent.sh` at the project root, a shim that execs `agent-kit/container/agent.sh` so that the documented command
  stays one command from the repository root
* `agent/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and the `PLAYWRIGHT_VERSION` build argument

Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`. The harness
versions are pinned in `container/Dockerfile`, so a project updates Claude Code and OpenCode by updating the kit, as
below, and rebuilding.

The build context is the project root, not the kit directory, because the Dockerfile installs the project's own
dependencies to get Playwright's system libraries at the version the project resolved. The wrapper passes
`--project-directory` so that relative paths in both compose files resolve from the project root.

## Installing the pinned commit

A fresh clone of a project has no `agent-kit/`. Without `--update`, the installer installs the commit the project's
`agent-kit.md` pins and leaves that file alone:

```sh
path/to/agent-kit/install.sh path/to/project agent-kit
```

Run it again whenever the pin changes, after pulling the project. It replaces the installed directory whole, so
nothing the pinned commit does not contain survives, and a second run with the same pin changes nothing. It refuses
a directory that is neither empty nor a previous installation, so a mistyped target cannot destroy anything else.

The pin is authoritative. Installing the kit's latest on every run would mean two people cloning the same project on
different days run agents under different instructions, with nothing in the project's history showing it. The pin
makes a clone reproducible.

## Updating a project to a newer kit

Pull this clone's `master`, then install with `--update`:

```sh
git -C path/to/agent-kit pull
path/to/agent-kit/install.sh --update path/to/project agent-kit
```

That rewrites only the commit in `agent-kit.md`, which the project commits like any other change. Every install
reports how far this clone's `master` has moved past what it installed, and never acts on it: moving the pin is a
deliberate change to the project.

## Sending an improvement back

Make the change here, in the kit repository, and commit it. The installed copy in a project is not a working copy of
this repository and nothing in it reaches here: an improvement found while working in one project is made in the kit,
and each project picks it up with `--update`.

## Where to run it

The installer reads a clone of this repository, which the agent sandbox does not mount, so install and update on the
host, outside the sandbox. A project's `agent.sh` needs the kit installed before the sandbox can start, and the
project directory the sandbox mounts then holds it.

## The kit's own tests

```sh
npm test
```

No dependencies and no install step: it runs node's built-in test runner over `tests/`.
