This document contains critical instructions for coding agents working in this repository. Follow these guidelines
precisely.

We eat our own dog food: this project uses AgentRite, and the files
[`.agentrite/instructions.md`](.agentrite/instructions.md) names are **required reading** before any change: the
kit's `process.md`, the project's standards, and the file of each role. `process.md` holds the changes process in
`changes/`, the status progression and the freeze, and the commit prefixes; the standards hold the rules on text,
documentation, commits, code and tests. This file holds only what is specific to this project, and nothing is stated
in both places.

Read before making changes, each for what it is the source of truth on:

* [README.md](README.md): what the kit is and how a project uses it
* [COMMANDS.md](COMMANDS.md): every command a project runs, and the exit statuses
* [ORCHESTRATOR.md](ORCHESTRATOR.md): what the orchestrator does
* [SETUP.md](SETUP.md): how a project installs, configures and updates the kit
* [SANDBOX.md](SANDBOX.md): what the sandbox does
* [CONTRIBUTING.md](CONTRIBUTING.md): working on the kit itself

## General guidelines

### Line limit

The default line wrapping of IntelliJ is used: 120 characters. Make sure all code and text are wrapped at 120
characters.

A line of a Markdown table may be longer than 120 characters, in every document of the repository, since a row
cannot be wrapped. Every other line keeps the limit.

## The documents

Each document answers the question its reader brings to it, and holds what answers it:

| Document          | The reader's question                                    | What goes in it                                                                                                                        |
|-------------------|----------------------------------------------------------|----------------------------------------------------------------------------------------------------------------------------------------|
| `README.md`       | What is the kit, and how do I start?                     | What the kit is, its components, the quick start, how it works, the map of the documents, "What is here"                               |
| `COMMANDS.md`     | What does a command take, do and exit with?              | The table of every command, each command's section with every argument, option and environment variable, and the exit statuses         |
| `ORCHESTRATOR.md` | How does the orchestrator take a unit through its roles? | Its definition, the outcome of a step, how a run ends, what `.orchestrator` holds, where it runs                                       |
| `SETUP.md`        | How do I install, configure and update the kit?          | Installing it, the git hooks, the project's settings, replacing and adding roles, updating                                             |
| `SANDBOX.md`      | How do I run an agent in the sandbox?                    | What a developer does with the sandbox and meets in it, by what they are doing                                                         |
| `CONTRIBUTING.md` | How do I work on the kit itself?                         | This repository's own commands, tests, copy of the kit and sandbox, what it holds besides the package, and what adding a harness takes |

They are kept as follows.

* A unit changes `README.md` only when it changes what the kit is, the quick start, a component or the workflow.
  Otherwise it changes `README.md` at most by a line of the map of the documents, "The documents"
* The commands are complete. Every command a project can run is described in `COMMANDS.md`, with every argument,
  option and environment variable, and a unit that adds, changes or removes one changes `COMMANDS.md` in the same
  unit, its row in the table at the top of `COMMANDS.md` among it. The same holds for `CONTRIBUTING.md` and this
  repository's own commands
* The two tables are kept up to date: "What is here" in `README.md`, for what the package holds, and "What the
  repository holds besides the package" in `CONTRIBUTING.md`. A unit that adds, removes or renames a file or
  directory at the root of the repository, or changes whether it is in the package, changes the table it belongs
  in, in the same unit
* The documents say what there is and how to use it: what a command, a file or the sandbox does, what a reader
  types, sees, must do or must not do, what is refused and how to recover. The rule on refusals below is the
  exception for `SANDBOX.md`. The why of a change is written in its unit under `changes/` and not in them
* `diagrams/` holds each diagram of the README as its Mermaid source and the SVG generated from it. A unit that
  changes a source generates its SVG with `npm run diagrams` and commits both in the same unit. A unit that changes
  a component or the workflow the diagrams show changes the diagram
* `SANDBOX.md` is kept complete for its reader, who uses the sandbox and wants to know how. A unit that adds,
  changes or removes something a developer does with the sandbox, or meets in it, changes `SANDBOX.md` in the same
  unit
* `SANDBOX.md` is ordered by what a reader does. A unit that adds to it puts the text in the section of what the
  reader is doing, and not in a section for the part of the sandbox that changed
* A refusal whose message names both why it refused and what to do is not described in `SANDBOX.md`. One whose
  message leaves either out is an entry of "When something goes wrong"
* A failure of the sandbox that a reader recovers from by doing something is an entry of "When something goes
  wrong" in `SANDBOX.md`, with what is seen, why and what to do, and is described nowhere else in it. "Where things
  are kept on the host" is kept up to date, its table and what it says of each place. A unit that changes either
  changes that section in the same unit
* `SANDBOX.md` holds no HTML. A table in it is a Markdown table

## The kit's command

In this repository `npx agentrite` runs the working tree's `agentrite`, not the installed release's. Run the
installed release's command as `npm run kit -- <command>`, with the arguments `npx agentrite <command>` takes. The
rest is in "Commands" of [CONTRIBUTING.md](CONTRIBUTING.md#commands).

## Exit statuses

Every command of the kit, and every command of this repository's own, follows "Exit statuses" of
[COMMANDS.md](COMMANDS.md#exit-statuses). A unit that adds a command, or a status of one, does so by that section.

## Ways of working

* Rewrite no commit that exists, by an amend, a reset, a squash, a rebase or a replay, also when it is not pushed,
  unless the human asked for that rewrite. The request permits that one rewrite only. Make a correction of your own
  as a new commit, and then ask the human whether to fold it into the earlier one. Check files, as for the line
  limit, before committing them rather than amending after
* The review of a unit is made by another model in another harness. A session that implemented a unit hands it over
  at `in-progress`, and neither offers the review nor starts it
* Build a reading of a spec that is the only one that works, such as `package-lock.json` changing with
  `package.json`, and log it in one line of `record.md`. Do not put it to the human as a decision

## Security findings

A finding of the security reviewer, [`extra-roles/security-reviewer.md`](extra-roles/security-reviewer.md), is kept
out of everything published, since everything committed in this repository is.

* A security finding, the decision on it and its outcome are written in nothing committed. This is an exception to
  the rule of `process.md` that the outcome of each finding is recorded in `record.md`
* No role but the security reviewer reads a file of `.reviews` whose name begins with `security-`. The implementer
  takes no findings from one, and the reviewer takes none as its last review, as exceptions to their role files
* A finding the human hands to another role is given in the hand-over
* A fix the human hands to a role is described by what it changes and not by the attack it stops, in a plan, a
  record, a commit message and a code comment alike
* A finding the human decides to fix is specified as a feature or a task, and never as a bug. Its documents state
  what will be true once it is done, as what the code does or refuses, and state no observed behavior, no steps to
  reproduce and no root cause. This is an exception to the rule of `process.md` on the kinds of a unit, which a bug
  would otherwise be
* Nothing of the unit of such a fix is pushed before the release that ships it is published: not its documents on
  `master`, not its branch, and not `master` once it holds either. Its commits are pushed by the push of that
  release, step 7 of [`RELEASING.md`](RELEASING.md), which follows `npm publish`, so the fix becomes public as a
  release that users can move to

## Releasing

`CHANGELOG.md` holds one section per release and ships in the package. A section is written when a release is made,
for all the units in it at once, and never by a unit as it is implemented: a unit cannot know which version it will
be released in, and one summary of a whole release reads better than lines written apart.

How a release is made, the release notes among it, is in [`RELEASING.md`](RELEASING.md). Read it when asked to make
a release or to write the release notes, and follow it. Start neither unasked.
