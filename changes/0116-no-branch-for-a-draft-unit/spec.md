# 0116 The sandbox cuts a branch for a unit that is not approved

## Context

`process.md` has a unit's branch cut from the head of the default branch when work on the unit starts after its
approval, and not earlier. `SANDBOX.md` has a unit run for the planner, the implementer and the reviewer, and has
specifying done on the host, on the default branch, where the human approves the unit too.

When `./sandbox.sh` is given a unit by a number that names no local branch, the wrapper cuts the unit's branch from
the default branch, reading the unit's `record.md` as the default branch holds it. When the branch exists, the
wrapper runs on it as it is. With `--variant`, the variant's branch is cut from the unit's branch as that branch is,
when the variant's branch does not exist. The wrapper mounts a clone of the branch, and a clone that an earlier run
kept is resumed as it is, not updated from the host's branch. In the clone, `npx agentrite orchestrate` refuses a
unit whose record is not `approved`.

A developer using the kit in a project of their own reported what follows.

## Observed behavior

1. The developer started a unit run of the orchestrator in the sandbox, with the unit given by its number, for a
   unit whose record on the default branch was still `draft`
2. The wrapper cut the unit's branch from the default branch all the same, at the commit before any approval
3. In the clone, the orchestrator refused, saying that the unit is `draft` and that a run starts the work of an
   approved unit
4. The developer approved the unit on the default branch with `npx agentrite approve` and ran the same command again.
   The wrapper found the branch it had cut and ran on it as it was, so the clone held the record as `draft`, and the
   orchestrator refused with the same words on every try
5. Neither message says that the branch was cut before the approval, nor that the branch holds the record as it was
   then, so the developer could not tell why the approval had no effect

## Expected behavior

The wrapper cuts no branch for a unit that is `draft` on the default branch, and says why and how to approve it.
Once the unit is approved, the same command cuts the branch from the default branch with the approval on it. Nor
does the wrapper cut a branch for a unit that is `implemented` on the default branch, whose work is done, and it says
that further work on it is a new unit. When the checkout a run reads holds the record from before the approval all
the same, as a branch cut by an earlier release of the kit or by hand, a variant cut from such a branch, or a clone
kept from an earlier run, the orchestrator's refusal says that the record it read is `draft`, and gives one remedy
for a unit that is approved on the default branch already. `SANDBOX.md` describes that case too, for a reader whose
clone runs a kit without the fix.

## Steps to reproduce

Not reproduced in this repository. The steps follow the report, and the cause below is read from the code.

1. In a project with the sandbox, specify a unit and commit its `spec.md` and `record.md`, at `draft`, on the default
   branch
2. Run `./sandbox.sh <number> npx agentrite orchestrate <number>`. See the wrapper cut the unit's branch, and the
   orchestrator in the clone refuse the unit as `draft`
3. Run `npx agentrite approve <number>` on the default branch, and run the command of step 2 again. See the wrapper
   take the existing branch and the orchestrator refuse the unit as `draft` once more

Step 2 cuts the branch whatever command is given after the unit, since the cut is made before the command starts.
Only the orchestrator's refusal belongs to the command of the steps.

## Root cause

When the wrapper cuts a unit's branch, it reads the `kind` and the `status` of the unit's record on the default
branch, and refuses a cut only for the status `cancelled`. Every other status, `draft` among them, gets a branch cut
at the head of the default branch, so a branch cut for a draft unit holds the record at `draft`. The wrapper takes a
branch that exists as it is and does not compare it with the default branch, so an approval committed on the
default branch after the cut never reaches the clone. The orchestrator's check that the unit is approved names the
status it found and nothing of where the record came from, so the refusal gives no hint that the branch is behind
the approval.

## Fix

The wrapper's cut refuses a unit whose status on the default branch is `draft` or `implemented`, as it refuses a
cancelled one, with a message for each that names why and what to do, and cuts nothing. The orchestrator's check
gives a unit that is `draft` a message that also explains a checkout that holds the record from before the approval
and one way to recover. The documents describe both, and `SANDBOX.md` describes the recovery for a clone whose kit does
not have the new message.

## Requirements

1. When `./sandbox.sh` is given a unit by a number that names no local branch, and the unit's `record.md` on the
   default branch has the status `draft`, the wrapper cuts no branch, builds no image, starts no container and exits
   `1`. Its message on standard error names the unit's directory, says that the unit is `draft` on the default branch
   and not approved, so no branch is cut for it, and says to approve it on the default branch with
   `npx agentrite approve <unit>` and to run the same command again
2. When `./sandbox.sh` is given a unit by a number that names no local branch, and the unit's `record.md` on the
   default branch has the status `implemented`, the wrapper cuts no branch, builds no image, starts no container and
   exits `1`. Its message on standard error names the unit's directory, says that the unit is implemented on the
   default branch, so its work is done and no branch is cut for it, and says that undoing or correcting implemented
   work is a new unit that names the unit's directory in `supersedes`
3. With `--variant`, a unit given as in R1 or R2 is refused as R1 or R2 says, and neither the unit's branch nor the
   variant's is cut
4. Once the unit of R1 is approved on the default branch, the same command cuts the unit's branch from the head of
   the default branch, so the branch holds the commit of the approval, and a new clone of it holds the record as
   `approved`
5. The cut of a unit's branch for a unit given by a number that names no local branch behaves as it does now for
   every status of the record on the default branch except `draft` and `implemented`, which R1 and R2 refuse, and
   `cancelled`, which stays refused as it is now. A unit given by a number or a name that names a local branch is
   run on that branch as it is, whatever its record holds on the default branch. With `--variant` and a unit's
   branch that exists, a variant's branch that exists is run as it is, and one that does not is cut from the unit's
   branch at the commit that branch is at, whatever the record holds on either branch
6. When `npx agentrite orchestrate` without `--resume` refuses a unit whose status is `draft`, its message still
   names the status and says that a run starts the work of an approved unit, and says also:
    * that the record it read, in this checkout, is `draft`
    * that a unit not yet approved is approved on the default branch with `npx agentrite approve <unit>`
    * that when the unit is approved on the default branch already, this checkout holds the record from before the
      approval, and the remedy is to merge the default branch into the branch the run is on, on the host, and run
      again
    * that a clone the sandbox kept is resumed as it is, so its work is brought back to the host first

   The message names no branch, and the refusal makes no check of git that it does not make now, so it is the same
   on a branch, on a detached `HEAD` and outside a git repository
7. The refusal of every other status that is not `approved` keeps its words as they are, and the refusal of
   `--resume` keeps its words for every status
8. Every description of when the wrapper cuts a unit's branch agrees with R1 to R5: in `SANDBOX.md`, where "Running
   a unit" says how a unit's branch is cut and where "Two implementations of one unit" says what is cut for a
   variant, in the `sandbox.sh` section of `COMMANDS.md`, and in the forms the wrapper prints. Each says, of a unit
   whose branch is missing and would be cut from the default branch, that no branch is cut for a unit that is
   `draft` on the default branch, and that the branch is cut once the unit is approved there, and that no branch is
   cut for a unit that is `implemented` on the default branch, further work on which is a new unit. A variant's
   branch that is missing is described as cut from a unit's branch that exists as that branch is, as R5 says. The
   row of the form with `UNIT` in the table at the top of `COMMANDS.md` says that a missing unit's branch is cut
   only for a unit that is approved or in progress, without naming every status
9. `COMMANDS.md` says, in "agentrite orchestrate", what the refusal of a `draft` unit says beside the status, and, in
   "sandbox.sh", that a unit given by a number that names no branch and that is `draft` or `implemented` on the
   default branch is among the refusals that exit `1`
10. "When something goes wrong" of `SANDBOX.md` has an entry for a unit run in which the orchestrator refuses the
    unit as `draft` although the unit is approved on the default branch. It says what is seen, why, that the
    checkout the run reads holds the record from before the approval, and one remedy: merge the default branch into
    the branch the run is on, on the host, and run again, and for a clone the sandbox kept, which is resumed as it
    is, bring its work back to the host first
11. Regression tests show:
    * R1 to R4 for the wrapper, among them that no branch exists after the refusals of R1 and R2 and that the branch
      of R4 holds the commit of the approval
    * R6 and R7 for the orchestrator
    * the reported retry: with a unit's branch that exists and holds the record at `draft`, and the approval
      committed only on the default branch, a run of `./sandbox.sh` with the unit given by its number leaves the
      branch at the commit it was at when the run starts, and the orchestrator run on that branch refuses the unit
      with the words of R6

## Decisions

* **The kind is bug.** `process.md` says when a unit's branch is cut, and the wrapper cuts it at another time. The
  orchestrator's refusal is correct, and its words are what left the developer without a way out
* **`draft` and `implemented` are added to the statuses that refuse a cut.** `draft` is the status of the report,
  and the one at which a cut contradicts `process.md` in every case. `implemented` is an end status: `process.md`
  freezes such a unit and has further work on it done as a new unit that names it in `supersedes`, so a branch cut
  for it has no work to hold. Its refusal says so, as the refusal of a cancelled unit names the new unit that takes
  its idea up again. The human took this case into the unit. `in-progress` on the default branch comes from a merge
  of the unit's branch before the work is done, and a cut for it is left as it is, since work may go on after such a
  merge
* **The refusal applies to every command a unit run is given, not to the orchestrator alone.** A unit's branch is
  for the work after the approval whatever runs on it, and `SANDBOX.md` keeps specifying, and with it the work on a
  draft unit, on the host. A draft unit can still be worked on in the sandbox with `--in-place` or `--workdir`,
  which cut no branch
* **The wrapper moves no branch that exists, and changes no clone it kept, at the start of a run or as an
  automatic recovery.** Fast-forwarding a branch to the default branch on its own, cutting it anew, or updating or
  removing a kept clone would move the human's refs or work unasked, and could drop or bury commits of their own.
  The orchestrator's message and the entry of R10 tell the human how to bring the approval in, and the human does it
  with git. Bringing the work back when a run ends, which fast-forwards the host's branch to the clone's, and the
  removal of a clone in which nothing would be lost, stay as they are
* **The refusal of R6 and the entry of R10 give one remedy, and no steps per case.** The record the orchestrator
  reads is in its own checkout, and the orchestrator cannot tell whether the host's branch, a variant cut from it or
  a kept clone is behind the approval, nor does it always run on a branch. So the message says what it knows, that
  the record it read is `draft`, and gives the remedy that holds for a unit approved on the default branch: merge
  the default branch into the branch the run is on, on the host, after bringing back the work of a kept clone.
  Deleting the branch and cutting it anew was rejected as a remedy: a deleted variant's branch is cut again from
  the unit's branch as that branch is, so it can land on the same record, and deleting a branch risks the work it
  holds. Naming the branch checked out was rejected as well, since the orchestrator may run on a detached `HEAD` or
  outside git, and naming it would need a check of git that the refusal does not make now
* **The wrapper does not compare a branch that exists with the default branch.** That would make the wrapper read
  and judge the status of every unit it runs on an existing branch, which R5 keeps out. A branch that holds the
  record from before the approval is still made by hand, by an earlier release of the kit, and by the cut of a
  variant from a unit's branch that is such a branch, which R5 keeps as it is. The message of R6 covers each, and
  its remedy is for the branch the run is on, which is the variant's for a variant
* **The extra words of R6 are given for `draft` alone.** A checkout from before the approval holds the status `draft`,
  since an approval moves a unit from `draft` only. Giving the words for `implemented` or `cancelled` would point
  the human to a cause that cannot be theirs
* **The refusal of `--resume` is not changed.** A resume takes the latest run of the unit on the variant of the branch
  checked out, and a run starts only on a branch whose record is `approved`. A branch whose record is still `draft`
  has had no run to resume, so the cause of R6 does not arise there, and its remedy is a run, whose refusal carries
  the words of R6
* **R6 holds for a clone whose kit holds the fix.** The clone runs the kit that its branch's own `package-lock.json`
  pins, installed when the clone is new, and a kept clone is not installed again. A branch cut before the fix, which
  is the branch of the report, so prints the old refusal, which names neither the cause nor the remedy, even when
  the host's wrapper holds the fix. The wrapper does not update the branch's kit or the clone to change that, by the
  decision above
* **The refusals of R1 and R2 are no entries of "When something goes wrong", and the symptom of R10 is one.** Each of
  R1 and R2 names both why and what to do, so by the rule of `AGENTS.md` on refusals neither is described in
  `SANDBOX.md`. Nor is the message of R6 described as a refusal. The orchestrator refusing a unit as `draft`
  although it is approved on the default branch is described, as a failure that a reader recovers from by doing
  something: a clone on a kit before the fix shows it with words that name neither why nor what to do, and the
  entry is where a reader on any version of the kit finds the recovery
* **The cause is read, not reproduced.** The report is from the developer's project, and the condition that lets a
  draft unit through and the message without the hint are in the code as it stands. Where in the code each is, is
  in `record.md`

## Non-goals

* Moving, resetting, fast-forwarding or deleting a branch that exists, and updating or removing a clone that the
  wrapper kept, at the start of a run or as an automatic recovery, by the wrapper or by the orchestrator. Bringing
  the work back when a run ends, and removing a clone in which nothing would be lost, stay as they are
* Checking the status of a unit whose branch exists, in the wrapper, also when a variant's branch is cut from it
* Updating the kit that a branch's `package-lock.json` pins, or the kit installed in a clone
* A record on the default branch that holds no status, or a status the kit does not have, which the wrapper treats as
  it does now
* The branch of a sandbox-only project, which is given by its name and has no unit, and `--connect`, which cuts no
  branch
* Any refusal of `npx agentrite run` for a unit's status

## Beyond the request

1. Say in `SANDBOX.md`, beside R8, that no branch is cut for a unit that is cancelled on the default branch, which
   the wrapper refuses now and the document does not mention. Cost: one sentence. Without it, the reader learns of
   it from the refusal, whose message names why and what to do
