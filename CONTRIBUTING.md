# Working on AgentRite

For whoever changes the kit. What the kit is and how a project uses it is in [`README.md`](README.md), and what the
sandbox does is in [`SANDBOX.md`](SANDBOX.md). This document is not in the package.

* [What the repository holds besides the package](#what-the-repository-holds-besides-the-package)
* [Commands](#commands)
* [The kit's own tests](#the-kits-own-tests)
* [The kit's own copy of the kit](#the-kits-own-copy-of-the-kit)
* [Trying the working copy's sandbox](#trying-the-working-copys-sandbox)
* [Adding a harness](#adding-a-harness)
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
| `.agentrite/`                 | The list of the instruction files in use, which `refresh` writes                     |
| `.claude/`                    | The role wrappers for Claude Code, and the `/release` skill                          |
| `.opencode/`                  | The role wrappers for OpenCode                                                       |
| `extra-roles/`                | The roles of this repository's own, which are not in the package                     |
| `agentrite.json`              | This repository's own settings, which the kit's commands read                        |
| `sandbox.sh`                  | The shim that runs the sandbox of the installed release                              |
| `sandbox/`                    | This repository's `compose.project.yml`                                              |
| `sandbox-dev.sh`              | Runs the sandbox of the working copy                                                 |
| `generate-diagrams.sh`        | Generates the SVGs of `diagrams/`, which `npm run diagrams` runs                     |
| `package-lock.json`           | The lockfile, which pins the installed release of the kit                            |
| `.dockerignore`, `.gitignore` | What the image build and git leave out                                               |
| `.editorconfig`               | The formatting that editors apply                                                    |
| `diagrams/`                   | The diagrams the README shows: each a Mermaid source and the SVG generated from it   |

## Commands

The commands that only this repository has. Those a project has too, `./sandbox.sh` and `npm run check-changes` among
them, are in "Commands" of `COMMANDS.md`.

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
follows `--`. That is a command and its arguments as "Commands" of `COMMANDS.md` gives them for `npx agentrite`, for
example `npm run kit -- refresh` or `npm run kit -- roles --json`. The script adds no argument, option or environment
variable of its own.

In this repository `npx agentrite` runs the working tree's command, `scripts/agentrite.mjs`, and not the installed
release's: the package is itself named `agentrite`, and npm runs the root package's own command for that name. A
project that installs the kit is not affected. `npm run kit --` runs the installed release's command, which is there
after `npm ci`, as for `npm run check-changes`.

See "The kit's own copy of the kit".

### npm run diagrams

```sh
npm run diagrams
```

Generates the SVG of every diagram in `diagrams/` from its Mermaid source, `<name>.svg` beside `<name>.mmd`, with a
white background, and stops at the first that fails, by running `generate-diagrams.sh`. It takes no argument. It runs a
pinned version of Mermaid's command line, `@mermaid-js/mermaid-cli`, through `npx`, which is no dependency of the
repository, so `npm ci` installs nothing for it. On its first run it downloads the command line and a headless Chrome
that the command line renders in. Run it on the host: the sandbox cannot reach the host the browser is downloaded from.

It exits with `0` when it generated every SVG, and with `1` when the Mermaid command line failed for one, by "Exit
statuses" of [`COMMANDS.md`](COMMANDS.md#exit-statuses).

### sandbox-dev.sh

```sh
./sandbox-dev.sh [--rebuild] [--mount HOST[:ro]]... UNIT [--variant NAME] [COMMAND...]
./sandbox-dev.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
./sandbox-dev.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
./sandbox-dev.sh --connect UNIT [--variant NAME] [COMMAND...]
```

Runs the sandbox from the working copy, in place of the installed release's. It runs on the host.

| Argument or option          | What it is                                                                      |
|-----------------------------|---------------------------------------------------------------------------------|
| Every one of `./sandbox.sh` | As "Commands" of `COMMANDS.md` gives them, its environment variables among them |
| `--rebuild`                 | Changes nothing: the image is built on every start of a run without it          |

| Environment variable   | What it is                                                                                 |
|------------------------|--------------------------------------------------------------------------------------------|
| `SANDBOX_PROJECT_NAME` | Names the Compose project and the image. The command sets it, whatever the environment has |

It exits as the working copy's `./sandbox.sh` does, by "Exit statuses" of [`COMMANDS.md`](COMMANDS.md#exit-statuses).

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
* It needs `npm ci` first: three tests judge this repository's own files against the installed release, as "The
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
  of `SETUP.md` has it. A release makes that update as one of its own steps, which [`RELEASING.md`](RELEASING.md)
  gives
* The repository also runs the kit's sandbox, from the installed release, with `./sandbox.sh`, as any project does.
  Work on the sandbox itself is therefore done inside the sandbox the last release built, not the working copy's: a
  change to `container/` does not alter the sandbox the agent making it runs in. Trying such a change is done from
  the host. See "Trying the working copy's sandbox"
* `npm publish` stays on the host: releasing needs the npm login that owns the package, which never enters the
  sandbox
* The root is a project of the installed release, and its own files are judged against that release, not against
  the working tree: the root's `agentrite.json` is the installed release's default file,
  `node_modules/agentrite/templates/project/agentrite.json`, with the roles of this repository's own added to
  `roles` after the four, and differs from it in nothing else, and the installed release's `refresh`, run at the root
  with no argument as `npm run kit -- refresh`, prints `up to date` for every file it writes and changes none. The
  suite checks both. A unit that changes what a project holds changes the root's files only when
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

## Adding a harness

What the kit's code knows of a harness is in one module of its own, which implements the harness contract. Add:

* A module `scripts/harnesses/<name>.mjs` that exports an object implementing `HARNESS_CONTRACT` of
  `scripts/agentrite-harness.mjs`: its name and title, its role wrappers, its start, its headless run and how the
  kit's instructions reach it. The JSDoc type `Harness` beside the contract says what each member takes and returns,
  and `scripts/harnesses/claude.mjs` and `scripts/harnesses/opencode.mjs` are the two to follow
* Its place in `HARNESSES` of `scripts/agentrite-harness.mjs`, the kit's only list of its harnesses. Every command
  that goes over the harnesses takes them from it, in its order
* Its file in `files` of `package.json`, and in the list of the test of the package's files in
  `tests/package-documents.test.mjs`

`tests/agentrite-harness.test.mjs` is the check of that part. It fails, naming the harness and the member, for a
member of the contract the module lacks or has of another kind, and fails for a module of `scripts/harnesses/` that
`HARNESSES` lacks and for an entry of `HARNESSES` without its module. A member added to the contract fails it for
every harness that does not implement the member.

The rest of what the kit knows of a harness is outside its module, in the places below, which no test ties to the
list. Each says what a new harness takes there.

* **The image**, `container/Dockerfile`: install the harness at the version that a build argument without a default
  gives, and record that version in a label `com.ritenoar.agentrite.<harness>-version`
* **The choice of that version**, in `container/sandbox.sh`: from the project's compose file, from the host's
  `--version`, or the latest published, with the build argument passed in `container/compose.yml`, the shape of a
  version the wrapper accepts, and the comparison with the image's label at each start, which rebuilds the image on
  a difference
* **Its own updates**, turned off in `container/Dockerfile`, so that the version the image holds is the one chosen
* **The directories of its logs**: made and owned by the agent in `container/Dockerfile`, owned at
  `container/entrypoint.sh`, mounted by `container/sandbox.sh` from the project's log directory on the host, and kept
  outside the home volume in `container/compose.yml`
* **Its login**: where the harness keeps it, which must survive a container in the home volume or in the log
  directory, and a way to log in that needs no callback from a browser on the host into the sandbox
* **The hosts the egress allowlist admits for it**, in `container/compose.yml`, each with a comment that says why,
  and in the comment of `templates/project/sandbox/compose.project.yml` that lists the kit's own hosts
* **The bell**: the hook or plugin under `container/bell/` that runs `container/bell/ring-bell.sh` when the harness
  waits for the developer, and its mount and configuration in `container/sandbox.sh`
* **The status line**, which only Claude Code has: `container/claude-managed-settings.json` and its mount in
  `container/sandbox.sh`
* **How long it keeps its sessions**, which only Claude Code carries from the host:
  `scripts/agentrite-cleanup-period.mjs` and its call in `container/sandbox.sh`
* **The trailers it adds to a commit message**, which `container/check-commit-message.mjs` refuses, and the rule on
  them in `standards.md`
* **The terminal variables** that `container/sandbox.sh` passes on into the container, which were added for
  OpenCode's colours: a new harness may need others
* **This repository's own files**: the default `harnesses` of `templates/project/agentrite.json`, this repository's
  `agentrite.json`, its wrappers and instruction files (`CLAUDE.md`, `opencode.json`, `.claude/`, `.opencode/`), its
  `sandbox/compose.project.yml`, and the table "What the repository holds besides the package" above, which lists
  them
* **The `CLAUDE.md` that `init` writes into every project**, from `templates/project/CLAUDE.md` in `processFiles` of
  `scripts/agentrite.mjs`, whatever the harnesses. A new harness's instruction file is written only by its module's
  `instructions.init`
* **The default orchestrator**, `orchestrator.json`, whose steps each name a harness and a model of it
* **The help texts that name harnesses**, in the usage of `agentrite run` in `scripts/agentrite-run.mjs`: a model id
  of each harness, and what `--skip-permissions` gives each
* **The documents**: the sections of `README.md`, `COMMANDS.md`, `ORCHESTRATOR.md`, `SETUP.md` and `SANDBOX.md` that
  name each harness, the `keywords` of `package.json`, and the text of the `agentrite-roles` pointer package in
  `pointers/agentrite-roles/`
* **The components diagram**, `diagrams/components.mmd`, which names each harness and the directory of its role
  wrappers. Generate its SVG with `npm run diagrams` and commit both
* **The tests that hold a case for each harness**, where a new harness gets its own cases:
    * the commands: `tests/agentrite-run.test.mjs`, `tests/agentrite-orchestrate.test.mjs` with its fake harnesses,
      `tests/agentrite-outcome.test.mjs` for the headless readings, `tests/agentrite-roles.test.mjs` for the
      wrappers and the harnesses' own agents, `tests/agentrite-settings.test.mjs`,
      `tests/agentrite-definition.test.mjs` and `tests/agentrite-config.test.mjs` for the harnesses the settings
      name
    * `init` and `refresh`: `tests/agentrite-init.test.mjs`, `tests/agentrite-refresh.test.mjs` and
      `tests/agentrite-instructions.test.mjs`
    * the sandbox: `tests/harness-versions.test.mjs`, `tests/sandbox-wrapper.test.mjs`, `tests/wrapper-fixture.mjs`
      and `tests/sandbox-project-dockerfile.test.mjs` for the versions; `tests/dockerfile-log-directories.test.mjs`
      and `tests/entrypoint-home-owner.test.mjs` for the log directories; `tests/bell.test.mjs` and
      `tests/sandbox-dev.test.mjs` for the bell; `tests/compose-allowlist.test.mjs`,
      `tests/entrypoint-allowlist.test.mjs` and `tests/sandbox-update.test.mjs` for the allowlists;
      `tests/claude-managed-settings.test.mjs` for the status line; `tests/agentrite-cleanup-period.test.mjs` for the
      sessions kept; `tests/check-commit-message.test.mjs`, `tests/commit-msg-hook.test.mjs` and
      `tests/sandbox-commit-msg.test.mjs` for the trailers
    * the pointer package: `tests/pointers.test.mjs`

  A test that names a harness only as an example of one, as in the settings it writes, needs nothing

## Releasing

A release is a version of the package `agentrite` on the npm registry, which a project installs by its name.

A release is made with the `/release` skill, in a Claude Code session on the host, on `master`. The skill is
`.claude/skills/release/SKILL.md`, which holds one line that sends the agent to [`RELEASING.md`](RELEASING.md). That
file holds every step, and a human, or an agent in another harness, follows it directly.

Releasing runs on the host only. It needs the npm login that owns the package, and that never enters the sandbox.
