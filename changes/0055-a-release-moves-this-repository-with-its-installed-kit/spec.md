# 0055 A release moves this repository, with its installed kit

## Context

This repository installs its own release as a devDependency, so that work on the kit follows the released process
and `./sandbox.sh` runs the released sandbox (unit 0044). Step 6 of `RELEASING.md` moves it to each release: five
commands, run on `master` and committed there with no unit. Two things about that step came up while release 7.1.0
was made on 2026-10-16.

**`npx agentrite` here runs the working tree, not the installed release.** This repository is itself the package
`agentrite`, and npm runs the root package's own command for `npx agentrite`. With 7.0.0 installed and unit 0052 on
`master` and in no release, `npx agentrite roles` printed 0052's description of the implementer, "Builds an approved
change unit", which only the working tree holds. `node node_modules/agentrite/scripts/agentrite.mjs roles` and
`node_modules/.bin/agentrite roles` printed 7.0.0's, "Builds a planned change unit". `npm exec -c` finds
`node_modules/.bin/agentrite` first on its `PATH`, so it is the name `agentrite`, which is this repository's own,
that leads npm to the working tree. Other projects are not affected: their package has another name. npm was
11.19.1.

So the `npx agentrite refresh` of step 6 runs the working tree's `refresh`. That gives the right result only while
`master` holds nothing but the release, which is so during a release and not after. A `refresh` run at the root at
any other time writes what units on `master` changed and no release holds. The planner of unit 0054 found the root's
implementer wrappers holding 0052's description before 0052 was released, which is what such a `refresh` writes; how
they came to hold it was not established.

**Step 6 stops for any release that asks a project for more than its five commands.** It then puts the repository
back, and the move becomes a unit. Releases 7.0.0 and 7.1.0 both asked for more, because units 0048 and 0052 changed
what a project's own `CLAUDE.md` and `opencode.json` must hold, and 7.0.0 took a task of its own, unit 0053. What
7.1.0 asks of a project besides the five commands is: run `npx agentrite init` with no argument; add the line
`@node_modules/agentrite/standards.md` to `CLAUDE.md` between two named lines; set a unit whose status is `planned`
to `approved`; and paste into an `AGENTS.md` that names no `standards.md` what the project wants of the sections
`init` prints. Its section also opens with the install and `refresh` that step 6 runs itself, and asks for one
commit. Step 6 of 7.1.0 ran the five commands on 2026-10-16, all of which passed, and stopped there.

The human asked for both to be dealt with in one unit, and chose that step 6 carries out what a release asks of a
project when it is exact, over a task for each such release.

## Requirements

Running the installed kit:

1. This repository's `package.json` has a script `kit`, which runs the `agentrite` command of the installed
   release, `node_modules/agentrite/scripts/agentrite.mjs`, with the arguments given after `--`. With 7.0.0 installed
   and a working tree that differs from it, `npm run kit -- roles` prints 7.0.0's roles
2. "Commands" of `CONTRIBUTING.md` describes `npm run kit`, with its arguments, and says that in this repository
   `npx agentrite` runs the working tree's command and `npm run kit --` the installed release's
3. This repository's `AGENTS.md` says the same in one place, for an agent that would run the kit's command here
4. No text of `RELEASING.md`, `CONTRIBUTING.md` or this repository's `AGENTS.md` tells a reader to run the
   installed release's command with `npx agentrite`. `npx agentrite-roles`, the pointer package, is another
   package and stays

Step 6:

5. Step 6 of `RELEASING.md` runs `refresh` as `npm run kit -- refresh`, in the place of `npx agentrite refresh`, and
   so runs the `refresh` of the release just installed. The other four of its commands stay as they are
6. After the five commands pass, step 6 carries out each instruction of "Worth knowing when you update" in the new
   release's section of `CHANGELOG.md` that asks a project to do something, when the instruction is exact. An
   instruction is exact when it gives, word for word, either a command to run, or a line to add to a named file of
   the project together with where it goes: before or after a line it quotes, or at the end of a list or section it
   names. A command that is the kit's own is run as `npm run kit --` with the same arguments
7. An instruction that installs the kit, runs `refresh`, starts the sandbox, or asks for the update to be committed
   is done by step 6 itself, by its five commands and its commit, and is not carried out again
8. An instruction that holds only for some projects asks nothing of this repository when its condition does not hold
   here. Whether it holds is settled by this repository's `agentrite.json`, or by what the tracked files on `master`
   hold, such as the status in each `record.md` under `changes/` or the text of `AGENTS.md`. When neither settles it,
   the step stops
9. Step 6 stops, as it does today for a release that asks for more, when such an instruction is not exact, or one it
   carries out fails or does not do what the instruction says it does. It then puts the repository back as it does
   today, and the move becomes a unit. Step 6 names the instruction and why it stopped
10. Step 6's reading of the tree takes the changes the instructions made as expected, beside those of the five
   commands: a change to a file an instruction named, or that a command it ran printed as written or changed. A
   change to any other file still stops the step
11. The commit body of step 6 says, besides what it says today, each instruction it carried out and what came of
    it, each it took as done by the five commands, and each whose condition does not hold here, with why

This repository's text:

12. The text of this repository's `CLAUDE.md`, and the rows of `CLAUDE.md` and `opencode.json` in "What the
    repository holds besides the package" of `CONTRIBUTING.md`, say what the file is for without listing the kit's
    instruction files one by one, so that a line a release has a project add to either file leaves them true. This
    repository's `CLAUDE.md` says where an instruction that every project follows is kept as the kit's instruction
    files at the root, and no longer as `process.md` alone
13. This repository's `AGENTS.md` calls the kit's `process.md` and `standards.md` required reading, each in a link,
    and says what each holds, as the `AGENTS.md` that release 7.1.0's `init` writes does. It no longer says that
    `process.md` holds the documentation rules and the code and testing standards

## Decisions

* **One unit for both.** The human asked for it. Both change step 6, and the widened step runs `refresh` and
  `init`, which is where the first finding bites
* **A script, named `kit`.** A script of `package.json` is what this repository already uses to name a file under
  `node_modules`, as `check-changes` does. `kit` says what it runs, the installed kit, and differs from the
  command's own name, so that `npm run kit` and `npx agentrite` read as two things. Rejected: a script named
  `agentrite`, which reads as the same command as `npx agentrite`; and writing the path out in each place, which
  is long and is the knowledge of where the command lives repeated in each
* **Step 6 carries out what a release asks when it is exact, and stops when it is not.** The human chose this over a
  task for each such release. An exact instruction leaves nothing to decide, so carrying it out on `master` without
  a unit is as safe as the five commands; one that leaves something to decide is what a unit is for. It also tries
  each release's own update instructions on a real project before others follow them, which a task after the release
  does as well, but later. Rejected: a move task for every release that asks for more than the five commands, as
  unit 0053 was
* **What is exact is a closed list.** A command word for word, or a line word for word with its file and its place.
  Anything else stops the step. The list is what makes "exact" checkable by the agent that runs the step, and a
  later release that needs another kind of instruction widens it in a unit
* **This repository's prose stops listing the kit's instruction files.** The two moves so far each changed the prose
  of `CLAUDE.md` and a row of `CONTRIBUTING.md`, because they named `process.md` alone. That edit is not an exact
  instruction of any release, and would stop the widened step on every release that adds a file. Written without
  the list, they stay true
* **What step 6 runs itself is not run again.** The sections that ask for more open with the install and the
  `refresh` a project runs, and 7.0.0's with the sandbox start. Run again as written, the install moves the
  devDependency from an exact version to a range, which step 6 records as exact, and the step's reading of the tree
  stops. The planner found this. Rejected: matching an instruction to a command by its words, which differ, as
  `npx agentrite refresh` and `npm run kit -- refresh` do
* **An instruction whose condition does not hold here asks nothing, and the tree may settle the condition.** Release
  notes address projects in general, and many of their instructions open with "a unit that", "an `AGENTS.md`
  that" or "with `opencode`". `agentrite.json` settles only the last kind. The others are settled by reading a file
  of this repository, which is as mechanical as reading `agentrite.json`. The planner raised it
* **This unit brings this repository's `AGENTS.md` to 7.1.0's wording.** 7.1.0 asks an `AGENTS.md` that names no
  `standards.md` to take what the project wants of the sections `init` prints, which leaves a choice and so stops
  step 6. The human chose to make that edit here, as requirement 12 does for `CLAUDE.md`, so that the condition does
  not hold when step 6 runs for 7.1.0. Between this unit reaching `master` and that move, `AGENTS.md` links a
  `standards.md` that the installed 7.0.0 does not have. Rejected: letting step 6 stop on it, which makes the move
  to 7.1.0 a unit after all
* **The move to 7.1.0 is not part of this unit.** It is step 6 run alone, which `RELEASING.md` allows for a release
  that is already made, once this unit is on `master`. That run is the first use of the widened step

## Non-goals

* Changing what `npx agentrite` does in this repository, or the package's name. It is npm's resolution, and the
  script goes round it
* Unit 0054's requirement 25, whose test must run the installed release's `refresh` and not `npx agentrite`. That
  unit's implementer takes it from this unit's context
* The README and every other file of the package. This unit changes this repository's own files only
* Steps of `RELEASING.md` other than step 6

## Beyond the request

* **A test that step 6's text names `npm run kit -- refresh`.** Cost: a test that pins a sentence of a document.
  Without it, a later edit that brings back `npx agentrite refresh` is caught when a release's move writes what the
  working tree writes, or by review
