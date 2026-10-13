# 0047 A second run of a unit

## Context

This spec is a sketch, on purpose. It holds the use case and the few requirements that the request itself fixes,
and it leaves the design open: nobody can implement the unit from it yet without coming back to ask. What is open
is listed under "Decisions", and is decided before the unit is approved.

A unit run of the sandbox, as in `./sandbox.sh 0069 claude`, refuses a second run for the same unit: there is one
clone and one container for each Compose project and branch. So one unit is implemented by one harness with one
model at a time. To have a second model implement the same unit, so that the two results can be laid side by side,
a developer today arranges a second branch or a second clone by hand.

### What the human asked for

On 2026-10-13 the human asked to be able to start a second, fully separate clone of a unit and have it mounted in a
container of its own, beside the first. They sketched it as "some sort of `./sandbox.sh 0069 --alt`", and gave the
use: "to let two different models implement the same feature", so that the two results can be compared.

They asked for "a very minimal, not worked out spec": "I don't want to have it written out TOO much right now,
because there's other features I want to implement first". Those features are built before this unit and may change
the sandbox. What is said of the sandbox below is of `master` at `4d36473`, which is the release 6.0.0 and the
units 0044 to 0046 after it, and is read again when the unit is worked out.

### What the sandbox does today

* The container of a unit run is named after the Compose project and the branch, and that name is the lock. While
  Docker says that container is running, a second unit run for the branch is refused, and the refusal names
  `--connect`
* The clone of a unit run is in the developer's state directory, under the Compose project's name and the branch's
  name. So it too is one for each project and branch
* When the container exits, the wrapper fetches the clone's branch into the host's repository as
  `sandbox/<branch>`, fast-forwards the host's branch to it, and removes the clone when nothing in it would be lost
* `--connect` runs a second command in the container of the run that is under way, on the same clone. That is two
  agents on one tree, as the implementer beside the reviewer, and not two implementations
* The runs of one project share the home volume, the project's log directory on the host, which holds the sessions
  of both harnesses and OpenCode's database and login, and the host's `.reviews` directory, which every unit run
  mounts into its clone
* A second implementation is had today in two ways, and neither is one command. A second branch, cut by hand from
  the unit's branch, is run by its name, and from then on the unit's number names two branches and is refused. A
  full clone, made by hand, is run with `--workdir`, which brings no commit back and cannot be connected to

## Requirements

1. While a run is under way for a unit, a second run for that unit can be started from the sandbox's wrapper, in
   one command that gives the unit. It is not refused, and the developer cuts no branch and makes no clone by hand
   for it
2. The second run works on a clone of the unit's branch that is its own. A file written or a commit made in the
   clone of one run is not in the clone of the other
3. The second run is in a container of its own, confined as the container of a unit run is. Each of the two
   containers ends when its own first command ends, and the other runs on
4. The first run is not disturbed. Starting the second run, running it and ending it stop nothing in the first
   run's container and write nothing in its clone, and the first run's work is brought back when its container
   exits, as that of a unit run is
5. When both runs have ended, the host has the commits of each, apart from those of the other. Neither run's
   commits are overwritten by the other's, and neither's are merged into the other's without the human asking

## Decisions

None is made yet. The following are left open on purpose, and each is decided, with its reasons, before the unit is
approved:

* **The form of the command.** `--alt` was a sketch and not a decision. With it: whether a unit can have more than
  one such run besides the first, and whether one can be started while no first run is under way, for a developer
  who runs the two models one after the other
* **Where the second run's commits go when its container exits.** A branch of their own, or something else. They
  cannot fast-forward the unit's branch as those of a unit run do, since the two runs would then land on one
  branch, which requirement 5 rules out
* **What the second clone starts from**, when the first run holds commits that the host's branch does not have
  yet, or when the unit's branch has moved on since the first run began
* **How the second run is named afterwards**: by `--connect`, when its clone was kept and is resumed, and when a
  number such as `0069` is resolved to a branch
* **How the human compares the two results and takes one**, and what becomes of the one that is not taken
* **What the two runs share, and whether any of it is separated.** The home volume, the log directory and the
  `.reviews` directory are shared today, as "What the sandbox does today" says

## Non-goals

* Two agents on one tree. That is `--connect`, which stays as it is
* Starting a harness or choosing a model. What runs in each of the two containers is the developer's command, as in
  every run
* Judging which of the two results is the better one. That is the human's
* Runs with `--in-place` and `--workdir`, which have no unit and stay as they are

## Beyond the request

None.
