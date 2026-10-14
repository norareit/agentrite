# AgentRite

A kit for running coding agents by a fixed process.

The shared instructions and tooling that coding agents work under, in one place so that an improvement is made once
rather than once per project. Projects install it as the npm package `agentrite` and keep only what is
specific to them.

* [The name](#the-name)
* [What is here](#what-is-here)
* [How it works](#how-it-works)
* [Commands](#commands)
* [Running a role](#running-a-role)
* [Installing it into a project](#installing-it-into-a-project)
* [The project's settings](#the-projects-settings)
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

| Path                 | What it holds                                                                     |
|----------------------|-----------------------------------------------------------------------------------|
| `process.md`         | How work is done: the changes process, the commit conventions, the code standards |
| `CHANGELOG.md`       | What each release changed, and what is worth knowing when updating to it          |
| `README.md`          | What the kit is and how a project uses it                                         |
| `LICENSE`            | The MIT License, which the kit is open source under                               |
| `SANDBOX.md`         | The reference of the sandbox                                                      |
| `package.json`       | The package's name, its version and the commands it installs                      |
| `roles/`             | The specifier, planner, implementer and reviewer instructions                     |
| `templates/changes/` | The starting `spec.md`, `plan.md` and `record.md` for a change unit               |
| `templates/project/` | The files `agentrite init` fills in and writes, and the one `config` writes       |
| `scripts/`           | `check-changes.mjs`, the freeze check, and the `agentrite` command                |
| `container/`         | The agent sandbox: image, entrypoint, egress proxy, base Compose file and wrapper |

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

## Commands

Every command a project that installed the kit runs, each with every argument, option and environment variable it
takes.

### agentrite init

```sh
npx agentrite init [--no-sandbox] [--default-branch <name>] <harness>...
npx agentrite init
```

Sets a project up, from its root: writes `agentrite.json`, the role wrappers, the project's agent instructions and the
sandbox's files, writes or amends `opencode.json` with `opencode`, and prints each file it wrote, changed or skipped.
The first form is for a project with no `agentrite.json`, and writes that file from its arguments. The second is for
a project that has one, and takes the harnesses and the sandbox setting from it.

| Argument or option        | What it is                                                                              |
|---------------------------|-----------------------------------------------------------------------------------------|
| `<harness>...`            | `claude` or `opencode`, one or both, for the harnesses the project uses                 |
| `--no-sandbox`            | For a project without the sandbox. Leaves out what is only for it, as said below        |
| `--default-branch <name>` | The project's default branch, written as `defaultBranch`. `master` when not given       |

In a project with no `agentrite.json`:

* `init` writes the file with the harnesses given, each once and in the order `claude`, `opencode` whatever order
  they were given in, with `sandbox` as `false` when `--no-sandbox` is given and `true` when it is not, and with
  `defaultBranch` as the name given, or `master`
* It prints `wrote agentrite.json` first and, at the end, after its notices, the content of the file as it wrote it.
  When `--default-branch` was not given it then prints a notice that `master` was written as the default branch, and
  that a project whose default branch is another changes `defaultBranch` in `agentrite.json`
* `--default-branch` goes at any place among the harnesses. The word after it is the name, whatever that word is, and
  given more than once the last one counts. With no word after it, or with an empty one, `init` prints why and its
  usage, writes nothing and exits 2. The form `--default-branch=<name>` is not taken, and is refused as an unknown
  harness
* With no harness, `init` prints its usage, writes nothing and exits 2

In a project with an `agentrite.json`:

* With no argument, `init` writes what is missing for the harnesses the file names, and with `sandbox` `true` for the
  sandbox, prints `skipped agentrite.json, which exists`, and leaves the file as it is
* Given a harness, `--no-sandbox` or `--default-branch`, also when the arguments say what the file says, it refuses:
  it writes nothing, exits 1, and says that the settings are read from the file, that a setting is changed by editing
  it, and that `npx agentrite init` with no argument then writes what is missing

With `opencode` among the harnesses, `init` writes `opencode.json` when nothing is at its path, and prints
`wrote opencode.json`. One that is a JSON object it amends, keeping every other key, their order, the indentation and
whether it ends in a line break: it adds `node_modules/agentrite/process.md` at the end of the `instructions` list, or
adds the list, and prints `changed opencode.json`. One whose list holds the path already, or that is not JSON and
whose text holds `"node_modules/agentrite/process.md"` with the quotes, as one with a comment in it can, it leaves
as it is, and prints `skipped opencode.json, which loads node_modules/agentrite/process.md`. Any other it leaves as
it is, and prints `skipped opencode.json, which cannot be amended` and a notice that says why and what to add by
hand: one that cannot be read, is not JSON, is not a JSON object, or has an `instructions` that is not a list. No
state of the file makes `init` refuse, and it writes everything else as it would have. Without `opencode`, `init`
does not read `opencode.json` and prints nothing of it.

`CLAUDE.md` that exists is left as it is. With `claude` among the harnesses, and only when it lacks one of the lines
`@node_modules/agentrite/process.md` and `@AGENTS.md`, `init` prints a notice that names the lines it lacks. A line
counts when it is exactly that text, ending in LF or CRLF.

With `--no-sandbox`, or with `sandbox` `false` in the file, `init` writes the role wrappers, `AGENTS.md` and
`CLAUDE.md`, amends `package.json`, writes or amends `opencode.json` with `opencode`, and prints the same lines and
notices for them. It does not write, change or
read `sandbox.sh`, `sandbox/compose.project.yml` or `.dockerignore`, prints no line for any of the three, and leaves
one that exists as it is. It runs when `package.json` has no `name`, and does not read `package-lock.json`. It still
refuses, writing nothing, when `package.json` is missing or cannot be read. The option goes at any place among the
harnesses, and given more than once it counts as given once.

See "Installing it into a project", "How the kit's instructions reach an agent" and "The project's settings".

### agentrite config

```sh
npx agentrite config
```

Writes the default `agentrite.json` into a project that has none, from the project root. It takes no argument: given
one, it prints its usage, writes nothing and exits 2.

It prints `wrote agentrite.json`, the content of the file as it wrote it, and a notice: these are the kit's defaults,
nothing of the project was looked at to find them, each is to be checked against the project, `agentrite.json` is
edited by hand where one is wrong, and the file is committed. It reads nothing else of the project, and runs in one
that has no `package.json`.

Where something is at the path of `agentrite.json`, a file that is not valid among it, `config` leaves it as it is,
prints `skipped agentrite.json, which exists`, prints no content and no notice, and exits 0.

See "The project's settings".

### agentrite refresh

```sh
npx agentrite refresh
```

Brings the kit's own files in a project up to date with the installed release, from the project root, and prints
each file as written, refreshed or up to date. It takes no argument: the harnesses and the sandbox setting are read
from `agentrite.json`, which it never writes. Given any argument, it prints its usage and that the two are read from
`agentrite.json`, writes nothing and exits 2.

It refreshes the role wrappers of the harnesses that `harnesses` names, a pinned model that survives included. With
`sandbox` `true` it refreshes `sandbox.sh` too, and writes one that is missing. With `sandbox` `false`, `sandbox.sh`
is not read or written and no line is printed for it: what is at its path, a symbolic link or a directory included,
changes neither what `refresh` prints nor its exit status.

It reads `CLAUDE.md` with `claude` among the harnesses, and `opencode.json` with `opencode`, and never writes or
creates either. After the lines of the files, it prints a notice, after an empty line, for each that does not load
the kit's instructions: a `CLAUDE.md` that is missing or lacks one of the lines `@node_modules/agentrite/process.md`
and `@AGENTS.md`, and an `opencode.json` that is missing or does not hold `node_modules/agentrite/process.md` in its
`instructions` list, judged as `init` judges it. The notice names what is missing, or why the file could not be
read, and says that `refresh` does not add it. It changes neither what `refresh` writes nor its exit status.

See "Updating a project to a newer kit", "How the kit's instructions reach an agent" and "The project's settings".

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

### check-changes

```sh
npm run check-changes
node node_modules/agentrite/scripts/check-changes.mjs [<repository root>]
```

The change check. It compares the committed work on the current branch with the default branch, and exits non-zero
with a list of the offending units when a frozen `spec.md` or `plan.md` changed or an implemented plan has unticked
tasks.

The default branch is the one that `defaultBranch` names in the `agentrite.json` at the repository root, as that
file is in the working tree. The check takes the local branch of that name, and `origin/<default branch>` when the
local one gives no common ancestor. When neither gives one it fails, and names the two it tried.

| Argument or option  | What it is                                               |
|---------------------|----------------------------------------------------------|
| `<repository root>` | Optional, and the working directory when it is not given |

See "Installing it into a project" and "The project's settings".

### sandbox.sh

```sh
./sandbox.sh [--rebuild] [--mount HOST[:ro]]... UNIT [COMMAND...]
./sandbox.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
./sandbox.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
./sandbox.sh --connect UNIT [COMMAND...]
```

Starts the sandbox, from the project root, with what the form names mounted at `/work`, and opens a shell in it.
With `--connect` it starts nothing, and runs beside a unit run that is under way. A unit given by a number that no
branch holds gets its branch first, cut from the default branch that `agentrite.json` names.

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

| Environment variable | What it is                                                                                 |
|----------------------|--------------------------------------------------------------------------------------------|
| `SANDBOX_MEM_LIMIT`  | The memory limit, in place of the `8g` that `init` writes in `sandbox/compose.project.yml` |
| `SANDBOX_CPUS`       | The CPU limit, in place of the `6` that `init` writes in `sandbox/compose.project.yml`     |
| `TERM`               | The terminal type, passed to the command. One the image lacks becomes `xterm-256color`     |
| `COLORTERM`          | Whether the terminal shows 24-bit colour. Passed to the command when set and not empty     |
| `XDG_STATE_HOME`     | Where the clones of unit runs are kept, in place of `~/.local/state`                       |
| `XDG_DATA_HOME`      | Where the project's log directory is, in place of `~/.local/share`                         |

See "The sandbox", and in `SANDBOX.md` "Running a unit", "Getting the work back", "Two agents on one unit",
"Running on the tree as it is" and "Where things are kept on the host".

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
  `./sandbox.sh` is still what starts the sandbox. In a unit run of the sandbox, `npx agentrite` is there after
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
  aside. The command names the file and names the command that repairs it, which writes the wrappers of the
  harnesses that `agentrite.json` names:

  ```sh
  npx agentrite refresh
  ```

  So a project that moved to a newer kit runs `refresh` before `run`, and a key a project added to a wrapper by hand
  stops `run` until `refresh` has removed it. See "Updating a project to a newer kit"
* the harness's own command is not on the `PATH`
* `changes/` holds no directory for the unit, or more than one for its digits

## Installing it into a project

The kit is the package `agentrite` on the npm registry, and a project adds it by its name:

```sh
npm install --save-dev agentrite
```

npm writes the package, with a range from the version it installed, under `devDependencies` of the project's
`package.json`, and the version, its address on the registry and an integrity hash into `package-lock.json`. The kit
assumes npm: `init` reads `package-lock.json`, and the sandbox's image installs from it.

Then set the project up from its root, naming only the harnesses it uses:

```sh
npx agentrite init claude opencode
```

A project whose default branch is not `master` names it:

```sh
npx agentrite init --default-branch main claude opencode
```

It prints each file it wrote, changed or skipped. It writes:

| File                          | What it is for                                                                       |
|-------------------------------|--------------------------------------------------------------------------------------|
| `agentrite.json`              | The project's settings, which the kit's commands read. See "The project's settings"  |
| `.claude/agents/*.md`         | For `claude`: a wrapper per role for Claude Code, pointing at the kit's role file    |
| `.opencode/agents/*.md`       | For `opencode`: the same for OpenCode                                                |
| `AGENTS.md`                   | The project's agent instructions, pointing at the kit's `process.md` and role files  |
| `CLAUDE.md`                   | Imports the kit's `process.md` and `AGENTS.md` into Claude Code, for any harnesses   |
| `opencode.json`               | For `opencode`: loads the kit's `process.md` into OpenCode. Amended when it exists   |
| `sandbox.sh`                  | The shim that runs the kit's sandbox from the project root. See "The sandbox"        |
| `sandbox/compose.project.yml` | The project's half of the sandbox configuration                                      |

* Every generated file is the project's own once written, and the project may edit any of them
* A project without the sandbox runs `npx agentrite init --no-sandbox claude opencode`, which leaves out `sandbox.sh`,
  `sandbox/compose.project.yml` and `.dockerignore`, as "agentrite init" in "Commands" says, and writes `sandbox` as
  `false` in `agentrite.json`
* `init` never regenerates one: a file it would create that already exists is left as it is and reported as
  skipped, so running it again only adds what is missing. In a project that has its `agentrite.json`, that is
  `npx agentrite init` with no argument
* The OpenCode wrappers are written with `mode: all`, which makes each role both a primary agent and a subagent.
  The roles are therefore also offered among the primary agents in OpenCode's own interface
* `init` refuses to run, writing nothing, when `package.json` has no `name`, unless the project is without the
  sandbox: `--no-sandbox`, or `sandbox` `false` in its `agentrite.json`

The files a project is expected to edit are these:

* `agentrite.json`, where a setting is not what the project has. See "The project's settings"
* `AGENTS.md` has a marked section for what is specific to the project, such as its house style, its code rules and
  how its tests run, and keeps only that: what holds for every project is in the kit. The three sections above it,
  Development Guidelines, Roles and Changes in this project, are what make the kit's instructions reach an agent, and
  are best kept. See "How the kit's instructions reach an agent"
* `sandbox/compose.project.yml` holds the Compose project and image names, both derived from the `name` in
  `package.json`, the `PLAYWRIGHT_VERSION` build argument when the project has Playwright, the memory and CPU limits,
  and the project's `ALLOWLIST`. The allowlist lists only what the project needs beyond what the kit admits itself.
  See "Reaching more hosts" of [`SANDBOX.md`](SANDBOX.md)
* The role wrappers, to pin a model per role

`CLAUDE.md` is best left as written, and what it must keep is in "How the kit's instructions reach an agent".
`sandbox.sh` is not a file to edit, and of what a project adds to a role wrapper
only a pinned model lasts. See "Updating a project to a newer kit".

A file that already exists:

* When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
  ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste
  in whichever it lacks. See "How the kit's instructions reach an agent"
* When `CLAUDE.md` already exists, it is left untouched too, and must hold the lines
  `@node_modules/agentrite/process.md` and `@AGENTS.md`. With `claude` among the harnesses, `init` prints a notice
  that names the ones it lacks. See "How the kit's instructions reach an agent"
* When `opencode.json` already exists, with `opencode` among the harnesses, `init` amends it as said below, or leaves
  it with a notice when it cannot
* An existing `sandbox/compose.project.yml` is left as it is

`init` also amends three files, adding only what is missing:

* `package.json` gains a `check-changes` script, unless it has one, keeping every other key, their order and the
  indentation:

  ```json
  "scripts": {
    "check-changes": "node node_modules/agentrite/scripts/check-changes.mjs"
  }
  ```

* `.dockerignore` is written when there is none. When it keeps any file of the kit's `container/` directory out of
  the build context, whatever its patterns, the exception is appended, so that the image build can reach the kit.
  Otherwise the file is left alone
* `opencode.json`, with `opencode` among the harnesses, is written when there is none. When it is a JSON object,
  `node_modules/agentrite/process.md` is added at the end of its `instructions` list, or the list is added, keeping
  every other key, their order and the indentation. When it cannot be amended, because it cannot be read, is not
  JSON, is not a JSON object, or has an `instructions` that is not a list, it is left with a notice of what to add
  by hand. One that loads `process.md` already is left alone

A project whose `.dockerignore` excludes `node_modules` must let that one directory's files back in:

```
node_modules
!node_modules/agentrite/container/**
```

The exception names the files rather than the directory: `!node_modules/agentrite/container` alone does
not bring back a kit file that a pattern excluded by name.

A project that depends on Playwright gets a sandbox with its browser:

* `init` takes the version from `package-lock.json` and writes it into `sandbox/compose.project.yml` as the
  `PLAYWRIGHT_VERSION` build argument. When the lockfile resolves no `playwright`, `init` writes the compose file
  without the argument, and the sandbox is built without a browser. `init` exits 0 either way
* The browser is in the image when the project's compose file gives `PLAYWRIGHT_VERSION` under
  `services.sandbox.build.args`, and not otherwise: the build argument alone decides
* A project that starts using Playwright adds the argument by hand, as the version its `package-lock.json`
  resolves, and one that stops removes it, and both rebuild with `./sandbox.sh --in-place --rebuild`. `init` and
  `refresh` never rewrite `sandbox/compose.project.yml`, which is the project's own

`init` fills in the templates in the kit's `templates/project/`, which ship in the package, at
`node_modules/agentrite/templates/project/`. A project set up or repaired by hand starts from the same
files, filling in each `{{placeholder}}` itself.

### How the kit's instructions reach an agent

A harness loads the kit's `process.md` into every session, and an agent finds the role files from it, because of
what three files of the project hold. Each file, what it must hold, and the harness that reads it:

* `AGENTS.md`, read by Claude Code and OpenCode: the sections Development Guidelines, Roles and Changes in this
  project, as `init` writes them. They call `process.md` required reading and name the role files
* `CLAUDE.md`, read by Claude Code: the lines `@node_modules/agentrite/process.md` and `@AGENTS.md`, each on a line
  of its own and outside a code span or a fenced block. From them Claude Code loads `process.md` and `AGENTS.md`
  into every session
* `opencode.json` at the project root, read by OpenCode, and needed only with `opencode` among the harnesses:
  `node_modules/agentrite/process.md` in its `instructions` list. From it OpenCode loads `process.md` into every
  session, beside `AGENTS.md`, which it reads by itself

The two lines of `CLAUDE.md` are shown here in a block. In the file they are not in one, since Claude Code does not
read a line inside a fenced block or a code span:

```
@node_modules/agentrite/process.md
@AGENTS.md
```

The `opencode.json` that `init` writes into a project that has none:

```json
{
  "instructions": [
    "node_modules/agentrite/process.md"
  ]
}
```

* `init` puts these into each of the three files it writes, and into an `opencode.json` it can amend. For an
  `AGENTS.md` or a `CLAUDE.md` that exists, and for an `opencode.json` it cannot amend, it only prints a notice of
  what is missing. The project then adds that by hand
* Neither harness reports a file that lacks them. There is no error: a session starts without the kit's
  instructions in its context, and reads them only if the model follows the link to `process.md` in `AGENTS.md`
* `refresh` never adds them to `CLAUDE.md` or `opencode.json`. It prints a notice on each run for as long as one of
  them lacks them, so a project that leaves them out on purpose gets that notice on every `refresh`

### On a fresh clone

A fresh clone of a project has no kit. `npm ci` installs it with the project's other dependencies, at exactly the
release and integrity hash `package-lock.json` records, and fails rather than install anything else.

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike:
the sandbox admits the hosts they need itself. See "Reaching more hosts" of `SANDBOX.md`. A project's `sandbox.sh`
runs the wrapper from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox can
start.

The kit is a development dependency. An install that leaves those out, as `npm ci --omit=dev` and an `npm ci` with
`NODE_ENV=production` do, installs no kit, and `npx agentrite` and `npm run check-changes` do not run there. A job
that runs the change check therefore installs with a plain `npm ci`.

## The project's settings

A project's settings are in `agentrite.json` at the project root, a JSON object with three keys:

| Key             | What it holds                                                 | What reads it                   |
|-----------------|---------------------------------------------------------------|---------------------------------|
| `defaultBranch` | The branch that units are cut from and compared with          | The change check and a unit run |
| `harnesses`     | The harnesses the project uses, as a list                     | `init` and `refresh`            |
| `sandbox`       | `true` with the sandbox, `false` without it                   | `init` and `refresh`            |

The default file, which `npx agentrite config` writes, and `npx agentrite init claude opencode` too:

```json
{
  "defaultBranch": "master",
  "harnesses": ["claude", "opencode"],
  "sandbox": true
}
```

* `init` writes the file from its arguments in a project that has none, and `config` writes the default file. The
  default branch is `master` unless `--default-branch` or an edit says otherwise
* The file is committed
* All three keys are required. `defaultBranch` is a string that is not empty, `harnesses` is a list of one or more of
  `claude` and `opencode`, in which a name given more than once counts once, and `sandbox` is `true` or `false`, not
  a string. A key the kit does not know is ignored
* The file is read by `refresh`, by `init` in a project that has one, by the change check, and by `./sandbox.sh` when
  a unit run cuts a branch. `agentrite roles`, `agentrite run`, and `./sandbox.sh` with `--in-place`, with
  `--workdir`, with `--connect` or with a unit whose branch exists do not read it
* A command that reads the file refuses in a project that has none, and names `npx agentrite config` as the command
  that writes one. It refuses a file that is not valid too, also when what is wrong is a key the command does not
  use, and names the file, the key, what is wrong with it and what it must hold. Either way it writes and changes
  nothing and exits with a status other than 0. No command takes a missing file for the default file, or a missing
  key for its default value

A setting is changed by editing the file by hand. What to run afterwards:

* `defaultBranch`: nothing
* A harness added to `harnesses`: `npx agentrite refresh` writes its wrappers. The wrapper directories that the
  project's `AGENTS.md` lists are the project's to bring up to date
* `sandbox` set to `true`: `npx agentrite init` writes the files of the sandbox that are missing
* A harness taken out, or `sandbox` set to `false`: no command removes a file, and what is left is removed by hand

## Updating a project to a newer kit

Install the newest release:

```sh
npm install --save-dev agentrite@latest
```

That changes only `package.json` and `package-lock.json`, which the project commits like any other change.
`npm outdated` reports when a newer release exists.

What a release changed, and what is worth knowing when updating to it, is in the kit's `CHANGELOG.md`, which after
the install is at `node_modules/agentrite/CHANGELOG.md`. It holds one section per release, newest first. A
project that skips releases reads every section between its old version and the new one.

A project with no `agentrite.json` first runs `npx agentrite config`, checks what it wrote against the project,
edits the file where the project differs, and commits it. See "The project's settings".

Then bring the kit's own files in the project up to date, from the project root:

```sh
npx agentrite refresh
```

It rewrites the role wrappers of the harnesses that `agentrite.json` names, and `sandbox.sh`, as the new release
writes them, writes any that are missing, and prints each file as written, refreshed or up to date. Without it those
copies stay as an older release wrote them, and nothing says so. In a project whose `agentrite.json` says `sandbox`
`false`, it leaves `sandbox.sh` out, so that one the project removed on purpose is not written back.

* A model pinned in a wrapper survives: a line in its frontmatter that opens with `model:` is kept, as written,
  after the kit's own keys
* Everything else in a wrapper, and all of `sandbox.sh`, is replaced, other keys a project added to the frontmatter
  among them. The wrappers are tracked files, so `git diff` shows what a refresh changed, and git has what it
  replaced
* `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `sandbox/compose.project.yml`, `package.json` and `.dockerignore` are
  never written, and never created
* It reads `CLAUDE.md` with `claude` among the harnesses, and `opencode.json` with `opencode`, and after its lines
  prints a notice for each that does not load the kit's instructions, as "agentrite refresh" in "Commands" says. A
  project set up before the release that loads them runs `npx agentrite init` with no argument, which writes or
  amends its `opencode.json`, and adds what the notices still name by hand. See "How the kit's instructions reach
  an agent"
* A path that holds something other than a regular file, such as a symbolic link, is left as it is and named on
  standard error. The other files are still refreshed, and the command exits non-zero

An improvement found while working in a project is made in the kit's repository, and committed there. The installed
copy under a project's `node_modules` is not a working copy of that repository, and nothing in it reaches there. The
improvement reaches that project, and every other, as a new release that each one updates to as above.

## The sandbox

The sandbox is a Docker container that a harness is run in, with a clone of a unit's branch or the project mounted
read-write at `/work`. `./sandbox.sh` starts it, in the forms "Commands" gives. The reference is
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

What it confines:

* The container's root filesystem is read-only. The agent writes the working directory, its home volume, the
  project's log directory on the host and `/tmp`
* `/tmp` is in memory and is emptied when the container stops, and files in it can be run, so a test suite or a tool
  that runs what it writes to the temporary directory works as on the host
* Egress is bounded by hostname: HTTPS on port 443 to the allowlisted hosts, and little else. See "Reaching more
  hosts" of `SANDBOX.md`
* Everything that confines the container is in `container/compose.yml` and `container/entrypoint.sh`

Nothing of the host is reachable but what is mounted at `/work`, with these exceptions:

| Of the host                                  | Mounted    | In `SANDBOX.md`                     |
|----------------------------------------------|------------|-------------------------------------|
| The developer's `~/.gitconfig`               | Read-only  |                                     |
| The developer's Claude Code status line      | Read-only  | "The status line"                   |
| The project's log directory                  | Read-write | "Where things are kept on the host" |
| The local model server's port                |            | "The local model server"            |
| The project's `.reviews`, in a unit run only | Read-write | "Running a unit"                    |

The `~/.gitconfig` makes commits from inside carry the same name and email as on the host.

A project configures the sandbox with two files:

* `sandbox.sh` at the project root, a shim that execs `node_modules/agentrite/container/sandbox.sh` with the
  project root as its first argument
* `sandbox/compose.project.yml`, holding what varies per project: the Compose project name, the image name, the egress
  allowlist, the resource limits and, for a project with Playwright, the `PLAYWRIGHT_VERSION` build argument
