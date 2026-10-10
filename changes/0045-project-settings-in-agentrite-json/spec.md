# 0045 A project names its settings in `agentrite.json`

## Context

The kit takes `master` for the branch that a project's units are cut from and compared with, and states that
nowhere as something a project must have:

* The change check, `scripts/check-changes.mjs`, compares the current branch with `master`, and with
  `origin/master` when there is no local `master`
* A unit run of the sandbox cuts a unit's branch from the local branch `master`, reads `changes/` and the unit's
  record from it, and refuses to cut when there is none. That is in `container/unit-clone.sh`, which
  `container/sandbox.sh` calls
* `process.md` and the role files of the specifier, the planner and the reviewer name `master`, and agents read
  those as instructions
* "Installing it into a project" of `README.md` does not name the branch, and `init` does not look for it. A
  project whose default branch is `main` finds out when `./sandbox.sh 0001` refuses

Two more things that a project decides once have no home either: the harnesses it uses, and whether it has the
sandbox. Both are typed on every `init` and every `refresh`. Unit 0038 recorded that as a decision, "The option is
given on each run and is not remembered", with its cost: a `refresh` run without `--no-sandbox` writes a
`sandbox.sh` that the project removed on purpose.

The three settings go into one file of the project, `agentrite.json`, which the kit's commands read.

Apart from that, `README.md` tells a project to install the kit with `npm install agentrite`, which makes it a
regular dependency. The kit is a tool for working on a project and is no part of what the project ships, so it is
a development dependency. The human added this to the unit while it was being specified.

The human worked the design out in a conversation with an agent before the unit was specified, and made the
decisions that "Decisions" marks as theirs. The others are the specifier's, and approving the unit approves them.

## Requirements

The file:

1. A project's settings are in `agentrite.json` at the project root, a JSON object with three keys:

   | Key             | What it holds                                        | What reads it                   |
   |-----------------|------------------------------------------------------|---------------------------------|
   | `defaultBranch` | The branch that units are cut from and compared with | The change check and a unit run |
   | `harnesses`     | The harnesses the project uses, as a list            | `init` and `refresh`            |
   | `sandbox`       | `true` with the sandbox, `false` without it          | `init` and `refresh`            |

2. The default file is the one below, ending in one line break. It is a template in `templates/project/`, which
   ships in the package:

   ```json
   {
     "defaultBranch": "master",
     "harnesses": ["claude", "opencode"],
     "sandbox": true
   }
   ```

3. A file is valid when it is a JSON object in which:
    * `defaultBranch` is a string that is not empty
    * `harnesses` is a list of one or more strings, each the name of a harness the kit has, which are `claude` and
      `opencode`. A name that is in the list more than once counts once
    * `sandbox` is `true` or `false`

   A key the kit does not know is ignored. Every other file is not valid: one that cannot be read, that is not
   JSON, that is not an object, that lacks one of the three keys, or in which one of them holds anything else,
   such as a number or an empty string for the branch, an empty list, a harness the kit does not have, or the
   string `"false"` for `sandbox`
4. What a valid file is, is decided in one place of the kit's code. `init`, `refresh`, the change check and the
   sandbox's wrapper all take the settings from there, and none of them reads the file by itself
5. A command that reads the file and finds one that is not valid refuses, also when what is wrong is a key the
   command does not use. It writes and changes nothing and exits with a status other than 0. Its message names the
   file, the key and what is wrong with it, and says what the key must hold. For a file that cannot be read or is
   not JSON it names the file, gives the error it got, and says that the file must hold a JSON object with the
   three keys
6. A command that reads the file and finds none refuses. It writes and changes nothing, exits with a status other
   than 0, says that the project has no `agentrite.json`, and names `npx agentrite config` as the command that
   writes one. No command takes a missing file for the default file, and no command takes a missing key for its
   default value
7. The file is read by `refresh`, by `init` in a project that has one, by the change check, and by a unit run of
   the sandbox at the moment it cuts a branch. Nothing else reads it. `agentrite roles`, `agentrite run`, and
   `./sandbox.sh` with `--in-place`, with `--workdir`, with `--connect` or with a unit whose branch exists do what
   they do before this unit, whether the file is there, missing or not valid

`init`:

8. In a project with no `agentrite.json`, `init` takes one or more harnesses and `--no-sandbox` as before, and
   the option `--default-branch <name>`. Besides what it writes before this unit it writes `agentrite.json`, and
   prints `wrote agentrite.json`:
    * `harnesses` holds the harnesses given, each once, in the order the kit lists them, whatever order they were
      given in
    * `sandbox` is `false` when `--no-sandbox` is given and `true` when it is not
    * `defaultBranch` is the name given with `--default-branch`, and `master` when the option is not given

   At the end of what it prints, with its notices, it prints the content of the file as it wrote it, as `config`
   does. When `--default-branch` was not given it prints a notice besides, which says that `master` was written
   as the default branch because none was named, and that a project whose default branch is another changes
   `defaultBranch` in `agentrite.json`. An `init` that wrote no `agentrite.json` prints neither
9. The file `init` writes is the default file with those values in place of its own: the same keys in the same
   order, the same indentation, the list on one line, and one line break at the end. `init claude opencode` writes
   byte for byte the default file
10. `--default-branch` stands at any place among the harnesses, as `--no-sandbox` does, and the word after it is
    the name, whatever that word is. Given more than once, the last one counts. With no word after it, or with an
    empty one, `init` prints why and its usage, writes nothing and exits 2
11. In a project with a valid `agentrite.json`, `init` with no argument takes the harnesses and the sandbox setting
    from the file. It writes what is missing for them, as `init` given those harnesses, and `--no-sandbox` when
    `sandbox` is `false`, does before this unit, and prints `skipped agentrite.json, which exists`. The file is
    byte for byte what it was
12. In a project with an `agentrite.json`, `init` given a harness, `--no-sandbox` or `--default-branch` refuses,
    also when the arguments say what the file says. It writes nothing and exits 1. Its message says that the
    project has an `agentrite.json`, that the settings are read from it, that a setting is changed by editing the
    file, and that `npx agentrite init` with no argument then writes what is missing
13. In a project with no `agentrite.json`, `init` with no harness prints its usage, writes nothing and exits 2, as
    before this unit. Whenever `init` refuses, for a `package.json` it cannot read among other reasons, it has
    written no `agentrite.json`
14. `init` asks for a `name` in `package.json`, and reads `package-lock.json`, when the sandbox setting it works
    with is `true`, and does neither when it is `false`, whether the setting came from `--no-sandbox` or from the
    file
15. What `init` writes, changes, skips and prints for every other file is what it does before this unit

`config`:

16. `npx agentrite config`, run from the project root, takes no argument. Given one, it prints its usage, writes
    nothing and exits 2
17. In a project with no `agentrite.json` it writes the default file, byte for byte the template, and exits 0. It
    reads nothing else of the project, and runs in one that has no `package.json`
18. It then prints `wrote agentrite.json`, the content of the file as it wrote it, and a notice that says: that
    these are the kit's defaults and that nothing of the project was looked at to find them, that each is to be
    checked against the project, that `agentrite.json` is edited by hand where one is wrong, and that the file is
    committed
19. In a project where something is at the path of `agentrite.json`, a file that is not valid among it, `config`
    leaves it as it is, prints `skipped agentrite.json, which exists`, prints no content and no notice, and exits
    0

`refresh`:

20. `npx agentrite refresh` takes no argument, and reads the harnesses and the sandbox setting from
    `agentrite.json`. It does for the role wrappers of the file's harnesses what `refresh` given those harnesses
    does before this unit. With `sandbox` `true` it does for `sandbox.sh` what `refresh` does before this unit, and
    with `false` what `refresh --no-sandbox` does: `sandbox.sh` is not read or written, and no line is printed for
    it
21. Given any argument, a harness and `--no-sandbox` among them, `refresh` writes nothing and exits 2, and prints
    its usage and that the harnesses and the sandbox setting are read from `agentrite.json`
22. `refresh` never writes, creates or changes `agentrite.json`
23. The remedy that `agentrite run` prints for a wrapper that is missing, or that is not what `refresh` would
    leave, names `npx agentrite refresh` with no harness, and says that it writes the wrappers of the harnesses
    that `agentrite.json` names
24. `agentrite` with no command, or with one it does not have, prints a usage that names `config`, gives `refresh`
    with no argument, and gives `init` with `--default-branch <name>` and in its form with no argument

The default branch:

25. The change check compares the committed work on the current branch with the branch that `defaultBranch` of the
    `agentrite.json` at the repository root names. That root is the one it is given, or the working directory. It
    takes the local branch of that name, and `origin/<default branch>` when the local one gives no common
    ancestor. It reads no branch named `master` unless the file names it
26. When neither gives a common ancestor, the check fails as it does today. Its message names the two it tried,
    and says that the name is the `defaultBranch` of `agentrite.json`
27. A unit run that is given a number no branch holds cuts the unit's branch from the local branch that
    `defaultBranch` names, and reads `changes/` and the unit's record from that branch, where before this unit it
    read `master`. It reads the `agentrite.json` of the project root the command is run from, as it is in the
    working tree, on whatever branch that checkout is and whether or not the file is committed
28. The refusals of requirements 5 and 6 come from the wrapper before it has cut a branch, made a clone, asked
    Docker or npm anything or built anything
29. What a unit run prints names the default branch by its name wherever it printed `master`, as in
    `sandbox.sh: cut feature-0031-cut-me from main at 1a2b3c4, for changes/0031-cut-me.` The refusal for a default
    branch that is no local branch names the branch, and says that `agentrite.json` names it as the default
    branch. The two lines the wrapper prints without having read the file, in the forms it lists and in the
    refusal of a name that is no branch, say "the default branch" where they said `master`
30. Inside the clone of a unit run, the change check reads the clone's own `agentrite.json`, which is the one
    committed on the unit's branch, and finds its base as `origin/<default branch>`

The prose:

31. `process.md` and the role files say "the default branch" wherever they named `master`. `process.md` says, once,
    that the default branch is the one the project names as `defaultBranch` in `agentrite.json` at its root
32. In the package, which is what "What is here" of `README.md` lists, `master` is named only as the value that is
    written when nothing else is asked for, in the template, in the code that writes it and in the documents that
    say so, and in the sections of earlier releases in `CHANGELOG.md`. The comments of the code and what the
    commands print are among what this covers

Installing the kit:

33. "Installing it into a project" of `README.md` installs the kit with `npm install --save-dev agentrite`. What it
    says npm writes is true of that command: the package under `devDependencies` of `package.json`, with a range
    from the version installed, and the version, its address on the registry and an integrity hash in
    `package-lock.json`
34. "Updating a project to a newer kit" of `README.md` updates with `npm install --save-dev agentrite@latest`. What
    it says that command changes stays true
35. "On a fresh clone" of `README.md` says that an install that leaves out the development dependencies, as
    `npm ci --omit=dev` and an `npm ci` with `NODE_ENV=production` do, installs no kit, that `npx agentrite` and
    `npm run check-changes` do not run there, and that a job that runs the change check therefore installs with a
    plain `npm ci`. `README.md` says it there and nowhere else

The documents:

36. `README.md` describes `agentrite.json` in one place, which its other sections refer to: where the file is,
    each key and what it holds, the default file, that the default branch is `master` unless `--default-branch` or
    an edit says otherwise, that the file is committed, and how a setting is changed by hand, with what to run
    afterwards:
    * `defaultBranch`: nothing is run
    * a harness added to `harnesses`: `npx agentrite refresh` writes its wrappers, and the wrapper directories that
      the project's `AGENTS.md` lists are the project's to bring up to date
    * `sandbox` set to `true`: `npx agentrite init` writes the files of the sandbox that are missing
    * a harness taken out, or `sandbox` set to `false`: no command removes a file, and what is left is removed by
      hand
37. "Commands" of `README.md` describes `agentrite config`, and describes `agentrite init`, `agentrite refresh`,
    `check-changes` and `sandbox.sh` as this unit leaves them, each with every argument and option: both forms of
    `init`, `--default-branch <name>`, `refresh` with no argument, and the default branch in place of `master`.
    It gives no `--no-sandbox` for `refresh`, and no harness for it, anywhere in the document
38. "Installing it into a project" of `README.md` lists `agentrite.json` among the files `init` writes and shows
    `--default-branch`. "Updating a project to a newer kit" gives `npx agentrite refresh` with no argument, and
    says that a project with no `agentrite.json` first runs `npx agentrite config`, checks what it wrote and
    commits the file. The row of `templates/project/` in "What is here" covers `config`
39. `SANDBOX.md` says in "Running a unit": that a unit's branch is cut from the default branch, which is the one
    that the `agentrite.json` of the checkout the command is run from names, and not the clone's; that the clone
    has the default branch as `origin/<default branch>`; and that the change check inside the clone reads the
    clone's `agentrite.json`, so the file is committed. Its entries of "When something goes wrong" say "the
    default branch" where they said `master`, and the entry for a default branch that is no local branch gives
    both remedies: make the local branch, or correct `defaultBranch`. The refusals of requirements 5 and 6 say why
    and what to do, and are not entries
40. The three documents follow the rules that this repository's `AGENTS.md` gives for them. None of them says why
    the file exists, what a command took before this unit, or how a project moves from one to the other, beyond
    what requirement 38 names

This repository:

41. This repository has an `agentrite.json` at its root, byte for byte the default file, which is right for it:
    its default branch is `master`, it has the wrappers of both harnesses, and it has the sandbox. The file is not
    in the package, and "What the repository holds besides the package" of `CONTRIBUTING.md` has a row for it
42. With it, the working copy's `refresh`, run at this repository's root with no argument, prints `up to date` for
    the eight wrappers and `sandbox.sh`, and changes no file
43. Step 6 of `RELEASING.md` gives `npx agentrite refresh` with no argument as the second of its five commands.
    Nothing else of `RELEASING.md` changes, and `CONTRIBUTING.md` changes by the row of requirement 41 alone

A project that updates:

44. A project that release 6.0.0 set up moves to the release that holds this unit by these steps and no others:
    1. install the release, with the command of requirement 34
    2. run `npx agentrite config`, read what it printed, and edit `agentrite.json` where the project differs: a
       default branch other than `master`, a harness it does not use, no sandbox
    3. run `npx agentrite refresh`
    4. commit `agentrite.json` together with `package.json`, `package-lock.json` and what `refresh` changed, on
       the default branch

    After them, `refresh` writes and prints what `refresh` given the project's harnesses, and `--no-sandbox` for
    a project without the sandbox, wrote and printed before, the change check passes where it passed, and a unit
    run cuts its branch from the branch the file names. Until step 2 is done, `refresh`, the change check and a
    unit run that cuts a branch refuse, each naming `npx agentrite config`. So a project whose CI runs the change
    check has a failing CI from the commit that updates the kit until `agentrite.json` is committed, which is why
    step 4 commits them together

Proof:

45. The suite passes in the clone of a unit run, which has no local `master`, and no test that passes on the host
    before this unit fails there after it. What reads and judges the file is unit tested: a valid file, a file
    with a key the kit does not know, a missing file, and every kind of file that requirement 3 names as not valid
46. Tested end to end, in temporary projects and repositories:
    * `init`: the file it writes for each combination of harnesses, `--no-sandbox` and `--default-branch`, the
      option at each place; the default file for `init claude opencode` and for `init opencode claude`; what it
      prints for the file, with `--default-branch` and without; a project
      with a file and no argument, for a file with one harness and for one with `sandbox` `false` and a
      `package.json` with no `name`; the refusals of requirements 10, 12 and 13, with nothing written; a file that
      is not valid
    * `config`: requirements 16 to 19, and that `refresh` runs on the file it wrote
    * `refresh`: each value of the two settings it reads, a missing file, a file that is not valid, and every
      argument it took before, with nothing written
    * the change check: a repository whose default branch is not `master` and that also has a branch `master`,
      which the check does not read; the fallback to `origin/<default branch>`; a missing file; a file that is not
      valid; a `defaultBranch` that names no branch
    * a unit run, with real git and the stand-in for Docker: a branch cut from a default branch that is not
      `master`, in a repository that also has a branch `master`; what it prints; the refusals for a missing file
      and for one that is not valid, with no branch cut and Docker and npm asked nothing; and that the runs of
      requirement 7 start with no file
    * the steps of requirement 44, in a project with the wrappers and the sandbox's files and no `agentrite.json`
47. A project that installs the tarball `npm pack` makes of the tree has everything requirements 16 to 30 need: the
    template, and what reads the file, for `npx agentrite`, for `npm run check-changes` and for the wrapper. The
    suite holds that the package's list of files covers them

The pointer package:

48. The pointer package `agentrite-roles` gives, in what it prints and in its `README.md`, the commands as this
    unit leaves them: `npm install --save-dev agentrite` to install the kit, `npx agentrite init claude opencode`
    to set a project up, and `npx agentrite refresh` to bring the wrappers up to date. It gives `refresh` no
    harness and no `--no-sandbox`, names `--no-sandbox` for `init` alone, and nowhere gives `npm install agentrite`
    without `--save-dev`. Everything else it says, its exit status of 1 and its `description` are unchanged. The
    tests of the pointer hold this for the message and for the README. It is the one package under `pointers/`
49. Its version is `2.0.2`, which the test that holds `2.0.1` now holds. The registry has `1.0.0` and `2.0.1` and
    takes a version once. The unit leaves the pointer in the tree at that version, with the new text and not
    published, and is `implemented` without the publish. Publishing it is the human's, with the release that
    holds this unit, as step 5 of `RELEASING.md` gives it. The plan holds no task for it

## Decisions

On the human's word:

* **One file for the kit's settings, `agentrite.json` at the project root, in JSON.** The kit has no runtime
  dependency, and node reads JSON by itself. The sandbox's wrapper already reads JSON on the host through `node`,
  so the shell side needs nothing new. It is a file for AgentRite's settings in general and not a file for the
  branch alone
* **The keys are `defaultBranch`, `harnesses` and `sandbox`.** `defaultBranch` and not `baseBranch`: it is git's and
  GitHub's own term. `harnesses` is a list. The sandbox setting is a positive boolean, `sandbox`, and not
  `noSandbox`
* **Nothing is implicit.** `defaultBranch` is always written out. `master` is the default only in that it is what
  gets written when nothing else is asked for. A missing file is not read as "`master`": a command that needs the
  file refuses and names `npx agentrite config`
* **`config` writes the defaults and looks at nothing.** It copies the template as it is, prints what it wrote and
  hands the checking to the reader, whose responsibility the settings then are. Rejected: finding the settings in
  the project's files. The traces are not reliable: the wrappers of a harness the project dropped, a `sandbox.sh`
  that a `refresh` without `--no-sandbox` wrote back, a project that still has the `agent.sh` names from before
  unit 0041. Rejected too: `config` with the arguments of `init`, which would be a second way to say the same
* **`refresh` reads the harnesses and the sandbox setting from the file, and never writes it.** This reverses the
  decision of unit 0038 that the option is given on each run and is not remembered, and replaces what unit 0013
  decided, that `refresh` is told the harnesses like `init`. What 0013 rejected stays rejected: the harnesses are
  not found from the directories that exist
* **The readers of the default branch share one reader of the file,** so that what a valid file is, is said once
* **The fallback of the change check is `origin/<default branch>`.** The clone of a unit run and a checkout in CI
  often have that and no local branch
* **One unit.** The branch setting and the move of the harnesses and the sandbox into the file are specified
  together. The human weighed a split and decided against it
* **The kit is a development dependency.** It is a tool for working on the project. Nothing in the kit depends on
  which section of `package.json` declares it: the image build runs a plain `npm ci`, and `init` reads
  `package-lock.json`, which records the package either way
* **Once a project has the file, `init` takes no setting from its arguments.** The specifier proposed it and the
  human confirmed it, for arguments that say what the file says too. The arguments of `init` are what the file is
  written from, and after that the file is the only source. Rejected: taking the arguments and skipping the file,
  as `init` skips every file that exists. `init claude` in a project whose file says `sandbox` `false` would then
  write a `sandbox.sh` that `refresh` never refreshes, and say nothing. Rejected too: taking arguments that say
  what the file says. The absence of `--no-sandbox` and of `--default-branch` says "the sandbox" and "`master`",
  so a second run in a project on `main` without the sandbox would have to repeat both options, which is the
  typing this unit ends. This changes requirement 10 of unit 0038: a project set up without the sandbox gets one
  by setting `sandbox` to `true` and running `npx agentrite init`
* **An empty `harnesses` is not valid,** which the human confirmed. `init` has always asked for at least one
  harness, and a `refresh` of no harness would write no wrapper and report nothing
* **`init` says what it wrote into the file.** It costs little, and it is the one moment at which a project on
  `main` can notice, before something refuses
* **The pointer package is brought along in this unit,** so that it does not go stale: it would otherwise send a
  reader to a `refresh` with harnesses, which this unit refuses, and to an install as a regular dependency. Its
  version is `2.0.2`, a patch for new text, as unit 0043 moved it. The human publishes it by step 5 of
  `RELEASING.md`, which got that passage on `master` before this unit, on the human's word. Until then the
  registry's `2.0.1` names `refresh claude opencode`, which the release refuses with a message that says where the
  harnesses are named
* **The cost to a project that updates is one command,** and the unit is described by that and by the steps of
  requirement 44. Which version the release is, is decided when it is made, and its notes are written then

The specifier's:

* **`refresh` refuses an argument, and does not ignore it.** A `refresh claude` that silently refreshed both
  harnesses of the file would do something else than was asked. The refusal costs one run, and its message says
  where the harnesses are now
* **`agentrite run` does not read the file.** The harness of a run is chosen for that run, and `harnesses` says
  which wrappers the project keeps. A run with a harness the file does not name is stopped as it is today, by the
  wrapper that is missing, and the remedy of requirement 23 says where the harnesses are named. Reading the file
  would make `run` refuse in a project where it works
* **A file is valid whole or not at all.** A reader that judged only its own keys would let a project run for
  months with a `harnesses` that the next `refresh` refuses. All three keys are required, because a key with a
  default when it is missing is an implicit setting. A key the kit does not know is ignored: with all three
  required, a misspelled key shows as the missing one
* **`defaultBranch` is checked to be a string that is not empty, and no more, by the reader.** Whether it names a
  branch is said where the branch is used, by the change check and by the wrapper, each in a message that names
  the branch and `agentrite.json`. See "Beyond the request" for git's own rule of a branch name
* **The wrapper reads the file only when it cuts a branch.** That is the one moment it needs the default branch.
  A unit run of a branch that exists, `--in-place`, `--workdir` and `--connect` go on working in a project that
  has not written its file yet, and a command given without a unit still gets the forms and not a refusal about
  a file
* **A unit run reads the file of the checkout it is run from, and the change check in the clone reads the
  clone's.** The wrapper cannot read the file from the default branch, whose name is what it is looking for. The
  working tree of the checkout is what the image, the allowlist and the limits are taken from already, by the
  decision of unit 0029, and an agent that edits the file in its clone has not changed where the host cuts from.
  The change check runs where it is started, with the repository root it is given, and inside the clone that is
  the clone
* **The change check reads the file of the working tree, not of a commit.** It is the one reader of the file that
  could read a commit, and it reads its change documents from commits. One way to read the file for every command
  was chosen. A file that is not committed shows as soon as the check runs anywhere else
* **`init` without the sandbox does not ask for a `name` in `package.json`, as before.** The reason of unit 0038
  holds wherever the setting comes from: the name is needed for the sandbox's Compose project and image, and for
  nothing else
* **The harnesses are written in the kit's order.** The file is then the same for one set of harnesses however
  they were typed, and `init claude opencode` writes exactly the default file
* **`init` prints the file, and its notice names the file and not the option.** Both commands that write the
  file print its content as written: one form for the same three values, and the reader sees what there is to
  edit. It is printed whether or not `--default-branch` was given, so that what `init` prints for the file does
  not depend on its options, and the notice comes only when `master` was written unasked. The notice does not
  name `--default-branch` as the way to change it: the file is there by then, and `init` refuses the option from
  then on. `init` asks git nothing. See "Beyond the request"
* **The update gives `--save-dev` too.** Tried with npm 11.19.1 in scratch projects: `npm install agentrite@latest`
  keeps the package in the section it is in, `devDependencies` and `dependencies` alike. With `--save-dev` it stays
  under `devDependencies`, and a package that an earlier `npm install agentrite` put under `dependencies` moves
  there. So the one command is right for both projects
* **What an install without development dependencies lacks is said in "On a fresh clone".** That is where
  `README.md` says what `npm ci` installs, and where someone who sets up a clone or a CI job reads. Tried with the
  same npm: `npm ci --omit=dev` and `NODE_ENV=production npm ci` both leave no `node_modules/agentrite`
* **This repository gets its file in this unit.** It installs its own release, which is 6.0.0 until the next
  release moves it. So until then nothing installed here reads the file: `npm run check-changes` and
  `./sandbox.sh` run the code of 6.0.0, which reads `master`. What reads it from the start is the working copy:
  `npx agentrite` at this root, which runs the working copy's file as unit 0044 has it, and
  `./sandbox-dev.sh`. From step 6 of the next release on, the installed check and wrapper read it. With the file
  on `master` before that release and requirement 43, step 6 is still its five commands. Without them the step
  would stop and hand the move to a unit of its own, as release 6.0.0 did to unit 0044
* **`RELEASING.md` and `CONTRIBUTING.md` go on naming `master` for this repository.** They describe this
  repository, whose default branch it is, and are not in the package

## Non-goals

* A section in `CHANGELOG.md`, and the version of the release. Both are the release's
* A change to the role wrappers, to `sandbox.sh` at a project's root, or to what the sandbox confines, mounts or
  builds
* Removing the wrappers of a harness, or the files of the sandbox, that a project took out of its file. The kit
  has never removed a file from a project
* A command that changes a setting. The file is edited by hand
* Moving what `sandbox/compose.project.yml` holds into `agentrite.json`
* A base branch per unit, or more than one default branch
* A setting for the remote. The fallback of the change check is `origin/<default branch>`, as it was
  `origin/master`
* Checking a harness given to `agentrite run` against `harnesses`
* The documents of earlier units and the sections of earlier releases in `CHANGELOG.md`, which keep `master`
* Moving the other projects that use the kit

## Beyond the request

* **`init` that looks whether the default branch it writes exists.** It would cost a call to git in a command
  that needs none today, and a rule for a project that is no repository yet. Without it, `init` says what it
  wrote, and a branch that is not there is refused by the first unit run or change check, in a message that names
  the branch and `agentrite.json`
* **Judging `defaultBranch` by git's own rule for a branch name,** as `git check-ref-format --branch` decides it.
  It would cost a call to git in every command that reads the file, `refresh` among them. Without it, a name that
  git would not take, such as one with a space, is refused where it is used, as a branch that does not exist
* **`--default-branch=<name>`,** the form with the equals sign that `agentrite run` takes for its own options.
  Without it, `init` prints `unknown harness: --default-branch=main` and its usage
* **`./sandbox.sh` that refuses in a project whose file says `sandbox` `false`.** It would have the wrapper read
  the file in every run. Without it, a `sandbox.sh` that was left in such a project starts the sandbox as it does
  today
* **A change check that says when `agentrite.json` is not committed.** It would cost a question to git and a
  message. Without it, the check passes on the developer's machine and refuses, naming `npx agentrite config`,
  in CI and in the clone of a unit run
