# 0074 A unit can be cancelled

## Context

A unit in `changes/` has one way to end today: `implemented`. A unit the human gives up on has none. It stays at
`draft`, `approved` or `in-progress` for good, and to anyone reading `changes/`, a person or an agent, it looks like
work still to be done. The human writes more and more draft units in the projects that use the kit, so these units
pile up.

Units end without being built for several reasons. Nobody wants the change any more. Another unit did the work, or
made it moot. The change turned out not to be feasible. The list of reasons is open. The kit needs a status that
closes a unit for any such reason without implementing it, and that keeps the unit's documents as a record of what
was considered.

Today `process.md` lists four statuses that every kind of unit goes through in order. Only `implemented` freezes a
unit, in the process and in the change check, and the record template lists the four statuses in its `status` field.
`agentrite orchestrate` starts work only on an `approved` unit, so it already refuses every other status, a
cancelled one included. `sandbox.sh`, given the number of a unit that has no branch, cuts one from the
default branch whatever the unit's status, and starts the sandbox on it.

## Requirements

The process:

1. `process.md` gives five statuses: `draft`, `approved`, `in-progress`, `implemented` and `cancelled`. It says that
   a unit that is built goes through the first four in that order. It says that `implemented` and `cancelled` are
   the two end statuses, and that a unit leaves the order for `cancelled` only from `draft`, `approved` or
   `in-progress`
2. `process.md` says that only the human cancels a unit, and that a unit that is `implemented` is never cancelled.
   Undoing implemented work stays a new unit that names the old one in `supersedes`, as `process.md` already says for
   a correction that would make a frozen record misleading
3. `process.md` says that the log entry that sets `cancelled` gives the reason in words, and that when another unit
   did the work or made it moot, the entry names that unit's directory
4. `process.md` says that a cancelled unit is frozen as an implemented one is: its `spec.md` and `plan.md` change no
   more, a later correction is an amendment in `record.md`, and outcomes recorded after the cancellation go under
   `## Amendments`
5. `process.md` says that taking up a cancelled unit's idea again is a new unit that names the cancelled one in
   `supersedes`, and that a cancelled unit is never set back to an earlier status
6. `process.md` says where a cancellation is committed. A unit with no branch is cancelled on the default branch, as
   its approval was. A unit that has a branch, which an `in-progress` unit always has and an `approved` one has once
   its planning began, is cancelled on the default branch too, and its branch is not merged. That commit holds the
   unit's documents as they stand at the head of its branch, `spec.md`, `plan.md` when there is one, and `record.md`
   with the entry that sets `cancelled`, and nothing of its implementation. `process.md` states this as an exception
   to the rule that everything after the approval is done on the unit's branch
7. `process.md`, where it says what the change check rejects, says it of units that are `implemented` or `cancelled`
   on the merge base

The change check:

8. The change check rejects a change to the `spec.md` or the `plan.md` of a unit that is `cancelled` on the merge
   base, and the deletion of such a unit, as it does for a unit that is `implemented` there, with the same messages
9. The change check does not reject a `cancelled` unit whose `plan.md` has unticked tasks. Only an `implemented`
   unit must have a complete plan

The documents of the process:

10. The record template gives `cancelled` among the values of its `status` field
11. No role file of the kit says or implies that `implemented` is the only status that freezes a unit, or that it is
    the only way a unit ends. Where a role file says which units are frozen, it says it of both end statuses, or
    leaves it to `process.md`

The sandbox:

12. `sandbox.sh`, given a unit by a number that names no branch, refuses to cut a branch for it when the unit's
    status in its `record.md` on the default branch is `cancelled`. It cuts no branch, builds no image and starts no
    container, and exits with 1, as for its other refusals before the command starts
13. The message of that refusal names the unit's directory, says that the unit is cancelled and so no branch is cut
    for it, and says that taking its idea up again is a new unit that names it in `supersedes`. Since the message
    names both why it refused and what to do, `SANDBOX.md` does not describe the refusal, and this unit does not
    change `SANDBOX.md`

The documents:

14. `README.md` says what the change check rejects of cancelled units, in "check-changes" of "Commands", and gives
    the number of statuses as five wherever it gives one, as "Adding a role" does. "sandbox.sh" of "Commands" gives
    a cancelled unit among the refusals it lists

Tests:

15. Unit tests of the change check cover: a change to the `spec.md` of a unit cancelled on the merge base is
    rejected, as is a change to its `plan.md` and its deletion; a unit that is `cancelled` at the head, and was not
    at the merge base, may change its documents in the same branch; a `cancelled` unit with unticked tasks in its
    `plan.md` is not rejected
16. A test shows that `agentrite orchestrate` refuses a unit whose status is `cancelled`, as it refuses every
    status but `approved`
17. Tests of `sandbox.sh` show that a unit given by its number, whose status on the default branch is `cancelled`,
    is refused by requirements 12 and 13 and that no branch exists after it, and that a unit at any other status
    still has its branch cut

## Decisions

* **The status is named `cancelled`.** The spelling is the one the repository already uses, and it is the name issue
  trackers such as Linear give to the end status beside the one for work that was done. Rejected: `declined` and
  `rejected`, which say that a proposal was judged and refused and so fit neither work done by another unit nor work
  found not to be feasible; `withdrawn`, which is unfamiliar as a status; `dropped` and `wontfix`, which the human
  also considered and did not take
* **One status for every reason, with the reason in the log entry.** A status for each reason would differ from the
  others in nothing the process or the change check does with it, and the set would grow with every new reason. The
  entry that sets the status says why, in words, and names the other unit when another unit did the work, which is
  what a reader of the unit needs
* **A unit is cancelled from `draft`, `approved` or `in-progress`, and only by the human.** Giving up on work is a
  decision about what the project wants, as approving it is, and approval is already the human's alone. An
  `implemented` unit is not cancelled: its work is in the project, and taking it out is a change of its own, which
  the process already makes a new unit with `supersedes`
* **The cancellation of a unit with a branch is committed on the default branch, without the implementation.** The
  human decided this for an `in-progress` unit. The unit's documents are the record of what was considered and why
  it stopped, and they must be on the default branch to be read there, while the implementation is not wanted and
  is not merged. It is an exception to the rule that everything after the approval is done on the unit's branch, and
  `process.md` says so where it states the rule. An `approved` unit whose planning began has a branch with its
  `plan.md` on it and nothing else of the work; the same commit is the only reading under which its plan reaches the
  default branch and its branch is not merged, so the rule is given for every unit with a branch. The human
  confirmed that extension
* **`cancelled` is terminal and frozen, as `implemented` is.** A unit that may be reopened is not ended, and would read
  as pending work again, which is the problem this unit solves. Freezing its `spec.md` and `plan.md` keeps the
  record of what was given up as it was when it was given up. Taking the idea up again is a new unit that names the
  cancelled one in `supersedes`, which keeps both histories readable
* **The plan of a cancelled unit may have unticked tasks.** A unit given up part way through has tasks that were never
  done, and ticking them, or removing them, would misstate what happened
* **`agentrite orchestrate` needs no change.** It starts work only on an `approved` unit, and its refusal names
  the status the unit has, which then reads `cancelled`

* **`sandbox.sh` refuses to cut a branch for a cancelled unit.** The human took this into the unit from "Beyond the
  request". A branch cut for a cancelled unit holds nothing anyone will build, and the roles in the sandbox would
  only read the status and stop, leaving a branch to delete by hand. The refusal is on cutting, which is where the
  wrapper reads the unit's record on the default branch. A unit whose branch exists is started as it is: the branch
  of a cancelled unit that was `in-progress` is the human's to keep or delete, and a run on it is the human's choice.
  The message says why and what to do, so by the rule of this repository on refusals `SANDBOX.md` does not describe
  it

## Non-goals

* A status for work set aside to be taken up later, such as `deferred` or `parked`. `draft` already says that a unit
  is written and not yet approved, which covers it
* Categories of reasons that a program can read, such as a field in the frontmatter. The reason is prose in the log
  entry
* A command that cancels a unit, or that deletes or archives the branch of a cancelled unit. What becomes of the
  branch is left to the human
* Changing `CHANGELOG.md`, which is written when a release is made

## Beyond the request

1. The change check rejects a change of the `status` of a unit that is `implemented` or `cancelled` on the merge
   base, so that a frozen unit cannot be reopened or an implemented one cancelled on a branch. It costs a further
   check and its tests. Without it, such a change on a branch passes the check and is seen in review or in the diff
   of `record.md`; it would not catch the cancellation commit itself, which is made on the default branch. The human
   declined it
2. `sandbox.sh` refuses to cut a branch for a unit whose status on the default branch is `cancelled`. The human took
   it, and it is requirements 12, 13 and 17
3. The request the orchestrator gives a step says that a step never sets `cancelled`, beside its sentence that a
   step sets no status later than `in-progress`, for which `cancelled` is outside the order. It costs a sentence in
   the request, its line in "The outcome of a step" of `README.md` and a test. Without it, a step reads in
   `process.md` that only the human cancels a unit. The human declined it
