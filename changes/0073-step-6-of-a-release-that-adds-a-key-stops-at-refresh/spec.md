# 0073 Step 6 of a release that adds a key stops at refresh

## Context

Step 6 of `RELEASING.md` moves this repository to the release just published. Unit 0055 gave it the five commands
it runs, the install, `refresh`, the suite, the change check and the start of the sandbox, and had it carry out the
release's own exact instructions of "Worth knowing when you update" after them. The step stopped after two releases
in a row, and each time the move became a task of its own: 0062 after 7.2.0, and 0072 after 8.0.0.

## The bug

**Observed.** After the release of 8.0.0, on `master` at `3301f72`, step 6 ran `npm install --save-dev --save-exact
agentrite@8.0.0`, which exited 0, and then `npm run kit -- refresh`, which printed
`agentrite: agentrite.json: orchestrator is missing` and exited 1. The step stopped, as it says to when one of the
five fails, and the repository was put back. The instruction of 8.0.0 that adds the key to `agentrite.json` is
exact, a line given word for word with its place, and step 6 never reached it.

**Expected.** Step 6 moves this repository to a release whose exact instructions add a required key to
`agentrite.json`, and commits the move, as it does for a release that adds none.

**Steps to reproduce.** Follow step 6 for a release that makes a key of `agentrite.json` required, with this
repository on the release before it. Reproduced with 8.0.0. Release 7.2.0 stopped at the same command for its key
`bell`, though its instruction was not exact, as task 0062 records.

**Root cause.** Step 6 runs its five commands first and settles the instructions of "Worth knowing when you update"
after them. Every command of the kit that reads `agentrite.json` refuses a file that lacks a required key, and
`refresh` is the first of the five that reads it. So a release that adds a required key fails at `refresh`, before
the instruction that adds the key is taken.

**Fix.** Step 6 settles the instructions right after the install, and runs `refresh`, the suite, the change check
and the start after them, in the order a project that updates follows: install, change its files as the release
says, then `refresh`.

## Requirements

1. Step 6 of `RELEASING.md` runs `npm install --save-dev --save-exact agentrite@<version>` first, then settles each
   instruction of "Worth knowing when you update" of the release, by the four cases it gives today and in the order
   the section gives them, and then runs `npm run kit -- refresh`, `npm test`, `npm run check-changes` and
   `./sandbox.sh --in-place --rebuild true`, in that order
2. An instruction that installs the kit, runs `refresh`, starts the sandbox or asks for the update to be committed is
   taken as done by the step, as today, and the command of the step that does it runs at its place in requirement 1
3. What step 6 says of a command that fails, of an instruction that stops it, of what the tree may hold before the
   commit, of putting the repository back, of the commit and of its body holds as today, with the order of
   requirement 1
4. Nothing of `RELEASING.md` but step 6 changes, and step 6 changes in nothing but what requirements 1 to 3 give
5. A dry run of step 6 as requirement 1 gives it, in a clone of this repository at the tag `v8.0.0`, outside the
   repository, with 8.0.0 from the registry, moves the clone to 8.0.0: the instruction that adds `orchestrator` is
   carried out, and `refresh`, the suite and the change check exit 0. The start of the sandbox may be left out of the
   dry run, which the record says

## Decisions

* **The kind is bug.** A step of the release's own instructions fails by following them, for every release that adds
  a required key, which is what the kit's releases have done twice in a row. The human did not ask for a feature
* **The instructions come before `refresh`, and not the key alone.** The README's "Updating a project to a newer kit"
  has a project install, add what the release asks to its files, and then run the kit's commands, which refuse a file
  that lacks a key. Step 6 follows the same order, so it tries the release's instructions as a project meets them.
  Rejected: a special case for an instruction that edits `agentrite.json`, which a reader of the step must tell apart
  from the others, and which leaves the next kind of instruction a command needs first to fail the same way
* **An instruction that needs `refresh` before it is not provided for.** No release so far has one, and its notes
  would say so, since a project follows them in their order. Such an instruction stops the step by case 4 today, as an
  instruction that fails does, and its repair is then a unit
* **The dry run is the regression check.** `RELEASING.md` is instructions to an agent and has no test of its own. A
  run of the new order on the release that showed the bug is the check that it holds

## Non-goals

* Task 0072, which moves this repository to 8.0.0, and which this unit does not wait for
* Instructions of "Worth knowing when you update" that are not exact, as that of 7.2.0, which stop the step as they
  do today
* Steps of `RELEASING.md` other than step 6, and step 2's rules for writing the instructions
* The moves of other projects to a release

## Beyond the request

None
