# Working on AgentRite

For whoever changes the kit. What the kit is and how a project uses it is in [`README.md`](README.md), and what the
sandbox does is in [`SANDBOX.md`](SANDBOX.md). This document is not in the package.

* [What the repository holds besides the package](#what-the-repository-holds-besides-the-package)
* [Commands](#commands)
* [The kit's own tests](#the-kits-own-tests)
* [The kit's own copy of the kit](#the-kits-own-copy-of-the-kit)
* [Trying the working copy's sandbox](#trying-the-working-copys-sandbox)
* [Releasing](#releasing)

## What the repository holds besides the package

What the package holds is in "What is here" of `README.md`. The repository holds besides:

| Path                          | What it holds                                                                        |
|-------------------------------|--------------------------------------------------------------------------------------|
| `tests/`                      | The kit's own unit tests, run by node's built-in test runner                         |
| `RELEASING.md`                | How a release of the kit is made, which the `/release` skill follows                 |
| `publish-check.mjs`           | What `npm publish` checks before it publishes                                        |
| `CONTRIBUTING.md`             | This document                                                                        |
| `changes/`                    | The kit's own change units                                                           |
| `pointers/`                   | The package that holds the name `agentrite-roles`                                    |
| `AGENTS.md`                   | This repository's own instructions for agents                                        |
| `CLAUDE.md`                   | The bridge that imports the kit's instruction files and `AGENTS.md` into Claude Code |
| `opencode.json`               | The configuration that loads the kit's instruction files into OpenCode               |
| `.claude/`                    | The role wrappers for Claude Code, and the `/release` skill                          |
| `.opencode/`                  | The role wrappers for OpenCode                                                       |
| `agentrite.json`              | This repository's own settings, which the kit's commands read                        |
| `sandbox.sh`                  | The shim that runs the sandbox of the installed release                              |
| `sandbox/`                    | This repository's `compose.project.yml`                                              |
| `sandbox-dev.sh`              | Runs the sandbox of the working copy                                                 |
| `package-lock.json`           | The lockfile, which pins the installed release of the kit                            |
| `.dockerignore`, `.gitignore` | What the image build and git leave out                                               |
| `.editorconfig`               | The formatting that editors apply                                                    |

## Commands

The commands that only this repository has. Those a project has too, `./sandbox.sh` and `npm run check-changes` among
them, are in "Commands" of `README.md`.

### npm test

```sh
npm test
```

Runs node's built-in test runner over `tests/`. It takes no argument.

See "The kit's own tests".

### npm run kit

```sh
npm run kit -- COMMAND [ARGUMENT...]
```

Runs the `agentrite` command of the installed release, `node_modules/agentrite/scripts/agentrite.mjs`, with what
follows `--`. That is a command and its arguments as "Commands" of `README.md` gives them for `npx agentrite`, for
example `npm run kit -- refresh` or `npm run kit -- roles --json`. The script adds no argument, option or environment
variable of its own.

In this repository `npx agentrite` runs the working tree's command, `scripts/agentrite.mjs`, and not the installed
release's: the package is itself named `agentrite`, and npm runs the root package's own command for that name. A
project that installs the kit is not affected. `npm run kit --` runs the installed release's command, which is there
after `npm ci`, as for `npm run check-changes`.

See "The kit's own copy of the kit".

### sandbox-dev.sh

```sh
./sandbox-dev.sh [--rebuild] [--mount HOST[:ro]]... UNIT [COMMAND...]
./sandbox-dev.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
./sandbox-dev.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
./sandbox-dev.sh --connect UNIT [COMMAND...]
```

Runs the sandbox from the working copy, in place of the installed release's. It runs on the host.

| Argument or option          | What it is                                                                    |
|-----------------------------|-------------------------------------------------------------------------------|
| Every one of `./sandbox.sh` | As "Commands" of `README.md` gives them, its environment variables among them |
| `--rebuild`                 | Changes nothing: the image is built on every start of a run without it        |

| Environment variable   | What it is                                                                                 |
|------------------------|--------------------------------------------------------------------------------------------|
| `SANDBOX_PROJECT_NAME` | Names the Compose project and the image. The command sets it, whatever the environment has |

See "Trying the working copy's sandbox".

### npm publish

```sh
npm publish
```

Publishes the package, at the version in `package.json`, on the npm registry. Before anything is sent it refuses a
version with no section in `CHANGELOG.md` and a working tree with a change to a tracked file that is not committed,
and runs `npm test`, publishing nothing when a test fails. The kit adds no argument, option or environment variable
of its own to it. It runs on the host, with the npm login that owns the package. An agent does not run it.

See "Releasing".

### /release

```
/release
```

The skill that makes a release, in a Claude Code session on the host, on `master`. It takes no argument.

See "Releasing".

## The kit's own tests

```sh
npm test
```

* It runs node's built-in test runner over `tests/`
* It needs `npm ci` first: two tests judge this repository's own files against the installed release, as "The
  kit's own copy of the kit" says, and fail, naming `npm ci`, when `node_modules/agentrite` is missing. The other
  tests need no install

A host other than Linux skips some of the tests. Each is skipped for what it needs and the host lacks:

* The reading of the allowlists by the entrypoint needs bash 4 or newer, and macOS has bash 3.2
* The check of who owns the agent's home needs GNU `stat`, and macOS has BSD's
* The terminal that `--connect` gives the command needs `script` of util-linux, and macOS has BSD's
* The tests of the script that rings the bell need `setsid`, and those of them that give it a terminal need `script`
  of util-linux besides. macOS has neither

A host without Docker skips the tests that need it, such as that a signal to the sandbox leaves it running, and that
a bell the agent writes to the sandbox's terminal comes out on the host's side. Each says so in the reason it prints.
The sandbox is such a host: its image holds no Docker, so those tests run with `npm test` on a host that has Docker,
and the command below does not run them.

The reason that each other skipped test prints names the command that runs the whole suite in the sandbox, which is
Linux:

```sh
./sandbox.sh --in-place npm test
```

The kit's own `changes/` go through the change check like any project's, wired the same way:

```sh
npm run check-changes
```

It runs the check from the released kit in `node_modules`, not from this repository's `scripts/`, so it needs
`npm ci` first.

## The kit's own copy of the kit

The kit is also a devDependency of itself, installed from the npm registry at one pinned version, so
`node_modules/agentrite/` exists here too.

* `AGENTS.md` sends agents to the process and roles there, so work on the kit follows the released instructions
  rather than the working copy it may be changing
* Changes are made at the repository root, never under `node_modules`
* The installed copy moves to a newer release only by a deliberate update, as "Updating a project to a newer kit"
  of `README.md` has it. A release makes that update as one of its own steps, which [`RELEASING.md`](RELEASING.md)
  gives
* The repository also runs the kit's sandbox, from the installed release, with `./sandbox.sh`, as any project does.
  Work on the sandbox itself is therefore done inside the sandbox the last release built, not the working copy's: a
  change to `container/` does not alter the sandbox the agent making it runs in. Trying such a change is done from
  the host. See "Trying the working copy's sandbox"
* `npm publish` stays on the host: releasing needs the npm login that owns the package, which never enters the
  sandbox
* The root is a project of the installed release, and its own files are judged against that release, not against
  the working tree: the root's `agentrite.json` is the installed release's default file,
  `node_modules/agentrite/templates/project/agentrite.json`, byte for byte, and the installed release's `refresh`,
  run at the root with no argument as `npm run kit -- refresh`, prints `up to date` for every file it writes and
  changes none. The suite checks both. A unit that changes what a project holds changes the root's files only when
  the repository moves to the release that holds it

## Trying the working copy's sandbox

`./sandbox-dev.sh` runs the sandbox from the working copy: `container/sandbox.sh`, `container/compose.yml`, the
Dockerfile, the entrypoint and the proxy as they are in the working tree, with the repository's
`sandbox/compose.project.yml`. It takes what `./sandbox.sh` takes, for example `./sandbox-dev.sh --in-place npm test`.

* It is this repository's own file. It is not in the package, and `init` and `refresh` do not write it
* It builds the image on every start of a run, so a change is in the sandbox that starts. With `--connect` it
  builds nothing, as `./sandbox.sh --connect` builds nothing: the command runs in the container that the run it
  connects to started, with the image that run built
* It takes the harness versions as `./sandbox.sh` does. It builds on every start of a run, so on a host without a
  harness it asks the registry at every such start and gets the latest published version of that harness
* It has its own Compose project and image, `ritenoar-agentrite-sandbox-dev`, and its own home volume,
  `ritenoar-agentrite-sandbox-dev_agent-home`, through `SANDBOX_PROJECT_NAME` in `sandbox/compose.project.yml`.
  Unset, as it is for `./sandbox.sh`, the name is `ritenoar-agentrite-sandbox`. The image and the home volume of
  `./sandbox.sh`, with Claude Code's login in it, are not touched, and both sandboxes can run at once
* It shares its log directory with `./sandbox.sh`, because both run from one project root:
  `~/.local/share/agentrite/agentrite`. So the two sandboxes list and continue each other's sessions, and share one
  OpenCode login
* A unit run of it has clones of its own, under its own Compose project name:
  `~/.local/state/agentrite/ritenoar-agentrite-sandbox-dev/<branch>`
* It runs on the host. A sandbox has no Docker, so an agent working inside one cannot run it
* The home volume starts as the image fills it and lasts. To start it anew:
  `docker volume rm ritenoar-agentrite-sandbox-dev_agent-home`. That leaves the log directory as it is
* To remove what it alone created: that volume, `docker network rm ritenoar-agentrite-sandbox-dev_default` and
  `docker image rm ritenoar-agentrite-sandbox-dev`. The log directory is `./sandbox.sh`'s too, and stays

## Releasing

A release is a version of the package `agentrite` on the npm registry, which a project installs by its name.

A release is made with the `/release` skill, in a Claude Code session on the host, on `master`. The skill is
`.claude/skills/release/SKILL.md`, which holds one line that sends the agent to [`RELEASING.md`](RELEASING.md). That
file holds every step, and a human, or an agent in another harness, follows it directly.

Releasing runs on the host only. It needs the npm login that owns the package, and that never enters the sandbox.
