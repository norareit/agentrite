# 0047 A second run of a unit

## Context

A unit run of the sandbox, as `./sandbox.sh 0069 claude`, works on a clone of the unit's branch in a container that
is named after the Compose project and the branch. That name is the lock: while the container runs, a second run for
the branch is refused, and the refusal names `--connect`. `--connect` runs a second command in the same container, on
the same clone, which is two agents on one tree and not two implementations. So one unit is implemented by one
harness with one model at a time.

The human wants two or more models to implement the same unit, each on its own, so that the results can be laid side
by side and one taken. Today that needs a branch or a clone made by hand, and neither is one command: a second
branch cut by hand from the unit's branch makes the unit's number name two branches, which the wrapper refuses, and a
clone run with `--workdir` brings no commit back and cannot be connected to.

The human first asked for this on 2026-10-13, and asked then for a sketch only, since other units came first. The
sketch left six questions open. On 2026-10-20 the human took the specifier's proposals for all six, and added that
the reviews of each run are kept apart, so that the implementer of one run reads only the reviews of that run.

What is said below of the sandbox holds for `master` at `e20449c`, which depends on release 7.3.0:

* A unit is given to the wrapper by its branch's name, or by a number that exactly one local branch's name holds as
  a whole number. A number that no branch holds has the unit's branch cut from the default branch. A number that two
  branches hold is refused, with both named
* The clone of a unit run is under the developer's state directory, at the Compose project's name and the branch's
  name. When the container exits, the wrapper fetches the clone's branch into the host's repository as
  `sandbox/<branch>`, fast-forwards the host's branch to it, and removes the clone when nothing in it would be lost
* The runs of one project share the home volume, the project's log directory on the host, and the host's `.reviews`
  directory, which every unit run mounts at `/work/.reviews`
* The reviewer saves its findings under `.reviews/<unit-directory>/`, in a file whose name tells it apart from the
  reviews already there. The names in this repository's `.reviews` hold commits, times and at times a model's name,
  with single hyphens, and none holds `--`. No branch, and no directory of `changes/`, holds `--` either
* `agentrite run <role> <harness> <unit> --model <id>` starts a harness as a role for a unit with a model of the
  developer's choice. It starts no sandbox

## Requirements

Starting a variant:

1. `./sandbox.sh` takes an option `--variant <name>`, given with a unit, as `./sandbox.sh 0069 --variant opus claude`.
   It is optional: without it, a unit run is as it is today. The usage and `README.md` show it among the wrapper's
   forms, and `--variant=<name>` is taken as well
2. A run with `--variant <name>` is a variant of the unit. It works on the branch `<unit's branch>--<name>`, which is
   the unit's branch's name, two hyphens and the variant's name, as `feature-0069-export-to-csv--opus`
3. A variant's name is one or more words of the lowercase letters `a` to `z` and the digits `0` to `9`, joined by
   single hyphens, as `opus` or `gpt-6-1`. A name of another form is refused before anything is started, with a
   message that names the name and the form
4. `--variant` is refused together with `--in-place` or `--workdir`, which have no unit, with a message that says so.
   It is refused when given twice
5. When the variant's branch does not exist, the wrapper cuts it from the host's branch of the unit, at the commit
   that branch is at, and says what it cut, from which branch and commit, before it builds an image or starts a
   container. When the unit has no branch yet, the wrapper first cuts the unit's branch from the default branch, as
   a unit run given the number does, and then the variant's branch from it
6. When the variant's branch exists, the run works on it as a unit run works on the unit's branch. Nothing of the
   unit's branch is taken into it

Running a variant:

7. A variant runs as a unit run of its branch: in a container of its own, named after the Compose project and the
   variant's branch, on a clone of its own, with the same confinement, mounts and settings. Everything "Running a
   unit" and "Getting the work back" of `SANDBOX.md` say of a unit run holds for it, with the variant's branch in
   the place of the unit's
8. A variant runs while a unit run of the unit, or another variant of it, runs, and while none does. Starting,
   running and ending one stops nothing in the container of another, writes nothing in its clone, and moves no
   branch of another
9. When a variant's container exits, its commits are brought back to the host's branch of the variant, and to no
   other branch. The unit's branch and the branches of the other variants are as they were
10. Two runs of one variant are refused as two unit runs of one branch are today
11. Any number of variants of a unit may exist and run at a time

Naming a variant afterwards:

12. A number names the unit's branch alone. A branch whose name holds `--` is not among the branches a number is
    looked up in, so a unit that has variants is still named by its number, and a number that only a variant's
    branch holds names no branch
13. A variant's branch given to the wrapper by its full name is a run of that variant, as `--variant` with its unit
    is. `--variant` together with a unit given by a variant's branch is refused
14. `./sandbox.sh --connect <unit> --variant <name> [COMMAND...]` connects to the run of that variant, as
    `--connect` connects to a unit run today, and `--connect` with a variant's branch by its full name does the
    same. Without `--variant`, `--connect` with a unit's number connects to the unit run alone

The reviews and the record:

15. A reviewer that reviews a variant saves its findings in a file whose name ends in `--<name>.md`, with the
    variant's name. A reviewer of a unit run saves them in a file whose name holds no `--`. Both are under
    `.reviews/<unit-directory>/`, as today
16. An implementer on a variant takes findings only from the files of `.reviews/<unit-directory>/` whose name ends in
    `--<name>.md` with its own variant's name. An implementer on the unit's branch takes them only from files whose
    name holds no `--`. A reviewer that looks at earlier reviews of the unit does the same
17. A role knows that it works on a variant, and which, from the branch it is on: a branch whose name holds `--` is
    a variant's, and its name is what follows the last `--`. This holds on the host as in the sandbox
18. An agent's entry in `record.md` made on a variant's branch names the variant in its text, as "on the variant
    `opus`". An entry made on the unit's branch names none
19. `process.md`, `roles/reviewer.md` and `roles/implementer.md` of the kit say what requirements 15 to 18 say,
    each where it says what it holds today of `.reviews` and of the record

The documents:

20. `SANDBOX.md` has a section on variants, after "Two agents on one unit", which says:
    * what a variant is for, with an example of two variants of one unit, each started with `agentrite run` and
      another `--model`
    * the option, the variant's name and its branch's name, and that the option is optional
    * where a variant's branch is cut from, and that commits of a unit run that are not yet brought back to the host
      are not in it
    * that its commits come back to the variant's branch alone, and that the reviews are kept apart by name
    * how the human compares two results, with `git diff` of two branches, and takes one, by merging its branch into
      the unit's branch or resetting the unit's branch to it, and that a variant that is not taken is a branch the
      human deletes, with its clone if one was kept
21. `README.md` shows the option among the forms of `./sandbox.sh` and in its table of options, and "Where things are
    kept on the host" of `SANDBOX.md` says that a variant's clone is kept as a unit run's is, under its branch's
    name

Tests:

22. The suite tests requirements 1 to 6 and 12 to 14 without Docker, as the wrapper's other refusals and its branch
    work are tested today, and requirements 7 to 11 with Docker, skipped where Docker is not available as the
    suite's other tests that need Docker are

## Decisions

* **The option is `--variant <name>`, and it is optional.** The human first sketched `--alt`, which says that there
  is another run and not which. A name lets more than one exist, and names the branch, the clone, the container and
  the reviews of each. Without the option nothing changes, so a developer who never compares models never meets it
* **A variant needs no unit run under way.** Two models may be run side by side, or one after the other on a
  machine that holds one container well. Rejected: a variant only beside a running unit run, which forces the two to
  overlap for no gain
* **A variant is a unit run of a branch of its own.** The lock, the clone, the bringing back and `--connect` are
  already made per branch, so a branch per variant gives each what a unit run has, with the least that is new.
  Rejected: a second clone of the unit's branch, whose commits would have to come back to one branch, which would
  either mix the two results or have the second overwrite the first
* **Two hyphens part the variant's name from the unit's branch.** A unit's branch is in single hyphens, as
  `feature-0069-export-to-csv`. With one hyphen, `feature-0069-export-to-csv-opus` could be the variant `opus` or a
  unit whose name ends in `-opus`. No branch, unit or review file holds `--` today, and a name of either form holds
  none, so a `--` says variant wherever it stands. Digits are allowed in a variant's name, since it will often be a
  model's, as `gpt-6-1`
* **A variant starts from the host's branch of the unit, as it is at the start.** That is where every unit run
  starts, and it is what the host can see. Commits of a unit run that is under way are in its clone and not yet on
  the host, and taking them would reach into another run, which requirement 8 rules out. Rejected: starting from the
  default branch, which would give a variant of a unit that was planned on its branch no plan
* **A number names the unit's branch alone.** With variants among the branches a number is looked up in, each
  variant would make the unit's number name two branches, which is refused, and the developer would have to give
  the unit's branch by its full name from then on. A variant is named by its unit and its name, or by its branch's
  full name
* **Comparing and taking a result is done with git.** The results are branches, and git's own commands compare,
  merge and delete them in every way a developer may want. Rejected: a command of the kit that takes a variant,
  which would have to choose between merging and resetting for the human
* **The runs share what unit runs share.** The home volume holds the harnesses' logins, the log directory their
  sessions, and `.reviews` the reviews; the first two are wanted in every run, and the reviews are kept apart by
  their names, by the human's wish. Rejected: a directory of `.reviews` per variant, which would leave a variant's
  reviews where no tool of the unit looks, and the human asked for the name
* **The reviews of a variant end in `--<name>`.** It is the same mark as in the branch, so the rule to tell a
  variant's file from a unit run's is one rule. A file of a unit run holds no `--`, which every file in this
  repository's `.reviews` already meets
* **A role reads its variant from its branch.** The branch is there on the host and in the sandbox, and in a run
  started with `agentrite run` or by hand alike. Rejected: a variable the wrapper sets, which a run on the host
  would lack
* **A record's entry made on a variant names it.** Each variant appends to `record.md` on its own branch, and the
  record of the variant that is taken is the one that stays. Its entries then say which run did what, also once the
  other branches are deleted

## Non-goals

* Starting a harness or choosing a model. What runs in each container is the developer's command, as in every run,
  and `agentrite run --model` is how a model is chosen
* Judging which result is the better one, which is the human's
* A command that takes a variant, merges it or deletes it
* Variants of `--in-place` and `--workdir` runs, which have no unit
* A variant of a variant. A variant's name holds no `--`, and a branch is a variant's or a unit's
* `CHANGELOG.md`, which is written when the release is made

## Beyond the request

None
