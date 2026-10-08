This document contains critical instructions for coding agents working in this repository. Follow these guidelines
precisely.

We eat our own dog food: this project uses AgentRite [
`node_modules/@ritenoar/agentrite/process.md`](node_modules/@ritenoar/agentrite/process.md) is **required reading**
before any change: the changes process in `changes/`, the status progression and the freeze, the commit conventions, the
documentation rules, and the code and testing standards. This file holds only what is specific to this project, and
nothing is stated in both places.

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
  reader types, sees, must do or must not do, what is refused and how to recover. The why of a change is written in
  its unit under `changes/` and not in them

## Releasing

`CHANGELOG.md` holds one section per release and ships in the package. A section is written when a release is made,
for all the units in it at once, and never by a unit as it is implemented: a unit cannot know which version it will
be released in, and one summary of a whole release reads better than lines written apart.

How a release is made, the release notes among it, is in [`RELEASING.md`](RELEASING.md). Read it when asked to make
a release or to write the release notes, and follow it. Start neither unasked.
