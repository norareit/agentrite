# 0037 Refactor the README

## Context

`README.md` is 1027 lines. It grew a section at a time, each written by the unit that added a behavior, and it has
no order a reader can follow: how to install comes before what the kit is for, the commands are spread over the
sections that happen to need them, nothing says what the roles are or how a unit is worked from request to done, and
about 600 of the lines are the reference of the sandbox. The human finds it too long to read through, and too long
to rewrite by hand.

The README is also what ships. npm puts it in the package whatever `files` says, so a project that installs the kit
gets all of it, the parts on working on the kit itself included, which no project uses.

The README is rebuilt from the ground, on the basis of the existing text, into three documents with one job each.

## Requirements

1. `README.md` holds these parts, in this order:
    1. The introduction and "The name", worded as they are now
    2. "What is here", as it is now, with a row for each document this unit adds
    3. How it works: what each of the four roles is, and a usual workflow
    4. The commands: every command a project runs, each with every argument and option it takes
    5. Installing the kit into a project, a fresh clone included
    6. Updating a project to a newer kit
    7. The sandbox, in brief: what it is for, what it confines, the files a project configures it with, and where
       the reference is
2. "How it works" describes each role briefly and in general terms: what it is given, what it produces, and where it
   stands in the order of the work. It states no rule that `process.md` or a role file states, and points to them
   for the rules
3. The usual workflow in "How it works" is the human's own text, on how the human uses the kit today. The implementer
   asks for it, places it as given apart from line wrapping, and writes none of it
4. The commands part opens with one overview that lists every command with one line on what it does, and then
   describes each. For each command it gives every form the command is run in, every argument, every option, and
   every environment variable a developer may set to change what it does. None is left out because it is rarely
   used. The commands are those a project that installed the kit can run:
    * `agentrite init`, `agentrite refresh`, `agentrite roles` and `agentrite run`
    * `agentrite-roles`
    * the change check, by its npm script and by the kit's script run with `node`
    * the project's `agent.sh`, in each form it is run in
5. Every argument, option and environment variable that a command's own usage text or argument parser accepts is
   named in the README. This is checked against the code, not against the present README: the present README names
   neither `AGENT_MEM_LIMIT` nor `AGENT_CPUS`, which a project's compose file reads
6. The reference of the sandbox is in a document of its own, which ships in the package. It holds everything the
   present README says under "Running the sandbox" that requirement 1 does not place in the README: working on a
   clone, connecting to a unit run, another working directory, extra directories, the shared `node_modules`, the
   home volume, the harness logs, the harness versions, the status line, logging in to a model provider, egress and
   the local model server
7. Working on the kit itself is in a document of its own, which does not ship in the package. It holds what the
   present README says under "The kit's own tests", "The kit's own copy of the kit", "Trying the working copy's
   sandbox" and "Releasing", and describes the commands that only this repository has, each with every argument and
   option, as requirement 4 asks of the README
8. No fact of the present README is lost. Each statement of it is in one of the three documents, or was left out
   because another statement of the three documents, of `process.md` or of a role file says the same. The record
   lists what was left out, and for each where the same is said
9. A fact is stated in one of the three documents and pointed to from the others. The kit's own allowlist hosts, what
   `refresh` rewrites, the Playwright build argument and the `.dockerignore` exception are each stated once
10. Every command, path, option, host name and file name keeps its exact spelling, and every statement keeps its
    strength: what is refused stays refused, and what is "best kept" does not become "must"
11. Everything outside the three documents that names the README, or a section of it by its title, names the
    document and the title where that text now is. That holds for what the kit writes into a project, for what a
    command prints, and for comments
12. This repository's `AGENTS.md` says that the README is complete and is kept complete: every command a project can
    run is described in it with every argument, option and environment variable, and a unit that adds, changes or
    removes one changes the README in the same unit. It says the same of the document on working on the kit, for
    this repository's own commands
13. This repository's `AGENTS.md` names each of the three documents for what it is the source of truth on, where it
    now names the README for all of it
14. The suites pass, and the package holds the README and the sandbox reference and does not hold the document on
    working on the kit

## Decisions

* **Three documents, split by reader.** The README is for whoever uses the kit in a project, the sandbox reference
  for whoever needs to know exactly what the sandbox does, and the third for whoever changes the kit. A single
  document with a better order was rejected: the sandbox reference is about 600 lines whatever its order, and a
  reader who wants the commands should not have to pass it. Shortening by rewording alone was rejected too, because
  with every section kept it takes out about a fifth and loses detail on the way
* **The sandbox reference is `SANDBOX.md` at the root of the package.** It stands beside `process.md` and
  `CHANGELOG.md`, where a reader of the installed package looks, and is added to what the package ships. A README
  inside `container/` would ship with no change to the package's list, and was rejected because nothing leads a
  reader into that directory. The human reads the split result and may move parts of it back into the README, which
  is then a change to this unit and not a new one
* **Working on the kit is `CONTRIBUTING.md` at the root of the repository.** That is the name a reader of an open
  source repository looks for, and the name code hosts link to by themselves. npm does not put it in a package
  unless the package lists it, and it is not listed. `RELEASING.md` stays its own document, since it is the
  instruction a release follows step by step, and `CONTRIBUTING.md` points to it
* **Complete means the commands.** The README describes every command a project runs, in full. It does not hold
  every consequence of every command: what a unit run does to the host's branches when the container exits is the
  sandbox reference's. The line is that whatever a developer types is in the README, and whatever happens as a
  result may be in the reference, with the README pointing there
* **Nothing is dropped but repetition.** The human asked for a complete README, and will read the split documents to
  decide what belongs where. Dropping detail before that reading would decide it for them. So the verbatim messages
  of the wrapper and the entrypoint, and the statements of what was tried on which system, move with their sections
  and stay
* **No target length.** The README becomes short by what moves out of it, and a number would press the implementer to
  drop what requirement 8 keeps. What is checked is the structure and the completeness
* **The roles are described and not defined.** `process.md` and the role files are the rules, and `process.md` says
  that nothing is stated in two places. A reader of the README needs to know that there are four roles, what each is
  for and in which order they come, and no more
* **The rule on completeness goes in this repository's `AGENTS.md`, not in `process.md`.** It is about this
  project's README and its commands. A rule that every project keeps its README complete would be the kit's to give,
  and nobody asked for it

## Non-goals

* A change to what any command does, accepts or prints, apart from the pointers of requirement 11
* A change to `process.md`, to a role file or to `RELEASING.md`, apart from a pointer of requirement 11 where one of
  them holds one
* A change to `CHANGELOG.md`. Earlier release notes name sections of the README by title, as they were when those
  notes were written. The notes of the release that carries this unit say where the text went, and are written when
  that release is made
* Correcting the content on the way. A statement of the present README that is out of date is moved as it is, and
  named in the record for the human
* Making the repository open source, or anything that would take: a licence, a code of conduct, a public remote

## Beyond the request

* A test that fails when a command accepts an option that the README does not name. It would make requirement 12
  hold by itself instead of by an instruction to agents. Its cost is a test that reads the usage text of four
  commands and the argument parsing of a shell script, which has no usage text to read in one place. Without it, a
  missing option is found by whoever looks for it in the README and does not find it, and is fixed then
* The two install examples name the releases 2.0.0 and 2.1.0, and the kit is at 4.2.0. Changing them to the present
  release costs one line each and goes out of date at the next release. Changing them to a placeholder makes the
  command one that cannot be pasted. Without either, a reader who pastes the example installs an old release, and
  `deploy.sh` prints the right URL at every release
* A table of contents at the top of each of the three documents. Code hosts build one from the headings, and a
  written one is one more thing to keep true
