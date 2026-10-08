# Working on AgentRite

For whoever changes the kit. What the kit is and how a project uses it is in [`README.md`](README.md), and what the
sandbox does is in [`SANDBOX.md`](SANDBOX.md). This document is not in the package.

## What the repository holds besides the package

What the package holds is in "What is here" of `README.md`. The repository holds besides:

| Path                          | What it holds                                                          |
|-------------------------------|------------------------------------------------------------------------|
| `tests/`                      | The kit's own unit tests, run by node's built-in test runner           |
| `infra/`                      | The CDK app that serves release tarballs from `agentrite.ritenoar.com` |
| `RELEASING.md`                | How a release of the kit is made, which the `/release` skill follows   |
| `deploy.sh`                   | The release script, which deploys `infra/` and uploads the packed kit  |
| `CONTRIBUTING.md`             | This document                                                          |
| `changes/`                    | The kit's own change units                                             |
| `pointers/`                   | The two packages that hold the names `agentrite` and `agentrite-roles` |
| `AGENTS.md`                   | This repository's own instructions for agents                          |
| `CLAUDE.md`                   | The bridge that imports `AGENTS.md` into Claude Code                   |
| `.claude/`                    | The role wrappers for Claude Code, and the `/release` skill            |
| `.opencode/`                  | The role wrappers for OpenCode                                         |
| `agent.sh`                    | The shim that runs the sandbox of the installed release                |
| `agent/`                      | This repository's `compose.project.yml`                                |
| `agent-dev.sh`                | Runs the sandbox of the working copy                                   |
| `package-lock.json`           | The lockfile, which pins the installed release of the kit              |
| `.dockerignore`, `.gitignore` | What the image build and git leave out                                 |
| `.editorconfig`               | The formatting that editors apply                                      |

## Commands

The commands that only this repository has. Those a project has too, `./agent.sh` and `npm run check-changes` among
them, are in "Commands" of `README.md`.

### npm test

```sh
npm test
```

Runs node's built-in test runner over `tests/`. It takes no argument.

See "The kit's own tests".

### agent-dev.sh

```sh
./agent-dev.sh [--rebuild] [--mount HOST[:ro]]... UNIT [COMMAND...]
./agent-dev.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
./agent-dev.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
./agent-dev.sh --connect UNIT [COMMAND...]
```

Runs the sandbox from the working copy, in place of the installed release's. It runs on the host.

| Argument or option        | What it is                                                                    |
|---------------------------|-------------------------------------------------------------------------------|
| Every one of `./agent.sh` | As "Commands" of `README.md` gives them, its environment variables among them |
| `--rebuild`               | Changes nothing: the image is built on every start of a run without it        |

| Environment variable | What it is                                                                                   |
|----------------------|----------------------------------------------------------------------------------------------|
| `AGENT_PROJECT_NAME` | Names the Compose project and the image. The command sets it, whatever the environment holds |

See "Trying the working copy's sandbox".

### deploy.sh

```sh
./deploy.sh
npm run deploy
```

Releases the kit: deploys `infra/` and uploads the packed kit, at the version in `package.json`, and prints the URL
of the release. It takes no argument, runs on the host, and runs `npm ci` itself.

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
* The tests need no install
* Releasing does: `infra/` needs `aws-cdk-lib` and the CDK CLI, which are the kit's devDependencies, so run `npm ci`
  first. `deploy.sh` does that itself

The kit's own `changes/` go through the change check like any project's, wired the same way:

```sh
npm run check-changes
```

It runs the check from the released kit in `node_modules`, not from this repository's `scripts/`, so it needs
`npm ci` first.

## The kit's own copy of the kit

The kit is also a devDependency of itself, installed from a release by its URL like in any project, so
`node_modules/@ritenoar/agentrite/` exists here too.

* `AGENTS.md` sends agents to the process and roles there, so work on the kit follows the released instructions
  rather than the working copy it may be changing
* Changes are made at the repository root, never under `node_modules`
* The installed copy moves to a newer release only by a deliberate update, as "Updating a project to a newer kit"
  of `README.md` has it. A release makes that update as one of its own steps, which [`RELEASING.md`](RELEASING.md)
  gives
* The repository also runs the kit's sandbox, from the installed release, with `./agent.sh`, as any project does.
  Work on the sandbox itself is therefore done inside the sandbox the last release built, not the working copy's: a
  change to `container/` does not alter the sandbox the agent making it runs in. Trying such a change is done from
  the host. See "Trying the working copy's sandbox"
* `./deploy.sh` stays on the host: releasing needs AWS credentials and hosts the sandbox does not reach

## Trying the working copy's sandbox

`./agent-dev.sh` runs the sandbox from the working copy: `container/agent.sh`, `container/compose.yml`, the
Dockerfile, the entrypoint and the proxy as they are in the working tree, with the repository's
`agent/compose.project.yml`. It takes what `./agent.sh` takes, for example `./agent-dev.sh --in-place npm test`.

* It is this repository's own file. It is not in the package, and `init` and `refresh` do not write it
* It builds the image on every start of a run, so a change is in the sandbox that starts. With `--connect` it
  builds nothing, as `./agent.sh --connect` builds nothing: the command runs in the container that the run it
  connects to started, with the image that run built
* It takes the harness versions as `./agent.sh` does. It builds on every start of a run, so on a host without a
  harness it asks the registry at every such start and gets the latest published version of that harness
* It has its own Compose project and image, `ritenoar-agentrite-agent-dev`, and its own home volume,
  `ritenoar-agentrite-agent-dev_agent-home`, through `AGENT_PROJECT_NAME` in `agent/compose.project.yml`. Unset, as it
  is for `./agent.sh`, the name is `ritenoar-agentrite-agent`. The image
  and the home volume of `./agent.sh`, with Claude Code's login in it, are not touched, and both sandboxes can run
  at once
* It shares its log directory with `./agent.sh`, because both run from one project root:
  `~/.local/share/agentrite/agentrite`. So the two sandboxes list and continue each other's sessions, and share one
  OpenCode login
* A unit run of it has clones of its own, under its own Compose project name:
  `~/.local/state/agentrite/ritenoar-agentrite-agent-dev/<branch>`
* It runs on the host. A sandbox has no Docker, so an agent working inside one cannot run it
* The home volume starts as the image fills it and lasts. To start it anew:
  `docker volume rm ritenoar-agentrite-agent-dev_agent-home`. That leaves the log directory as it is
* To remove what it alone created: that volume, `docker network rm ritenoar-agentrite-agent-dev_default` and
  `docker image rm ritenoar-agentrite-agent-dev`. The log directory is `./agent.sh`'s too, and stays

## Releasing

A release is a tarball of the kit served from `https://agentrite.ritenoar.com/`, which a project installs from its
URL. `infra/` is the CDK app that serves it, and none of it ships to a project:

* a private bucket
* a CloudFront distribution in front of it
* a certificate in us-east-1
* the DNS record in the existing `ritenoar.com` hosted zone, which it looks up rather than owns

A release is made with the `/release` skill, in a Claude Code session on the host, on `master`. The skill is
`.claude/skills/release/SKILL.md`, which holds one line that sends the agent to [`RELEASING.md`](RELEASING.md). That
file holds every step, and a human, or an agent in another harness, follows it directly.

Releasing runs on the host only. It needs AWS credentials, and those never enter the sandbox.
