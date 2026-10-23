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

The process is the same in every project. A project can replace the standards, and each of the roles, with a file of
its own, named in its `agentrite.json`. See [Replacing a role or the standards](#replacing-a-role-or-the-standards).
A project can add roles of its own as well. See [Adding a role](#adding-a-role).

* [The name](#the-name)
* [What is here](#what-is-here)
* [How it works](#how-it-works)
* [Commands](#commands)
* [Running a role](#running-a-role)
* [The orchestrator](#the-orchestrator)
* [Installing it into a project](#installing-it-into-a-project)
* [Git hooks](#git-hooks)
* [The project's settings](#the-projects-settings)
* [Replacing a role or the standards](#replacing-a-role-or-the-standards)
* [Adding a role](#adding-a-role)
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
| `process.md`         | How work is done: the changes process, the roles, the commit prefixes                     |
| `standards.md`       | The rules on how text, documentation, commits, code and tests are written                 |
| `orchestrator.json`  | The orchestrator's default definition, which a project may copy and change                |
| `CHANGELOG.md`       | What each release changed, and what is worth knowing when updating to it                  |
| `README.md`          | What the kit is and how a project uses it                                                 |
| `LICENSE`            | The MIT License, which the kit is open source under                                       |
| `SANDBOX.md`         | The reference of the sandbox                                                              |
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
[Adding a role](#adding-a-role).

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
npx agentrite init [--no-sandbox] [--no-orchestrator] [--default-branch <name>] <harness>...
npx agentrite init
```

Sets a project up, from its root: writes `agentrite.json`, the wrappers of every role `roles` names, the list of the
instruction files in use, the project's agent instructions, the sandbox's files and the `commit-msg` hook, writes or
amends `opencode.json` with `opencode`, and prints each file it wrote, changed or skipped. The hook is written as
[Git hooks](#git-hooks) says. The first form is for a project with no
`agentrite.json`, and writes that file from its arguments. The second is for a project that has one, and takes the
harnesses and the sandbox setting from it.

| Argument or option        | What it is                                                                              |
|---------------------------|-----------------------------------------------------------------------------------------|
| `<harness>...`            | `claude` or `opencode`, one or both, for the harnesses the project uses                 |
| `--no-sandbox`            | For a project without the sandbox. Leaves out what is only for it, as said below        |
| `--no-orchestrator`       | For a project without the orchestrator. Writes `orchestrator` as `false`                |
| `--default-branch <name>` | The project's default branch, written as `defaultBranch`. `master` when not given       |

In a project with no `agentrite.json`:

* `init` writes the file with the harnesses given, each once and in the order `claude`, `opencode` whatever order
  they were given in, with `sandbox` as `false` when `--no-sandbox` is given and `true` when it is not, with
  `defaultBranch` as the name given, or `master`, with `orchestrator` as `false` when `--no-orchestrator` is given and
  as the kit's default definition, `node_modules/agentrite/orchestrator.json`, when it is not, and with `standards`
  and `roles` naming the kit's own files, as the default file does
* Before it writes anything, it checks that each path of `standards`, `orchestrator` and `roles` names a file. In a
  project where the kit is not installed under `node_modules`, it refuses as a command that reads an `agentrite.json`
  whose path names no file does, writes nothing and exits 1
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
* Given a harness, `--no-sandbox`, `--no-orchestrator` or `--default-branch`, also when the arguments say what the file
  says, it refuses: it writes nothing, exits 1, and says that the settings are read from the file, that a setting is
  changed by editing it, and that `npx agentrite init` with no argument then writes what is missing

The wrappers, the list `.agentrite/instructions.md`, `CLAUDE.md` and `opencode.json` follow `standards` and `roles`
in `agentrite.json`. Below, the standards path is the one `standards` names, which in the default file is
`node_modules/agentrite/standards.md`. Each role's wrappers carry the description of the role file `roles` gives and
point at that file, and `init` refuses, writing nothing, a role file that does not open with the front matter that
"Replacing a role or the standards" gives, naming the file and the form it must have.

With `opencode` among the harnesses, `init` writes `opencode.json` when nothing is at its path, naming OpenCode's
schema `https://opencode.ai/config.json` and holding both paths in its `instructions` list, and prints
`wrote opencode.json`. One that is a JSON object it amends, keeping every other key, their order, the indentation and
whether it ends in a line break, and adding no `$schema`: it adds whichever of `node_modules/agentrite/process.md` and
the standards path its `instructions` list lacks at the end of the list, in that order, or adds the list with both,
and prints `changed opencode.json`. One whose list holds both paths already, or that is not JSON and whose text holds
each of the two paths in quotes, as one with a comment in it can, it leaves as it is, and prints
`skipped opencode.json, which loads node_modules/agentrite/process.md and <standards path>`. Any other it leaves as it
is, and prints `skipped opencode.json, which cannot be amended` and a notice that says why and names the paths to add
by hand: one that cannot be read, is not JSON, is not a JSON object, or has an `instructions` that is not a list. No
state of the file makes `init` refuse, and it writes everything else as it would have. Without `opencode`, `init`
does not read `opencode.json` and prints nothing of it.

`CLAUDE.md` that exists is left as it is. With `claude` among the harnesses, and only when it lacks one of the lines
`@node_modules/agentrite/process.md`, `@<standards path>` and `@AGENTS.md`, `init` prints a notice that names the
lines it lacks. A line counts when it is exactly that text, ending in LF or CRLF.

When `standards` names another file than `node_modules/agentrite/standards.md`, `init` also prints a notice for a
`CLAUDE.md` that still holds the line `@node_modules/agentrite/standards.md`, with `claude` among the harnesses, and
for an `opencode.json` that still holds `node_modules/agentrite/standards.md` in its `instructions` list, or in quotes
in a file that is not JSON, with `opencode`. The harness then loads both sets of rules. The notice names the line or
the entry to remove, and `init` removes neither.

An `AGENTS.md` that exists is left as it is, and `init` prints the sections it would have written, as "Installing it
into a project" says. When that `AGENTS.md` does not hold the text `.agentrite/instructions.md`, a notice follows: that
agents then do not learn from it which role and standards files the project uses, which the list names, and that
`refresh` does not change `AGENTS.md`. `.agentrite/instructions.md` that exists is left as it is, as every file
`init` would create is.

The notices come in this order: the sections of `AGENTS.md`, the notice of `AGENTS.md` and the list, the lines
`CLAUDE.md` lacks, the kit's standards in `CLAUDE.md`, an `opencode.json` that cannot be amended, the kit's standards
in `opencode.json`, and last that no hook was written, outside a git repository.

With `--no-sandbox`, or with `sandbox` `false` in the file, `init` writes the role wrappers, the list, `AGENTS.md`,
`CLAUDE.md` and the hook, amends `package.json`, writes or amends `opencode.json` with `opencode`, and prints the same
lines and notices for them. It does not write, change or
read `sandbox.sh`, `sandbox/compose.project.yml` or `.dockerignore`, prints no line for any of the three, and leaves
one that exists as it is. It runs when `package.json` has no `name`, and does not read `package-lock.json`. It still
refuses, writing nothing, when `package.json` is missing or cannot be read. The option goes at any place among the
harnesses, and given more than once it counts as given once.

`--no-orchestrator` changes only what `init` writes as `orchestrator`, and `init` writes no other file for the
orchestrator either way. The option goes at any place among the harnesses, and given more than once it counts as given
once. The form `--no-orchestrator=<value>` is not taken, and is refused as an unknown harness, as
`--no-sandbox=<value>` is.

It exits with `0`, `1` when it refuses or fails, and `2` for wrong arguments, as [Exit statuses](#exit-statuses) says.

See "Installing it into a project", "Git hooks", "How the kit's instructions reach an agent", "The project's
settings" and "Replacing a role or the standards".

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

It exits with `0`, `1` when it fails, and `2` for an argument, as [Exit statuses](#exit-statuses) says.

See "The project's settings".

### agentrite refresh

```sh
npx agentrite refresh
```

Brings the kit's own files in a project up to date with the installed release, from the project root, and prints
each file as written, refreshed or up to date. It takes no argument: the harnesses and the sandbox setting are read
from `agentrite.json`, which it never writes. Given any argument, it prints its usage and that the two are read from
`agentrite.json`, writes nothing and exits 2.

It refreshes the wrappers of every role `roles` names, the roles of the project's own included, for the harnesses that
`harnesses` names, a pinned model that survives included. Each role's wrappers are written from the role file that
`roles` gives: its description, and a body that says to read that file. A role file that does not open with the front
matter "Replacing a role or the standards" gives is refused: `refresh` names the file and the form the front matter must
have, writes nothing and exits 1. It then writes the list `.agentrite/instructions.md` from `standards` and `roles`,
whatever is at its path. With `sandbox` `true` it refreshes `sandbox.sh` too, and writes one that is missing. With
`sandbox` `false`, `sandbox.sh` is not read or written and no line is printed for it: what is at its path, a symbolic
link or a directory included, changes neither what `refresh` prints nor its exit status. After them it writes the
`commit-msg` hook where there is none, and rewrites one that carries the kit's mark, as [Git hooks](#git-hooks) says.

After the lines of the files and before the notices, `refresh` removes the wrapper of a role that `roles` no longer
names, as a role taken out or renamed leaves one. In the wrapper directory of each harness that `harnesses` names, it
removes a regular file `<name>.md` whose `<name>` is not a role `roles` names, when the text after its front matter is
the body the kit writes in a wrapper: to read a file by its path from the project root and follow it, whatever the
path. A model pinned in the front matter does not stop the removal. It prints `removed <path>` for each file it
removes. A file with another body, such as an agent of the project's own, a symbolic link and a directory are left as
they are, and `refresh` says nothing of them. `init` removes nothing.

It reads `CLAUDE.md` with `claude` among the harnesses, and `opencode.json` with `opencode`, and never writes or creates
either. After the lines of the files, it prints a notice, after an empty line, for each that does not load the kit's
instructions: a `CLAUDE.md` that is missing or lacks one of the lines `@node_modules/agentrite/process.md`, `@` and the
path that `standards` names, and `@AGENTS.md`, and an `opencode.json` that is missing or does not hold both
`node_modules/agentrite/process.md` and the path that `standards` names in its `instructions` list, judged as `init`
judges it. The notice says why the file does not load them, names the lines or paths that are missing, and says that
`refresh` does not add them. When `standards` names another file than `node_modules/agentrite/standards.md`, it prints
the notices `init` prints for a `CLAUDE.md` and an `opencode.json` that still load the kit's `standards.md`.

It reads `AGENTS.md` too, whatever the harnesses, and never writes it. For one that is missing, or does not hold the
text `.agentrite/instructions.md`, it prints a notice: that agents then do not learn from `AGENTS.md` which role and
standards files the project uses, that `refresh` does not change `AGENTS.md`, and where the README says what it must
hold. The notices come in this order: the lines `CLAUDE.md` lacks, the kit's standards in it, what `opencode.json`
lacks, the kit's standards in it, `AGENTS.md`, then the hook's: a hook of the project's own at its path, or none
written outside a git repository. None of them changes what `refresh` writes or its exit status.

It exits with `0`, `1` when it refuses or fails, and `2` for an argument, as [Exit statuses](#exit-statuses) says.

See "Updating a project to a newer kit", "Git hooks", "How the kit's instructions reach an agent", "The project's
settings" and "Replacing a role or the standards".

### agentrite roles

```sh
npx agentrite roles [--json]
```

Lists the roles of the project, from its root, each with the description that the role file `roles` in
`agentrite.json` gives holds, which is the description its wrappers hold. The four roles come first, in the order
`specifier`, `planner`, `implementer`, `reviewer`, and the roles of the project's own follow, in the order of `roles`.
The JSON document is an object with one key, `roles`, an array that holds each role as an object with its `name`, its
`description`, which is on one line, not wrapped, and its `path`: the path of its file as `roles` gives it, from the
project root. The text listing does not show the path.

It reads `agentrite.json` and refuses as every command that reads it does, in a project that has none or whose file
is not valid. It refuses a role file that does not open with the front matter "Replacing a role or the standards"
gives too, and names the file and the form the front matter must have. Either way it prints nothing on standard
output and exits 1.

| Argument or option | What it is                                                                   |
|--------------------|------------------------------------------------------------------------------|
| `--json`           | Prints the same roles, in the same order, as one JSON document, for a script |

It exits with `0`, `1` when it refuses or fails, and `2` for an argument other than `--json`, as
[Exit statuses](#exit-statuses) says.

### agentrite units

```sh
npx agentrite units [<number>] [--open | --status <status>] [--kind <kind>] [--limit <count>] [--json]
```

Lists the units of `changes/` in the directory it runs in. It reads that `changes/` as it stands in the working tree
and nothing else: no other branch, no other revision and no `agentrite.json`, so it runs in a project that has none.
A unit is a directory of `changes/` whose name is four digits, a hyphen and at least one character more. No other
directory is listed or found by its number. The units come in the order of their number, the highest first, and units
with the same number in the order of their directory names. The options may stand at any place among the arguments.

Each unit is one line: its number, its status, its kind and its title, the first three padded to the widest value of
their column among the lines listed, the columns separated by two spaces. The status and the kind are the values of
the `status` and `kind` fields of the unit's `record.md`, as written there. The title is the first `#` heading of the
record, without the unit's number and the space after it when the heading begins with them.

```text
0077  in-progress  feature  The units of a project can be listed
0076  implemented  bug      A bug
```

Without a filter every unit is listed. `--open` leaves out the units whose status is `implemented` or `cancelled`.
`--status <status>` lists the units of that status, one of `draft`, `approved`, `in-progress`, `implemented` and
`cancelled`. `--kind <kind>` lists the units of that kind, one of `feature`, `bug` and `task`, and goes with `--open`
and with `--status`: a unit is listed when it passes each filter given. `--open` and `--status` are not given together.

`<number>` is exactly four digits. With it the command shows the unit or units whose directory opens with those
digits and a hyphen, which are several when units share a number, and the filters apply to them as to a listing.
Without it at most 50 units are listed. `--limit <count>` sets another maximum and `--limit 0` lists every unit. The
limit counts the units that remain after the filters, so that `--open` lists up to that many open units. When the
limit leaves units out, the listing ends with the line

```text
showing <shown> of <total> units, --limit 0 shows them all
```

When there is nothing to show, because `changes/` holds no unit or the filters left out every unit, or the unit that
`<number>` names, the listing is the one line `no units`, or `no units with` and what was given, joined by a comma and a
space, in the order the number, `--open`, `--status <status>`, `--kind <kind>`, as in `no units with 0077, --open`. The
command exits `0`.

With `--json` the command prints one JSON document instead: an object with the key `units`, an array of the units
listed in the same order, and the key `total`, the number of units there are after the filters and before the limit.
Each unit is an object with its `number`, a string of the four digits, its `directory`, its `status`, its `kind` and
its `title`. When there is nothing to show, `units` is an empty array and no line of text is printed.

It refuses a unit whose `record.md` is missing, or has no `status` field, no `kind` field or no `#` heading, naming
the file and what is missing in it, a `<number>` that opens no directory of `changes/`, and a directory with no
`changes/`, naming it. Each prints nothing on standard output and exits 1. It prints what is wrong, then its usage, and
exits 2 for a `<number>` that is not four digits, a second `<number>`, `--status`, `--kind` or `--limit` without a
value or given twice, a `<status>` or a `<kind>` that is none of the values, a `<count>` that is not a whole number of
zero or more, `--open` together with `--status`, `--limit` together with `<number>`, and an option the command does
not take.

| Argument or option  | What it is                                                                                  |
|---------------------|---------------------------------------------------------------------------------------------|
| `<number>`          | Four digits. Shows the unit or units whose directory opens with them                        |
| `--open`            | Leaves out the units whose status is `implemented` or `cancelled`                           |
| `--status <status>` | Lists the units of that status only. Not given with `--open`                                |
| `--kind <kind>`     | Lists the units of that kind only                                                           |
| `--limit <count>`   | Lists at most that many units, 50 without it, and every unit for 0. Not given with a number |
| `--json`            | Prints one JSON document in place of the text                                               |

It exits with `0`, `1` when it refuses or fails, and `2` for a wrong argument, as [Exit statuses](#exit-statuses)
says.

### agentrite run

```sh
npx agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] [--skip-permissions]
                  [-- <harness arguments...>]
```

Starts a harness as one of the roles, for one unit, from the project root. Run with no argument, it prints its
usage. It reads `agentrite.json` and the role files it names, and refuses as `agentrite roles` does, starting
nothing. Given a role that `roles` does not name, it refuses too: it prints on standard error the role and the roles
the project has, starts nothing and exits 1.

| Argument or option          | What it is                                                                          |
|-----------------------------|-------------------------------------------------------------------------------------|
| `<role>`                    | A role that `agentrite.json` names, as `agentrite roles` lists them                 |
| `<harness>`                 | `claude` or `opencode`                                                              |
| `<unit>`                    | A directory of `changes/`, by its name or by the four digits its name opens with    |
| `--prompt <text>`           | Adds its text to the prompt, as it is written. Also `--prompt="<text>"`             |
| `--model <id>`              | The harness's own id of a model, passed on as it is written. Also `--model=<id>`    |
| `--headless`                | Runs the harness without a session, for a script: it works on the prompt and ends   |
| `--skip-permissions`        | Ends the harness's questions about permissions. The option belongs in the sandbox   |
| `-- <harness arguments...>` | Ends the command's own arguments. What follows goes to the harness as it is written |

Before it starts the harness, it exits with `1` when it refuses or fails, and `2` for wrong arguments. Once the
harness started, it passes on the harness's status, and exits with `1` when a signal ended the harness. See
[Exit statuses](#exit-statuses).

See "Running a role".

### agentrite orchestrate

```sh
npx agentrite orchestrate <unit> [--definition <file>] [--skip-permissions] [--follow]
```

Takes an approved unit through its roles, from the project root, by the definition that `orchestrator` in
`agentrite.json` names: it runs each step as `agentrite run` with `--headless`, one at a time, and ends when every
item of the definition has run or a step stops the run. Run with no argument, it prints its usage.

| Argument or option    | What it is                                                                                 |
|-----------------------|--------------------------------------------------------------------------------------------|
| `<unit>`              | A directory of `changes/`, by its name or by the four digits its name opens with           |
| `--definition <file>` | Runs this definition, relative to the project root or absolute. Also `--definition=<file>` |
| `--skip-permissions`  | Passed to the `agentrite run` of every step. The option belongs in the sandbox             |
| `--follow`            | Prints each step's messages and tool calls while it runs. See "How a run ends"             |

It refuses, starts nothing, writes nothing and exits 1 when:

* the project has no `agentrite.json`, or its file is not valid, as every command that reads the file refuses
* `orchestrator` is `false`, also with `--definition`. It says that the project opted out, and which key to change
* the path of `--definition` names no file. It names the path
* the definition is not of the form "The orchestrator" gives. It names the definition's path, where in it the fault
  is, what is wrong and what it must hold
* `changes/` holds no directory for the unit, or more than one for its digits
* the unit's status is not `approved`. It names the status, and says that a run starts the work of an approved unit.
  A `record.md` that is missing, or holds no status, is refused as one that is missing a status field

It takes no `--`: a step's harness gets the arguments the definition and the command give it, and no other.

Every step runs in a process group of its own. `SIGINT`, `SIGTERM` and `SIGHUP` sent to the command, as Ctrl-C on
the terminal and `kill <pid>` send them, are sent on to the step that runs, and the command then ends by the same
signal.

It exits with `0` for a run that ran every item of the definition to its end, `1` when it refuses or fails, `2` for
wrong arguments or none, which it refuses with its usage, and `3`, its own status, for a run that a step or a
repeat stopped, which waits for the human. See [Exit statuses](#exit-statuses).

See "The orchestrator".

### check-changes

```sh
npm run check-changes
node node_modules/agentrite/scripts/check-changes.mjs [<repository root>]
```

The change check. It compares the committed work on the current branch with the default branch, and exits with 1
and a list of the offending units when the `spec.md` or `plan.md` of a unit that is `implemented` or `cancelled` on
the merge base with the default branch changed, such a unit was deleted, an implemented plan has unticked tasks, or
an entry of `## Log` or `## Amendments` of a `record.md` stands after a blank line that separates it from an entry
before it in the same section. Such an entry is named by its first line, and one that already stood after a blank
line on the default branch is not rejected. A cancelled unit's plan with unticked tasks is not rejected.

The default branch is the one that `defaultBranch` names in the `agentrite.json` at the repository root, as that
file is in the working tree. The check takes the local branch of that name, and `origin/<default branch>` when the
local one gives no common ancestor. When neither gives one it fails, and names the two it tried.

| Argument or option  | What it is                                                                           |
|---------------------|--------------------------------------------------------------------------------------|
| `<repository root>` | Optional, and the working directory when it is not given. It takes no other argument |

It exits with `0`, `1` for units at fault or a check that failed, and `2` for more than one argument, which it
refuses with its usage and without checking anything, as [Exit statuses](#exit-statuses) says.

See "Installing it into a project" and "The project's settings".

### check-commit-message

```sh
node node_modules/agentrite/container/check-commit-message.mjs <commit message file>
```

The check of a commit message against the trailers the standards forbid, which the `commit-msg` hook of the project
and that of the sandbox run. It reads the file and refuses the message when a line of it starts with `Co-Authored-By:`
or `Claude-Session:`, the name in any case, as git reads a trailer's name, with nothing before it and the colon right
after it. A line that starts with `#` is not read, and a name anywhere but at the start of a line refuses nothing.

For a message it does not refuse it prints nothing. For one it refuses it prints on standard error, for each
offending line, `line <number>: <line>`, with the line's number in the file and the line as written, and then:

```
The standards forbid the trailers Co-Authored-By and Claude-Session, so remove these lines and make the commit again.
```

A file it cannot read it refuses with `check-commit-message: cannot read <path>: <reason>`.

| Argument or option      | What it is                                                                  |
|-------------------------|-----------------------------------------------------------------------------|
| `<commit message file>` | The file that holds the message, as git gives it to a `commit-msg` hook     |

It exits with `0` for a message it does not refuse, `1` for one it refuses or a file it cannot read, and `2` for no
path or more than one, which it refuses with what is wrong and its usage, reading nothing, as
[Exit statuses](#exit-statuses) says.

See "Git hooks".

### sandbox.sh

```sh
./sandbox.sh [--rebuild] [--mount HOST[:ro]]... UNIT [--variant NAME] [COMMAND...]
./sandbox.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]
./sandbox.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]
./sandbox.sh --connect UNIT [--variant NAME] [COMMAND...]
```

Starts the sandbox, from the project root, with what the form names mounted at `/work`, and opens a shell in it.
With `--connect` it starts nothing, and runs beside a unit run that is under way. A unit given by a number that no
branch holds gets its branch first, cut from the default branch that `agentrite.json` names, unless the unit is
cancelled there, which gets none. With `--variant` the run is of a variant of the unit, on a branch of its own.

Every form but `--connect` reads `bell` from the project's `agentrite.json` at each start, and with `true` has the
harnesses ring the terminal's bell. It refuses a project with no `agentrite.json`, and a file that lacks `bell` or
whose `bell` is neither `true` nor `false`, with a message that names the file, the key and what it must hold, and
starts nothing. See "The project's settings".

| Argument or option | What it is                                                                                   |
|--------------------|----------------------------------------------------------------------------------------------|
| `UNIT`             | Mounts a clone of the unit's branch, given by its name or by the unit's number in its name   |
| `--variant NAME`   | Runs a variant of the unit, on the branch `<unit's branch>--NAME`. Optional                  |
| `--in-place`       | Mounts the project root, as it is                                                            |
| `--workdir DIR`    | Mounts `DIR`, as it is                                                                       |
| `--connect UNIT`   | Runs the command in the container of the unit's run that is under way. Takes `--variant`     |
| `--rebuild`        | Builds the image before running, even if it exists and holds the wanted harness versions     |
| `--mount HOST`     | Also mounts the host directory `HOST` at `/mnt/<basename>`, read-write. It may be repeated   |
| `--mount HOST:ro`  | The same, read-only                                                                          |
| `--`               | Ends the options, so that what follows is the unit or the command, even one opening with `-` |
| `COMMAND...`       | Runs this instead of the shell                                                               |

`--variant` is given as `--variant NAME` or `--variant=NAME`, before `UNIT` or as the argument right after it. It is
refused with `--in-place` and `--workdir`, and when given twice. Besides `--variant`, `--connect` takes no option.

A word that opens with `-` where an option stands, and is none of the options above, is refused, named, and the
forms printed. A unit or a command that opens with `-` goes after `--`. A command's own options after the unit, or
after `--in-place COMMAND`, are the command's, and are passed on as they are.

Before the command in the container starts, or the one of `--connect`, it exits with `2` for wrong arguments and with
`1` for every other refusal or failure of its own: among them an `agentrite.json` at fault, a unit that names no
branch, a unit given by a number that names no branch and that is cancelled on the default branch, a run under way
for the branch or none to connect to, a clone not yet brought back, and Docker or npm that cannot be asked. A Docker
command it runs before that which fails, as Compose reading the configuration or the build of the image, ends it with
Docker's status, which it passes on. Once the command started, it passes on the command's status, as
[Exit statuses](#exit-statuses) says.

With a project's `sandbox/Dockerfile`, `--rebuild` builds that file anew on the image too. See "Adding software to
the sandbox" in [`SANDBOX.md`](SANDBOX.md).

| Environment variable | What it is                                                                                 |
|----------------------|--------------------------------------------------------------------------------------------|
| `SANDBOX_MEM_LIMIT`  | The memory limit, in place of the `8g` that `init` writes in `sandbox/compose.project.yml` |
| `SANDBOX_CPUS`       | The CPU limit, in place of the `6` that `init` writes in `sandbox/compose.project.yml`     |
| `TERM`               | The terminal type, passed to the command. One the image lacks becomes `xterm-256color`     |
| `COLORTERM`          | Whether the terminal shows 24-bit colour. Passed to the command when set and not empty     |
| `XDG_STATE_HOME`     | Where the clones of unit runs are kept, in place of `~/.local/state`                       |
| `XDG_DATA_HOME`      | Where the project's log directory is, in place of `~/.local/share`                         |

See "The sandbox", and in `SANDBOX.md` "Running a unit", "Getting the work back", "Two agents on one unit",
"Two implementations of one unit", "Running on the tree as it is", "The bell" and "Where things are kept on the host".

## Exit statuses

Every command of the kit exits with a status that means the same in each:

| Status     | What it means                                                                                     |
|------------|---------------------------------------------------------------------------------------------------|
| `0`        | The command did what it was asked                                                                 |
| `1`        | The command was given arguments it takes, and refused or failed. Its message says why             |
| `2`        | The arguments are wrong. It says what is wrong, prints its usage or its forms, and starts nothing |
| `3` and up | A meaning of one command's own, which that command's section in "Commands" names                  |

* A check that finds something at fault, as the change check does, ends with `1`
* The arguments are wrong for an option the command does not take, an option without its value, a value not of the
  form the option takes, arguments that do not go together, and one that is missing
* No two meanings of one command share a status. One command of the kit has a status of its own:
  `npx agentrite orchestrate` exits `3` for a run that stopped for the human

A command that runs another program and exits with that program's status passes on whatever that program gave, and
a caller cannot tell it from the command's own. Before that program started, the command's own statuses hold:

* `npx agentrite run`, once the harness started. A harness that a signal ended has no status to pass on, and the
  command exits `1`
* `./sandbox.sh` with a unit, `--in-place` or `--workdir`, once the command, or the shell, in the container started.
  A unit run whose command exited `0` and whose work was not brought back exits `1`. Before that, a Docker command
  it runs which fails, as Compose reading the configuration or the build of the image, passes on Docker's status
* `./sandbox.sh --connect`, once the connected command started

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
* The command waits for the harness, and exits with the status the harness exited with, or with 1 when a signal ended
  the harness
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

* the project has no `agentrite.json`, its file is not valid, or a role file it names does not open with the front
  matter "Replacing a role or the standards" gives. The command says why, as "agentrite roles" in "Commands" says
* `roles` in `agentrite.json` does not name the role. The command names the role and the roles the project has
* the role's wrapper for the harness is missing, or holds anything but what `refresh` would write from the role file
  that `roles` in `agentrite.json` gives, a pinned model aside. The command names the file and names the command that
  repairs it, which writes the wrappers of the harnesses that `agentrite.json` names:

  ```sh
  npx agentrite refresh
  ```

  So a project that moved to a newer kit, or changed `roles`, runs `refresh` before `run`, and a key a project added
  to a wrapper by hand stops `run` until `refresh` has removed it. See "Updating a project to a newer kit"
* the harness's own command is not on the `PATH`
* `changes/` holds no directory for the unit, or more than one for its digits

## The orchestrator

`agentrite orchestrate` takes an approved unit through its roles, so that the human does not start each one: it runs
the steps of a definition one at a time, each as `agentrite run` with `--headless`, and ends when every step has run
or a step needs the human. A run starts the work of a unit whose `record.md` has the status `approved`, as the human
leaves it after approving the spec, and refuses a unit of any other status.

```sh
npx agentrite orchestrate 0029
```

A project that does not use the orchestrator holds `"orchestrator": false` in `agentrite.json`, which
`npx agentrite init --no-orchestrator` writes, and `agentrite orchestrate` refuses to run in it.

### The definition

What a run does is in its definition, a JSON file that `orchestrator` in `agentrite.json` names. The kit's default,
`node_modules/agentrite/orchestrator.json`, has the planner write the plan in Claude Code on Opus, and then runs at most
three rounds of the implementer in Claude Code on Sonnet followed by a review in OpenCode on GPT Sol. The implementer
of the first round builds the unit, and that of a later round applies the findings of the review before it. A review
with no blocking finding ends the repeat, and a third review with one stops the run:

```json
{
  "steps": [
    { "role": "planner", "harness": "claude", "model": "claude-opus-5-5" },
    {
      "repeat": {
        "times": 3,
        "until": "no-blocking-findings",
        "steps": [
          {
            "role": "implementer",
            "harness": "claude",
            "model": "claude-sonnet-5-5",
            "prompt": "From round 2, this definition accepts review findings you agree with. Propose declining others."
          },
          {
            "role": "reviewer",
            "harness": "opencode",
            "model": "openai/gpt-6.1-sol"
          }
        ]
      }
    }
  ]
}
```

* A definition is a JSON object with one key, `steps`, a list of one or more items. An item is a step or a repeat,
  and the items run in the order of the list
* A step holds `role`, a role that `roles` in `agentrite.json` names, `harness`, one that `harnesses` names, and
  `model`, the harness's own id of a model, each a string that is not empty. It may hold `prompt`, a string that is
  not empty, which the step's prompt gets after the unit, `stopWhen` and `timeoutMinutes`
* A repeat is an object with one key, `repeat`, an object that holds `times`, a whole number of one or more, and
  `steps`, a list of one or more steps, and may hold `until`. It runs its steps in order, round after round. A repeat
  holds no repeat
* `until`, whose only value is `"no-blocking-findings"`, ends the repeat when the outcome of the last step of a round
  has no blocking finding, and the run goes on with the item after the repeat. When it still has one after the last
  round, the repeat ran out, and the run stops. A repeat without `until` runs all its rounds, and never stops the run
  by itself
* `stopWhen`, whose only value is `"blocking-findings"`, stops the run after the step when a finding of its outcome
  is blocking. Any step may hold it, in a repeat or not
* `timeoutMinutes` is the step's time limit in minutes, a number greater than 0 and at most 1440, the minutes of a
  day. A fraction is taken, as `0.5` for 30 seconds. Any step may hold it, in a repeat or not, and a step without it
  has no time limit. When the step's time, from the start of its `agentrite run` to its end, reaches the limit, the
  command sends `SIGTERM` to the step's process group, which holds its `agentrite run` and the harness, and `SIGKILL`
  when a process of the group is left 10 seconds later. It then stops the run
* A step in a repeat is told its round, and how many rounds the repeat has at most, so that its `prompt` can say from
  which round something holds, as the default's implementer's does
* Within one run, a step of a role and a harness that already ran continues that step's session of the harness, so
  that the implementer of a later round has the context of the earlier ones. A run continues no session of an earlier
  run
* A definition with a key it does not take, or a value of another form, is refused before anything runs. The
  message names the definition's path, where in it the fault is, as `steps[1].repeat.steps[0].model`, what is wrong
  and what it must hold

After a step, the step is judged first, by the cases under "How a run ends", and the `until` of its repeat only after
it and only when the step did not stop the run. A `stopWhen` on the last step of a repeat with `until` therefore stops
the run at that step's first blocking finding, before `until` is judged.

A project that wants another definition copies the kit's into the project, changes the copy, commits it, and names it
in `orchestrator`, as it does with a role of its own:

```sh
cp node_modules/agentrite/orchestrator.json orchestrator.json
```

```json
  "orchestrator": "orchestrator.json",
```

`--definition` runs another file for one run, without a change to `agentrite.json`, so that a definition can be tried
first. Its path is relative to the project root, or absolute, and may lie outside the project:

```sh
npx agentrite orchestrate 0029 --definition trial.json
```

A project whose `orchestrator` is `false` is refused also with `--definition`.

### The outcome of a step

The command adds a request to the prompt of every step, after the step's own `prompt`: to give the step's outcome in
its final response, as one JSON object in a fenced code block marked `json`, which is the only such block of the
response and stands before the line `**Needed from you**` when the response has one. The agent writes no file for
it, and the command reads it from the final response the harness printed. The block is read at the top level of the
response, in a blockquote, nested or not, and in a list item, at any indentation. It ends at its closing fence, at the
end of its blockquote, or at the end of the response. A fence shown in a code block indented by four spaces counts as
a block too. A response whose block stands in another form may be read as having no outcome, or more than one, and
the run then stops, as "How a run ends" says, with the final response in the run's directory. The outcome holds
these keys, and no other:

* `outcome`: `"done"`, `"needs-human"` or `"failed"`
* `summary`: a string, what the step did
* `questions`: a list of strings, what the step needs from the human for the run to go on, which may be empty
* `afterwards`: a list of strings, what the human needs to do, check or decide after the run, which the run can go on
  without, which may be empty
* `findings`: a list of objects, each with `id`, a string such as `S1`, `blocking`, `true` or `false`, and
  `summary`, a string. It is empty for a step that reviewed nothing
* `declines`: a list of objects, each with `finding`, the `id` of a finding, and `reason`, a string. It is empty for a
  step that proposed no decline

The request says that `needs-human` is for a step that cannot go on without the human, and that a step that did its
work and leaves items only in `afterwards` gives `done`. It says that an item belongs in `afterwards` when it is a
check only the human can make, as in a running application or on another operating system, an action only the human
can take that the rest of the run does not need, or a decision for which the step built the answer it recommends. An
item belongs in `questions`, with `needs-human`, when the step's work, or the steps after it, cannot do without it, as
a spec that can be read in two ways, or a decision that the rest of the work depends on and that the step could not
make. Every item of the list under `**Needed from you**` of the final response is also an item of exactly one of
`questions` and `afterwards`, and every item of these two is an item of that list.

The request also says that a finding the step's prompt accepts is recorded in `record.md` as accepted by the
orchestrator's definition, and not as a decision of the human, and that the step sets the unit's status to no status
later than `in-progress`. The human sets `implemented` after the run, once the findings of its last review are
decided.

The outcome of a review with one blocking finding, as it stands in the final response:

````markdown
```json
{
  "outcome": "done",
  "summary": "Reviewed the unit against its spec and plan, and ran both suites.",
  "questions": [],
  "afterwards": [],
  "findings": [
    { "id": "S1", "blocking": true, "summary": "R25 is not met: a unit run does not mount .orchestrator" },
    { "id": "C1", "blocking": false, "summary": "The usage of orchestrate does not name its exit statuses" }
  ],
  "declines": []
}
```
````

### How a run ends

Before and after each step the command prints a line with the step's number, counted from 0 in the order the steps
run, its round in a repeat, its role, its harness and its model. The line after it adds the outcome, or that the step
ran out of time, and how long the step took:

```
step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: started
step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol: done after 8m 12s
```

The harness's standard error reaches the terminal. Without `--follow`, what it prints on standard output is read and
not shown, and the command prints nothing of a step but its two lines. The step's session is in the harness's own
logs.

With `--follow`, the command prints between a step's two lines, while the step runs, the text messages the step's
agent writes and the tool calls it makes, each once the harness has made it known, in that order. Claude Code makes
each known as the agent makes it. OpenCode makes a tool call known once the call has ended, so of calls it runs at
the same time, the one that ended first is printed first:

* a text message is printed in full after its time, with one blank line before and after it. The final response is
  printed as any other text message, the block of its outcome among it
* a tool call is printed dimmed, on one line: its time, `→`, the name of the tool as the harness gives it, and a
  label. The label is the first of these that the call has: the description the agent gave a call of the shell tool,
  the path of the file the call acts on, the pattern the call searches for, and the first line of the command the
  call runs, cut to its first 100 characters. A line break in the label is written as `\n`, and a carriage return
  as `\r`, so that the call stays on one line. A call that has none of them has no label

The time is the instant the harness gives for the message or the call, or, where it gives none, the instant the
command learns of it, as `HH:MM:SS` in UTC. No result of a tool call, no reasoning of the agent and no other event of
the harness is printed, in Claude Code and in OpenCode alike. The end report stands last, as without the option. The
option is chosen when the run starts: a run started without it cannot be followed, and one started with it cannot be
stopped from printing. A step followed, its two tool calls dimmed on the terminal:

```
step 1, implementer, claude, claude-sonnet-5-5: started

14:03:27 I will read the spec first, and then the tests of the command.

14:03:31 → Bash Run the unit tests of the command
14:03:40 → Read /work/scripts/agentrite.mjs

14:12:05 The tests pass, and the plan is ticked.

step 1, implementer, claude, claude-sonnet-5-5: done after 8m 41s
```

The run stops, and runs nothing after the step, when:

* the step ran past its `timeoutMinutes`. This is judged before the cases below, and nothing is taken from what the
  step printed as an outcome: its final response is kept as that of a step without an outcome
* the harness exits with a status other than 0, or a signal ends it. A step whose `agentrite run` refuses, as for a
  wrapper that `refresh` would rewrite, is such a step
* the final response holds no block marked `json`, more than one, or one that is not an outcome of the form above
* the outcome is `needs-human` or `failed`
* the outcome is `done` and `questions` is not empty, since the step cannot go on without the human's answers
* `declines` is not empty, since only the human decides a proposed decline
* the step holds `stopWhen`, and a finding of its outcome is blocking
* a repeat with `until` ran out

`afterwards` stops no run. A run that ran every item to its end exits 0 also when a step left items in it.

When the run ends, the command prints last: a list of every step that ran, with its number, role, harness, model and
how long it took; how the run ended, and for a stop which step stopped it and why, with what is wrong with an outcome
not of the form; then from the outcome of the step that ran last, when it is of the form, its summary, the blocking
findings still open after a stop by `stopWhen` or by a repeat that ran out, its questions and its proposed declines;
then the items of `afterwards` of every step that gave an outcome of the form; and last the run's directory, and that
the reviewer's findings are under `.reviews/<unit-directory>/`. For a last step without an outcome of the form, it
gives the path of its final response in the run's directory instead, or says that the harness gave none. For a step
that ran past its time limit, it gives the limit, and the path of its final response or that the harness gave none.
Nothing else is taken from an earlier step.

```
0  planner      claude    claude-opus-5-5     12m 04s
1  implementer  claude    claude-sonnet-5-5   41m 37s
2  reviewer     opencode  openai/gpt-6.1-sol   8m 12s
```

The items of `afterwards` are given whatever ended the run, under the line `After the run:`, grouped by step in the
order the steps ran. Each step is named by its number, its round in a repeat and its role, and its items follow in the
order the step gave them, each as the step gave it, also when two steps give the same. A step that left no item is
left out, and when no step left one, so is the line `After the run:`. For an implementer in round 1 that left two
items and a reviewer in round 1 that left one:

```
After the run:
  step 1, round 1 of 3, implementer:
    - Check the new action in a running IDE
    - Decide the label of the button; the step built "Export"
  step 2, round 1 of 3, reviewer:
    - Check the dialog on macOS
```

A step outside a repeat is named as `  step 0, planner:`.

A run that ran every item to its end exits 0, and a run that stopped exits 3, which is the command's own status. A
run that the command refused, and that started nothing, exits 1. See "agentrite orchestrate" in "Commands".

A run neither sets the unit's status nor commits. What the roles do to the unit, their commits and their entries in
`record.md` among it, is theirs, as when they are started by hand. A run that stopped is not picked up again by the
command: the human takes over from where it stopped.

### What .orchestrator holds

The command keeps each run in `.orchestrator/<unit-directory>/<run>/` of the project root, where `<run>` is the
instant the run started, in UTC, as `2026-10-21T10:00:00Z`. Nothing but the command writes in `.orchestrator/`. A
run's directory holds:

* `definition.json`, the definition the run runs, as it was read at the start
* `state.json`, the state of the run: the unit, the definition's path as it was given, the step and round it is at,
  the id of each harness session, and when the run ended, its exit status and how it ended
* `heartbeat`, one instant in UTC to the second, as `2026-10-23T10:00:05Z`, followed by a line break, and nothing
  else. The command writes it when it makes the run's directory, before the first step starts, and then every 10
  seconds while the run lasts, between steps and while a step runs, with `--follow` and without it. Each write
  replaces the instant before it with the instant of that write, on the clock of the machine the command runs on,
  which in a unit run is the container's. Once the end of the run is in `state.json`, the command writes it no more,
  and it holds the instant of its last write
* `<number>-<role>.outcome.json` for each step that gave an outcome of the form, as it stood in its block, and
  `<number>-<role>.response.md` for a step that did not, holding its final response when there was one. The numbers
  have as many digits as the definition's highest step number needs, two at least, so that the names sort in the
  order the steps ran. An outcome file holds the step's items of `afterwards`, so the run's directory holds those of
  every step that gave an outcome of the form

Every file of a run's directory is written whole. A file that is being written stands in the same directory under a
name that opens with `.` until it takes its own name, so a program that reads one of the files reads what it held
before a write or what the write gives it, and never part of either. Once a run ended, no file whose name opens with
`.` is left in its directory.

A program that reads the directory tells the state of a run by `state.json` and `heartbeat`:

* A run whose `state.json` holds an end has ended, whatever `heartbeat` holds
* A run without an end whose `heartbeat` is at most 60 seconds old has a sign of life
* Any other run without an end, one without a `heartbeat` among them, has had none for over 60 seconds, and is called
  stale

A stale run can be one whose process ended without writing its end, as when a signal ended it; one on a machine that
sleeps, which gives signs of life again once it wakes; or one whose clock is behind the reader's by more than the
margin, as a container's in a virtual machine can be. The harness of a step can still be running when the command's own
process was killed, and the run then shows as stale.

At the start of each run the command makes sure that `.orchestrator/.gitignore` holds `*` and nothing else, and
writes it when it is missing or holds anything else. So git ignores the directory in every project, without a line in
the project's own `.gitignore`.

### On the host and in the sandbox

On the host, the command is run from the project root, and each step's harness runs there, in the developer's
checkout:

```sh
npx agentrite orchestrate 0029
```

To watch each step's messages and tool calls while it runs, as "How a run ends" gives them, the command is run with
`--follow`:

```sh
npx agentrite orchestrate 0029 --follow
```

`--skip-permissions` is passed to the `agentrite run` of every step. What it does in each harness is in
[Running a role](#running-a-role). Without it, a headless step gets only what the harness's settings allow, and a
step that needs more is refused it. The option belongs in the sandbox, where the run is in a unit run on the clone of
the unit's branch, after `npm ci` in the clone:

```sh
./sandbox.sh 0029 sh -c 'npm ci && npx agentrite orchestrate 0029 --skip-permissions'
```

A unit run mounts the host's `.orchestrator` at `/work/.orchestrator`, so the run's directory is on the host as it is
written. See "Running a unit" of `SANDBOX.md`.

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
| `.claude/agents/*.md`         | For `claude`: a wrapper per role for Claude Code, pointing at the role's file        |
| `.opencode/agents/*.md`       | For `opencode`: the same for OpenCode                                                |
| `.agentrite/instructions.md`  | The list of the instruction files in use, which the kit writes from `agentrite.json` |
| `AGENTS.md`                   | The project's agent instructions, pointing at the list of the files in use           |
| `CLAUDE.md`                   | Imports the kit's `process.md`, the project's standards and `AGENTS.md`              |
| `opencode.json`               | For `opencode`: loads `process.md` and the standards. Amended if present             |
| `sandbox.sh`                  | The shim that runs the kit's sandbox from the project root. See "The sandbox"        |
| `sandbox/compose.project.yml` | The project's half of the sandbox configuration                                      |
| `.git/hooks/commit-msg`       | The hook that refuses a commit message the standards forbid. See "Git hooks"         |

* Every generated file is the project's own once written, and the project may edit any of them, but for the list
  `.agentrite/instructions.md`, which `refresh` writes as `agentrite.json` gives it. The list is committed, as the
  wrappers are
* The role files the wrappers point at, and the standards the list and `CLAUDE.md` name, are the kit's, as the
  default `agentrite.json` names them. See "Replacing a role or the standards"
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
  how its tests run, and keeps only that: what holds for every project is in the files the list names. The three
  sections above it,
  Development Guidelines, Roles and Changes in this project, are what make the kit's instructions reach an agent, and
  are best kept. See "How the kit's instructions reach an agent"
* `sandbox/compose.project.yml` holds the Compose project and image names, both derived from the `name` in
  `package.json`, the `PLAYWRIGHT_VERSION` build argument when the project has Playwright, the memory and CPU limits,
  and the project's `ALLOWLIST`. The allowlist lists only what the project needs beyond what the kit admits itself.
  See "Reaching more hosts" of [`SANDBOX.md`](SANDBOX.md)
* The role wrappers, to pin a model per role

`CLAUDE.md` is best left as written, and what it must keep is in "How the kit's instructions reach an agent".
`sandbox.sh` and `.agentrite/instructions.md` are not files to edit, and of what a project adds to a role wrapper
only a pinned model lasts. See "Updating a project to a newer kit".

A file that already exists:

* When `AGENTS.md` already exists, `init` leaves it untouched and prints the three sections it would have written,
  ready to be pasted in. An agent does not see the kit's instructions until the existing file holds them, so paste
  in whichever it lacks. When the file does not name `.agentrite/instructions.md`, `init` says so in a notice after
  the sections. See "How the kit's instructions reach an agent"
* When `CLAUDE.md` already exists, it is left untouched too, and must hold the lines
  `@node_modules/agentrite/process.md`, `@` and the path of the project's standards, and `@AGENTS.md`. With `claude`
  among the harnesses, `init` prints a notice that names the ones it lacks. See "How the kit's instructions reach an
  agent"
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
  whichever of `node_modules/agentrite/process.md` and the path of the project's standards its `instructions` list
  lacks is added at the end of it, in that order, or the list is added with both, keeping every other key, their order
  and the indentation. When it cannot be amended, because it cannot be read, is not JSON, is not a JSON object, or has
  an `instructions` that is not a list, it is left with a notice of what to add by hand. One that loads both already is
  left alone

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

A harness loads the kit's `process.md` and the project's standards into every session, and an agent finds the role
files from `AGENTS.md`, because of what three files of the project hold. The standards are the file that `standards`
in `agentrite.json` names, which is `node_modules/agentrite/standards.md` unless the project replaced it, and the
paths below are those of a project that did not. Each file, what it must hold, and the harness that reads it:

* `AGENTS.md`, read by Claude Code and OpenCode: the sections Development Guidelines, Roles and Changes in this
  project, as `init` writes them. They call the files that `.agentrite/instructions.md` names required reading, link
  that list, and name no role file and no standards file themselves. `init` and `refresh` print a notice for an
  `AGENTS.md` that is missing or does not hold the text `.agentrite/instructions.md`
* `CLAUDE.md`, read by Claude Code: the lines `@node_modules/agentrite/process.md`,
  `@node_modules/agentrite/standards.md` and `@AGENTS.md`, each on a line of its own and outside a code span or a fenced
  block. From them Claude Code loads `process.md`, the standards and `AGENTS.md` into every session. With standards of
  the project's own, the second line is `@` and their path, and the line `@node_modules/agentrite/standards.md` is
  removed, since Claude Code would load both sets of rules; `init` and `refresh` print a notice for it
* `opencode.json` at the project root, read by OpenCode, and needed only with `opencode` among the harnesses:
  `node_modules/agentrite/process.md` and `node_modules/agentrite/standards.md` in its `instructions` list. From it
  OpenCode loads `process.md` and the standards into every session, beside `AGENTS.md`, which it reads by itself. With
  standards of the project's own, their path stands in the place of the second, and the kit's is removed, as for
  `CLAUDE.md`

The list `.agentrite/instructions.md`, which the kit writes from `agentrite.json` with `init` and `refresh`, names by
their paths from the project root, each linked: the kit's `process.md`, the standards, and the file of each role, the
four first and then the roles of the project's own. It says that these are the files whose instructions hold in the
project, that the standards are the project's whole set of rules on how text, documentation, commits, code and tests are
written, and that the list is not edited by hand. The harnesses do not load it. It is there for an agent that reads
files itself, from `AGENTS.md` or from a kit role file, which sends it to the standards and to the other role files by
the list.

The three lines of `CLAUDE.md` are shown here in a block. In the file they are not in one, since Claude Code does not
read a line inside a fenced block or a code span:

```
@node_modules/agentrite/process.md
@node_modules/agentrite/standards.md
@AGENTS.md
```

The `opencode.json` that `init` writes into a project that has none:

```json
{
  "$schema": "https://opencode.ai/config.json",
  "instructions": [
    "node_modules/agentrite/process.md",
    "node_modules/agentrite/standards.md"
  ]
}
```

* `init` puts these into each of the three files it writes, and into an `opencode.json` it can amend. For an
  `AGENTS.md` or a `CLAUDE.md` that exists, and for an `opencode.json` it cannot amend, it only prints a notice of
  what is missing. The project then adds that by hand
* Neither harness reports a file that lacks them. There is no error: a session starts without the kit's instructions in
  its context, and reads them only if the model follows the link to the list in `AGENTS.md`, and from it to the files
* `refresh` never adds them to `CLAUDE.md` or `opencode.json`. It prints a notice on each run for as long as one of
  them lacks them, so a project that leaves them out on purpose gets that notice on every `refresh`

### On a fresh clone

A fresh clone of a project has no kit. `npm ci` installs it with the project's other dependencies, at exactly the
release and integrity hash `package-lock.json` records, and fails rather than install anything else.

Installing and updating are `npm ci` and `npm install`, which run on the host and inside a project's sandbox alike:
the sandbox admits the hosts they need itself. See "Reaching more hosts" of `SANDBOX.md`. A project's `sandbox.sh`
runs the wrapper from `node_modules`, though, so a fresh clone needs `npm ci` on the host before its sandbox can
start.

A clone does not copy git's hooks, so a fresh clone has no `commit-msg` hook until `npx agentrite refresh` writes it.
See [Git hooks](#git-hooks).

The kit is a development dependency. An install that leaves those out, as `npm ci --omit=dev` and an `npm ci` with
`NODE_ENV=production` do, installs no kit, and `npx agentrite` and `npm run check-changes` do not run there. A job
that runs the change check therefore installs with a plain `npm ci`.

## Git hooks

The kit puts one git hook in a project, `commit-msg`, which git runs after a commit message is written and before
the commit is made. It refuses a message that holds a trailer the standards forbid, `Co-Authored-By` or
`Claude-Session`, and git then makes no commit and shows what it printed. The rule is the one
[check-commit-message](#check-commit-message) gives, since the hook runs that checker.

The hook is written into the hooks directory that git uses for the project: `.git/hooks` unless the project sets
`core.hooksPath`, which git then reads in its place, a directory outside the project included. In a linked worktree
it is the hooks directory of the repository the worktree belongs to. `init` and `refresh` print its path relative to
the project root when it is under it, as `.git/hooks/commit-msg`, and as it is otherwise.

The hook is a shell script the owner may execute. Its second line is the kit's mark:

```sh
# agentrite: commit-msg hook
```

It finds the top of the work tree that git runs it in and runs
`node <top>/node_modules/agentrite/container/check-commit-message.mjs` with the path git gives it, so it uses the
checker of the kit installed in that work tree. When it cannot run the checker it refuses the commit too, and says
which of the two it is and what to do:

* `commit-msg: the commit message checker is not at <path>.`, when the work tree has no kit under `node_modules`. Its
  dependencies are installed in that work tree, as with `npm ci`, and the commit is made again. Each worktree needs
  its own, as the project's other commands do
* `commit-msg: node is not on the PATH that git gives the hook, ...`, when git was started with a `PATH` that holds
  no `node`, as a git client outside a terminal may be. `node` is made reachable from git, and the commit is made
  again

What `init` and `refresh` do with it:

* `init` writes the hook where nothing is at its path, making the hooks directory when it is missing, and prints
  `wrote <path>`. A file already there, of whatever content, it leaves as it is, and prints
  `skipped <path>, which exists`
* `refresh` writes the hook where nothing is at its path, and prints `wrote <path>`. A regular file that holds the
  mark as a line of its own is the kit's: it rewrites it as this release writes it, and makes it executable, printing
  `refreshed <path>`, or `up to date <path>` when there was nothing to change. Anything else at the path, a file
  without the mark or a symbolic link among it, is the project's own: it leaves it as it is, prints no line for it,
  and prints a notice that the hook at that path is not the kit's, that commit messages are then not checked for the
  trailers unless that hook calls the checker, and that this section says how
* Outside a git repository neither writes a hook. Each prints a notice that no hook was written and why, that the
  project is not inside a git repository or that git could not be run, with what git said. The notice changes
  neither what else they write nor their exit status

A project with a `commit-msg` hook of its own keeps it, and calls the checker from it, from the top of the work tree:

```sh
node node_modules/agentrite/container/check-commit-message.mjs "$1" || exit 1
```

A project that does not want the hook puts a file of its own at the path, which `refresh` then leaves as it is.

`git commit --no-verify` skips the hook, and a commit that git makes without running `commit-msg`, as some steps of
`cherry-pick`, `revert` and `rebase` do, is not checked. The hook in the sandbox is the image's, and the clone's is
not run there. See "Commit messages" in [`SANDBOX.md`](SANDBOX.md).

## The project's settings

A project's settings are in `agentrite.json` at the project root, a JSON object with seven keys:

| Key             | What it holds                                         | What reads it                        |
|-----------------|-------------------------------------------------------|--------------------------------------|
| `defaultBranch` | The branch that units are cut from and compared with  | The change check and a unit run      |
| `harnesses`     | The harnesses the project uses, as a list             | `init` and `refresh`                 |
| `sandbox`       | `true` with the sandbox, `false` without it           | `init` and `refresh`                 |
| `bell`          | `true` for a sandbox that rings, `false` for none     | `./sandbox.sh`, at each start        |
| `standards`     | The path of the standards file the project uses       | `init` and `refresh`                 |
| `orchestrator`  | The path of the orchestrator's definition, or `false` | `orchestrate`                        |
| `roles`         | Each role's name, with the path of its file in use    | `init`, `refresh`, `roles` and `run` |

The default file, which `npx agentrite config` writes, and `npx agentrite init claude opencode` too:

```json
{
  "defaultBranch": "master",
  "harnesses": ["claude", "opencode"],
  "sandbox": true,
  "bell": true,
  "standards": "node_modules/agentrite/standards.md",
  "orchestrator": "node_modules/agentrite/orchestrator.json",
  "roles": {
    "specifier": "node_modules/agentrite/roles/specifier.md",
    "planner": "node_modules/agentrite/roles/planner.md",
    "implementer": "node_modules/agentrite/roles/implementer.md",
    "reviewer": "node_modules/agentrite/roles/reviewer.md"
  }
}
```

* `init` writes the file from its arguments in a project that has none, and `config` writes the default file. The
  default branch is `master` unless `--default-branch` or an edit says otherwise
* The file is committed
* All seven keys are required. `defaultBranch` is a string that is not empty, `harnesses` is a list of one or more of
  `claude` and `opencode`, in which a name given more than once counts once, and `sandbox` and `bell` are each `true`
  or `false`, not a string. A key the kit does not know is ignored
* `bell` says whether the harnesses in the sandbox ring the terminal's bell when they need the developer or stop, as
  "The bell" in `SANDBOX.md` says. It is read at each start of the sandbox, so a change holds from the next start. It
  has no effect outside the sandbox: the harnesses on the host are the developer's, and the kit changes nothing of
  their configuration
* `orchestrator` names the definition that `agentrite orchestrate` runs, or holds `false` for a project that does not
  use the orchestrator, which `init --no-orchestrator` writes. It is `false` or a path, not a string that says
  `false`. The file `config` and `init` write names the kit's default definition, and a project that wants another
  copies it and names the copy, as "The orchestrator" says
* `standards` and `roles` name the kit's own files in the file `config` and `init` write. A project uses another file
  by naming its path instead, as "Replacing a role or the standards" says. `roles` holds the four names
  `specifier`, `planner`, `implementer` and `reviewer`, each with the path of its file, and may hold roles of the
  project's own besides, as "Adding a role" says. Two or more roles may name the same file, each role then getting its
  wrappers, with that file's description, and its line in the list
* The name of a role of the project's own is one or more words of the lowercase letters `a` to `z`, joined by single
  hyphens, as `security-reviewer`. A name of another form is refused, naming the name and the form. A name that a
  harness has for an agent of its own is refused too, whichever harnesses `harnesses` names and without regard to case,
  because a wrapper of that name and the harness's agent would take each other's place. The names are:

  | Harness     | Its own agents                                                                                  |
  |-------------|-------------------------------------------------------------------------------------------------|
  | Claude Code | `Explore`, `Plan`, `general-purpose`, `claude`, `statusline-setup`, `claude-code-guide`, `fork` |
  | OpenCode    | `build`, `plan`, `general`, `explore`, `scout`, `compaction`, `title`, `summary`                |

  The message names the name and the harness. `agentrite roles` and the list `.agentrite/instructions.md` give the
  four first and then the roles of the project's own, in the order of the file
* A path in `standards`, `orchestrator` or `roles` is a string that is not empty, relative to the project root, that
  does not lead outside the project, and that names a regular file in the project's working tree. Whether it leads
  outside is judged on the path as it is written, with no symbolic link followed. Whether it names a file is judged with
  symbolic links followed, so a kit linked into `node_modules`, as `npm link` does, is taken
* The file is read by `refresh`, by `init` in a project that has one, by `agentrite roles`, by `agentrite run`, by
  `agentrite orchestrate`, by the change check, and by `./sandbox.sh`. Every form of `./sandbox.sh` but `--connect`
  reads `bell` at each start, and judges no other key of the file, unless a unit run cuts a branch, which reads the
  whole file. `--connect` does not read it
* A command that reads the file refuses in a project that has none, and names `npx agentrite config` as the command
  that writes one. It refuses a file that is not valid too, also when what is wrong is a key the command does not
  use, and names the file, the key, what is wrong with it and what it must hold. A path that names no file is refused
  so by every command that reads the file, also one that does not use it: the message names the key, the path and
  that there is no file at it. Either way it writes and changes nothing and exits with 1. No
  command takes a missing file for the default file, or a missing key for its default value
* A start of `./sandbox.sh` that cuts no branch judges `bell` alone. It refuses a project with no file, a file that
  is not a JSON object, one that lacks `bell` and one whose `bell` is neither `true` nor `false`, names the file, the
  key, what it holds or that it is missing, and what it must hold, starts nothing and exits 1. Another key at fault
  does not stop it

A setting is changed by editing the file by hand. What to run afterwards:

* `defaultBranch`: nothing
* `bell`: nothing. It holds from the next start of the sandbox
* `orchestrator`: nothing. It holds from the next run of `agentrite orchestrate`
* A harness added to `harnesses`: `npx agentrite refresh` writes its wrappers. The wrapper directories that the
  project's `AGENTS.md` lists are the project's to bring up to date
* `sandbox` set to `true`: `npx agentrite init` writes the files of the sandbox that are missing
* A role of the project's own added to `roles`: `npx agentrite refresh` writes its wrappers and the list
* A role taken out of `roles`, or renamed: `npx agentrite refresh` removes the wrappers of the old name, as "agentrite
  refresh" in "Commands" says, and writes those of the new one
* A harness taken out, or `sandbox` set to `false`: no command removes a file, and what is left is removed by hand
* `standards` or a file in `roles` changed: `npx agentrite refresh` rewrites the wrappers and the list, and prints the
  notices of "agentrite refresh" on a `CLAUDE.md` and an `opencode.json` that do not load the new standards, or still
  load the kit's beside them. The project changes those two files by hand

## Replacing a role or the standards

A project can use a file of its own in the place of the kit's `standards.md`, and in the place of any of the kit's
four role files, and keep everything else the kit wires up. It names the file's path, from the project root, in
`standards` or in the role's entry of `roles` in `agentrite.json`, commits the file, and runs `npx agentrite refresh`.
The process in `process.md` is the same in every project and is not replaced.

A role file opens with front matter that holds its description, which is what a harness dispatches the role on and
what `agentrite roles` lists. The front matter opens and closes with a line `---`, and holds the description and
nothing else, in one of two forms. On one line:

```markdown
---
description: Reviews a finished change unit against this project's checklist. Dispatch it with the unit directory.
---
```

Or folded, the text on lines indented by two spaces, which are read as one line joined by spaces:

```markdown
---
description: >-
  Reviews a finished change unit against this project's checklist.
  Dispatch it with the unit directory.
---
```

A command that needs the description refuses a role file without front matter in one of these forms, names the file
and the form it must have, and writes nothing. After the front matter, a role file holds:

* first, an instruction to read `process.md` and the project's standards, with a link to `process.md` that works from
  where the file is, such as `node_modules/agentrite/process.md` from the project root. The kit's role files say that
  the standards are the file `.agentrite/instructions.md` names, and a project's can name its own file directly
* what the role is given, what it produces and the status it sets, in terms of the documents of `changes/` and the
  statuses that `process.md` gives: a spec the human approves, a plan where the kind needs one, the work, and a review
  whose blocking findings `implemented` waits on. Each role covers one of these, and none is left out

A standards file is the project's whole set of rules on how text, documentation, commits, code and tests are written:
with it, the kit's `standards.md` no longer holds in the project. A broken rule in it blocks `implemented` as a broken
rule of the kit's does.

* A replaced file gets none of the kit's later improvements to the file it replaces. A new release changes the kit's
  files under `node_modules`, and not the project's
* The file is committed. A unit run of the sandbox works in a clone, which holds only what is committed, and every
  command that reads `agentrite.json` refuses a path that names no file
* What a project adds to a role without replacing it, as "our reviewer also checks the migrations", belongs in the
  project's `AGENTS.md`, which every session reads. The kit has no file for an addition to a role
* Two roles may name one file, as one file for the specifier and the planner. The process still has the two done at
  their own moments, and the file says how to do both

## Adding a role

A project can add roles of its own to the kit's four. An extra role adds no stage and no status: the four stages of
`process.md` and its five statuses stay as they are, and each of the four roles still covers one stage and moves the
unit through the statuses. An extra role runs just before or just after one of the four, within that role's stage, and
moves the unit through none. Some examples:

| Extra role          | Runs                         | The unit's status while it runs |
|---------------------|------------------------------|---------------------------------|
| A spec reviewer     | After the specifier          | `draft`                         |
| A plan reviewer     | After the planner            | `approved`                      |
| A test writer       | Before the implementer       | `approved` or `in-progress`     |
| A security reviewer | Before or after the reviewer | `in-progress`                   |

It is added by its name and the path of its file in `roles` of `agentrite.json`, after the four, with the file
committed, and then `npx agentrite refresh`, which writes its wrappers for each harness and names it in the list
`.agentrite/instructions.md`. A name is of the form "The project's settings" gives. Removed from `roles`, with
`npx agentrite refresh` run after, its wrappers are removed too.

```json
  "roles": {
    "specifier": "node_modules/agentrite/roles/specifier.md",
    "planner": "node_modules/agentrite/roles/planner.md",
    "implementer": "node_modules/agentrite/roles/implementer.md",
    "reviewer": "node_modules/agentrite/roles/reviewer.md",
    "security-reviewer": "rules/security-reviewer.md"
  }
```

The file of an extra role opens with the front matter of a role file, and then first with an instruction to read
`process.md` and the project's standards, as "Replacing a role or the standards" says of a role file. It also says:

* which of the four roles it runs before or after, what it is given and what it produces. It sets no status: the
  statuses stay with the four roles, and the kit cannot enforce this, so the file must say it
* where its findings go, such as to the human, to the role whose work it judged, or to the implementer. They do not
  block `implemented`; what blocks is in `process.md`. A project that wants a check to block makes it part of its
  reviewer, by replacing the reviewer's file
* that it writes at least one entry in the unit's `record.md`, as `as the <name>` with its name as `roles` gives it,
  each time it works on the unit. The kit's reviewer reads the file of each extra role that has such an entry and
  judges the work against it, as it does the files of the specifier, the planner and the implementer. An extra role
  with no entry did not work on the unit, and its file is not read

The kit does not yet run an extra role at its moment, and does not read where the role file says it runs. The human
dispatches it, in a session of the harness or with `npx agentrite run <name> <harness> <unit>`, at that moment.

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

A project whose `agentrite.json` lacks `standards` and `roles` adds them, as the default file gives them, before any
command that reads the file runs again: until then every such command refuses the file. The two keys, after
`sandbox`:

```json
  "standards": "node_modules/agentrite/standards.md",
  "roles": {
    "specifier": "node_modules/agentrite/roles/specifier.md",
    "planner": "node_modules/agentrite/roles/planner.md",
    "implementer": "node_modules/agentrite/roles/implementer.md",
    "reviewer": "node_modules/agentrite/roles/reviewer.md"
  }
```

A project whose `agentrite.json` lacks `orchestrator` adds it before any command that reads the file runs again:
until then every such command refuses the file. The line, after `standards`, with `false` for a project that does not
use the orchestrator:

```json
  "orchestrator": "node_modules/agentrite/orchestrator.json",
```

A project whose `agentrite.json` lacks `bell` adds it before any command that reads the file runs again, and before
the sandbox starts again: until then every such command refuses the file, and every start but `--connect` is
refused. The line, after `sandbox`, with `false` for a project that wants no bell:

```json
  "bell": true,
```

The first start of the sandbox after the update builds its image again, since the image records the release of the
kit it was built from, and the wrapper says so before it builds.

Then bring the kit's own files in the project up to date, from the project root:

```sh
npx agentrite refresh
```

It rewrites the role wrappers of the harnesses that `agentrite.json` names, the list `.agentrite/instructions.md`,
`sandbox.sh`, and the `commit-msg` hook when it carries the kit's mark, as the new release writes them, writes any
that are missing, and prints each file as written, refreshed or up to date. A hook of the project's own is left as it
is, with a notice, as [Git hooks](#git-hooks) says. The list is committed with the wrappers. Without it those
copies stay as an older release wrote them, and nothing says so. In a project whose `agentrite.json` says `sandbox`
`false`, it leaves `sandbox.sh` out, so that one the project removed on purpose is not written back.

* A model pinned in a wrapper survives: a line in its frontmatter that opens with `model:` is kept, as written,
  after the kit's own keys
* Everything else in a wrapper, and all of the list and of `sandbox.sh`, is replaced, other keys a project added to
  the frontmatter among them. The wrappers are tracked files, so `git diff` shows what a refresh changed, and git has
  what it replaced
* `AGENTS.md`, `CLAUDE.md`, `opencode.json`, `sandbox/compose.project.yml`, `package.json` and `.dockerignore` are
  never written, and never created
* It reads `CLAUDE.md` with `claude` among the harnesses, and `opencode.json` with `opencode`, and after its lines
  prints a notice for each that does not load the kit's instructions, as "agentrite refresh" in "Commands" says. A
  project set up before the release that loads them runs `npx agentrite init` with no argument, which writes or
  amends its `opencode.json`, and adds what the notices still name by hand. See "How the kit's instructions reach
  an agent"
* It reads `AGENTS.md` and prints a notice for one that does not name `.agentrite/instructions.md`. An `AGENTS.md`
  that `init` wrote before the list existed lists the kit's `standards.md` and role files itself. Its sections
  Development Guidelines and Roles are replaced by those that `npx agentrite init` with no argument prints, which
  link the list, so that agents are sent to the files `agentrite.json` names
* A path that holds something other than a regular file, such as a symbolic link, is left as it is and named on
  standard error. The other files are still refreshed, and the command exits 1

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
