# 0037 Refactor the README

## Context

`README.md` is 1027 lines. It grew a section at a time, each written by the unit that added a behavior, and it has
no order a reader can follow: how to install comes before what the kit is for, the commands are spread over the
sections that happen to need them, nothing says what the roles are or how a unit is worked from request to done, and
about 600 of the lines are the reference of the sandbox. Much of it is prose on why something is as it is, which a
reader who wants to use the kit does not need and which the units under `changes/` already hold. The human finds it
too long to read through, and too long to rewrite by hand.

The README is also what ships. npm puts it in the package whatever `files` says, so a project that installs the kit
gets all of it, the parts on working on the kit itself included, which no project uses.

The README is rebuilt from the ground, on the basis of the existing text, into three documents with one job each,
that say what there is and how to use it.

## Requirements

1. `README.md` holds these parts, in this order:
    1. The introduction and "The name", worded as they are now
    2. "What is here"
    3. How it works: what each of the four roles is, and a usual workflow
    4. "Commands": every command a project runs, each with every argument and option it takes
    5. "Running a role": what the present README's "Running a role" says of `agentrite run` beyond its arguments
       and options, such as resuming a session, stopping a run, the wrapper the command needs and how it is
       repaired, and the status it exits with, as far as requirement 9 keeps it
    6. Installing the kit into a project, a fresh clone included
    7. Updating a project to a newer kit
    8. The sandbox, in brief: what it is for, what it confines, the files a project configures it with, and where
       the reference is
2. "What is here" lists what the package holds, and nothing else: a row for every file and directory at the root of
   the package. What the repository holds besides, such as `tests/`, `infra/`, `RELEASING.md` and `deploy.sh`, which
   the present table lists, is not in it. The present table's two rows for `templates/changes/` and
   `templates/project/` stay, and are the rows of `templates/`
3. "How it works" describes each role briefly and in general terms: what it is given, what it produces, and where it
   stands in the order of the work. It states no rule that `process.md` or a role file states, and points to them
   for the rules
4. The usual workflow in "How it works" is the human's own text, on how the human uses the kit today. The implementer
   asks for it, places it as given apart from line wrapping, and writes none of it
5. The part "Commands" has a section for each command, under a heading that names the command, in which the
   command stands once, with its description right after it. There is no overview beside those sections, and no
   second place in the part where a command is described again. A section holds, in this order, and nothing else:
    * the command as it is typed, in every form it is run in, in a code block
    * what it does, in one or two sentences
    * a table with a row for every argument and every option, each with one line on what it is, and a second table
      with a row for every environment variable a developer may set to change what the command does. None is left
      out because it is rarely used, and a command that takes none has no table
    * where more is said, by the title of that section, when another part of the README or `SANDBOX.md` says what
      the command writes, refuses or leaves behind

   The commands are those a project that installed the kit can run:
    * `agentrite init`, `agentrite refresh`, `agentrite roles` and `agentrite run`
    * `agentrite-roles`
    * the change check, by its npm script and by the kit's script run with `node`
    * the project's `agent.sh`, in each form it is run in
6. Every argument, option and environment variable that a command's own usage text or argument parser accepts is
   named in the README. This is checked against the code, not against the present README: the present README names
   neither `AGENT_MEM_LIMIT` nor `AGENT_CPUS`, which a project's compose file reads
7. The reference of the sandbox is `SANDBOX.md`, which ships in the package. It covers the subjects of the present
   README's "Running the sandbox" that requirement 1 does not place in the README: working on a clone, connecting
   to a unit run, another working directory, extra directories, the shared `node_modules`, the home volume, the
   harness logs, the harness versions, the status line, logging in to a model provider, egress and the local model
   server. Its text is not copied from the present README: it is written anew by requirements 9 and 10, as the
   README's is
8. Working on the kit itself is in `CONTRIBUTING.md`, which does not ship in the package. It covers the subjects of
   the present README's "The kit's own tests", "The kit's own copy of the kit", "Trying the working copy's sandbox"
   and "Releasing", written anew by requirements 9 and 10 and not copied. It describes the commands that only this
   repository has, each with every argument and option, as requirement 5 asks of the README. A command that takes
   what a command of the README takes names that command's section for them, and has rows only for what differs.
   It also has a table of
   what the repository holds that the package does not, with a row for every such file and directory that is
   tracked at the root of the repository. Files that only configure a tool may share one row
9. The three documents say what there is and how to use it, and not why it is so. What stays, and what goes:
    * Stays: what a command, a file or the sandbox does; what a reader types; what a reader then sees or finds, and
      where; what is refused, and how to recover; what a reader must do or must not do, and the one clause of
      consequence that makes it a thing to heed; what the sandbox defends against and what it does not; and a limit
      of what was tried, where a reader on another system would meet it
    * Goes: why a behavior was chosen, and what was rejected for it; how a behavior is brought about, where a reader
      does not act on it; what an earlier release did, apart from the steps of moving away from it; evidence of what
      was tried and found to work; and a copy of what a command prints, where saying what it means is enough
10. Text is short. A list or a table stands where the present text is a paragraph that enumerates, a sentence says
    one thing, and a section is pointed to by its title alone
11. A fact is stated in one of the three documents and pointed to from the others. The kit's own allowlist hosts, what
    `refresh` rewrites, the Playwright build argument and the `.dockerignore` exception are each stated once
12. Every command, path, option, host name and file name keeps its exact spelling, and every statement that stays
    keeps its strength: what is refused stays refused, and what is "best kept" does not become "must"
13. The record lists every statement of the present README that is in none of the three documents, grouped by the
    section it stood in, and says of each group which line of requirement 9 it went by, or where the same is now
    said
14. Everything outside the three documents that names the README, or a section of it by its title, names the
    document and the title where that text now is. That holds for what the kit writes into a project, for what a
    command prints, and for comments
15. This repository's `AGENTS.md` says:
    * that the README is complete and is kept complete: every command a project can run is described in it with
      every argument, option and environment variable, and a unit that adds, changes or removes one changes the
      README in the same unit. The same holds for `CONTRIBUTING.md` and this repository's own commands
    * that the two tables are kept up to date, "What is here" in the README and the one in `CONTRIBUTING.md`: a unit
      that adds, removes or renames a file or directory at the root of the repository, or changes whether it is in
      the package, changes the table it belongs in, in the same unit
    * that the three documents say what there is and how to use it, as requirement 9 has it, and that the why of a
      change is written in its unit under `changes/` and not in them
    * which of the three documents is the source of truth on what, where it now names the README for all of it
16. The examples that install the kit by the URL of a release, of which the present README has two, at 2.0.0 and at
    2.1.0, name the release that this repository depends on when the unit is built
17. The suites pass, and the package holds `README.md` and `SANDBOX.md` and does not hold `CONTRIBUTING.md`

## For the reviewer

The reviewer compares the three documents with `README.md` as it is on the merge base, section by section, and does
not take the implementer's list of requirement 13 for that comparison. The review reports:

* every statement of the earlier README that is in none of the three documents and that the implementer's list does
  not name. Each is a finding
* every statement the list names that, in the reviewer's judgement, a reader needs in order to use the kit, with
  the reason. Each is a finding for the human, who decides whether it comes back. The reviewer does not decide it
* every statement that stayed and no longer says what it said, by requirement 12

Whether a loss is a problem is the human's to decide in every case. A loss that the human accepted is recorded as a
decision, and a later review treats it as settled.

## Decisions

* **Three documents, split by reader.** The README is for whoever uses the kit in a project, `SANDBOX.md` for
  whoever needs to know exactly what the sandbox does, and `CONTRIBUTING.md` for whoever changes the kit. A single
  document with a better order was rejected: the sandbox reference is long whatever its order, and a reader who
  wants the commands should not have to pass it
* **`SANDBOX.md` is at the root of the package.** It stands beside `process.md` and `CHANGELOG.md`, where a reader of
  the installed package looks. A README inside `container/` was rejected because nothing leads a reader into that
  directory. The human reads the split result and may move parts of it back into the README, which is then a change
  to this unit and not a new one
* **`CONTRIBUTING.md` is at the root of the repository.** That is the name a reader of an open source repository
  looks for, and the name code hosts link to by themselves. npm does not put it in a package unless the package
  lists it, and it is not listed. `RELEASING.md` stays its own document, since it is the instruction a release
  follows step by step, and `CONTRIBUTING.md` points to it
* **"What is here" is the package, on the human's word.** The README ships, so "here" is what a project that
  installed the kit finds under `node_modules`. A row for `deploy.sh` or `infra/` tells that reader of something
  they do not have. Those rows move to `CONTRIBUTING.md`, whose reader has the repository
* **`agent-dev.sh` points to `agent.sh` for what it takes, on the human's word.** It passes every argument on to
  the wrapper, and the README describes each of them, with the environment variables. Repeating those rows in
  `CONTRIBUTING.md` was rejected: it would say them twice, against requirement 11, and the two tables would have
  to be kept the same
* **Each command once, on the human's word.** An overview followed by a description of each would say every
  command twice and grow long again. So a command's section is its description, and what a command does at length
  is in the part it belongs to, which the section names
* **A heading and a table per command, on the human's word.** The part was first built as one nested list, with
  a code block and a list of options under each command. The human found that odd to read and had a table in
  mind, as a man page has, and took this form once it was built. A table keeps each argument and option to one
  line. One table for all commands was not built: the forms of a command and what it does do not fit a cell. The
  title is "Commands", which is what a reader looks for, and not "The commands"
* **The install examples name the present release, on the human's word.** They go out of date at the next release,
  and it does no harm to bring them along now. A placeholder was rejected because the command could then not be
  pasted
* **"Running a role" is a part of its own, on the human's word.** A command's section in "Commands" holds the form, a
  description and a line per option, and what the present README says of `agentrite run` besides is more than
  that and stays by requirement 9. It is no subject of the sandbox, so `SANDBOX.md` is not its place. Widening the
  section of `run` alone was rejected because the part would grow long there, and letting the statements go
  was rejected because they are what a reader types and what is refused
* **Two rows for `templates/`, on the human's word.** The two directories in it are for two readers, a unit's
  author and `init`, and the present rows say so. One row for the directory was rejected for that
* **Complete means the commands.** The README describes every command a project runs, in full. It does not hold
  every consequence of every command: what a unit run does to the host's branches when the container exits is in
  `SANDBOX.md`. The line is that whatever a developer types is in the README, and whatever happens as a result may be
  in the reference, with the README pointing there
* **The why goes, on the human's word.** Someone who reads the README wants to know what there is and how to use
  it, and the reasoning is in the units under `changes/`, which is where a reader who wants it looks. `process.md`
  forbids removing or condensing documentation without the user's explicit approval. The approval of this spec is
  that approval, for what requirement 9 lets go and for nothing else
* **Losses are listed twice and decided by the human.** The implementer lists what was left out, and the reviewer
  finds it again without that list. Neither decides whether a loss matters. Requirement 9 draws a line that two
  readers will draw differently in places, and the human would rather see a loss and accept it than not see it
* **What the sandbox defends against stays.** It reads as reasoning, and it is what there is: a reader decides by it
  whether a unit run is safe enough for what they are about to do
* **No table of contents, on the human's word.** The human wanted one whose entries link to their sections on
  Bitbucket, on GitHub and in IntelliJ's preview alike. Bitbucket forms the anchor of a heading differently from the
  other two, and Markdown has no form that works on all three, so there is none
* **No target length.** The documents become short by requirements 9 and 10, and a number would have the
  implementer drop what requirement 9 keeps. What is checked is the structure, the completeness and what was lost
* **The roles are described and not defined.** `process.md` and the role files are the rules, and `process.md` says
  that nothing is stated in two places. A reader of the README needs to know that there are four roles, what each is
  for and in which order they come, and no more
* **The rules go in this repository's `AGENTS.md`, not in `process.md`, on the human's word.** They are about this
  project's documents and its commands, and are not a rule for every project that uses the kit

## Non-goals

* A change to what any command does, accepts or prints, apart from the pointers of requirement 14
* A change to `process.md`, to a role file or to `RELEASING.md`, apart from a pointer of requirement 14 where one of
  them holds one
* A change to `CHANGELOG.md`. Earlier release notes name sections of the README by title, as they were when those
  notes were written. The notes of the release that carries this unit say where the text went, and are written when
  that release is made
* Correcting the content on the way, apart from the two tables of what is where and the release in the install
  examples. Another statement of the present README that is out of date is moved as it is, when it stays at all,
  and named in the record for the human
* Making the repository open source, or anything that would take: a licence, a code of conduct, a public remote

## Beyond the request

* A test that fails when a command accepts an option that the README does not name. It would make requirement 15
  hold by itself instead of by an instruction to agents. Its cost is a test that reads the usage text of four
  commands and the argument parsing of a shell script, which has no usage text to read in one place. Without it, a
  missing option is found by whoever looks for it in the README and does not find it, and is fixed then
