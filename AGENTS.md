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
* [SANDBOX.md](SANDBOX.md): what the sandbox does
* [CONTRIBUTING.md](CONTRIBUTING.md): working on the kit itself

## General guidelines

### Line limit

The default line wrapping of IntelliJ is used: 120 characters. Make sure all code and text are wrapped at 120
characters.

## The documents

`README.md`, `SANDBOX.md` and `CONTRIBUTING.md` are kept as follows.

* The commands are complete. Every command a project can run is described in `README.md`, with every argument,
  option and environment variable, and a unit that adds, changes or removes one changes `README.md` in the same
  unit. The same holds for `CONTRIBUTING.md` and this repository's own commands
* The two tables are kept up to date: "What is here" in `README.md`, for what the package holds, and "What the
  repository holds besides the package" in `CONTRIBUTING.md`. A unit that adds, removes or renames a file or
  directory at the root of the repository, or changes whether it is in the package, changes the table it belongs
  in, in the same unit
* The three documents say what there is and how to use it: what a command, a file or the sandbox does, what a
  reader types, sees, must do or must not do, what is refused and how to recover. The rule on refusals below is
  the exception for `SANDBOX.md`. The why of a change is written in its unit under `changes/` and not in them
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
* `SANDBOX.md` holds no HTML. A table in it is a Markdown table whose lines fit the line limit, and what does not
  fit one is written as text

## The kit's command

In this repository `npx agentrite` runs the working tree's `agentrite`, not the installed release's. Run the
installed release's command as `npm run kit -- <command>`, with the arguments `npx agentrite <command>` takes. The
rest is in "Commands" of [CONTRIBUTING.md](CONTRIBUTING.md#commands).

## Exit statuses

Every command of the kit, and every command of this repository's own, follows "Exit statuses" of
[README.md](README.md#exit-statuses). A unit that adds a command, or a status of one, does so by that section.

## Releasing

`CHANGELOG.md` holds one section per release and ships in the package. A section is written when a release is made,
for all the units in it at once, and never by a unit as it is implemented: a unit cannot know which version it will
be released in, and one summary of a whole release reads better than lines written apart.

How a release is made, the release notes among it, is in [`RELEASING.md`](RELEASING.md). Read it when asked to make
a release or to write the release notes, and follow it. Start neither unasked.
