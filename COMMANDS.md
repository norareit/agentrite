# Commands

Every command a project that installed the kit runs, each with every argument, option and environment variable it
takes.

| Command                                                                                                                                    | What it does                                                   | Section                                         |
|--------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------|-------------------------------------------------|
| `npx agentrite init [--no-sandbox] [--no-orchestrator] [--default-branch <name>] <harness>...`                                             | Sets a project up, writing `agentrite.json` from its arguments | [agentrite init](#agentrite-init)               |
| `npx agentrite init`                                                                                                                       | Sets a project up again from its `agentrite.json`              | [agentrite init](#agentrite-init)               |
| `npx agentrite config`                                                                                                                     | Writes the default `agentrite.json` into a project             | [agentrite config](#agentrite-config)           |
| `npx agentrite refresh`                                                                                                                    | Brings the kit's files in a project up to date                 | [agentrite refresh](#agentrite-refresh)         |
| `npx agentrite roles [--json]`                                                                                                             | Lists the roles of the project                                 | [agentrite roles](#agentrite-roles)             |
| `npx agentrite units [<number>] [--open \| --status <status>] [--kind <kind>] [--limit <count>] [--json]`                                  | Lists the units of `changes/`, with their status               | [agentrite units](#agentrite-units)             |
| `npx agentrite approve <unit>`                                                                                                             | Approves a unit and commits its `record.md`                    | [agentrite approve](#agentrite-approve)         |
| `npx agentrite run <role> <harness> <unit> [--prompt <text>] [--model <id>] [--headless] [--skip-permissions] [-- <harness arguments...>]` | Starts a harness as one of the roles, for one unit             | [agentrite run](#agentrite-run)                 |
| `npx agentrite orchestrate <unit> [--definition <file>] [--resume [--prompt <text>]] [--skip-permissions] [--follow]`                      | Takes an approved unit through its roles                       | [agentrite orchestrate](#agentrite-orchestrate) |
| `npx agentrite runs [<number>] [--limit <count>] [--json]`                                                                                 | Lists the runs of the orchestrator and their state             | [agentrite runs](#agentrite-runs)               |
| `npm run check-changes`                                                                                                                    | Runs the change check, by the project's own command            | [check-changes](#check-changes)                 |
| `node node_modules/agentrite/scripts/check-changes.mjs [<repository root>]`                                                                | Runs the change check, on the repository root given            | [check-changes](#check-changes)                 |
| `node node_modules/agentrite/container/check-commit-message.mjs <commit message file>`                                                     | Refuses a commit message with a trailer the standards forbid   | [check-commit-message](#check-commit-message)   |
| `./sandbox.sh [--rebuild] [--mount HOST[:ro]]... UNIT [--variant NAME] [COMMAND...]`                                                       | Starts the sandbox on a clone of a unit's branch               | [sandbox.sh](#sandboxsh)                        |
| `./sandbox.sh [--rebuild] [--mount HOST[:ro]]... --in-place [COMMAND...]`                                                                  | Starts the sandbox on the project root as it is                | [sandbox.sh](#sandboxsh)                        |
| `./sandbox.sh [--rebuild] [--mount HOST[:ro]]... --workdir DIR [COMMAND...]`                                                               | Starts the sandbox on a directory as it is                     | [sandbox.sh](#sandboxsh)                        |
| `./sandbox.sh --connect UNIT [--variant NAME] [COMMAND...]`                                                                                | Runs a command beside a unit run that is under way             | [sandbox.sh](#sandboxsh)                        |

## agentrite init

```sh
npx agentrite init [--no-sandbox] [--no-orchestrator] [--default-branch <name>] <harness>...
npx agentrite init
```

Sets a project up, from its root: writes `agentrite.json`, the wrappers of every role `roles` names, the list of the
instruction files in use, the project's agent instructions, the sandbox's files and the `commit-msg` hook, writes or
amends `opencode.json` with `opencode`, and prints each file it wrote, changed or skipped. The hook is written as
[Git hooks](README.md#git-hooks) says. The first form is for a project with no
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
"Replacing a role or the standards" in `README.md` gives, naming the file and the form it must have.

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
settings" and "Replacing a role or the standards" in `README.md`.

## agentrite config

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

See "The project's settings" in `README.md`.

## agentrite refresh

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
matter "Replacing a role or the standards" in `README.md` gives is refused: `refresh` names the file and the form the
front matter must have, writes nothing and exits 1. It then writes the list `.agentrite/instructions.md` from
`standards` and `roles`, whatever is at its path. With `sandbox` `true` it refreshes `sandbox.sh` too, and writes one
that is missing. With `sandbox` `false`, `sandbox.sh` is not read or written and no line is printed for it: what is at
its path, a symbolic link or a directory included, changes neither what `refresh` prints nor its exit status. After them
it writes the `commit-msg` hook where there is none, and rewrites one that carries the kit's mark, as [Git
hooks](README.md#git-hooks) says.

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
settings" and "Replacing a role or the standards" in `README.md`.

## agentrite roles

```sh
npx agentrite roles [--json]
```

Lists the roles of the project, from its root, each with the description that the role file `roles` in
`agentrite.json` gives holds, which is the description its wrappers hold. The four roles come first, in the order
`specifier`, `planner`, `implementer`, `reviewer`, and the roles of the project's own follow, in the order of `roles`.
The JSON document is an object with one key, `roles`, an array that holds each role as an object with its `name`, its
`description`, which is on one line, not wrapped, and its `path`: the path of its file as `roles` gives it, from the
project root. The text listing does not show the path.

It reads `agentrite.json` and refuses as every command that reads it does, in a project that has none or whose file is
not valid. It refuses a role file that does not open with the front matter "Replacing a role or the standards" in
`README.md` gives too, and names the file and the form the front matter must have. Either way it prints nothing on
standard output and exits 1.

| Argument or option | What it is                                                                   |
|--------------------|------------------------------------------------------------------------------|
| `--json`           | Prints the same roles, in the same order, as one JSON document, for a script |

It exits with `0`, `1` when it refuses or fails, and `2` for an argument other than `--json`, as
[Exit statuses](#exit-statuses) says.

## agentrite units

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

## agentrite approve

```sh
npx agentrite approve <unit>
```

Approves a unit, from the project root. It takes no option and exactly one `<unit>`.

It writes in the unit's `record.md` and nowhere else. The `status` field of the front matter becomes `approved`, and
nothing else of the front matter changes. An entry is added to `## Log`, directly after its last entry, with the
instant the command runs, in UTC:

```text
- 2026-10-23T11:23:18Z [human] approved the spec. The status is `approved`
```

A task has `approved the record` in place of `approved the spec`. The entry names the human whoever runs the command.

It then commits `record.md` alone, on the default branch that `defaultBranch` in `agentrite.json` names, with the
message `feature-<number> Approve the spec`, `bugfix-<number> Approve the spec` or `task-<number> Approve the record`,
by the kind of the unit and the four digits of its directory. Whatever else the working tree or the index holds is
left as it was, and is not in the commit. The commit is made as any `git commit` of the developer is, with their
identity and the repository's hooks, the `commit-msg` hook of the kit among them. When the commit fails, as when a
hook refuses it, `record.md` and the index are as they were before the command, what git printed goes to standard
error, and the command exits 1.

On success it prints one line, the unit's directory, the new status and the commit by its short hash and its message,
and exits 0. It pushes nothing and makes no branch.

```text
changes/0082-a-unit-can-be-approved-by-a-command/ is approved, in 1b191d2 feature-0082 Approve the spec
```

It prints nothing on standard output, writes nothing, commits nothing and exits 1 when:

* `agentrite.json` is missing or is not valid
* the project root is in no git repository, or the branch checked out is not the default branch. The line names the
  branch checked out, or that none is, and the default branch
* `changes/` holds no directory for the unit, or more than one for its digits
* the unit's `record.md` is missing, or has no `status` field, no `kind` field or no `## Log` heading. The line names
  the file and what is missing
* the unit's status is not `draft`. The line names the status and says that an approval moves a unit from `draft`
* the unit is a feature or a bug and has no `spec.md`. The line names the file and says that the approval of a
  feature or a bug is that of its spec
* a file of the unit's directory differs from what the commit checked out holds: changed, staged, or not tracked. The
  line names each file with its state, and says that the human approves what is committed, so that the files are
  committed first

With no `<unit>`, a second one, or an option, it prints what is wrong, then its usage, and exits 2.

| Argument | What it is                                                                                          |
|----------|-----------------------------------------------------------------------------------------------------|
| `<unit>` | A directory of `changes/`, by its name, with or without `changes/` before it, or by its four digits |

It exits with `0`, `1` when it refuses or fails, and `2` for a wrong argument, as [Exit statuses](#exit-statuses)
says.

## agentrite run

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
* The command starts no sandbox: it starts the harness where it is run, on the host or inside the sandbox, and
  `./sandbox.sh` is still what starts the sandbox. In a unit run of the sandbox, `npx agentrite` is there in the
  clone, whose dependencies the run installs before the command, like the role files

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

* the role's wrapper for the harness is missing, or holds anything but what `refresh` would write from the role file
  that `roles` in `agentrite.json` gives, a pinned model aside. The command names the file and names the command that
  repairs it, which writes the wrappers of the harnesses that `agentrite.json` names:

  ```sh
  npx agentrite refresh
  ```

  So a project that moved to a newer kit, or changed `roles`, runs `refresh` before `run`, and a key a project added
  to a wrapper by hand stops `run` until `refresh` has removed it. See "Updating a project to a newer kit" in
  `README.md`
* the harness's own command is not on the `PATH`
* `changes/` holds no directory for the unit, or more than one for its digits

Before it starts the harness, it exits with `1` when it refuses or fails, and `2` for wrong arguments. Once the
harness started, it passes on the harness's status, and exits with `1` when a signal ended the harness. See
[Exit statuses](#exit-statuses).

## agentrite orchestrate

```sh
npx agentrite orchestrate <unit> [--definition <file>] [--resume [--prompt <text>]] [--skip-permissions] [--follow]
```

Takes an approved unit through its roles, from the project root, by the definition that `orchestrator` in
`agentrite.json` names: it runs each step as `agentrite run` with `--headless`, one at a time, and ends when every
item of the definition has run or a step stops the run. With `--resume`, it resumes the latest run of the unit, which
stopped for the human, as "How a run ends" in `ORCHESTRATOR.md` gives. Run with no argument, it prints its usage.

| Argument or option    | What it is                                                                                                 |
|-----------------------|------------------------------------------------------------------------------------------------------------|
| `<unit>`              | A directory of `changes/`, by its name or by the four digits its name opens with                           |
| `--definition <file>` | Runs this definition, relative to the project root or absolute. Also `--definition=<file>`                 |
| `--resume`            | Resumes the latest run of the unit, which stopped for the human. See "How a run ends" in `ORCHESTRATOR.md` |
| `--prompt <text>`     | With `--resume`, the human's words to the step it reruns. Also `--prompt="<text>"`                         |
| `--skip-permissions`  | Passed to the `agentrite run` of every step. The option belongs in the sandbox                             |
| `--follow`            | Prints each step's messages and tool calls while it runs. See "How a run ends" in `ORCHESTRATOR.md`        |

It refuses, starts nothing, writes nothing and exits 1 when:

* the project has no `agentrite.json`, or its file is not valid, as every command that reads the file refuses
* `orchestrator` is `false`, also with `--definition`. It says that the project opted out, and which key to change
* the path of `--definition` names no file. It names the path
* the definition is not of the form "The orchestrator" in `ORCHESTRATOR.md` gives. It names the definition's path, where
  in it the fault is, what is wrong and what it must hold
* `changes/` holds no directory for the unit, or more than one for its digits
* the unit's status is not `approved`. It names the status, and says that a run starts the work of an approved unit.
  A `record.md` that is missing, or holds no status, is refused as one that is missing a status field
* the branch checked out in the project root ends in `--` and a variant that is not one or more words of the lowercase
  letters `a` to `z` and the digits `0` to `9`, joined by single hyphens. It names the branch and the form a variant
  takes. A directory that is in no git repository, and a detached `HEAD`, are not refused

With `--resume`, it refuses as a run does for `agentrite.json`, for `orchestrator`, for the unit and for the form of
the variant. It refuses `--definition`, saying that a resume runs the definition of the run it resumes, and in the
place of the refusal of a unit that is not `approved`, it refuses a unit whose status is neither `approved` nor
`in-progress`, naming the status and saying that a resume takes a unit that is approved or in progress. Beside these,
it refuses, starts nothing, writes nothing and exits 1 when:

* the unit has no run on the variant of the branch checked out. It names the unit, and the variant or that the runs
  it looked for have none
* the latest of those runs has not ended, or ended with a status other than 3. It names the run, its state and what
  `agentrite runs` gives after the state, and says that a resume takes a run that ended with 3, which a run does when
  it stops for the human
* the latest run's `state.json` holds no `branch`, or one other than the branch checked out. It names both
* the latest run's `state.json` or `definition.json` cannot be read or is not of the form the command writes, as
  `agentrite runs` refuses them, or its `state.json` holds an end and no step it was at. It names the file and what is
  wrong with it

`--prompt` without `--resume` is refused with the usage, as wrong arguments are.

It takes no `--`: a step's harness gets the arguments the definition and the command give it, and no other.

Every step runs in a process group of its own. `SIGINT`, `SIGTERM` and `SIGHUP` sent to the command, as Ctrl-C on
the terminal and `kill <pid>` send them, are sent on to the step that runs, and the command then ends by the same
signal.

It exits with `0` for a run that ran every item of the definition to its end, `1` when it refuses or fails, `2` for
wrong arguments or none, which it refuses with its usage, and `3`, its own status, for a run that a step or a
repeat stopped, which waits for the human. A resume exits as a run does. See [Exit statuses](#exit-statuses).

See "The orchestrator" in `ORCHESTRATOR.md`.

## agentrite runs

```sh
npx agentrite runs [<number>] [--limit <count>] [--json]
```

Lists the runs of the orchestrator in the directory it runs in. It reads `.orchestrator/` as it stands there and
nothing else: no `changes/`, no `agentrite.json` and no git, so it runs in a directory that has none of them. A run is
a directory `.orchestrator/<unit-directory>/<run>/` whose `<unit-directory>` is four digits, a hyphen and at least one
character more, and whose `<run>` is an instant of the form `2026-10-21T10:00:00Z`, alone or followed by `--` and a
variant. No other directory of `.orchestrator/` is listed, whatever it holds, and nor is a run whose directory holds
no `state.json`, which the orchestrator writes right after making the directory. The runs come by the instant they
started, the latest first. Runs that started at the same instant come in the order of their unit directories, and runs
of one unit in the order of their directories' names. The options may stand at any place among the arguments.

Each run is one line: the instant it started, the four digits of its unit followed by `--` and its variant for a run on
a variant's branch, its state, and what the state gives. The first three are padded to the widest value of their column
among the lines listed, the columns separated by two spaces. The variant is the one the directory's name gives. The
state is judged by the rule of "What .orchestrator holds" in `ORCHESTRATOR.md`, on the clock of the machine the command
runs on:

* `running`: the run has no end and a sign of life in the last 60 seconds. The line gives the step the run is at, as the
  line the orchestrator prints before a step names it, without `: started`, or `before its first step`
* `stale`: the run has no end and no sign of life in the last 60 seconds. The line gives `no sign of life since` and the
  instant of its `heartbeat`, or `no sign of life` for a run with none, then `, at` and the step, or
  `, before its first step`
* `ended`: the run's `state.json` holds an end, whatever its `heartbeat` holds. The line gives the line of its end, as
  `state.json` holds it

```text
2026-10-23T10:05:00Z  0081--opus  running  step 2, round 1 of 3, reviewer, opencode, openai/gpt-6.1-sol
2026-10-23T09:40:00Z  0081        stale    no sign of life since 2026-10-23T09:41:10Z, before its first step
2026-10-22T16:00:00Z  0080        ended    The run ran every item of the definition to its end.
```

`<number>` is exactly four digits. With it the command lists the runs whose unit directory opens with those digits and a
hyphen, those of every variant among them. Without a limit at most 50 runs are listed. `--limit <count>` sets another
maximum and `--limit 0` lists every run. The limit counts the runs that remain after `<number>`. When the limit leaves
runs out, the listing ends with the line

```text
showing <shown> of <total> runs, --limit 0 shows them all
```

When there is nothing to show, because there is no `.orchestrator/`, it holds no run, or no run is of the unit that
`<number>` names, the listing is the one line `no runs`, or `no runs of` and the number when one was given. The command
exits `0`.

With `--json` the command prints one JSON document instead: an object with the key `runs`, an array of the runs listed
in the same order, and the key `total`, the number of runs there are after `<number>` and before the limit. Each run is
an object with:

* `number`, a string of the four digits of its unit, and `unit`, the name of its unit directory
* `variant`, its variant, or `null` for a run without one, and `branch`, the branch its `state.json` holds, or `null`
  for a run without one, as one from before `state.json` held it
* `run`, the instant it started, and `directory`, the path of its directory from the directory the command runs in
* `state`, one of `running`, `stale` and `ended`
* `heartbeat`, the instant its `heartbeat` holds, or `null` when it holds none of the form or is missing
* `step`, `null` for a run that is not at a step yet, or an object with the step's `number`, its `round` and the
  `rounds` of its repeat, both `null` for a step outside a repeat, its `role`, its `harness` and its `model`
* `followed`, the path from the directory the command runs in of the file that holds the followed output of the run's
  step, or `null` for a run with no step and when the run's directory holds no such file, as for a run from before the
  followed files or a step whose file is not yet made. The command reads whether the file is there and not what it holds
* `ended`, `null` for a run without an end, or its end as `state.json` holds it, with its `status` and its `line`

When there is nothing to show, `runs` is an empty array and no line of text is printed.

It refuses a run whose `state.json` or `definition.json` cannot be read, is not JSON, or is not of the form the
orchestrator writes, or whose `at` names a step its definition does not have, naming the file and what is wrong with it.
It prints nothing on standard output and exits 1. It prints what is wrong, then its usage, and exits 2 for a `<number>`
that is not four digits, a second `<number>`, `--limit` without a value or given twice, a `<count>` that is not a whole
number of zero or more, and an option the command does not take.

| Argument or option | What it is                                                                          |
|--------------------|-------------------------------------------------------------------------------------|
| `<number>`         | Four digits. Lists the runs of the unit or units whose directory opens with them    |
| `--limit <count>`  | Lists at most that many runs, 50 without it, and every run for 0                    |
| `--json`           | Prints one JSON document in place of the text                                       |

It exits with `0`, `1` when it refuses or fails, and `2` for a wrong argument, as [Exit statuses](#exit-statuses)
says.

## check-changes

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

See "Installing it into a project" and "The project's settings" in `README.md`.

## check-commit-message

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

See "Git hooks" in `README.md`.

## sandbox.sh

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
starts nothing. See "The project's settings" in `README.md`.

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
[Exit statuses](#exit-statuses) says. A unit run of a new clone that holds a `package-lock.json` installs the clone's
dependencies with `npm ci` in the container before the command, and when that install fails it starts no command and
passes on npm's status.

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

See "The sandbox" in `README.md`, and in `SANDBOX.md` "Running a unit", "Getting the work back", "Two agents on one
unit", "Two implementations of one unit", "Running on the tree as it is", "The bell" and "Where things are kept on the
host".

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
  A unit run of a new clone passes on the status of the install of its dependencies as well, once that started:
  npm's, when the install fails and starts no command. A unit run whose command exited `0` and whose work was not
  brought back exits `1`. Before that, a Docker command it runs which fails, as Compose reading the configuration or
  the build of the image, passes on Docker's status
* `./sandbox.sh --connect`, once the connected command started
