# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `@ritenoar/agentrite` and keep only what is
specific to them.

* [The name](#the-name)
* [What is here](#what-is-here)
* [How it works](#how-it-works)
* [Commands](#commands)
* [Running a role](#running-a-role)
* [Installing it into a project](#installing-it-into-a-project)
* [Updating a project to a newer kit](#updating-a-project-to-a-newer-kit)
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
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards         |
| `CHANGELOG.md`       | What each release changed, and what is worth knowing when updating to it                  |
| `README.md`          | What the kit is and how a project uses it                                                 |
| `SANDBOX.md`         | The reference of the sandbox                                                              |
| `package.json`       | The package's name, its version and the commands it installs                              |
| `roles/`             | The specifier, planner, implementer and reviewer instructions                             |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit                       |
| `templates/project/` | The files `agentrite init` fills in and writes into a project                             |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agentrite` and `agentrite-roles` commands |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, base Compose file and wrapper         |

Nothing here names a particular project. A rule that would need rewording to make sense elsewhere belongs in the
project's own `AGENTS.md`, which links here for the rest.

## How it works

A change is worked as a unit, a directory under `changes/`, by four roles in this order:

| Role        | Is given            | Produces                                                             |
|-------------|---------------------|----------------------------------------------------------------------|
| Specifier   | A request           | What the unit must make true: its `spec.md`, or a task's `record.md` |
| Planner     | An approved unit    | The unit's `plan.md`: the ordered tasks the implementer then follows |
| Implementer | A planned unit      | The implementation, with the plan ticked and the record kept         |
| Reviewer    | An implemented unit | Its findings, which it returns and does not apply                    |

The rules each role works by are in `process.md` and in the role's file under `roles/`.

The writers current workflow:

1. Use Claude Code with Opus as the `specifier` role and ask it to refine a feature (or bug or task) together
2. Read the `spec.md` that comes out of this, ask for a few clarifications or corrections if necessary and approve it
3. Run the `agent.sh 0007` where `0007` is the change number. This cuts the branch and starts the container
4. Run Claude Code with Opus as the `planner` role and ask it to create a plan for feature 0007
5. Run Claude Code with Sonnet or OpenCode with Qwen 3.8 27b as the `implementer` role and ask it to implement the
   plan
6. Run OpenCode with GPT Sol as the `reviewer` role and ask it to review the code
7. Reopen Claude (`claude -c`) and ask the implementer to check the review and see which changes need to be made
8. Repeat step 6 and 7 until no more issues arise
9. Exit the container. This will fast-forward the branch on the host to the one from the container (which was a
   separate checkout!). At this point it is up to you how to handle the rest. You can create a pull request and check
   the changes yourself, or you can simply mark the change `implemented` and merge it back to master

## Commands

Every command a project that installed the kit runs, each with every argument, option and environment variable it
takes.

### agentrite init

```sh
npx agentrite init <harness>...
```

Sets a project up, from its root: writes the role wrappers, the project's agent instructions and the sandbox's two
files, and prints each file it wrote, changed or skipped.

| Argument or option | What it is                                                              |
|--------------------|-------------------------------------------------------------------------|
| `<harness>...`     | `claude` or `opencode`, one or both, for the harnesses the project uses |

See "Installing it into a project".

### agentrite refresh

```sh
npx agentrite refresh <harness>...
```

Brings the kit's own files in a project up to date with the installed release, from the project root, and prints
each file as written, refreshed or up to date.

| Argument or option | What it is                                                              |
|--------------------|-------------------------------------------------------------------------|
| `<harness>...`     | `claude` or `opencode`, one or both, for the harnesses the project uses |

See "Updating a project to a newer kit".

### agentrite roles

```sh
npx agentrite roles [--json]
```

Lists the roles the kit has, each with the description its wrappers hold, and reads nothing of the project. The JSON
document is an object with one key, `roles`, an array that holds each role as an object with its `name` and its
`description`, which is on one line, not wrapped.

| Argument or option | What it is                                                                   |
|--------------------|------------------------------------------------------------------------------|
| `--json`           | Prints the same roles, in the same order, as one JSON document, for a script |

### agentrite run

```sh
npx agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] [--skip-permissions]
                  [-- <harness arguments...>]
```

Starts a harness as one of the roles, for one unit, from the project root. Run with no argument, it prints its
usage.

| Argument or option          | What it is                                                                          |
|-----------------------------|-------------------------------------------------------------------------------------|
| `<role>`                    | One that `agentrite roles` lists                                                    |
| `<harness>`                 | `claude` or `opencode`                                                              |
| `<unit>`                    | A directory of `changes/`, by its name or by the four digits its name opens with    |
| `--prompt <text>`           | Adds its text to the prompt, as it is written. Also `--prompt="<text>"`             |
| `--model <id>`              | The harness's own id of a model, passed on as it is written. Also `--model=<id>`    |
| `--headless`                | Runs the harness without a session, for a script: it works on the prompt and ends   |
| `--skip-permissions`        | Ends the harness's questions about permissions. The option belongs in the sandbox   |
| `-- <harness arguments...>` | Ends the command's own arguments. What follows goes to the harness as it is written |

See "Running a role".

### agentrite-roles

```sh
npx agentrite-roles <harness>...
```

Writes the role wrappers and nothing else, for a project that wants only those. Unlike `init`, it refuses to
overwrite a file that already exists.

| Argument or option | What it is                          |
|--------------------|-------------------------------------|
| `<harness>...`     | `claude` or `opencode`, one or both |

See "Installing it into a project".

### check-changes

```sh
npm run check-changes
node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs [<repository root>]
```

The change check. It compares the committed work on the current branch with `master`, and exits non-zero with a
list of the offending units when a frozen `spec.md` or `plan.md` changed or an implemented plan has unticked tasks.

| Argument or option  | What it is                                               |
|---------------------|----------------------------------------------------------|
| `<repository root>` | Optional, and the working directory when it is not given |

See "Installing it into a project".

### agent.sh

```sh
./agent.sh [--rebuild] [--mount HOST[:ro]]... UNIT [COMMAND...]
./agent.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
./agent.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
./agent.sh --connect UNIT [COMMAND...]
```

Starts the sandbox, from the project root, with what the form names mounted at `/work`, and opens a shell in it.
With `--connect` it starts nothing, and runs beside a unit run that is under way.

| Argument or option | What it is                                                                                   |
|--------------------|----------------------------------------------------------------------------------------------|
| `UNIT`             | Mounts a clone of the unit's branch, given by its name or by the unit's number in its name   |
| `--in-place`       | Mounts the project root, as it is                                                            |
| `--workdir DIR`    | Mounts `DIR`, as it is                                                                       |
| `--connect UNIT`   | Runs the command in the container of the unit's run that is under way. Takes no other option |
| `--rebuild`        | Builds the image before running, even if it exists and holds the wanted harness versions     |
| `--mount HOST`     | Also mounts the host directory `HOST` at `/mnt/<basename>`, read-write. It may be repeated   |
| `--mount HOST:ro`  | The same, read-only                                                                          |
| `--`               | Ends the options, so that what follows is the unit or the command                            |
| `COMMAND...`       | Runs this instead of the shell                                                               |

| Environment variable | What it is                                                                               |
|----------------------|------------------------------------------------------------------------------------------|
| `AGENT_MEM_LIMIT`    | The memory limit, in place of the `8g` that `init` writes in `agent/compose.project.yml` |
| `AGENT_CPUS`         | The CPU limit, in place of the `6` that `init` writes in `agent/compose.project.yml`     |
| `XDG_STATE_HOME`     | Where the clones of unit runs are kept, in place of `~/.local/state`                     |
| `XDG_DATA_HOME`      | Where the project's log directory is, in place of `~/.local/share`                       |

See "The sandbox", and in `SANDBOX.md` "Working on a clone", "Connecting to a unit run", "Another working
directory", "Extra directories" and "The harness logs".

## Running a role

`agentrite run` starts the harness in the directory the command is run from, with the role as its agent and one
prompt: `The unit is changes/<directory>/.` A unit run by its number, in each harness:

```sh
npx agentrite run implementer claude 0032
npx agentrite run reviewer opencode 0032
```

* The unit is given by its directory's name, with or without `changes/` before it and a slash after it, or by the
  four digits its name opens with
* The command takes a unit that has a directory, so the specifier of a unit that does not exist yet is started in a
  session of the harness, not with `run`
* The command waits for the harness, and exits with the status the harness exited with, or with a status other than
  0 when a signal ended the harness
* The command starts no sandbox: it starts the harness where it is run, on the host or inside the sandbox, and
  `./agent.sh` is still what starts the sandbox. In a unit run of the sandbox, `npx agentrite` is there after
  `npm ci` in the clone, like the role files

The options, which may stand anywhere among the arguments before a `--`:

* The text of `--prompt` is added to the prompt after an empty line. The text is one argument, so a shell's quotes
  go around it, and it may hold any word, one that opens with a dash among them. A text that itself opens with a
  dash is given as `--prompt="<text>"`. The command takes no word after the unit that is not an option

  ```sh
  npx agentrite run reviewer opencode 0032 --prompt "start with the tests of the wrappers"
  ```

* `--headless` chooses between the two modes. Without it the harness opens a session on the terminal the command
  was run on, with the prompt as its first. With it the harness is run without a session
* `--model` takes an id such as `claude-sonnet-5-5` for Claude Code or `openai/gpt-6.1-sol` for OpenCode. The kit has
  no names of its own for models. Without `--model` the harness gets no model and decides by itself, and
  a model pinned in the role's wrapper is what such a run is expected to use
* `--skip-permissions` holds in both modes. Claude Code gets `--dangerously-skip-permissions`, which bypasses every
  check, and OpenCode gets `--auto`, which approves what is not explicitly denied, so the two do not do the same.
  The command does not look where it runs, and on the host the flag does what its name says

What the harness is given, in this order:

1. The role, the model and the permission flag
2. Every argument after the `--`, as it is written and in the order given
3. The prompt, which is the last argument the harness gets. Where the harness takes it as an argument of its own,
   the command puts a `--` in front of it

The command reads none of the arguments it passes on: it does not look whether one repeats or undoes an argument of
its own, such as a second `--model`, and what the harness makes of that is the harness's. With no `--`, or with
nothing after it, the harness gets the role, the prompt and what the options give, and nothing else.

Stopping a run:

* The command does not pass a signal on. A signal sent to the command alone, as `kill <pid>` does, ends the command
  and leaves the harness running, still at work on the unit
* A caller that stops a run starts the command in a process group of its own and signals the group, as
  `kill -- -<pgid>` does, which reaches the command and the harness alike
* Ctrl-C on a terminal already goes to both

A session is resumed with the harness's own options, after the `--`. In Claude Code, give the first run an id, which
is a UUID, and resume it by that id:

```sh
npx agentrite run implementer claude 0032 --headless -- --session-id 0b6f3c1e-58a4-4c0f-9d1b-2f1f6e3a7c55
npx agentrite run implementer claude 0032 --headless --prompt "go on" -- --resume 0b6f3c1e-58a4-4c0f-9d1b-2f1f6e3a7c55
```

In OpenCode, read the id of the session from `opencode session list` after the first run, and resume it by that:

```sh
npx agentrite run reviewer opencode 0032 --headless
opencode session list
npx agentrite run reviewer opencode 0032 --headless --prompt "go on" -- --session ses_ef35877c0ffefJvzVbIUZSXpWV
```

A resumed run gets the role as its agent again, and its prompt again: the unit, and the text when there is any.
That holds with `--headless`. A session of OpenCode that is resumed so opens on what was said before and does not
send the new prompt.

The command starts nothing when:

* the role's wrapper for the harness is missing, or holds anything but what `refresh` would write, a pinned model
  aside. The command names the file and names the command that repairs it:

  ```sh
  npx agentrite refresh opencode
  ```

  So a project that moved to a newer kit runs `refresh` before `run`, and a key a project added to a wrapper by hand
  stops `run` until `refresh` has removed it. See "Updating a project to a newer kit"
* the harness's own command is not on the `PATH`
* `changes/` holds no directory for the unit, or more than one for its digits

## Installing it into a project

The kit is the npm package `@ritenoar/agentrite`. It is served as a tarball from `agentrite.ritenoar.com` rather than
from a registry, so a project adds it by the URL of a release:

```sh
npm install https://agentrite.ritenoar.com/ritenoar-agentrite-4.2.0.tgz
```

npm writes the URL into the project's `package.json`, and the resolved URL with an integrity hash into
`package-lock.json`. The kit assumes npm: `init` reads `package-lock.json`, and the sandbox's image installs from it.

Then set the project up from its root, naming only the harnesses it uses:

```sh
npx agentrite init claude opencode
```

It prints each file it wrote, changed or skipped. It writes:

| File                        | What it is for                                                                       |
|-----------------------------|--------------------------------------------------------------------------------------|
| `.claude/agents/*.md`       | For `claude`: a wrapper per role for Claude Code, pointing at the kit's role file    |
| `.opencode/agents/*.md`     | For `opencode`: the same for OpenCode                                                |
| `AGENTS.md`                 | The project's agent instructions, pointing at the kit's `process.md` and role files  |
| `CLAUDE.md`                 | The bridge that imports `AGENTS.md` into Claude Code, written whatever the harnesses |
| `agent.sh`                  | The shim that runs the kit's sandbox from the project root. See "The sandbox"         |
| `agent/compose.project.yml` | The project's half of the sandbox configuration                                      |

* Every generated file is the project's own once written, and the project may edit any of them
* `init` never regenerates one: a file it would create that already exists is left as it is and reported as
  skipped, so running it again only adds what is missing
* The role wrappers are the ones `npx agentrite-roles claude opencode` writes
* The OpenCode wrappers are written with `mode: all`, which makes each role both a primary agent and a subagent.
  The roles are therefore also offered among the primary agents in OpenCode's own interface
* `init` refuses to run, writing nothing, when `package.json` has no `name`

The files a project is expected to edit are these:

* `AGENTS.md` has a marked section for what is specific to the project, such as its house style, its code rules and
  how its tests run, and keeps only that: what holds for every project is in the kit. The three sections above it,
  Development Guidelines, Roles and Changes in this project, are what make the kit's instructions reach an agent, and
  are best kept
* `agent/compose.project.yml` holds the Compose project and image names, both derived from the `name` in
  `package.json`, the `PLAYWRIGHT_VERSION` build argument when the project has Playwright, the memory and CPU limits,
  and the project's `ALLOWLIST`. The allowlist lists only what the project needs beyond what the kit admits itself.
  See "Egress" of [`SANDBOX.md`](SANDBOX.md)
* The role wrappers, to pin a model per role

`CLAUDE.md` is best left as written. `agent.sh` is not a file to edit, and of what a project adds to a role wrapper
only a pinned model lasts. See "Updating a project to a newer kit".

A file that already exists:

* When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
  ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste
  in whichever it lacks
* When `CLAUDE.md` already exists, it is left untouched too, and must import `AGENTS.md` with a line holding
  `@AGENTS.md`
* An existing `agent/compose.project.yml` is left as it is

`init` also amends two files, adding only what is missing:

* `package.json` gains a `check-changes` script, unless it has one, keeping every other key, their order and the
  indentation:

  ```json
  "scripts": {
    "check-changes": "node node_modules/@ritenoar/agentrite/scripts/check-changes.mjs"
  }
  ```

* `.dockerignore` is written when there is none. When it keeps any file of the kit's `container/` directory out of
  the build context, whatever its patterns, the exception is appended, so that the image build can reach the kit.
  Otherwise the file is left alone

A project whose `.dockerignore` excludes `node_modules` must let that one directory's files back in:

```
node_modules
!node_modules/@ritenoar/agentrite/container/**
```

The exception names the files rather than the directory: `!node_modules/@ritenoar/agentrite/container` alone does
not bring back a kit file that a pattern excluded by name.

A project that depends on Playwright gets a sandbox with its browser:

* `init` takes the version from `package-lock.json` and writes it into `agent/compose.project.yml` as the
  `PLAYWRIGHT_VERSION` build argument. When the lockfile resolves no `playwright`, `init` writes the compose file
  without the argument, and the sandbox is built without a browser. `init` exits 0 either way
* The browser is in the image when the project's compose file gives `PLAYWRIGHT_VERSION` under
  `services.agent.build.args`, and not otherwise: the build argument alone decides
* A project that starts using Playwright adds the argument by hand, as the version its `package-lock.json`
  resolves, and one that stops removes it, and both rebuild with `./agent.sh --in-place --rebuild`. `init` and
  `refresh` never rewrite `agent/compose.project.yml`, which is the project's own

`init` fills in the templates in the kit's `templates/project/`, which ship in the package, at
`node_modules/@ritenoar/agentrite/templates/project/`. A project set up or repaired by hand starts from the same
files, filling in each `{{placeholder}}` itself.

### On a fresh clone

A fresh clone of a project has no kit. `npm ci` installs it with the project's other dependencies, at exactly the
release and integrity hash `package-lock.json` records, and fails rather than install anything else.

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike:
the sandbox admits the hosts they need itself. See "Egress" of `SANDBOX.md`. A project's `agent.sh` runs the wrapper
from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox can start.

## Updating a project to a newer kit

Install the newer release by its URL:

```sh
npm install https://agentrite.ritenoar.com/ritenoar-agentrite-4.2.0.tgz
```

That changes only `package.json` and `package-lock.json`, which the project commits like any other change. Nothing
reports that a newer release exists: `npm outdated` has no registry to ask.

What a release changed, and what is worth knowing when updating to it, is in the kit's `CHANGELOG.md`, which after
the install is at `node_modules/@ritenoar/agentrite/CHANGELOG.md`. It holds one section per release, newest first. A
project that skips releases reads every section between its old version and the new one.

Then bring the kit's own files in the project up to date, from the project root, naming the harnesses it uses:

```sh
npx agentrite refresh claude opencode
```

It rewrites the role wrappers of those harnesses and `agent.sh` as the new release writes them, writes any that are
missing, and prints each file as written, refreshed or up to date. Without it those copies stay as an older release
wrote them, and nothing says so.

* A model pinned in a wrapper survives: a line in its frontmatter that opens with `model:` is kept, as written,
  after the kit's own keys
* Everything else in a wrapper, and all of `agent.sh`, is replaced, other keys a project added to the frontmatter
  among them. The wrappers are tracked files, so `git diff` shows what a refresh changed, and git has what it
  replaced
* `AGENTS.md`, `CLAUDE.md`, `agent/compose.project.yml`, `package.json` and `.dockerignore` are never touched, and
  never created
* A path that holds something other than a regular file, such as a symbolic link, is left as it is and named on
  standard error. The other files are still refreshed, and the command exits non-zero

An improvement found while working in a project is made in the kit's repository, and committed there. The installed
copy under a project's `node_modules` is not a working copy of that repository, and nothing in it reaches there. The
improvement reaches that project, and every other, as a new release that each one updates to as above.

## The sandbox

The sandbox is a Docker container that a harness is run in, with a clone of a unit's branch or the project mounted
read-write at `/work`. `./agent.sh` starts it, in the forms "Commands" gives. The reference is
[`SANDBOX.md`](SANDBOX.md), which in a project is at `node_modules/@ritenoar/agentrite/SANDBOX.md`.

What a run needs:

* The host needs Docker: Desktop on macOS, Engine on Linux
* Never run it with `sudo`. The wrapper refuses to run with uid or gid 0, because the agent inside the sandbox would
  then be root too. When Docker needs elevated permissions on the machine, add the user to the `docker` group instead
* A run says what it mounts at `/work`, and there is no default. A command that names no unit, and gives no
  `--in-place`, no `--workdir` and no `--connect` either, starts nothing and names the forms

What a run does:

* A unit run, as `./agent.sh 0029`, mounts a clone of that unit's branch. It is the way to implement and to review a
  unit. A number that no branch holds and that is a unit on `master` gets its branch first. See "Working on a clone"
  of `SANDBOX.md`
* A run with `--in-place` mounts the project as it is on the host, so the agent works in the developer's own
  checkout, `.git` and `node_modules` included. It is the way to run something on the tree as it is, such as the
  suite
* Either builds the image on first use and opens a shell in the container. A command appended to it runs instead of
  the shell, as in `./agent.sh 0029 claude` and `./agent.sh --in-place npm test`
* `./agent.sh --in-place --rebuild` builds the image again before running
* `./agent.sh --connect 0029` mounts and starts nothing: it runs a command in the container of the unit run that is
  under way for the unit, beside what runs there. See "Connecting to a unit run" of `SANDBOX.md`

What it confines:

* The container's root filesystem is read-only. The agent writes the working directory, its home volume, the
  project's log directory on the host and `/tmp`
* `/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
  that runs what it writes to the temporary directory works as on the host
* Egress is bounded by hostname: HTTPS on port 443 to the allowlisted hosts, and little else. See "Egress" of
  `SANDBOX.md`
* Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`

Nothing of the host is reachable but what is mounted at `/work`, with these exceptions:

| Of the host                                  | Mounted    | In `SANDBOX.md`          |
|----------------------------------------------|------------|--------------------------|
| The developer's `~/.gitconfig`               | Read-only  |                          |
| The developer's Claude Code status line      | Read-only  | "The status line"        |
| The project's log directory                  | Read-write | "The harness logs"       |
| The local model server's port                |            | "The local model server" |
| The project's `.reviews`, in a unit run only | Read-write | "Working on a clone"     |

The `~/.gitconfig` makes commits from inside carry the same name and email as on the host.

A project configures the sandbox with two files:

* `agent.sh` at the project root, a shim that execs `node_modules/@ritenoar/agentrite/container/agent.sh` with the
  project root as its first argument
* `agent/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument
