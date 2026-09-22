# agent-kit

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects vendor this repository with `git subtree` and keep only what is specific to
them.

## What is here

| Path                 | What it holds                                                                     |
|----------------------|-----------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards |
| `roles/`             | The planner, implementer and reviewer instructions                                |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit               |
| `scripts/`           | `check-changes.mjs`, which enforces the freeze on implemented units               |
| `tests/`             | The kit's own unit tests, run by node's built-in test runner                      |
| `container/`         | The agent sandbox: image, entrypoint, base Compose file and wrapper               |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## Vendoring it into a project

The kit is vendored at `agent-kit/`, not `.agent-kit/`: agents read these files constantly and some search tools
skip dot directories.

```sh
git remote add agent-kit git@bitbucket.org:ritenoar/agent-kit.git
git subtree add --prefix agent-kit agent-kit master --squash
```

The subtree lands as ordinary committed files, so every clone has them and no `--recursive` or install step is
needed.

Then, in the project:

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
versions are pinned in `container/Dockerfile`, so a project updates Claude Code and OpenCode by pulling the kit and
rebuilding.

The build context is the project root, not the kit directory, because the Dockerfile installs the project's own
dependencies to get Playwright's system libraries at the version the project resolved. The wrapper passes
`--project-directory` so that relative paths in both compose files resolve from the project root.

## Pulling an update into a project

```sh
git subtree pull --prefix agent-kit agent-kit master --squash
```

## Sending an improvement back

Make the change in the project's `agent-kit/` directory, commit it there, and push the subtree:

```sh
git subtree push --prefix agent-kit agent-kit master
```

This is how an improvement found while working in one project reaches the others: each of them picks it up with the
pull above.

## These are host commands

`git subtree pull` and `git subtree push` reach `bitbucket.org`, which is not on the sandbox's egress allowlist, and
no git credential is mounted into the container. Run them on the host, outside the sandbox.

## The kit's own tests

```sh
npm test
```

No dependencies and no install step: it runs node's built-in test runner over `tests/`.
