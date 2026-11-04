# 0095 A project uses the sandbox alone

## Context

A project can set up AgentRite without the sandbox, with `npx agentrite init --no-sandbox`, but it cannot set up the
sandbox without the rest. The human wants a project to be able to use the sandbox alone: the sandbox with its run on a
clone of a branch that is brought back to the host afterwards, which is what makes the sandbox worth having, without
the change process in `changes/`, the roles or the orchestrator. The package `agentrite` is installed whole, with all
of its commands, and that is accepted.

What the kit does today that ties the sandbox to the process:

* A run of `./sandbox.sh` given a unit takes an existing local branch by its exact name, which works without
  `changes/`. A number that no branch holds is matched against the branches that hold it, or gets a branch cut for
  the unit of that number in `changes/` on the default branch, named after the kind in the unit's record. Both are
  the process's
* `--variant` names a branch by the `--` naming of variants, which `process.md` defines
* A clone run mounts the host's `.reviews` and `.orchestrator` into the clone, and creates both directories in the
  project root to do so
* Git in the container runs the image's `commit-msg` hook in every form, which refuses a commit message with a
  trailer the standards forbid
* `init` writes the role wrappers, the list `.agentrite/instructions.md`, `AGENTS.md`, `CLAUDE.md`, `opencode.json`
  for OpenCode, the `check-changes` script in `package.json`, the host's `commit-msg` hook, and the files of the
  sandbox. `refresh`, and `init` with no argument, take all of what they write from `agentrite.json`, so a project
  that only had the files of the sandbox would get the rest written at its next `refresh`. What the project is set up
  for therefore has to be recorded where those commands read it

The project's `sandbox.sh` is a shim that runs the kit's wrapper, `container/sandbox.sh`, with the project root. The
wrapper does all of the work and is shared by every project, so the mode is passed from the shim into it and nothing
of the wrapper is copied.

The unit is built after units 0093 and 0094, and on what they leave. Unit 0094 splits `README.md`: the commands go
to `COMMANDS.md`, which opens with a table of one row per form of every command, the setup, the settings and the
updating of a project go to `SETUP.md`, and what the README says of the sandbox goes to `SANDBOX.md`. Unit 0093 has
the tests that start `init` and `refresh` give them an environment without git's environment configuration, which
the sandbox sets in `container/compose.yml` to point git at the image's hooks, and adds a regression test that runs
those tests with that configuration set.

In this spec, a project "with the process" is one whose `agentrite.json` says it uses the process, as every project
does today, and a "sandbox-only" project is one whose file says it does not.

## Requirements

### The setting

1. `agentrite.json` has an eighth key, `process`, which holds `true` for a project with the process and `false` for a
   sandbox-only project. It is required, as every other key is, and is judged as `sandbox` is: `true` or `false`, and
   not a string. A file that lacks it, or whose `process` is neither, is refused by every command that reads the whole
   file, with the message of a key at fault that names the file, the key, what it holds or that it is missing, and
   what it must hold
2. A file whose `process` is `false` and whose `sandbox` is `false` is refused by every command that reads the whole
   file, with a message that names both keys and says that a project without the process has the sandbox. It writes
   and changes nothing and exits 1
3. Every other key stays required and is judged as it is today in both modes, the check that each path of
   `standards`, `orchestrator` and `roles` names a file included. In a sandbox-only project, what `init` and
   `refresh` write, and what they refuse, depends on no content of those files
4. The default file that `npx agentrite config` writes, and the template it is written from, hold `"process": true`.
   This repository's own `agentrite.json` holds `"process": true`
5. The key is written right after `harnesses`, in the file `init` writes and in the default file

### Setting up

6. `npx agentrite init` takes the option `--sandbox-only`, for a project with no `agentrite.json`. It writes the file
   with `process` as `false`, `sandbox` as `true`, `orchestrator` as `false`, and the other keys as it writes them
   today. Without the option it writes `process` as `true`
7. `--sandbox-only` goes at any place among the harnesses, and given more than once counts as given once. The form
   `--sandbox-only=<value>` is not taken, and is refused as an unknown harness, as `--no-sandbox=<value>` is. `init`
   still needs one or more harnesses with it, which it writes as `harnesses`
8. `--sandbox-only` together with `--no-sandbox` is refused: `init` says that a sandbox-only project has the sandbox,
   prints its usage, writes nothing and exits 2. `--sandbox-only` together with `--no-orchestrator` is taken, and
   writes what `--sandbox-only` alone writes
9. In a project with an `agentrite.json`, `--sandbox-only` is refused as every other argument is: the settings are
   read from the file
10. In a sandbox-only project, `init` writes `agentrite.json` when it is missing, `sandbox.sh`,
    `sandbox/compose.project.yml` and `.dockerignore` as it does today for the sandbox, and prints its line for each.
    It does not write, change or read the role wrappers, `.agentrite/instructions.md`, `AGENTS.md`, `CLAUDE.md` or
    `opencode.json`, does not add the `check-changes` script to `package.json`, and does not write the host's
    `commit-msg` hook. It prints no line and no notice for any of them, and leaves one that exists as it is. It still
    prints the content of the file it wrote and the notice on the default branch, as it does today
11. In a sandbox-only project, `refresh` writes `sandbox.sh` as the sandbox-only shim, and writes or reads nothing
    else: no role wrapper, no list, no hook, no removal of a stale wrapper, and no notice on `CLAUDE.md`,
    `opencode.json`, `AGENTS.md` or the hook
12. The `sandbox.sh` that `init` and `refresh` write in a sandbox-only project passes the sandbox-only mode to the
    kit's wrapper. The one they write in a project with the process is the shim they write today, and a shim of that
    form runs the wrapper as it runs today

### The sandbox in a sandbox-only project

13. `./sandbox.sh [--rebuild] [--mount HOST[:ro]]... BRANCH [COMMAND...]` runs on a clone of the local branch
    `BRANCH`. A local branch of that exact name is run as it is. A name that is no local branch gets a branch of that
    name cut from the head of the local branch that `defaultBranch` names, and the wrapper says on standard error
    what it cut, from which branch and at which commit, as it does today. Only local branches are looked at
14. No name is matched against the branches that hold it as a number, and nothing of `changes/` is read: a name of
    digits is a branch's name as any other is
15. A name that git does not take as the name of a branch is refused: nothing is cut, nothing starts, and the
    wrapper exits 1 with a message that names the name. A missing local default branch is refused as it is today
16. The clone is made, run, fetched back as `sandbox/<branch>`, fast-forwarded into the host's branch when it can be,
    resumed and removed as a unit run's is today, and its container is named after the branch as a unit run's is
17. The clone run mounts neither `.reviews` nor `.orchestrator`, and creates neither directory in the project root or
    in the clone
18. `--variant` is refused in every form, with a message that says that variants belong to the change process. It is
    refused as wrong arguments, with 2, before anything is read, built or cut
19. `./sandbox.sh --connect BRANCH [COMMAND...]` runs the command in the container of the run of the local branch of
    that exact name, as it does today, and names no unit or number. A name that is no local branch is refused as it
    is today, and nothing is cut
20. `--in-place` and `--workdir` run as they do today
21. Git in the container runs no `commit-msg` hook in any form: a commit message with a trailer the standards forbid is
    committed. No hook of a repository mounted at `/work` or with `--mount`, nor of a hooks directory its configuration
    names, runs in the container either, as today
22. The forms the wrapper prints, with its refusals of wrong arguments and when nothing to mount was given, are the
    sandbox-only forms, which name a branch and no unit, unit number or variant. No message of the wrapper in a
    sandbox-only project calls the branch a unit
23. `bell`, the harness versions, the image builds, the status line, the logs, `cleanupPeriodDays` and the exit
    statuses are as they are today

### The sandbox in a project with the process

24. Nothing of the sandbox changes in a project with the process

### Switching

25. A project switches by editing `process` in `agentrite.json`. To sandbox-only: `npx agentrite refresh` rewrites
    `sandbox.sh` as the sandbox-only shim, and the files of the process that are left, among them the host's hook,
    are removed by hand, as for `sandbox` set to `false` today. To the process: `npx agentrite init` with no argument
    writes the files of the process that are missing, and `npx agentrite refresh` then rewrites `sandbox.sh` as the
    shim of a project with the process

### The documents

26. `COMMANDS.md` describes, in the sections of the commands:
    * the `init` option `--sandbox-only`, its combinations and what `init` writes and leaves out with it
    * what `refresh` does in a sandbox-only project
    * the forms of `./sandbox.sh` in a sandbox-only project, with their arguments
27. The table at the top of `COMMANDS.md` has a row for each form of `./sandbox.sh` in a sandbox-only project, and the
    synopsis of `init` in its row holds `--sandbox-only`
28. `SETUP.md` describes:
    * in "Installing it into a project", the sandbox-only setup, with the files table of the setup saying which files a
      sandbox-only project gets
    * in "Git hooks", that a sandbox-only project gets no hook
    * in "The project's settings", the key `process` in the table and the rules, among them what is run after it is
      changed
    * in "Updating a project to a newer kit", a paragraph that a project whose `agentrite.json` lacks `process` adds
      `"process": true` after `harnesses` before any command that reads the file runs again, as the paragraphs on the
      other keys added later say
29. `SANDBOX.md` describes running on a branch in a sandbox-only project, in the section of what the reader does, that
    no commit message is checked there in "Commit messages", and that a sandbox-only project's root gets no `.reviews`
    or `.orchestrator` in "Where things are kept on the host"
30. `README.md` changes in one line only: the line of `SETUP.md` in the map of the documents says that a project can
    set up the sandbox alone
31. A file or directory added at the root of the repository, or one whose presence in the package changes, is in the
    table it belongs in, "What is here" in `README.md` or the one of `CONTRIBUTING.md`, in this unit

### The tests

32. Every test of this unit that starts `init`, `refresh` or a project's `sandbox.sh` shim gives the process an
    environment without git's environment configuration, as the tests that unit 0093 changed do, so that it passes in
    the sandbox as on the host
33. A test file of this unit that starts `init` or `refresh`, and is not among those the regression test of unit 0093
    runs, is added to the files that test runs
34. The regression test of unit 0093 passes. When this unit changes how the sandbox sets git's environment
    configuration, the test sets what the sandbox then sets in a project with the process

## Decisions

* **The mode is a new required key, `process`, and no key becomes optional.** The human decided this. Making the
  keys a sandbox-only project does not use optional was rejected: every key stays required in both modes, and the
  sandbox-only setup does nothing with `roles`, `standards`, `orchestrator` or `harnesses`. The name says what it
  decides, whether the project uses the process, and stands beside `sandbox`, which says the same of the sandbox.
  `sandboxOnly` was rejected because it would be one more boolean that contradicts `sandbox: false`, where `process`
  and `sandbox` are two independent statements with one forbidden pair
* **An existing project without the key is refused until it adds it**, as projects were when `standards`, `roles`,
  `orchestrator` and `bell` were added: the message names the key, and "Updating a project to a newer kit" says what
  to add. A default of `true` for a missing key was rejected, since no command takes a missing key for its default
  value and the human does not want optional keys. A start of the sandbox that cuts no branch judges `bell` alone and
  is not refused for the missing key, since the mode reaches the wrapper from the shim
* **A sandbox-only project has the sandbox.** `process` and `sandbox` both `false` leaves nothing of the kit set up,
  so the file is refused rather than taken as a project with nothing in it
* **`init` writes `orchestrator` as `false` with `--sandbox-only`.** The key stays required, and `false` is the value
  that says truthfully that the project does not use the orchestrator. It also has `agentrite orchestrate` refuse with
  the message it has today for a project without the orchestrator. `--no-orchestrator` beside it says the same, so it
  is taken rather than refused
* **The option is `--sandbox-only`, not `--no-process`.** The human decided this. It names the setup the project
  gets rather than one of the keys it sets: it sets `process`, `sandbox` and `orchestrator` at once, and cannot be
  given with `--no-sandbox`, so it is not the plain negation of one key that `--no-sandbox` and `--no-orchestrator`
  are. The key keeps the name `process`, for the reasons above
* **`--sandbox-only` with `--no-sandbox` is refused as wrong arguments**, since the setup they ask for does not exist,
  and `init` refuses its other wrong arguments with 2
* **The project's file stays `./sandbox.sh`**, and in a sandbox-only project `init` and `refresh` write a shim that
  passes the mode to the one wrapper of the kit. The human decided this over a separate `sandbox-only.sh`, which would
  give the developer two commands to tell apart and a second file to keep up to date
* **The wrapper runs as today when the shim passes no mode.** The shim of every release so far passes none, and it can
  only be in a project with the process, so a project that has not run `refresh` since the update keeps a sandbox that
  starts. A mode that every shim must pass, refusing an older shim, was rejected: it would refuse a start of every
  existing project for an ambiguity there is not. How the mode is spelled between the shim and the wrapper is the
  plan's, since it is the shim's and no developer types it
* **The wrapper takes the mode from the shim and does not read `process` at each start.** That is the human's
  decision that the shim passes the mode. A file edited without `refresh` runs in the shim's mode until `refresh` is
  run, which requirement 25 tells the reader to run
* **A name is a branch, and a new name is cut from the default branch.** The human decided this. Matching by a number
  and cutting for a unit of `changes/` are the process's, and a project without `changes/` has nothing to match or
  read. Cutting from the head of the local default branch is what a unit run does today, and keeps `defaultBranch` the
  one key the sandbox reads besides `bell`
* **`--variant` is refused in a sandbox-only project.** Its branch naming, the unit's branch and `--` and a name, is
  the naming `process.md` gives variants, and the reviews it keeps apart are the process's. A developer who wants two
  runs beside each other gives two branch names
* **`--connect` stays**, since it is a property of a clone run, the second shell beside a run under way, and not of
  the process
* **No `.reviews` or `.orchestrator` mount in a sandbox-only clone run**, so that nothing of the process is created in
  the project root. Both directories are the process's: the reviews of `process.md` and the runs of the orchestrator
* **No hook in a sandbox-only project, on the host or in the sandbox.** The human decided this: the trailer check
  enforces a rule of the kit's standards, which a sandbox-only project has not taken on. In the container, git's hooks
  directory is still set by the environment, to one of the image that holds no hook, rather than left unset. Leaving it
  unset was rejected because the image's hooks directory today also keeps the hooks of a mounted repository, which the
  agent can write, from running in the container, as "Commit messages" in `SANDBOX.md` says, and the sandbox-only mode
  has no reason to give that up
* **`init` and `refresh` write nothing of the process in a sandbox-only project**: no role wrappers, no list, no
  `AGENTS.md`, no imports of the instructions in `CLAUDE.md` or `opencode.json`, nothing of the orchestrator. The human
  decided this. The `check-changes` script in `package.json` is left out too, since the change check is the process's.
  `AGENTS.md` is not written at all, because every section of the kit's template is about the process
* **Switching is in scope, by editing the key and running the commands that exist.** It needs nothing new: `refresh`
  writes the shim of the mode, and `init` with no argument writes what is missing. Removing what the other mode left
  is out, as it is for `sandbox` set to `false` today
* **The other commands of the kit stay as they are in a sandbox-only project.** `units`, `approve`, `run`, `runs`,
  `roles`, `orchestrate` and the change check are installed with the package, and the human accepted that. They read
  `agentrite.json` as today, and `orchestrate` refuses because `orchestrator` is `false`. Refusing the rest is
  "Beyond the request" item 1
* **The documents are named as unit 0094 leaves them.** This unit is built after 0094, so its requirements name
  `COMMANDS.md`, `SETUP.md` and `SANDBOX.md` and the sections they hold then, and not the sections of `README.md`
  before the split
* **`README.md` gets one line, in the map of the documents.** The human decided that the README says that the sandbox
  can be set up alone. Unit 0094 has a unit change the README only for what the kit is, the quick start, a component
  or the workflow, and otherwise at most by a line of the map. The line of `SETUP.md` in the map is where a reader
  looking to set up the sandbox alone looks, and keeps this unit within that rule
* **The tests follow unit 0093.** In the sandbox, a test that starts `init` or `refresh` with the environment it
  inherits finds the image's hooks through git's environment configuration, and fails, as unit 0093 found. The tests
  of this unit start those commands, and this unit changes how the sandbox sets that configuration, so both the rule
  of 0093 and its regression test are kept true

## Non-goals

* Changing how the process commands behave in a sandbox-only project, or refusing them there
* Removing the files of one mode when a project switches to the other
* A project with neither the process nor the sandbox
* A smaller package, or one without the process's commands, for a sandbox-only project
* Running on a branch that is only on a remote, or cutting a branch from anything but the head of the local default
  branch
* Variants, or another way to run two clones of one branch, in a sandbox-only project
* Any change to what the sandbox confines: the firewall, the egress allowlist, the mounts of the logs and the status
  line, and the image's settings
* Any change to the sandbox, to `init` or to `refresh` in a project with the process, beyond writing `process` in the
  file `init` writes

## Beyond the request

1. Refuse the process commands, `units`, `approve`, `run`, `runs`, `roles`, `orchestrate` and the change check, in a
   sandbox-only project, with a message that the project does not use the process. It costs a check and a message in
   each, with their tests and documentation. Without it they behave as they do today: `orchestrate` refuses, `units`
   finds no unit, and the others refuse or report on what is missing, which a developer sees and does not act on
2. Have `refresh` remove the files of the process when a project switches to sandbox-only: the role wrappers the kit
   wrote, the list and a hook with the kit's mark. It costs a removal per kind of file and its tests, and a rule on
   which files are surely the kit's. Without it the developer removes them by hand, and `git status` shows them
3. Guard against cutting a branch for a mistyped name, such as a command given without saying what to mount, which in
   a sandbox-only project cuts a branch of that name, by asking before a cut or by an option that a cut needs. It
   costs an option or a prompt and its tests. Without it the stray branch is named on standard error when it is cut,
   and `git branch -d` removes it
4. Have each start of the sandbox read `process` from `agentrite.json` and refuse a shim of the other mode, telling
   the developer to run `npx agentrite refresh`. It costs one more key judged at each start, beside `bell`, and its
   tests. Without it a project that edited the key and did not run `refresh` runs in the shim's mode until it does
