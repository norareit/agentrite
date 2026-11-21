# 0116 The sandbox cuts a branch for a unit that is not approved

## Approach

The fix is in two places of code, and the rest is tests and documents.

`cut_unit_branch` of `container/unit-clone.sh` reads the `kind` and the `status` of the unit's record on the default
branch and today refuses only `cancelled`, with `return 3`. The single `if` for `cancelled` becomes a `case` on the
status with three refusals, `draft`, `implemented` and `cancelled`, each printing its two lines on standard error and
returning `3`, before the kind is judged, as the refusal of `cancelled` is now. Every other status, a missing one
among them, falls through to the cut as now (R5). A `3` from `resolve_unit_branch` already makes `container/sandbox.sh`
exit `1` without the forms and before the variant's branch, the image and the container, so R1 to R3 need no change in
`sandbox.sh` beyond its forms and comments. `return 3`, and not `1`, is what keeps the forms out, since a `1` from the
cut prints them.

The two new refusals print, with `$directory` the unit's directory and `$default_branch` the default branch:

```text
sandbox.sh: changes/$directory is draft on $default_branch and not approved, so no branch is cut for it.
Approve it on $default_branch with 'npx agentrite approve $directory', and run the same command again.
```

```text
sandbox.sh: changes/$directory is implemented on $default_branch, so its work is done and no branch is cut for it.
Undoing or correcting implemented work is a new unit that names $directory in supersedes.
```

`checkApproved` of `scripts/agentrite.mjs` keeps its message for every status but `draft`. For `draft` it throws
four lines, which the command prints after `agentrite: `, with `<directory>` the unit's directory:

1. `the unit changes/<directory>/ is draft, and a run starts the work of an approved unit.`
2. `The record read in this checkout is draft. A unit not yet approved is approved on the default branch, with npx
   agentrite approve <directory>.`, as one line
3. `When the unit is approved on the default branch already, this checkout holds the record from before the
   approval: merge the default branch into the branch the run is on, on the host, and run again.`, as one line
4. `A clone the sandbox kept is resumed as it is, so bring its work back to the host first.`

The first line is the message of today with a full stop after it. The message names no branch, and the function
reads nothing it does not read now, so it is the same on a branch, on a detached `HEAD` and outside git (R6).
`checkResumable` is not touched (R7). In the source the lines are joined with `\n` and each is built of strings
joined with `+`, as the message of `resolveUnit` in `scripts/agentrite-run.mjs` is, so that the source keeps to 120
characters.

The documents follow R8 to R10, and the forms the wrapper prints follow R8.

## Files

- `container/unit-clone.sh`: `cut_unit_branch` and its comment
- `container/sandbox.sh`: `run_forms`, and the header comments on `UNIT`, `--variant` and the cut of a unit's branch
- `scripts/agentrite.mjs`: `checkApproved`
- `tests/sandbox-unit-run.test.mjs`: the tests of the cut, the forms and the retry
- `tests/agentrite-orchestrate.test.mjs`: the refusal of a `draft` unit and the retry on a branch behind the approval
- `SANDBOX.md`: "Running a unit", "Two implementations of one unit", "When something goes wrong"
- `COMMANDS.md`: the table at the top, "agentrite orchestrate" and "sandbox.sh"

## Tasks

### The regression tests

- [x] In `tests/sandbox-unit-run.test.mjs`, take `draft` and `implemented` out of the loop of the test "the wrapper
  cuts feature-0031-cut-me from master for a unit that is ${status} there", which keeps `approved` and `in-progress`
  (R5, R11)
- [x] Add two entries to `noCut`, beside the one for a unit cancelled on master: "a unit that is draft on master" and
  "a unit that is implemented on master", each with `commitUnit(host, 'kind: feature\nstatus: <status>\ntimestamp:
  2026-10-05T13:45:27Z')`, and `says` matching the two lines of the Approach for that status, with `0031-cut-me` and
  `master`, as whole lines with `^` and `$` and the `m` flag. The loop over `noCut` already checks the exit `1`, that
  no ref changed, that Docker and npm were not called and that the state directory is not made (R1, R2, R11)
- [x] Add a test, after "--variant for a unit with no branch cuts the unit and then the variant, and runs the
  variant", looping over `draft` and `implemented`, that commits the unit at that status, runs
  `['0031', '--variant', 'opus', 'echo', 'hi']` with `setUpWithBuildDue`, and asserts the exit `1`, the first line of
  the refusal of that status, that `git('for-each-ref')` is as it was before the run, so neither
  `feature-0031-cut-me` nor `feature-0031-cut-me--opus` exists, and that Docker and npm were not called (R3, R11)
- [x] Add a test "a unit approved on master after a refused cut gets its branch cut with the approval on it": commit
  the unit at `draft`, run `['0031', 'echo', 'hi']` and assert the exit `1` and no new ref, then commit on `master`
  the record with `status: approved`, set `host.agent('git show HEAD:changes/0031-cut-me/record.md >
  ../record-seen')`, run the same command again, and assert the exit `0`, the line
  `sandbox.sh: cut feature-0031-cut-me from master at <short>, for changes/0031-cut-me.` with the short commit of the
  approval, that `refs/heads/feature-0031-cut-me` is the commit of the approval, and that the file `record-seen` beside
  the clone, under `state/agentrite/project-sandbox/`, holds `status: approved` (R4, R11)
- [x] Add a test "a branch cut before the approval is run as it is, and is not moved to the approval": commit the unit
  at `draft` on `master`, cut `feature-0031-cut-me` from it with `git('branch', ...)`, commit the record with
  `status: approved` on `master` alone, note `git('for-each-ref')`, set the agent script to write
  `git show HEAD:changes/0031-cut-me/record.md` to `../record-seen`, and run `['0031', 'echo', 'hi']`. Assert the exit
  `0`, no `cut ` in standard error, that `git('for-each-ref')` is as noted, so the branch is at the commit it was at,
  and that `record-seen` holds `status: draft` (R5, R11)
- [x] In `tests/agentrite-orchestrate.test.mjs`, take `draft` out of the list of statuses whose refusal keeps the
  words of today in "the refusals of requirement 11 exit 1, start nothing and make no .orchestrator", which keeps
  `in-progress`, `implemented` and `cancelled` with their message unchanged, and add an entry for `draft` whose
  message is the four lines of the Approach with `UNIT` as the directory (R6, R7, R11)
- [x] Add a test that the refusal of a `draft` unit is that same message on a branch, as `onBranch(base, TRY_BRANCH)`
  makes, on a detached `HEAD`, from a repository with a commit checked out by its hash, and with no git repository,
  each through `refused` (R6, R11)
- [x] Add a test of the reported retry: a project made a git repository, in which a commit of `changes/` alone holds
  the record at `draft`, the branch `feature-0029-try-the-orchestrator` is cut there, and `master` has a further commit
  with the record at `approved`, as a branch cut before the approval is. The commits are made with an identity given
  by `-c user.name=` and `-c user.email=`, and the branch is checked out, so that its working tree holds `draft`.
  `agentrite('orchestrate', '0029')` exits `1`, prints the four lines of the Approach after `agentrite: `, calls no
  harness, makes no `.orchestrator`, and leaves `HEAD` and every ref as they were (R6, R11)
- [x] Leave the test "a resume refuses a unit not approved or in progress, --definition, and an opted out project"
  with its message for `draft`, `implemented` and `cancelled` unchanged, as the proof of R7 for `--resume` (R7, R11)
- [x] Run `node --test tests/sandbox-unit-run.test.mjs tests/agentrite-orchestrate.test.mjs` and see the new and the
  changed tests fail, and the others pass

### The fix

- [x] In `cut_unit_branch` of `container/unit-clone.sh`, replace the `if` for `cancelled` with a `case "$status"` whose
  arms `draft`, `implemented` and `cancelled` each print their two lines and `return 3`, the `cancelled` arm with its
  words unchanged. Update the comment above the function: a unit that is draft, implemented or cancelled on the
  default branch is one that no branch can be cut for, and gets none (R1, R2, R3, R5)
- [x] In `checkApproved` of `scripts/agentrite.mjs`, throw for `draft` the message of the Approach and for every
  other status that is not `approved` the message of today. Update its JSDoc to say that the refusal of a draft unit
  also says how to approve it and how to recover a checkout that holds the record from before the approval (R6, R7)
- [x] In `run_forms` of `container/sandbox.sh`, replace the line "An ID with no branch gets one, cut from the default
  branch" with lines that say that an ID with no branch gets one, cut from the default branch once the unit is
  approved there, that a draft unit gets none, and that an implemented one gets none, further work on it being a new
  unit. Replace "cut from the unit's branch when it does not exist" with a line that says the variant's branch is cut
  from the unit's branch as it is when it does not exist. Keep each line of the forms within the width of the longest
  line there now (R8)
- [x] In `tests/sandbox-unit-run.test.mjs`, change the two assertions on the line "An ID with no branch gets one, cut
  from the default branch", in the test of a name that names no branch and in "the forms the wrapper lists say the
  default branch, and are printed without reading the file", to the new lines of the forms (R8)
- [x] In the header comments of `container/sandbox.sh`, where they say that a unit given by its number that has no
  branch gets one cut from the default branch, under the `UNIT` option and in the opening description, add that no
  branch is cut for a unit that is draft, implemented or cancelled there, and under `--variant` that the variant's
  branch is cut from the unit's branch as it is (R8)
- [x] Run `node --test tests/sandbox-unit-run.test.mjs tests/agentrite-orchestrate.test.mjs` and see them pass

### The documents

- [x] In "Running a unit" of `SANDBOX.md`, after step 2 of the numbered list of how a unit's branch is cut, say that
  no branch is cut for a unit that is `draft` on the default branch, and that the same command cuts it once the unit
  is approved there, and that no branch is cut for a unit that is `implemented` there, further work on which is a new
  unit. Say nothing there of a cancelled unit, which is BTR1 and not taken into the unit (R8)
- [x] In "Two implementations of one unit" of `SANDBOX.md`, in the item that says when the variant's branch is cut,
  say that it is cut from the unit's branch as that branch is, whatever its record holds, and that a unit with no
  branch gets its branch cut first, from the default branch, as "Running a unit" says, so that a unit that is draft
  or implemented on the default branch gets neither (R8)
- [x] In "When something goes wrong" of `SANDBOX.md`, add an entry after the one that opens "For a unit run, the
  wrapper says why and starts nothing", in bold: the orchestrator in a unit run refuses the unit as `draft`, although
  it is approved on the default branch. Then why: the checkout the run reads holds the record from before the
  approval, as a branch cut before it, a variant cut from such a branch or a clone kept from an earlier run, which is
  resumed as it is. Then what to do: bring the work of a kept clone back to the host first, merge the default branch
  into the branch the run is on, on the host, and run again (R10)
- [x] In the table at the top of `COMMANDS.md`, change the description of the form with `UNIT` to say that it starts
  the sandbox on a clone of a unit's branch, which when missing is cut only for a unit that is approved or in
  progress, without naming the other statuses, and realign the columns of the table to the new width (R8)
- [x] In "sandbox.sh" of `COMMANDS.md`, in the paragraph that says a unit given by a number that no branch holds gets
  its branch first, say that it gets none when the unit is draft on the default branch, until it is approved there,
  nor when it is implemented there, further work on it being a new unit, beside the cancelled unit already named, and
  that with `--variant` a missing variant's branch is cut from the unit's branch as it is. In the paragraph of the exit
  statuses, extend the refusal of "a unit given by a number that names no branch and that is cancelled on the default
  branch" to one that is draft, implemented or cancelled there (R8, R9)
- [x] In "agentrite orchestrate" of `COMMANDS.md`, in the item of a status that is not `approved`, say that for a
  `draft` unit it also says that the record read in this checkout is `draft`, how a unit not yet approved is approved,
  that a unit approved on the default branch already means a checkout from before the approval, which is recovered by
  merging the default branch into the branch the run is on, on the host, and running again, and that the work of a
  clone the sandbox kept is brought back first (R9)
- [x] Check every line changed or added in the documents, the scripts and the tests against the limit of 120
  characters, apart from the rows of Markdown tables

## Verification

- [x] `npm test` passes in the environment without Docker, where 34 tests are skipped
- [ ] `npm test` passes on a host that has Docker, the tests that need it among them, which is a check of the human
- [x] `npm run check-changes` passes once the work is committed
- [x] `grep -n "cut" SANDBOX.md COMMANDS.md container/sandbox.sh` shows no description of the cut of a unit's branch
  that disagrees with R1 to R5

## Commit Points

- [x] `bugfix-0116 Write the plan`: `plan.md` and the planner's entry in `record.md`
- [x] `bugfix-0116 Cut no branch for a draft or implemented unit`: the tests, `container/unit-clone.sh`,
  `container/sandbox.sh` and `scripts/agentrite.mjs`
- [x] `bugfix-0116 Describe the cut and the refusal of a draft unit`: `SANDBOX.md` and `COMMANDS.md`
